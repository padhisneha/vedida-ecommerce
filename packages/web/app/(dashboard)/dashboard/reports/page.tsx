'use client';

import { useState, useEffect } from 'react';
import {
  getAllOrdersWithProducts,
  Order,
  OrderStatus,
  formatCurrency,
} from '@ecommerce/shared';
import { showToast } from '@/lib/toast';

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await getAllOrdersWithProducts(); // Changed to fetch with products
      setOrders(data);
      console.log('✅ Loaded orders with products for reports:', data.length);
    } catch (error) {
      console.error('Error loading orders:', error);
      showToast.error('Failed to load orders for reports');
    } finally {
      setLoading(false);
    }
  };

  const getOrdersInRange = () => {
    return orders.filter((order) => {
      const orderDate = order.createdAt.toDate();
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  };

  const calculateTotalRevenue = () => {
    return getOrdersInRange()
      .filter((order) => order.status === OrderStatus.DELIVERED)
      .reduce((sum, order) => sum + order.totalAmount, 0);
  };

  const calculateTotalTax = () => {
    const ordersInRange = getOrdersInRange().filter((order) => order.status === OrderStatus.DELIVERED);
    let totalCGST = 0;
    let totalSGST = 0;

    ordersInRange.forEach((order) => {
      order.items.forEach((item) => {
        if (item.product) {
          const itemSubtotal = item.product.priceExcludingTax * item.quantity;
          totalCGST += (itemSubtotal * item.product.taxCGST) / 100;
          totalSGST += (itemSubtotal * item.product.taxSGST) / 100;
        }
      });
    });

    return { totalCGST, totalSGST, total: totalCGST + totalSGST };
  };

  const getProductWiseSales = () => {
    const productMap = new Map<string, { 
      name: string; 
      quantity: number; 
      revenue: number;
      unit: string;
    }>();

    getOrdersInRange()
      .filter((order) => order.status === OrderStatus.DELIVERED)
      .forEach((order) => {
        order.items.forEach((item) => {
          if (item.product) {
            const productKey = item.productId;
            const productName = item.product.name;
            const existing = productMap.get(productKey) || { 
              name: productName, 
              quantity: 0, 
              revenue: 0,
              unit: item.product.unit,
            };
            
            productMap.set(productKey, {
              name: productName,
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + (item.price * item.quantity),
              unit: item.product.unit,
            });
          }
        });
      });

    return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
  };

  const getDailyRevenue = () => {
    const dailyMap = new Map<string, number>();

    getOrdersInRange()
      .filter((order) => order.status === OrderStatus.DELIVERED)
      .forEach((order) => {
        const date = order.createdAt.toDate().toLocaleDateString('en-IN');
        const existing = dailyMap.get(date) || 0;
        dailyMap.set(date, existing + order.totalAmount);
      });

    return Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">📈</div>
          <div className="text-lg text-gray-600">Loading reports...</div>
        </div>
      </div>
    );
  }

  const totalRevenue = calculateTotalRevenue();
  const taxData = calculateTotalTax();
  const productSales = getProductWiseSales();
  const dailyRevenue = getDailyRevenue();
  const ordersInRange = getOrdersInRange();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-2">Business insights and performance metrics</p>
      </div>

      {/* Date Range Selector */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <label className="label">Date Range</label>
            <div className="flex gap-3 items-center flex-wrap">
              <input
                type="date"
                className="input"
                value={dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                className="input"
                value={dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 7)),
                end: new Date(),
              })}
              className="btn-secondary text-sm"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 30)),
                end: new Date(),
              })}
              className="btn-secondary text-sm"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 90)),
                end: new Date(),
              })}
              className="btn-secondary text-sm"
            >
              Last 90 Days
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-sm font-medium text-green-800 mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-green-900">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-xs text-green-700 mt-2">
            {ordersInRange.filter(o => o.status === OrderStatus.DELIVERED).length} delivered orders
          </p>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-2">Total Orders</p>
          <p className="text-3xl font-bold text-blue-900">
            {ordersInRange.length}
          </p>
          <p className="text-xs text-blue-700 mt-2">
            Avg: {formatCurrency(ordersInRange.length > 0 ? totalRevenue / ordersInRange.filter(o => o.status === OrderStatus.DELIVERED).length : 0)} per order
          </p>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-sm font-medium text-purple-800 mb-2">Total Tax Collected</p>
          <p className="text-3xl font-bold text-purple-900">
            {formatCurrency(taxData.total)}
          </p>
          <p className="text-xs text-purple-700 mt-2">
            CGST: {formatCurrency(taxData.totalCGST)} | SGST: {formatCurrency(taxData.totalSGST)}
          </p>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <p className="text-sm font-medium text-orange-800 mb-2">Total Units Sold</p>
          <p className="text-3xl font-bold text-orange-900">
            {productSales.reduce((sum, p) => sum + p.quantity, 0)}
          </p>
          <p className="text-xs text-orange-700 mt-2">
            {productSales.length} different products
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales by Date */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📊 Daily Revenue (Last 7 Days)
          </h2>
          {dailyRevenue.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data available</p>
          ) : (
            <div className="space-y-2">
              {dailyRevenue.map((day) => (
                <div key={day.date} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{day.date}</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(day.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            🏆 Top Selling Products
          </h2>
          {productSales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data available</p>
          ) : (
            <div className="space-y-3">
              {productSales.slice(0, 5).map((product, index) => (
                <div key={product.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-600' :
                    'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      {product.quantity} {product.unit} sold
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product-wise Sales Report Table */}
      <div className="card mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          📊 Product-wise Sales Report
        </h2>
        {productSales.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sales data available for the selected period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Units Sold
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Revenue
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Price per Unit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productSales.map((product, index) => (
                  <tr key={product.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">{product.unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-semibold text-gray-900">
                        {product.quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-bold text-primary-600">
                        {formatCurrency(product.revenue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-gray-900">
                        {formatCurrency(product.revenue / product.quantity)}
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-primary-50 font-bold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm"></td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                    {productSales.reduce((sum, p) => sum + p.quantity, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-primary-700">
                    {formatCurrency(productSales.reduce((sum, p) => sum + p.revenue, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 This report shows sales data for delivered orders only within the selected date range.
          </p>
        </div>
      </div>

      {/* Tax Report */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          📋 Tax Report
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tax Component
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Percentage of Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">CGST</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  {formatCurrency(taxData.totalCGST)}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  {totalRevenue > 0 ? ((taxData.totalCGST / totalRevenue) * 100).toFixed(2) : 0}%
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm text-gray-900">SGST</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                  {formatCurrency(taxData.totalSGST)}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">
                  {totalRevenue > 0 ? ((taxData.totalSGST / totalRevenue) * 100).toFixed(2) : 0}%
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-6 py-4 text-sm font-bold text-gray-900">Total Tax</td>
                <td className="px-6 py-4 text-sm text-right font-bold text-primary-600">
                  {formatCurrency(taxData.total)}
                </td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-primary-600">
                  {totalRevenue > 0 ? ((taxData.total / totalRevenue) * 100).toFixed(2) : 0}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 This report shows tax collected on delivered orders within the selected date range.
          </p>
        </div>
      </div>
    </div>
  );
}