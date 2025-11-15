'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Admin'}! 
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your business today
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
              <p className="text-xs text-green-600 mt-2">↑ 3 from yesterday</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">45</p>
              <p className="text-xs text-green-600 mt-2">↑ 5 new this week</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">234</p>
              <p className="text-xs text-blue-600 mt-2">12 new this month</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₹12,450</p>
              <p className="text-xs text-green-600 mt-2">↑ 8% from avg</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
      </div>

      {/* Today's Delivery Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📋 Today's Delivery Summary
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥛</span>
                <span className="font-medium text-gray-900">Fresh Milk</span>
              </div>
              <span className="text-lg font-bold text-primary-600">45 L</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥣</span>
                <span className="font-medium text-gray-900">Thick Curd</span>
              </div>
              <span className="text-lg font-bold text-primary-600">30 kg</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧈</span>
                <span className="font-medium text-gray-900">Fresh Ghee</span>
              </div>
              <span className="text-lg font-bold text-primary-600">12 kg</span>
            </div>
          </div>
          <button className="btn-primary w-full mt-4">
            📦 Generate Subscription Orders
          </button>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🕒 Recent Activity
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  New order #ORD-2024-00145
                </p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  New subscription created
                </p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Low stock alert: Fresh Milk
                </p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Order #ORD-2024-00142 delivered
                </p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="font-semibold text-gray-900 mb-2">New Orders</h3>
            <p className="text-sm text-gray-600 mb-4">
              View and manage new orders
            </p>
            <div className="text-2xl font-bold text-primary-600">8</div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-3">🚚</div>
            <h3 className="font-semibold text-gray-900 mb-2">Out for Delivery</h3>
            <p className="text-sm text-gray-600 mb-4">
              Track ongoing deliveries
            </p>
            <div className="text-2xl font-bold text-blue-600">15</div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Low Stock Items</h3>
            <p className="text-sm text-gray-600 mb-4">
              Items needing restock
            </p>
            <div className="text-2xl font-bold text-red-600">3</div>
          </div>
        </div>
      </div>
    </div>
  );
}