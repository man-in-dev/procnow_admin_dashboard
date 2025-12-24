'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { getEnquiries, getAuthToken, getCurrentUser, type Enquiry } from '@/lib/api';

export default function EnquiriesPage() {
  const router = useRouter();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const user = await getCurrentUser(token);
        if (user.role !== 'admin') {
          router.push('/login');
          return;
        }

        setIsAuthLoading(false);
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadEnquiries();
    }
  }, [isAuthLoading]);

  useEffect(() => {
    filterEnquiries();
  }, [enquiries, searchQuery, statusFilter]);

  const loadEnquiries = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        setIsLoading(false);
        return;
      }

      const data = await getEnquiries(token);
      setEnquiries(data);
    } catch (error) {
      console.error('Error loading enquiries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterEnquiries = () => {
    let filtered = [...enquiries];

    // Filter by search query (ID or buyer name/email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((enquiry) => {
        const enquiryId = enquiry._id?.toLowerCase() || '';
        
        // Get buyer email from populated userId or fallback to address
        let buyerEmail = '';
        if (typeof enquiry.userId === 'object' && enquiry.userId !== null && 'auth' in enquiry.userId) {
          const user = enquiry.userId as { auth?: { email?: string } };
          buyerEmail = user.auth?.email?.toLowerCase() || '';
        }
        if (!buyerEmail) {
          buyerEmail = enquiry.shippingAddress?.email?.toLowerCase() || enquiry.billingAddress?.email?.toLowerCase() || '';
        }
        
        // Get buyer name from populated userId or fallback to enquiry name
        let buyerName = '';
        if (typeof enquiry.userId === 'object' && enquiry.userId !== null && 'auth' in enquiry.userId) {
          const user = enquiry.userId as { auth?: { name?: string } };
          buyerName = user.auth?.name?.toLowerCase() || '';
        }
        if (!buyerName) {
          buyerName = enquiry.enquiryName?.toLowerCase() || '';
        }
        
        return enquiryId.includes(query) || buyerEmail.includes(query) || buyerName.includes(query);
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((enquiry) => enquiry.enquiryStatus === statusFilter);
    }

    setFilteredEnquiries(filtered);
  };

  const formatEnquiryId = (id: string | undefined): string => {
    if (!id) return 'N/A';
    // Extract last part of MongoDB ID and format as ENQ-YYYY-XXX
    const year = new Date().getFullYear();
    const shortId = id.slice(-3).toUpperCase();
    return `ENQ-${year}-${shortId.padStart(3, '0')}`;
  };

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('new')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('rfq') || statusLower.includes('sent')) return 'bg-orange-100 text-orange-800';
    if (statusLower.includes('quote') || statusLower.includes('received')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('pending') || statusLower.includes('approval')) return 'bg-purple-100 text-purple-800';
    if (statusLower.includes('approved')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const calculateEstimatedValue = (enquiry: Enquiry): number => {
    // Placeholder calculation - in real app, this would come from product prices
    // For now, estimate based on number of items
    const itemCount = enquiry.enquiryProducts?.length || 0;
    return itemCount * 10000; // $10,000 per item as placeholder
  };

  const getBuyerName = (enquiry: Enquiry): string => {
    // First, try to get name from populated userId
    if (typeof enquiry.userId === 'object' && enquiry.userId !== null && 'auth' in enquiry.userId) {
      const user = enquiry.userId as { auth?: { name?: string } };
      if (user.auth?.name) {
        return user.auth.name;
      }
    }
    // Fallback to enquiry name
    if (enquiry.enquiryName) {
      return enquiry.enquiryName;
    }
    // Extract company name from email domain or use a default
    const email = enquiry.shippingAddress?.email || '';
    if (email) {
      const domain = email.split('@')[1];
      if (domain) {
        return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1) + ' Corp';
      }
    }
    return 'Unknown Company';
  };

  const getBuyerEmail = (enquiry: Enquiry): string => {
    // First, try to get email from populated userId
    if (typeof enquiry.userId === 'object' && enquiry.userId !== null && 'auth' in enquiry.userId) {
      const user = enquiry.userId as { auth?: { email?: string } };
      if (user.auth?.email) {
        return user.auth.email;
      }
    }
    // Fallback to shipping or billing address email
    return enquiry.shippingAddress?.email || enquiry.billingAddress?.email || 'N/A';
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'New', label: 'New' },
    { value: 'RFQ Sent', label: 'RFQ Sent' },
    { value: 'Quotes Received', label: 'Quotes Received' },
    { value: 'Pending Approval', label: 'Pending Approval' },
    { value: 'Approved', label: 'Approved' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Enquiries</h1>
            <p className="text-gray-600">Manage and process buyer enquiries</p>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search by ID or buyer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Enquiries Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mb-4"></div>
                <p className="text-gray-500">Loading enquiries...</p>
              </div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No enquiries found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ENQUIRY ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        BUYER
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ITEMS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        EST. VALUE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        STATUS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        DATE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEnquiries.map((enquiry) => (
                      <tr key={enquiry._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/enquiries/${enquiry._id}`)}
                            className="text-teal-600 font-medium cursor-pointer hover:text-teal-700"
                          >
                            {formatEnquiryId(enquiry._id)}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-gray-400"
                            >
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                              <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            <div>
                              <div className="font-medium text-gray-900">{getBuyerName(enquiry)}</div>
                              <div className="text-sm text-gray-500">{getBuyerEmail(enquiry)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {enquiry.enquiryProducts?.length || 0} items
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          ${calculateEstimatedValue(enquiry).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(enquiry.enquiryStatus)}`}>
                            {enquiry.enquiryStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                          {formatDate(enquiry.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {/* View Icon */}
                            <button
                              onClick={() => {
                                if (enquiry._id) {
                                  router.push(`/enquiries/${enquiry._id}`);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>

                            {/* Send Icon - Show for New status */}
                            {(enquiry.enquiryStatus === 'New' || enquiry.enquiryStatus.toLowerCase().includes('new')) && (
                              <button
                                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Send"
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="22" y1="2" x2="11" y2="13"></line>
                                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                              </button>
                            )}

                            {/* Quotes Icon - Show for Quotes Received and Pending Approval */}
                            {(enquiry.enquiryStatus === 'Quotes Received' ||
                              enquiry.enquiryStatus === 'Pending Approval' ||
                              enquiry.enquiryStatus.toLowerCase().includes('quote') ||
                              enquiry.enquiryStatus.toLowerCase().includes('pending')) && (
                              <button
                                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Quotes"
                              >
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="18" y1="20" x2="18" y2="10"></line>
                                  <line x1="12" y1="20" x2="12" y2="4"></line>
                                  <line x1="6" y1="20" x2="6" y2="14"></line>
                                </svg>
                              </button>
                            )}

                            {/* More Options Icon */}
                            <button
                              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                              title="More options"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="12" cy="12" r="1"></circle>
                                <circle cx="12" cy="5" r="1"></circle>
                                <circle cx="12" cy="19" r="1"></circle>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
