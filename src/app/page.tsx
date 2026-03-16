'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils/format';

interface DashboardStats {
  statusCounts: Record<string, number>;
  recentOrders: {
    _id: string;
    orderNumber: string;
    customer: { name: string };
    event: { eventDate: string };
    total: number;
    status: string;
  }[];
  totalRevenue: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders?stats=true')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  const counts = stats?.statusCounts || {};
  const totalOrders = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-500">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome to Nidhi Catering Management</p>
        </div>
        <Link href="/orders/new" className="btn-primary text-lg px-6 py-3">
          ➕ New Order
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Orders</h2>
          <Link href="/orders" className="text-saffron-500 hover:text-saffron-600 text-sm font-medium">
            View All →
          </Link>
        </div>

        {stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Order</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Event Date</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order._id} className="border-b border-gray-50 hover:bg-cream-50 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/orders/${order._id}`}
                        className="text-saffron-500 hover:text-saffron-600 font-semibold"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium">{order.customer.name}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(order.event.eventDate)}</td>
                    <td className="py-3 px-4 text-right font-semibold">{formatCurrency(order.total)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No orders yet. Create your first order to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
