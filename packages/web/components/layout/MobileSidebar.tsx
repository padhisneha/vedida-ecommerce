'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Orders', href: '/dashboard/orders', icon: '📦' },
  { name: 'Subscriptions', href: '/dashboard/subscriptions', icon: '📅' },
  { name: 'Customers', href: '/dashboard/customers', icon: '👥' },
  { name: 'Delivery Partners', href: '/dashboard/delivery-partners', icon: '🚚' },
  { name: 'Inventory', href: '/dashboard/inventory', icon: '🏪' },
  { name: 'Reports', href: '/dashboard/reports', icon: '📈' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center">
              {/* <div className="text-2xl mr-2"><Image src="/logo.png" width="75" height="75" className="object-cover" alt="Logo" /></div> */}
              <div>
                <h1 className="text-lg font-bold text-gray-900">Vedida Farms</h1>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                    ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="text-xs text-gray-500 text-center">
              v1.0.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
