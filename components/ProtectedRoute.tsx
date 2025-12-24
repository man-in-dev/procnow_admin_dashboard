'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken, getCurrentUser } from '@/lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Don't protect login page
      if (pathname === '/login') {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/login');
          return;
        }

        const user = await getCurrentUser(token);
        if (user.role !== 'admin') {
          // Not an admin, redirect to login
          router.push('/login');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        // Token invalid or error fetching user
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

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

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

