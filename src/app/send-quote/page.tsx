'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils/format';

interface OrderListItem {
  _id: string;
  orderNumber: string;
  customer: { name: string; email: string; phone: string };
  event: { eventDate: string; eventType?: string; deliveryType: string; guestCount?: number };
  total: number;
  status: string;
  lineItems: { menuItemName: string }[];
  createdAt: string;
}

export default function SendQuotePage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    // Focus this view on draft orders which typically still need a quote email
    params.set('status', 'draft');
    if (search) params.set('search', search);

    try {
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders for send-quote:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-500 flex items-center gap-2">
            ✉️ Send Quote
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Draft orders waiting for a formal quote email.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by order number, customer name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Orders needing quote */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading draft orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">✅</p>
            <p>No draft orders currently need a quote email.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Order
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Event
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-gray-50 hover:bg-cream-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="text-saffron-500 font-semibold">{order.orderNumber}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatDate(order.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{order.customer.name}</div>
                      <div className="text-xs text-gray-400">{order.customer.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{formatDate(order.event.eventDate)}</div>
                      <div className="text-xs text-gray-400">
                        {order.event.eventType || 'Event'}
                        {order.event.guestCount
                          ? ` · ${order.event.guestCount} guests`
                          : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/orders/${order._id}`}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        Send Quote →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

