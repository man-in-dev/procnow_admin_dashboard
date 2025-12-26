/**
 * API utility functions for the admin dashboard
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ProductSheetItem {
  _id?: string;
  productSource: string;
  adminProductId?: string | null;
  externalRef?: string | null;
  displayName?: string | null;
  category?: string | null;
  userAttributes?: Record<string, any>;
}

export interface EnquiryProduct {
  _id?: string;
  enquiryId: string;
  productsheetitemid: string | ProductSheetItem;
  quantity?: string;
  targetUnitPrice?: string;
  status: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface User {
  _id?: string;
  auth?: {
    email?: string;
    name?: string;
    avatar?: string;
  };
  role?: string;
}

export interface Enquiry {
  _id?: string;
  userId: string | User; // Can be string ID or populated user object
  enquiryName: string;
  shippingAddress: Address;
  billingAddress: Address;
  expectedDeliveryDate: string | Date;
  enquiryStatus: string;
  enquiryNotes?: string;
  attachment?: string;
  enquiryProducts?: EnquiryProduct[]; // Array of EnquiryProduct documents
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
}

export interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
  detail?: any;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface VendorAssignmentPayloadItem {
  enquiryProductId: string;
  vendorIds: string[];
}

export interface SendRfqPayload {
  assignments: VendorAssignmentPayloadItem[];
}

/**
 * Get authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Save authentication token to localStorage
 */
export function saveAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
}

/**
 * Remove authentication token from localStorage
 */
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
}

/**
 * Log in a user and get JWT token
 * Calls: POST /api/auth/login
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseData: ApiSuccessResponse<LoginResponse> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Login failed');
  }

  return (responseData as ApiSuccessResponse<LoginResponse>).data;
}

/**
 * Get the currently authenticated user using the stored JWT token
 * Calls: GET /api/auth/me
 */
export async function getCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<AuthUser> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Not authenticated');
  }

  return (responseData as ApiSuccessResponse<AuthUser>).data;
}

/**
 * Get all enquiries (admin endpoint)
 * Calls: GET /api/admin/enquiries
 */
export async function getEnquiries(token: string): Promise<Enquiry[]> {
  const response = await fetch(`${API_URL}/api/admin/enquiries`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ enquiries: Enquiry[] }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get enquiries');
  }

  return (responseData as ApiSuccessResponse<{ enquiries: Enquiry[] }>).data.enquiries;
}

/**
 * Get a single enquiry by ID (admin endpoint)
 * Calls: GET /api/admin/enquiries/:enquiryId
 */
export async function getEnquiryById(token: string, enquiryId: string): Promise<Enquiry> {
  const response = await fetch(`${API_URL}/api/admin/enquiries/${enquiryId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ enquiry: Enquiry }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get enquiry');
  }

  return (responseData as ApiSuccessResponse<{ enquiry: Enquiry }>).data.enquiry;
}

/**
 * Get all vendors (admin endpoint)
 * Calls: GET /api/admin/vendors
 */
export async function getVendors(token: string): Promise<Vendor[]> {
  const response = await fetch(`${API_URL}/api/admin/vendors`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ vendors: Vendor[] }> | ApiErrorResponse =
    await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get vendors');
  }

  return (responseData as ApiSuccessResponse<{ vendors: Vendor[] }>).data.vendors;
}

/**
 * Send RFQ / create vendor assignments for an enquiry (admin endpoint)
 * Calls: POST /api/admin/enquiries/:enquiryId/send-rfq
 */
export async function sendEnquiryRfq(
  token: string,
  enquiryId: string,
  payload: SendRfqPayload
): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/enquiries/${enquiryId}/send-rfq`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData: ApiSuccessResponse<{ enquiryId: string; totalAssignments: number }> |
    ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to send RFQ');
  }
}

// Quote Types
export interface Quote {
  _id?: string;
  vendorAssignmentId: any;
  unitPrice?: string;
  deliveryDate?: string | Date;
  validTill?: string | Date;
  description?: string;
  attachment?: string;
  visibletoClient: boolean;
  quoteStatus: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Get all quotes for an enquiry (admin endpoint)
 * Calls: GET /api/admin/enquiries/:enquiryId/quotes
 */
export async function getEnquiryQuotes(token: string, enquiryId: string): Promise<Quote[]> {
  const response = await fetch(`${API_URL}/api/admin/enquiries/${enquiryId}/quotes`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const responseData: ApiSuccessResponse<{ quotes: Quote[] }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to get quotes');
  }

  return (responseData as ApiSuccessResponse<{ quotes: Quote[] }>).data.quotes;
}

/**
 * Send selected quotes to buyer (admin endpoint)
 * Calls: POST /api/admin/enquiries/:enquiryId/quotes/send-to-buyer
 */
export async function sendQuotesToBuyer(
  token: string,
  enquiryId: string,
  quoteIds: string[]
): Promise<{ count: number }> {
  const response = await fetch(`${API_URL}/api/admin/enquiries/${enquiryId}/quotes/send-to-buyer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quoteIds }),
  });

  const responseData: ApiSuccessResponse<{ count: number }> | ApiErrorResponse = await response.json();

  if (!response.ok || !responseData.success) {
    const errorResponse = responseData as ApiErrorResponse;
    throw new Error(errorResponse.message || errorResponse.error || 'Failed to send quotes to buyer');
  }

  return (responseData as ApiSuccessResponse<{ count: number }>).data;
}

