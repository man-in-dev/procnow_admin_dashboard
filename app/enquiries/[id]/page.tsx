'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  getEnquiryById,
  getAuthToken,
  getCurrentUser,
  getVendors,
  sendEnquiryRfq,
  getEnquiryQuotes,
  sendQuotesToBuyer,
  type Enquiry,
  type EnquiryProduct,
  type ProductSheetItem,
  type Vendor,
  type Quote,
} from '@/lib/api';

export default function EnquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const enquiryId = params?.id as string;

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'quotesSent' | 'quotesReceived'>('items');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [detailModalProduct, setDetailModalProduct] = useState<EnquiryProduct | null>(null);
  const [vendorModalProduct, setVendorModalProduct] = useState<EnquiryProduct | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());
  const [assignedVendors, setAssignedVendors] = useState<Record<string, Vendor[]>>({});
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [isSendingQuotes, setIsSendingQuotes] = useState(false);

  // Load assigned vendors from localStorage (if any)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('assigned_vendors');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, Vendor[]>;
        setAssignedVendors(parsed);
      }
    } catch (error) {
      // Ignore JSON/parse errors and start fresh
      console.error('Failed to load assigned vendors from localStorage', error);
    }
  }, []);

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
    if (enquiryId && !isAuthLoading) {
      loadEnquiry();
      loadQuotes();
    }
  }, [enquiryId, isAuthLoading]);

  useEffect(() => {
    if (activeTab === 'quotesReceived' && enquiryId && !isAuthLoading) {
      loadQuotes();
    }
  }, [activeTab, enquiryId, isAuthLoading]);

  const loadEnquiry = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        setIsLoading(false);
        return;
      }

      const data = await getEnquiryById(token, enquiryId);
      setEnquiry(data);
    } catch (error) {
      console.error('Error loading enquiry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuotes = async () => {
    try {
      setQuotesLoading(true);
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const quotesData = await getEnquiryQuotes(token, enquiryId);
      setQuotes(quotesData);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setQuotesLoading(false);
    }
  };

  const formatEnquiryId = (id: string | undefined): string => {
    if (!id) return 'N/A';
    const year = new Date().getFullYear();
    const shortId = id.slice(-3).toUpperCase();
    return `ENQ-${year}-${shortId.padStart(3, '0')}`;
  };

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const getStatusBadgeColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('rfq') && statusLower.includes('sent')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('quote') && statusLower.includes('in')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('quoted')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('assigned')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('pending')) return 'bg-gray-100 text-gray-800';
    if (statusLower.includes('rfq')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const calculateEstimatedValue = (): number => {
    if (!enquiry?.enquiryProducts) return 0;
    // Placeholder calculation
    return enquiry.enquiryProducts.length * 42833; // Approximate to match $128,500 for 3 items
  };

  const getBuyerName = (): string => {
    if (!enquiry) return 'N/A';
    if (typeof enquiry.userId === 'object' && enquiry.userId !== null && 'auth' in enquiry.userId) {
      const user = enquiry.userId as { auth?: { name?: string } };
      if (user.auth?.name) {
        return user.auth.name;
      }
    }
    return enquiry.enquiryName || 'Unknown Company';
  };

  const getBuyerEmail = (): string => {
    if (!enquiry) return 'N/A';
    if (typeof enquiry.userId === 'object' && enquiry.userId !== null && 'auth' in enquiry.userId) {
      const user = enquiry.userId as { auth?: { email?: string } };
      if (user.auth?.email) {
        return user.auth.email;
      }
    }
    return enquiry.shippingAddress?.email || enquiry.billingAddress?.email || 'N/A';
  };

  const getBuyerPhone = (): string => {
    if (!enquiry) return 'N/A';
    return enquiry.shippingAddress?.phone || enquiry.billingAddress?.phone || 'N/A';
  };

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAllProducts = () => {
    if (!enquiry?.enquiryProducts) return;
    if (selectedProducts.size === enquiry.enquiryProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(enquiry.enquiryProducts.map(ep => ep._id || '')));
    }
  };

  const getProductDisplayName = (enquiryProduct: EnquiryProduct): string => {
    const product = typeof enquiryProduct.productsheetitemid === 'object' 
      ? enquiryProduct.productsheetitemid 
      : null;
    return product?.displayName || product?.productSource || 'Unknown Product';
  };

  const getProductCategory = (enquiryProduct: EnquiryProduct): string => {
    const product = typeof enquiryProduct.productsheetitemid === 'object' 
      ? enquiryProduct.productsheetitemid 
      : null;
    return product?.category || 'Uncategorized';
  };

  const getProductQuantity = (enquiryProduct: EnquiryProduct): string => {
    return enquiryProduct.quantity || 'N/A';
  };

  const openDetailModal = (enquiryProduct: EnquiryProduct) => {
    setDetailModalProduct(enquiryProduct);
  };

  const closeDetailModal = () => {
    setDetailModalProduct(null);
  };

  const openVendorModal = async (enquiryProduct: EnquiryProduct) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const productId = enquiryProduct._id || '';

      if (vendors.length === 0) {
        const data = await getVendors(token);
        setVendors(data);
      }

      setVendorModalProduct(enquiryProduct);
      const existingForProduct = assignedVendors[productId] || [];
      setSelectedVendorIds(new Set(existingForProduct.map((v) => v.id)));
      setVendorSearch('');
    } catch (error) {
      console.error('Failed to load vendors', error);
    }
  };

  const closeVendorModal = () => {
    setVendorModalProduct(null);
    setSelectedVendorIds(new Set());
    setVendorSearch('');
  };

  const toggleVendorSelection = (vendorId: string) => {
    setSelectedVendorIds((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) {
        next.delete(vendorId);
      } else {
        next.add(vendorId);
      }
      return next;
    });
  };

  const filteredVendors = vendors.filter((vendor) => {
    const term = vendorSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      vendor.name.toLowerCase().includes(term) ||
      vendor.email.toLowerCase().includes(term)
    );
  });

  const getAssignedVendorsForProduct = (productId: string): Vendor[] => {
    return assignedVendors[productId] || [];
  };

  const getTotalVendorRfqCount = (): number => {
    if (!enquiry?.enquiryProducts) return 0;
    return enquiry.enquiryProducts.reduce((sum, ep) => {
      const productId = ep._id || '';
      if (!productId) return sum;
      return sum + getAssignedVendorsForProduct(productId).length;
    }, 0);
  };

  const handleSendRfq = async () => {
    if (!enquiry?._id) return;
    const totalRfqs = getTotalVendorRfqCount();
    if (totalRfqs === 0) return;

    try {
      const token = getAuthToken();
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const assignments =
        enquiry.enquiryProducts
          ?.map((ep) => {
            const productId = ep._id || '';
            if (!productId) return null;
            const vendorsForProduct = getAssignedVendorsForProduct(productId);
            if (!vendorsForProduct.length) return null;
            return {
              enquiryProductId: productId,
              vendorIds: vendorsForProduct.map((v) => v.id),
            };
          })
          .filter((item): item is { enquiryProductId: string; vendorIds: string[] } => !!item) || [];

      if (!assignments.length) return;

      await sendEnquiryRfq(token, enquiry._id, { assignments });
      // Optimistically update product status to 'Assigned' in UI
      setEnquiry((prev) => {
        if (!prev || !prev.enquiryProducts) return prev;
        const updatedProducts = prev.enquiryProducts.map((ep) => {
          const productId = ep._id || '';
          const hasVendors =
            assignments.find((a) => a.enquiryProductId === productId)?.vendorIds.length ??
            0;
          if (hasVendors > 0) {
            return { ...ep, status: 'Assigned' };
          }
          return ep;
        });
        return { ...prev, enquiryProducts: updatedProducts };
      });
      setIsRfqModalOpen(false);
    } catch (error) {
      console.error('Failed to send RFQ:', error);
    }
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

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-gray-500">Loading enquiry...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-gray-500">Enquiry not found</div>
          </div>
        </div>
      </div>
    );
  }

  const enquiryProducts = enquiry.enquiryProducts || [];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header Section */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/enquiries')}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(enquiry.enquiryStatus)}`}>
                  {enquiry.enquiryStatus}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Chat with Client
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Contact Buyer
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors"
                  onClick={() => setIsRfqModalOpen(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Send RFQ
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {formatEnquiryId(enquiry._id)}
              </h1>
              <p className="text-gray-600">
                {enquiryProducts.length} items • Est. value: ${calculateEstimatedValue().toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex gap-6 p-6">
            {/* Main Content Area */}
            <div className="flex-1">
              {/* Tabs */}
              <div className="bg-white rounded-lg border border-gray-200 mb-4">
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('items')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'items'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Items ({enquiryProducts.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('quotesSent')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'quotesSent'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quotes Sent (3)
                  </button>
                  <button
                    onClick={() => setActiveTab('quotesReceived')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'quotesReceived'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quotes Received ({quotes.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'items' && (
                    <div>
                      {/* Select All Checkbox */}
                      <div className="mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProducts.size === enquiryProducts.length && enquiryProducts.length > 0}
                            onChange={toggleAllProducts}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Select products</span>
                        </label>
                      </div>

                      {/* Product List */}
                      <div className="space-y-4">
                        {enquiryProducts.map((enquiryProduct) => {
                          const productId = enquiryProduct._id || '';
                          const product = typeof enquiryProduct.productsheetitemid === 'object' 
                            ? enquiryProduct.productsheetitemid 
                            : null;
                          const isSelected = selectedProducts.has(productId);
                          const productStatus = enquiryProduct.status || 'Pending';

                          return (
                            <div
                              key={productId}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start gap-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleProductSelection(productId)}
                                  className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                                />
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h3 className="font-semibold text-gray-900 mb-1">
                                        {getProductDisplayName(enquiryProduct)}
                                      </h3>
                                      <p className="text-sm text-gray-600">{getProductCategory(enquiryProduct)}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(productStatus)}`}>
                                      {productStatus}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-3">
                                    Quantity: {getProductQuantity(enquiryProduct)}
                                  </p>
                                  <div className="flex items-center gap-4 mb-3">
                                    <div className="text-sm">
                                      <span className="text-gray-500">Assigned Vendors:</span>
                                      <div className="flex flex-wrap gap-2 mt-1">
                                        {(assignedVendors[productId] || []).length === 0 ? (
                                          <span className="text-xs text-gray-400">
                                            No vendors assigned yet
                                          </span>
                                        ) : (
                                          (assignedVendors[productId] || []).map((vendor) => (
                                            <span
                                              key={vendor.id}
                                              className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs flex items-center gap-1"
                                            >
                                              {vendor.name}
                                              <button
                                                type="button"
                                                className="ml-1 text-[11px] leading-none text-green-700 hover:text-green-900"
                                                onClick={() => {
                                                  setAssignedVendors((prev) => {
                                                    const current = prev[productId] || [];
                                                    const updatedForProduct = current.filter(
                                                      (v) => v.id !== vendor.id
                                                    );
                                                    const next: Record<string, Vendor[]> = {
                                                      ...prev,
                                                    };
                                                    if (updatedForProduct.length === 0) {
                                                      delete next[productId];
                                                    } else {
                                                      next[productId] = updatedForProduct;
                                                    }

                                                    if (typeof window !== 'undefined') {
                                                      try {
                                                        window.localStorage.setItem(
                                                          'assigned_vendors',
                                                          JSON.stringify(next)
                                                        );
                                                      } catch (error) {
                                                        console.error(
                                                          'Failed to update assigned vendors in localStorage',
                                                          error
                                                        );
                                                      }
                                                    }

                                                    return next;
                                                  });
                                                }}
                                              >
                                                ×
                                              </button>
                                            </span>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                                      onClick={() => openDetailModal(enquiryProduct)}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                      </svg>
                                      View Details
                                    </button>
                                    <button
                                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                                      onClick={() => openVendorModal(enquiryProduct)}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                      </svg>
                                      Add Vendors
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'quotesSent' && (
                    <div className="text-center py-12 text-gray-500">
                      Quotes Sent content coming soon
                    </div>
                  )}

                  {activeTab === 'quotesReceived' && (
                    <div className="p-6">
                      {/* Send to Buyer Button */}
                      {quotes.length > 0 && selectedQuotes.size > 0 && (
                        <div className="mb-4 flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg p-4">
                          <div>
                            <p className="text-sm font-medium text-teal-900">
                              {selectedQuotes.size} {selectedQuotes.size === 1 ? 'quote' : 'quotes'} selected
                            </p>
                            <p className="text-xs text-teal-700 mt-1">
                              Selected quotes will be made visible to the buyer
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              if (!enquiryId || selectedQuotes.size === 0) return;
                              
                              try {
                                setIsSendingQuotes(true);
                                const token = getAuthToken();
                                if (!token) {
                                  alert('Not authenticated');
                                  return;
                                }

                                const quoteIds = Array.from(selectedQuotes);
                                await sendQuotesToBuyer(token, enquiryId, quoteIds);
                                
                                // Clear selection and reload quotes
                                setSelectedQuotes(new Set());
                                loadQuotes();
                                alert(`Successfully sent ${quoteIds.length} ${quoteIds.length === 1 ? 'quote' : 'quotes'} to buyer!`);
                              } catch (error: any) {
                                console.error('Error sending quotes to buyer:', error);
                                alert(error.message || 'Failed to send quotes to buyer');
                              } finally {
                                setIsSendingQuotes(false);
                              }
                            }}
                            disabled={isSendingQuotes}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSendingQuotes ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 2L11 13"></path>
                                  <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                                </svg>
                                <span>Send to Buyer</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {quotesLoading ? (
                        <div className="text-center py-12">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mb-4"></div>
                          <p className="text-gray-600">Loading quotes...</p>
                        </div>
                      ) : quotes.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-gray-400">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                          </svg>
                          <p className="text-lg">No quotes received yet</p>
                          <p className="text-sm mt-2">Quotes submitted by vendors will appear here</p>
                        </div>
                      ) : (() => {
                        // Group quotes by product
                        const quotesByProduct = new Map<string, Quote[]>();
                        
                        quotes.forEach((quote) => {
                          const assignment = quote.vendorAssignmentId as any;
                          const enquiryProduct = assignment?.enquiryProductId as any;
                          const product = enquiryProduct?.productsheetitemid as any;
                          const productId = product?._id?.toString() || 'unknown';
                          const productName = product?.displayName || product?.externalRef || 'Unknown Product';
                          
                          if (!quotesByProduct.has(productId)) {
                            quotesByProduct.set(productId, []);
                          }
                          quotesByProduct.get(productId)!.push(quote);
                        });

                        const toggleProduct = (productId: string) => {
                          setExpandedProducts((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(productId)) {
                              newSet.delete(productId);
                            } else {
                              newSet.add(productId);
                            }
                            return newSet;
                          });
                        };

                        return (
                          <div className="space-y-3">
                            {Array.from(quotesByProduct.entries()).map(([productId, productQuotes]) => {
                              const firstQuote = productQuotes[0];
                              const assignment = firstQuote.vendorAssignmentId as any;
                              const enquiryProduct = assignment?.enquiryProductId as any;
                              const product = enquiryProduct?.productsheetitemid as any;
                              const productName = product?.displayName || product?.externalRef || 'Unknown Product';
                              const isExpanded = expandedProducts.has(productId);

                              return (
                                <div key={productId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                  {/* Accordion Header */}
                                  <button
                                    onClick={() => toggleProduct(productId)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                      >
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                      </svg>
                                      <h3 className="text-lg font-semibold text-gray-900">{productName}</h3>
                                      <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                                        {productQuotes.length} {productQuotes.length === 1 ? 'quote' : 'quotes'}
                                      </span>
                                    </div>
                                  </button>

                                  {/* Accordion Content */}
                                  {isExpanded && (
                                    <div className="border-t border-gray-200 p-4 space-y-4">
                                      {productQuotes.map((quote) => {
                                        const quoteAssignment = quote.vendorAssignmentId as any;
                                        const vendor = quoteAssignment?.vendorId as any;
                                        const quoteId = quote._id || '';
                                        const isSelected = selectedQuotes.has(quoteId);
                                        
                                        const handleQuoteSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
                                          e.stopPropagation();
                                          setSelectedQuotes((prev) => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(quoteId)) {
                                              newSet.delete(quoteId);
                                            } else {
                                              newSet.add(quoteId);
                                            }
                                            return newSet;
                                          });
                                        };
                                        
                                        return (
                                          <div key={quote._id} className={`bg-gray-50 border rounded-lg p-4 transition-colors ${isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
                                            <div className="flex items-start justify-between mb-3">
                                              <div className="flex items-center gap-3">
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={handleQuoteSelect}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                                                />
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                  quote.quoteStatus === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                                                  quote.quoteStatus === 'Accepted' ? 'bg-green-100 text-green-800' :
                                                  quote.quoteStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                  'bg-gray-100 text-gray-800'
                                                }`}>
                                                  {quote.quoteStatus}
                                                </span>
                                                <span className="text-sm font-medium text-gray-900">
                                                  {vendor?.auth?.name || 'Unknown Vendor'}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                              <div>
                                                <p className="text-gray-500">Unit Price</p>
                                                <p className="font-medium text-gray-900">{quote.unitPrice || 'N/A'}</p>
                                              </div>
                                              <div>
                                                <p className="text-gray-500">Delivery Date</p>
                                                <p className="font-medium text-gray-900">
                                                  {quote.deliveryDate ? new Date(quote.deliveryDate).toLocaleDateString() : 'N/A'}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-gray-500">Valid Till</p>
                                                <p className="font-medium text-gray-900">
                                                  {quote.validTill ? new Date(quote.validTill).toLocaleDateString() : 'N/A'}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-gray-500">Submitted</p>
                                                <p className="font-medium text-gray-900">
                                                  {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                              </div>
                                            </div>
                                            {quote.description && (
                                              <div className="mt-3">
                                                <p className="text-sm text-gray-500 mb-1">Description</p>
                                                <p className="text-sm text-gray-900">{quote.description}</p>
                    </div>
                  )}
                                            {quote.attachment && (
                                              <div className="mt-3">
                                                <a 
                                                  href={quote.attachment} 
                                                  target="_blank" 
                                                  rel="noopener noreferrer"
                                                  className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-2"
                                                >
                                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                                  </svg>
                                                  View Attachment
                                                </a>
                </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-80 space-y-4">
              {/* Buyer Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Buyer Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-400 mt-0.5"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Company Name</p>
                      <p className="font-medium text-gray-900">{getBuyerName()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-400 mt-0.5"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Client Type</p>
                      <p className="font-medium text-gray-900">Enterprise Client</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-400 mt-0.5"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{getBuyerEmail()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-400 mt-0.5"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{getBuyerPhone()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-400 mt-0.5"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-500">Created Date</p>
                      <p className="font-medium text-gray-900">Created {formatDate(enquiry.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {detailModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            <button
              onClick={closeDetailModal}
              className="absolute right-4 top-4 rounded-full border border-gray-200 bg-white p-1 text-gray-500 hover:text-gray-700 hover:shadow-sm"
            >
              <span className="sr-only">Close</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {(() => {
              const product =
                typeof detailModalProduct.productsheetitemid === 'object'
                  ? (detailModalProduct.productsheetitemid as ProductSheetItem)
                  : null;
              const attrs = (product?.userAttributes || {}) as Record<string, any>;

              const title = product?.displayName || product?.productSource || 'Product Details';
              const category = product?.category || attrs.category || 'Uncategorized';
              const description =
                attrs.description ||
                attrs.longDescription ||
                'No detailed description available for this product.';

              const usageTags: string[] =
                attrs.usageTags || attrs.usage || attrs.tags || [];

              const phase = attrs.phase || attrs.Phase;
              const voltage = attrs.voltage || attrs.Voltage;
              const ipRating = attrs.ipRating || attrs['IP Rating'];
              const insulation = attrs.insulation || attrs.Insulation;
              const efficiency = attrs.efficiency || attrs.Efficiency;

              const quantity = detailModalProduct.quantity || attrs.quantity;
              const targetPrice = detailModalProduct.targetUnitPrice || attrs.targetPrice;

              const deliveryDate =
                (enquiry && enquiry.expectedDeliveryDate && formatDate(enquiry.expectedDeliveryDate)) ||
                attrs.deliveryDate;

              const attributeEntries = Object.entries(attrs || {});

              const formatLabel = (key: string) => {
                return key
                  .replace(/[_-]+/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
              };

              return (
                <div className="max-h-[90vh] overflow-y-auto rounded-xl">
                  {/* Image */}
                  <div className="h-56 w-full overflow-hidden rounded-t-xl bg-gray-100">
                    {/* Placeholder image; replace with real image URL if available in attributes */}
                    <img
                      src={
                        (attrs.imageUrl as string) ||
                        'https://images.pexels.com/photos/4484078/pexels-photo-4484078.jpeg?auto=compress&cs=tinysrgb&w=1200'
                      }
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="space-y-6 p-6">
                    {/* Title & chips */}
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                          {category}
                        </span>
                        {product?._id && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">
                            {product._id}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h3 className="mb-1 text-sm font-semibold text-gray-900">Description</h3>
                      <p className="text-sm text-gray-700">{description}</p>
                    </div>

                    {/* Usage tags */}
                    {usageTags && usageTags.length > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-gray-900">Usage</h3>
                        <div className="flex flex-wrap gap-2">
                          {usageTags.map((tag, index) => (
                            <span
                              key={index}
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Specifications grid (key technical fields) */}
                    {(phase || voltage || ipRating || insulation || efficiency) && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Key Specifications</h3>
                        <div className="grid gap-3 md:grid-cols-2">
                          {(phase || voltage) && (
                            <div className="rounded-lg bg-gray-50 px-4 py-3">
                              <p className="text-xs text-gray-500">Phase</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {phase || '—'}
                              </p>
                            </div>
                          )}
                          {(phase || voltage) && (
                            <div className="rounded-lg bg-gray-50 px-4 py-3">
                              <p className="text-xs text-gray-500">Voltage</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {voltage || '—'}
                              </p>
                            </div>
                          )}
                          {(ipRating || insulation) && (
                            <div className="rounded-lg bg-gray-50 px-4 py-3">
                              <p className="text-xs text-gray-500">IP Rating</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {ipRating || '—'}
                              </p>
                            </div>
                          )}
                          {(ipRating || insulation) && (
                            <div className="rounded-lg bg-gray-50 px-4 py-3">
                              <p className="text-xs text-gray-500">Insulation</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {insulation || '—'}
                              </p>
                            </div>
                          )}
                          {efficiency && (
                            <div className="rounded-lg bg-gray-50 px-4 py-3 md:col-span-2 md:max-w-xs">
                              <p className="text-xs text-gray-500">Efficiency</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {efficiency}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* All attributes from userAttributes */}
                    {attributeEntries.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">All Attributes</h3>
                        <div className="grid gap-3 md:grid-cols-2">
                          {attributeEntries.map(([key, value]) => (
                            <div key={key} className="rounded-lg bg-gray-50 px-4 py-3">
                              <p className="text-xs text-gray-500">{formatLabel(key)}</p>

                              {Array.isArray(value) ? (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {value.map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-800 shadow-sm"
                                    >
                                      {String(item)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm font-medium text-gray-900 break-words">
                                  {typeof value === 'object' && value !== null
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity / price / delivery */}
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {quantity ? `${quantity}` : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">Target Price</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {targetPrice ? `₹${targetPrice}` : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 px-4 py-3">
                        <p className="text-xs text-gray-500">Delivery Date</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {deliveryDate || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add Vendors Modal */}
      {vendorModalProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Vendors to {getProductDisplayName(vendorModalProduct)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select vendors to add to this product
                </p>
              </div>
              <button
                onClick={closeVendorModal}
                className="rounded-full border border-gray-200 bg-white p-1 text-gray-500 hover:text-gray-700 hover:shadow-sm"
              >
                <span className="sr-only">Close</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Search bar temporarily disabled */}
            {/*
            <div className="border-b border-gray-100 px-6 py-3">
              <div className="flex items-center rounded-full border border-teal-500/60 bg-teal-50 px-3 py-2 text-sm text-gray-700">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mr-2 text-teal-500"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="20" y2="20" />
                </svg>
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="w-full border-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                />
              </div>
            </div>
            */}

            <div className="max-h-80 overflow-y-auto px-6 py-3 space-y-2">
              {filteredVendors.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">
                  No vendors found.
                </p>
              ) : (
                filteredVendors.map((vendor) => (
                  <label
                    key={vendor.id}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 hover:border-teal-200 hover:bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedVendorIds.has(vendor.id)}
                        onChange={() => toggleVendorSelection(vendor.id)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {vendor.name}
                        </p>
                        <p className="text-xs text-gray-500">{vendor.email}</p>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-3">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={closeVendorModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                disabled={selectedVendorIds.size === 0}
                onClick={() => {
                  if (!vendorModalProduct) return;
                  const productId = vendorModalProduct._id || '';
                  if (!productId) return;

                  const selected = vendors.filter((v) => selectedVendorIds.has(v.id));

                  setAssignedVendors((prev) => {
                    const updated = { ...prev, [productId]: selected };
                    if (typeof window !== 'undefined') {
                      try {
                        window.localStorage.setItem(
                          'assigned_vendors',
                          JSON.stringify(updated)
                        );
                      } catch (error) {
                        console.error('Failed to save assigned vendors to localStorage', error);
                      }
                    }
                    return updated;
                  });

                  closeVendorModal();
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review & Send RFQ Modal */}
      {isRfqModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review &amp; Send RFQ</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review items and vendors before sending • {formatEnquiryId(enquiry._id)}
                </p>
              </div>
              <button
                onClick={() => setIsRfqModalOpen(false)}
                className="rounded-full border border-gray-200 bg-white p-1 text-gray-500 hover:text-gray-700 hover:shadow-sm"
              >
                <span className="sr-only">Close</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[65vh] overflow-y-auto px-6 py-4 space-y-3">
              {enquiryProducts.map((ep) => {
                const productId = ep._id || '';
                const product =
                  typeof ep.productsheetitemid === 'object'
                    ? (ep.productsheetitemid as ProductSheetItem)
                    : null;
                const productName =
                  product?.displayName || product?.productSource || 'Unknown Product';
                const category = product?.category || 'Uncategorized';
                const quantity = ep.quantity || '—';
                const assigned = getAssignedVendorsForProduct(productId);

                return (
                  <div
                    key={productId}
                    className="rounded-xl border border-gray-200 bg-white"
                  >
                    {/* Product row */}
                    <div className="flex items-start justify-between px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                            <path d="M10 8h4v8h-4z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{productName}</p>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-700">
                              {category}
                            </span>
                            <span>{quantity} units</span>
                            <span className="text-gray-400">
                              • {assigned.length} vendor(s)
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500"
                        // Placeholder: removing item not implemented yet
                        onClick={() => {}}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>

                    {/* Assigned vendors list */}
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                      {assigned.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          No vendors assigned yet for this product.
                        </p>
                      ) : (
                        assigned.map((vendor) => (
                          <div
                            key={vendor.id}
                            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-gray-800"
                          >
                            <span>{vendor.name}</span>
                            <button
                              type="button"
                              className="text-gray-400 hover:text-red-500"
                              onClick={() => {
                                setAssignedVendors((prev) => {
                                  const current = prev[productId] || [];
                                  const updatedForProduct = current.filter(
                                    (v) => v.id !== vendor.id
                                  );
                                  const next: Record<string, Vendor[]> = { ...prev };
                                  if (updatedForProduct.length === 0) {
                                    delete next[productId];
                                  } else {
                                    next[productId] = updatedForProduct;
                                  }
                                  if (typeof window !== 'undefined') {
                                    try {
                                      window.localStorage.setItem(
                                        'assigned_vendors',
                                        JSON.stringify(next)
                                      );
                                    } catch (error) {
                                      console.error(
                                        'Failed to update assigned vendors in localStorage',
                                        error
                                      );
                                    }
                                  }
                                  return next;
                                });
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))
                      )}

                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => openVendorModal(ep)}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Vendor
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="border-t border-gray-100 px-6 py-3">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Total Items:</span>{' '}
                    {enquiryProducts.length}
                  </p>
                  <p>
                    <span className="font-medium">Total Vendor RFQs:</span>{' '}
                    {getTotalVendorRfqCount()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsRfqModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                    disabled={getTotalVendorRfqCount() === 0}
                    onClick={handleSendRfq}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send RFQ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}