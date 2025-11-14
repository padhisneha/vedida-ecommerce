'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && !isAdmin) {
      alert('Access denied. Admin privileges required.');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🥛</div>
          <div className="text-lg text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar - NOW INCLUDED */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header - NOW INCLUDED */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
