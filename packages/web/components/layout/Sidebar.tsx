'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-screen bg-white border-r border-gray-200">
          {/* Logo */}
          <div align="center"><Image src="/logo.png" width="120" height="120" className="object-cover" alt="Logo" /></div>
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-200">
            {/* <div className="text-2xl mr-2"><Image src="/logo.png" width="80" height="80" className="object-cover" alt="Logo" /> </div> */}
            <div>
              <h1 className="text-lg font-bold text-gray-900">Vedida Farms</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto">
            <nav className="px-3 py-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
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
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="text-xs text-gray-500 text-center">
              v1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}