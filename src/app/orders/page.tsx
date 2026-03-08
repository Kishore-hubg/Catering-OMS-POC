'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, formatDate, getStatusColor, cn } from '@/lib/utils/format';
import type { OrderStatus } from '@/types';

interface OrderListItem {
  _id: string;
  orderNumber: string;
  customer: { name: string; email: string; phone: string };
  event: { eventDate: string; eventType?: string; deliveryType: string; guestCount?: number };
  total: number;
  status: string;
  lineItems: { menuItemName: string; menuType?: string }[];
  changeHistory?: { field: string; changedAt: string }[];
  updatedAt?: string;
  createdAt: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'quoted', label: 'Quote Sent' },
  { value: 'confirmed', label: 'Approved' },
  { value: 'completed', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    quoted: 'Quote Sent',
    confirmed: 'Approved',
    completed: 'Paid',
    cancelled: 'Cancelled',
  };
  return map[status] ?? status;
}

/** Escape CSV cell */
function csvEscape(s: string): string {
  const str = String(s ?? '');
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildOrdersCSV(orders: OrderListItem[]): string {
  const headers = [
    'Order #',
    'Customer',
    'Email',
    'Event Date',
    'Event Type',
    'Delivery',
    'Guests',
    'Total',
    'Status',
    'Revisions',
    'Last Updated',
  ].join(',');
  const rows = orders.map((o) => {
    const delivery =
      o.event.deliveryType === 'delivery'
        ? 'Delivery'
        : o.event.deliveryType === 'live'
        ? 'Live Catering'
        : 'Pickup';
    return [
      csvEscape(o.orderNumber),
      csvEscape(o.customer.name),
      csvEscape(o.customer.email),
      o.event.eventDate ? formatDate(o.event.eventDate) : '',
      csvEscape(o.event.eventType ?? ''),
      delivery,
      o.event.guestCount ?? '',
      o.total.toFixed(2),
      getStatusLabel(o.status),
      (o.changeHistory?.length ?? 0).toString(),
      o.updatedAt ? formatDate(o.updatedAt) : formatDate(o.createdAt),
    ].join(',');
  });
  return ['Nidhi Catering — Order History', '', headers, ...rows].join('\r\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [eventType, setEventType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stats, setStats] = useState<{
    totalOrders: number;
    confirmed: number;
    awaitingApproval: number;
    revised: number;
  } | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (eventType) params.set('eventType', eventType);
    if (fromDate) params.set('startDate', fromDate);
    if (toDate) params.set('endDate', toDate);
    params.set('page', pagination.page.toString());

    try {
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data.orders ?? []);
        setPagination((prev) => ({ ...prev, ...data.data.pagination }));
        if (data.data.stats) {
          setStats({
            totalOrders: data.data.stats.totalOrders,
            confirmed: data.data.stats.confirmed,
            awaitingApproval: data.data.stats.awaitingApproval,
            revised: data.data.stats.revised,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [status, search, eventType, fromDate, toDate, pagination.page]);
  const clearFilters = () => {
    setStatus('');
    setSearch('');
    setEventType('');
    setFromDate('');
    setToDate('');
    setPagination((p) => ({ ...p, page: 1 }));
  };

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const revisionCount = (o: OrderListItem) => o.changeHistory?.length ?? 0;
  const itemTags = (o: OrderListItem) => {
    const types = new Set<string>();
    o.lineItems.forEach((item) => {
      const t = item.menuType ?? '';
      if (t === 'Veg Menu') types.add('Veg');
      else if (t === 'Non-Veg Menu') types.add('Non-Veg');
      else if (t === 'Desserts') types.add('Dessert');
      else if (t === 'Puja Food') types.add('Puja');
    });
    return Array.from(types);
  };
  const deliveryLabel = (dt: string) =>
    dt === 'delivery' ? 'Delivery' : dt === 'live' ? 'Live Catering' : 'Pickup';

  return (
    <div>
      {/* Page header: Order History + subtitle, Export CSV (outline) + New Order (primary) */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-500">Order History</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search, review, and update past orders. Click any row to expand details and change log.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const csv = buildOrdersCSV(orders);
              downloadCSV(csv, `Nidhi-Catering-Orders-${new Date().toISOString().slice(0, 10)}.csv`);
            }}
            disabled={loading || orders.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-saffron-500 text-saffron-600 bg-white font-semibold text-sm hover:bg-saffron-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⬇ Export CSV
          </button>
          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-saffron-500 text-white font-semibold text-sm hover:bg-saffron-600"
          >
            ＋ New Order
          </Link>
        </div>
      </div>

      {/* Summary cards: TOTAL ORDERS, APPROVED/CONFIRMED, AWAITING APPROVAL, REVISED ORDERS */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-saffron-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">TOTAL ORDERS</p>
            <p className="text-2xl font-black text-navy-500">{stats.totalOrders}</p>
            <p className="text-xs text-gray-500 mt-0.5">All time</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-emerald-600">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">APPROVED / CONFIRMED</p>
            <p className="text-2xl font-black text-navy-500">{stats.confirmed}</p>
            <p className="text-xs text-gray-500 mt-0.5">This year</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-amber-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">AWAITING APPROVAL</p>
            <p className="text-2xl font-black text-navy-500">{stats.awaitingApproval}</p>
            <p className="text-xs text-gray-500 mt-0.5">Quote sent</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-navy-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">REVISED ORDERS</p>
            <p className="text-2xl font-black text-navy-500">{stats.revised}</p>
            <p className="text-xs text-gray-500 mt-0.5">Modified after send</p>
          </div>
        </div>
      )}

      {/* Search & filter bar: SEARCH, STATUS, EVENT TYPE, FROM DATE, TO DATE, Clear */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">SEARCH</label>
          <input
            type="text"
            placeholder="Customer name, order #, event type..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-saffron-400 focus:border-saffron-500"
          />
        </div>
        <div className="w-40">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">STATUS</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-saffron-400"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">EVENT TYPE</label>
          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-saffron-400"
          >
            <option value="">All Types</option>
            <option value="Wedding">Wedding</option>
            <option value="Birthday">Birthday</option>
            <option value="Corporate">Corporate</option>
            <option value="Puja">Puja</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">FROM DATE</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40 focus:ring-2 focus:ring-saffron-400"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">TO DATE</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40 focus:ring-2 focus:ring-saffron-400"
          />
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          ✕ Clear
        </button>
      </div>

      {/* Orders table: navy header, ORDER #, CUSTOMER, EVENT DATE, EVENT TYPE, ITEMS, DELIVERY, TOTAL, STATUS, REVISIONS, LAST UPDATED, ACTIONS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No orders found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-500 text-white">
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">ORDER #</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">CUSTOMER</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">EVENT DATE</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">EVENT TYPE</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">ITEMS</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">DELIVERY</th>
                    <th className="text-right py-3 px-4 text-[10px] font-bold uppercase tracking-wider">TOTAL</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">STATUS</th>
                    <th className="text-center py-3 px-4 text-[10px] font-bold uppercase tracking-wider">REVISIONS</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">LAST UPDATED</th>
                    <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr
                      key={order._id}
                      className={cn(
                        'border-b border-gray-100 hover:bg-amber-50/50 transition-colors',
                        idx % 2 === 1 && 'bg-gray-50/50'
                      )}
                    >
                      <td className="py-3 px-4">
                        <Link href={`/orders/${order._id}`} className="font-bold text-navy-600 hover:text-saffron-600">
                          #{order.orderNumber}
                        </Link>
                        {revisionCount(order) > 0 && (
                          <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Rev {revisionCount(order)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-navy-700">{order.customer.name}</div>
                        <div className="text-xs text-gray-500">{order.customer.email}</div>
                        {order.event.guestCount != null && (
                          <div className="text-xs text-gray-500 mt-0.5">👥 {order.event.guestCount} guests</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {order.event.eventDate ? formatDate(order.event.eventDate) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{order.event.eventType || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {itemTags(order).map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                'text-[9px] font-bold px-1.5 py-0.5 rounded',
                                tag === 'Veg' && 'bg-emerald-100 text-emerald-800',
                                tag === 'Non-Veg' && 'bg-red-100 text-red-700',
                                tag === 'Dessert' && 'bg-gray-200 text-gray-700',
                                tag === 'Puja' && 'bg-sky-100 text-sky-700'
                              )}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-700">
                          {order.event.deliveryType === 'delivery' && '🚚 '}
                          {order.event.deliveryType === 'pickup' && '🏠 '}
                          {order.event.deliveryType === 'live' && '🎤 '}
                          {deliveryLabel(order.event.deliveryType)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-navy-700">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn('inline-flex px-2 py-1 rounded-full text-xs font-bold', getStatusColor(order.status))}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700">{revisionCount(order)}</td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {order.updatedAt ? formatDate(order.updatedAt) : formatDate(order.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/orders/${order._id}`}
                            className="p-1.5 rounded text-saffron-600 hover:bg-saffron-100"
                            title="Edit"
                          >
                            ✏️
                          </Link>
                          <Link
                            href={`/orders/${order._id}`}
                            className="p-1.5 rounded bg-navy-500 text-white hover:bg-navy-600"
                            title="View / Quote"
                          >
                            📄
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination - always show when there are orders */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50/50">
              <p className="text-sm text-gray-600">
                Showing{' '}
                {pagination.total === 0
                  ? '0'
                  : `${(pagination.page - 1) * (pagination.limit || 20) + 1}-${Math.min(pagination.page * (pagination.limit || 20), pagination.total)}`}{' '}
                of {pagination.total} orders
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {(() => {
                  const { page, pages } = pagination;
                  const showPages: (number | 'ellipsis')[] = [];
                  if (pages <= 5) {
                    for (let i = 1; i <= pages; i++) showPages.push(i);
                  } else {
                    showPages.push(1);
                    const left = page <= 3 ? 2 : page - 1;
                    const right = page >= pages - 2 ? pages - 1 : page + 1;
                    if (left > 2) showPages.push('ellipsis');
                    for (let i = left; i <= right; i++) {
                      if (i !== 1 && i !== pages) showPages.push(i);
                    }
                    if (right < pages - 1) showPages.push('ellipsis');
                    if (pages > 1) showPages.push(pages);
                  }
                  return showPages.map((p, i) =>
                    p === 'ellipsis' ? (
                      <span key={`e-${i}`} className="flex items-center justify-center w-9 h-9 text-gray-400 text-sm">
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPagination((prev) => ({ ...prev, page: p }))}
                        className={cn(
                          'flex items-center justify-center min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-semibold transition-colors',
                          page === p
                            ? 'bg-saffron-500 text-white border border-saffron-500'
                            : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        )}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
