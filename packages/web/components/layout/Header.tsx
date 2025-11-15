'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import MobileSidebar from './MobileSidebar';
import Image from 'next/image';

export default function Header() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Mobile menu + Logo */}
          <div className="flex items-center gap-4">
            <MobileSidebar />
            
            {/* Mobile logo */}
            <div className="flex items-center md:hidden">
              <div className="text-2xl mr-2"><Image src="/logo.png" width={80} height={80} className="object-cover" alt="Logo" /></div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Vedida Farms</h1>
              </div>
            </div>
          </div>

          {/* Right: User menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors relative">
              <span className="text-xl">🔔</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
                <svg
                  className="w-4 h-4 text-gray-400 hidden sm:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.name || 'Admin User'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {user?.email || user?.phoneNumber}
                      </p>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <span>🚪</span>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}