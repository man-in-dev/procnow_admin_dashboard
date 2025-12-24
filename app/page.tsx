'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { getAuthToken, getCurrentUser } from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

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

        setIsLoading(false);
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  // Mock data - in real app, this would come from API
  const stats = {
    openEnquiries: 24,
    openEnquiriesChange: 12,
    pendingRFQs: 18,
    pendingRFQsChange: -5,
    vendorResponses: 42,
    vendorResponsesChange: 23,
    conversions: 68,
    conversionsChange: 8,
  };

  const recentEnquiries = [
    {
      company: 'Acme Corporation',
      items: 5,
      value: 45000,
      status: 'New',
      statusColor: 'bg-blue-100 text-blue-800',
      time: 'Today',
    },
    {
      company: 'Global Tech Ltd',
      items: 8,
      value: 128500,
      status: 'RFQ Sent',
      statusColor: 'bg-yellow-100 text-yellow-800',
      time: 'Yesterday',
    },
    {
      company: 'Sunrise Industries',
      items: 3,
      value: 22800,
      status: 'Quotes In',
      statusColor: 'bg-green-100 text-green-800',
      time: '2 days ago',
    },
    {
      company: 'Pacific Traders',
      items: 12,
      value: 89200,
      status: 'Pending Approval',
      statusColor: 'bg-orange-100 text-orange-800',
      time: '3 days ago',
    },
  ];

  const actionItems = [
    {
      title: '3 RFQs expiring today',
      description: 'Vendor responses pending for ENQ-2024-001',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      color: 'bg-red-50 border-red-200 text-red-800',
      time: '2h ago',
    },
    {
      title: 'Quote comparison needed',
      description: 'ENQ-2024-005 has all vendor quotes received',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      ),
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      time: '4h ago',
    },
    {
      title: 'New enquiry received',
      description: 'Global Tech Ltd submitted 8 item enquiry',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      ),
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      time: '5h ago',
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome back, John. Here&apos;s what&apos;s happening.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Open Enquiries */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                  ↑ {stats.openEnquiriesChange}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.openEnquiries}</h3>
              <p className="text-sm text-gray-500">Open Enquiries</p>
              <p className="text-xs text-gray-400 mt-1">↑ {stats.openEnquiriesChange}% from last month</p>
            </div>

            {/* Pending RFQs */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </div>
                <span className="text-sm font-medium text-red-600 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                    <polyline points="17 18 23 18 23 12"></polyline>
                  </svg>
                  ↓ {Math.abs(stats.pendingRFQsChange)}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.pendingRFQs}</h3>
              <p className="text-sm text-gray-500">Pending RFQs</p>
              <p className="text-xs text-gray-400 mt-1">↓ {Math.abs(stats.pendingRFQsChange)}% from last month</p>
            </div>

            {/* Vendor Responses */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                  ↑ {stats.vendorResponsesChange}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.vendorResponses}</h3>
              <p className="text-sm text-gray-500">Vendor Responses</p>
              <p className="text-xs text-gray-400 mt-1">↑ {stats.vendorResponsesChange}% from last month</p>
            </div>

            {/* Conversions */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                  ↑ {stats.conversionsChange}%
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.conversions}%</h3>
              <p className="text-sm text-gray-500">Conversions</p>
              <p className="text-xs text-gray-400 mt-1">↑ {stats.conversionsChange}% from last month</p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Enquiries */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Enquiries</h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View all →
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentEnquiries.map((enquiry, index) => (
                    <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{enquiry.company}</h3>
                        <p className="text-sm text-gray-500">
                          {enquiry.items} items • ${enquiry.value.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${enquiry.statusColor}`}>
                          {enquiry.status}
                        </span>
                        <span className="text-xs text-gray-400">{enquiry.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Required */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Action Required</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {actionItems.map((item, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${item.color}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{item.icon}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{item.title}</h3>
                          <p className="text-sm opacity-90">{item.description}</p>
                          <p className="text-xs mt-2 opacity-75">{item.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

