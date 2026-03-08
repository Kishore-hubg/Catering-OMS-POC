'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getMenuTypeColor,
  getMenuTypeIcon,
} from '@/lib/utils/format';
import type { Order, OrderStatus } from '@/types';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const sendQuoteOpenedRef = useRef(false);

  // Email modal state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      const data = await res.json();
      if (data.success) setOrder(data.data);
      else toast.error('Order not found');
    } catch {
      toast.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Auto-open Send Quote modal when redirected with ?sendQuote=1 (e.g. after "Generate Quote & Email")
  useEffect(() => {
    if (loading || !order || sendQuoteOpenedRef.current) return;
    if (searchParams.get('sendQuote') === '1') {
      sendQuoteOpenedRef.current = true;
      handleComposeEmail();
      router.replace(`/orders/${params.id}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when order loads with sendQuote=1
  }, [loading, order, searchParams, params.id, router]);

  const handleStatusChange = async (status: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, changeReason: `Status changed to ${status}` }),
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
        toast.success(`Order ${status}`);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this order? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/orders/${params.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Order deleted');
        router.push('/orders');
      }
    } catch {
      toast.error('Failed to delete order');
    }
  };

  const openQuote = () => {
    window.open(`/api/quotes?orderId=${params.id}`, '_blank');
  };

  const handleComposeEmail = async () => {
    setEmailLoading(true);
    setEmailModalOpen(true);
    setChannel('email');
    setWhatsAppNumber(order?.customer.phone || '');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compose', orderId: params.id }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailSubject(data.data.subject);
        setEmailBody(data.data.body);
      }
    } catch {
      toast.error('Failed to compose email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!order) return;
    setEmailLoading(true);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          orderId: params.id,
          to: order.customer.email,
          subject: emailSubject,
          body: emailBody,
          attachQuote: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Quote email sent!');
        setEmailModalOpen(false);
        fetchOrder(); // Refresh to show updated status
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch {
      toast.error('Failed to send email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!order) return;
    if (!whatsAppNumber.trim()) {
      toast.error('Please enter a WhatsApp number');
      return;
    }
    setEmailLoading(true);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: params.id,
          to: whatsAppNumber.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('WhatsApp quote sent!');
        setEmailModalOpen(false);
        fetchOrder();
      } else {
        toast.error(data.error || 'Failed to send WhatsApp message');
      }
    } catch {
      toast.error('Failed to send WhatsApp message');
    } finally {
      setEmailLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading order...</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-400">Order not found</p>
        <Link href="/orders" className="text-saffron-500 mt-2 inline-block">← Back to Orders</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/orders" className="text-sm text-gray-400 hover:text-navy-500 mb-1 block">← Back to Orders</Link>
          <h1 className="text-3xl font-bold text-navy-500 flex items-center gap-3">
            {order.orderNumber}
            <span className={`badge text-sm ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </h1>
          <p className="text-gray-500 mt-1">Created {formatDate(order.createdAt)}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={openQuote} className="btn-outline">📄 View Quote</button>
          <button onClick={handleComposeEmail} className="btn-primary">📧 Send Quote</button>
          {order.status === 'draft' && (
            <button onClick={() => handleStatusChange('confirmed')} className="btn-secondary">
              ✓ Confirm
            </button>
          )}
          {order.status === 'confirmed' && (
            <button onClick={() => handleStatusChange('completed')} className="btn-secondary">
              ✓ Complete
            </button>
          )}
          <button onClick={handleDelete} className="btn-danger">🗑️</button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column - Order details */}
        <div className="col-span-2 space-y-6">
          {/* Customer & Event */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Customer</h3>
              <p className="text-lg font-semibold">{order.customer.name}</p>
              <p className="text-sm text-gray-500">{order.customer.email}</p>
              <p className="text-sm text-gray-500">{order.customer.phone}</p>
              {order.customer.address && <p className="text-sm text-gray-500 mt-1">{order.customer.address}</p>}
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Event</h3>
              <p className="text-lg font-semibold">{formatDate(order.event.eventDate)}</p>
              {order.event.eventTime && <p className="text-sm text-gray-500">Time: {order.event.eventTime}</p>}
              {order.event.eventType && <p className="text-sm text-gray-500">Type: {order.event.eventType}</p>}
              {order.event.guestCount && <p className="text-sm text-gray-500">Guests: {order.event.guestCount}</p>}
              <p className="text-sm mt-1">
                {order.event.deliveryType === 'delivery'
                  ? '🚚 Delivery'
                  : order.event.deliveryType === 'pickup'
                  ? '🏠 Pickup'
                  : '🍳 Live Catering (On-site)'}
              </p>
              {order.event.deliveryAddress && (
                <p className="text-sm text-gray-500 mt-1">{order.event.deliveryAddress}</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Order Items ({order.lineItems.length})
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2.5 text-gray-400">{i + 1}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getMenuTypeColor(item.menuType)}`}>
                          {getMenuTypeIcon(item.menuType)}
                        </span>
                        <div>
                          <span className="font-medium">{item.menuItemName}</span>
                          <span className="text-xs text-gray-400 ml-2">{item.category}</span>
                        </div>
                      </div>
                      {item.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{item.notes}</p>}
                    </td>
                    <td className="py-2.5 text-gray-500">{item.sizeOption}</td>
                    <td className="py-2.5 text-center">{item.quantity} {item.unit}</td>
                    <td className="py-2.5 text-right">{item.isQuoteBased ? 'TBD' : formatCurrency(item.unitPrice)}</td>
                    <td className="py-2.5 text-right font-medium">{item.isQuoteBased ? 'Quote' : formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Change History */}
          {order.changeHistory.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Change History</h3>
              <div className="space-y-2">
                {order.changeHistory.map((change, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-500 py-1 border-b border-gray-50">
                    <span className="text-xs text-gray-400">{formatDate(change.changedAt)}</span>
                    <span className="font-medium text-navy-500">{change.field}</span>
                    <span>→ {String(change.newValue)}</span>
                    {change.reason && <span className="text-xs italic">({change.reason})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Pricing */}
        <div className="space-y-4">
          <div className="card bg-navy-500 text-white sticky top-8">
            <h3 className="text-saffron-400 font-semibold text-sm uppercase mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-navy-200">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-red-300">
                  <span>Discount {order.discountType === 'percent' ? `(${order.discount}%)` : ''}</span>
                  <span>-{formatCurrency(
                    order.discountType === 'percent'
                      ? order.subtotal * (order.discount / 100)
                      : order.discount
                  )}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-navy-200">Tax ({order.taxRate}%)</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy-200">Delivery Fee</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              <div className="border-t border-navy-400 pt-3 flex justify-between text-xl font-bold text-saffron-400">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
              {order.advancePayment > 0 && (
                <>
                  <div className="flex justify-between text-green-300">
                    <span>Advance Paid</span>
                    <span>-{formatCurrency(order.advancePayment)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold bg-navy-600 -mx-6 px-6 py-3 rounded-b-xl mt-4">
                    <span>Balance Due</span>
                    <span>{formatCurrency(order.balanceDue)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          {order.adminNotes && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Admin Notes</h3>
              <p className="text-sm text-gray-600">{order.adminNotes}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Actions</h3>
            <div className="space-y-2">
              <button onClick={openQuote} className="w-full btn-outline text-sm">📄 View / Print Quote</button>
              <button onClick={handleComposeEmail} className="w-full btn-outline text-sm">📧 Send Quote Email</button>
              {order.status !== 'cancelled' && (
                <button
                  onClick={() => handleStatusChange('cancelled')}
                  className="w-full text-sm text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                >
                  ✕ Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-navy-500 flex items-center gap-2">
                  ✉️ Compose & Send Quote
                </h2>
                <p className="text-xs text-gray-500">
                  Order {order.orderNumber} · {order.customer.name}
                </p>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Two-column layout: left compose, right invoice preview */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left: compose */}
              <div className="w-1/2 border-r px-6 py-4 overflow-y-auto">
                {/* Channel selector */}
                <div className="mb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Send Via
                  </p>
                  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => setChannel('email')}
                      className={`px-3 py-1.5 flex-1 ${
                        channel === 'email'
                          ? 'bg-saffron-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      ✉️ Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('whatsapp')}
                      className={`px-3 py-1.5 flex-1 ${
                        channel === 'whatsapp'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      💬 WhatsApp
                    </button>
                  </div>
                </div>

                {channel === 'whatsapp' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="label text-xs uppercase text-gray-500">
                        WhatsApp Number
                      </label>
                      <input
                        className="input-field"
                        value={whatsAppNumber}
                        onChange={(e) => setWhatsAppNumber(e.target.value)}
                        placeholder={order.customer.phone || '+1 (___) ___-____'}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      A short message with a secure link to the quote PDF will be sent via WhatsApp.
                    </p>
                  </div>
                ) : emailLoading && !emailSubject ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-2xl mb-2">🤖</p>
                    <p>AI is composing your email...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="label text-xs uppercase text-gray-500">
                        From
                      </label>
                      <input
                        className="input-field bg-gray-50 text-xs"
                        value={
                          process.env.NEXT_PUBLIC_EMAIL_FROM ||
                          'Nidhi Catering <orders@nidhicatering.com>'
                        }
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="label text-xs uppercase text-gray-500">
                        To
                      </label>
                      <input
                        className="input-field bg-gray-50"
                        value={order.customer.email}
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="label text-xs uppercase text-gray-500">
                        Subject
                      </label>
                      <input
                        className="input-field"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="label text-xs uppercase text-gray-500">
                        Message Body
                      </label>
                      <textarea
                        className="input-field text-sm leading-relaxed"
                        rows={10}
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        {emailBody.length} characters
                      </p>
                    </div>

                    <div className="mt-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">
                        📎 Attachment
                      </p>
                      <p className="text-xs text-gray-600">
                        Quote PDF will be attached automatically when the email is sent.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: invoice preview (HTML quote) */}
              <div className="w-1/2 bg-gray-50 px-4 py-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase">
                    Invoice Preview — Quote PDF
                  </span>
                  <button
                    type="button"
                    onClick={openQuote}
                    className="btn-ghost text-xs"
                  >
                    🖨 Open Full Quote
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[380px]">
                  <iframe
                    title="Quote preview"
                    src={`/api/quotes?orderId=${params.id}`}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer actions */}
            <div className="px-6 py-3 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => setEmailModalOpen(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              {channel === 'whatsapp' ? (
                <button
                  onClick={handleSendWhatsApp}
                  disabled={emailLoading}
                  className="btn-primary bg-emerald-500 hover:bg-emerald-600"
                >
                  {emailLoading ? 'Sending...' : '💬 Send via WhatsApp'}
                </button>
              ) : (
                <button
                  onClick={handleSendEmail}
                  disabled={emailLoading}
                  className="btn-primary"
                >
                  {emailLoading ? 'Sending...' : '📧 Send Quote Email'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
