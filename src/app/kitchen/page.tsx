'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, addDays, startOfWeek, subWeeks, addWeeks } from 'date-fns';
import { formatCurrency, getMenuTypeIcon, cn } from '@/lib/utils/format';
import type { KitchenDayPlan } from '@/types';

type SelectedOrder = { date: string; order: KitchenDayPlan['orders'][0] };

// Aggregate key: menuType + category + name + sizeOption
type BreakdownRow = {
  menuType: string;
  category: string;
  name: string;
  sizeOption: string;
  quantity: number;
  lineTotal: number;
};

const MENU_TYPE_ORDER: Record<string, number> = {
  'Veg Menu': 0,
  'Non-Veg Menu': 1,
  Desserts: 2,
  'Puja Food': 3,
  'Live Catering': 4,
  'Chafing Dishes': 5,
  'Disposable Plates': 6,
};

const MENU_TYPE_PANEL: Record<string, { label: string; headerClass: string; totalClass: string }> = {
  'Veg Menu': { label: 'Vegetarian Items', headerClass: 'bg-emerald-700', totalClass: 'bg-emerald-50 text-emerald-800' },
  'Non-Veg Menu': { label: 'Non-Vegetarian Items', headerClass: 'bg-red-800', totalClass: 'bg-red-50 text-red-800' },
  Desserts: { label: 'Desserts', headerClass: 'bg-violet-700', totalClass: 'bg-violet-50 text-violet-800' },
  'Puja Food': { label: 'Puja Food (No Onion / Garlic)', headerClass: 'bg-sky-700', totalClass: 'bg-sky-50 text-sky-800' },
  'Live Catering': { label: 'Live Catering', headerClass: 'bg-amber-700', totalClass: 'bg-amber-50 text-amber-800' },
  'Chafing Dishes': { label: 'Chafing Dishes', headerClass: 'bg-slate-600', totalClass: 'bg-slate-50 text-slate-800' },
  'Disposable Plates': { label: 'Disposable Plates', headerClass: 'bg-cyan-600', totalClass: 'bg-cyan-50 text-cyan-800' },
};

function getEventCardClass(eventType?: string): string {
  if (!eventType) return 'bg-cream-50 border-gray-300';
  const t = eventType.toLowerCase();
  if (t.includes('wedding') || t.includes('reception')) return 'bg-amber-50/80 border-amber-400';
  if (t.includes('birthday')) return 'bg-red-50/80 border-red-400';
  if (t.includes('corporate') || t.includes('business')) return 'bg-blue-50 border-blue-400';
  if (t.includes('puja') || t.includes('ceremony') || t.includes('religious')) return 'bg-sky-50 border-sky-400';
  return 'bg-cream-50 border-gray-300';
}

/** Escape a CSV cell (quotes and commas) */
function csvEscape(s: string): string {
  const str = String(s ?? '');
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Build CSV content for weekly plan: events list + category breakdown */
function buildWeeklyPlanCSV(
  plans: KitchenDayPlan[],
  breakdownByType: Map<string, BreakdownRow[]>,
  weekStart: Date,
  weekEnd: Date
): string {
  const rows: string[] = [];
  rows.push('Nidhi Catering — Weekly Kitchen Lineup');
  rows.push(`Week of ${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`);
  rows.push('');

  rows.push('EVENTS');
  rows.push(
    [
      'Date',
      'Day',
      'Order Number',
      'Customer',
      'Event Type',
      'Time',
      'Delivery Type',
      'Guests',
      'Veg Items',
      'Non-Veg Items',
      'Dessert Items',
      'Puja Items',
      'Live Items',
    ].join(',')
  );
  plans.forEach((day) => {
    day.orders.forEach((order) => {
      const vegN = order.items.filter((i) => i.menuType === 'Veg Menu').length;
      const nvN = order.items.filter((i) => i.menuType === 'Non-Veg Menu').length;
      const desN = order.items.filter((i) => i.menuType === 'Desserts').length;
      const pujaN = order.items.filter((i) => i.menuType === 'Puja Food').length;
      const liveN = order.items.filter((i) => i.menuType === 'Live Catering').length;
      const deliveryLabel =
        order.deliveryType === 'delivery'
          ? 'Delivery'
          : order.deliveryType === 'live'
          ? 'Live Catering'
          : 'Pickup';
      rows.push(
        [
          day.date,
          format(new Date(day.date), 'EEEE'),
          csvEscape(order.orderNumber ?? ''),
          csvEscape(order.customerName ?? ''),
          csvEscape(order.eventType ?? ''),
          csvEscape(order.eventTime ?? ''),
          deliveryLabel,
          order.guestCount ?? '',
          vegN,
          nvN,
          desN,
          pujaN,
          liveN,
        ].join(',')
      );
    });
  });
  rows.push('');

  rows.push('CATEGORY BREAKDOWN — PREP QUANTITIES');
  rows.push(['Menu Type', 'Category', 'Item Name', 'Size / Option', 'Total Qty'].join(','));
  breakdownByType.forEach((typeRows) => {
    typeRows.forEach((r) => {
      rows.push(
        [
          csvEscape(r.menuType),
          csvEscape(r.category),
          csvEscape(r.name),
          csvEscape(r.sizeOption),
          r.quantity,
        ].join(',')
      );
    });
  });
  return rows.join('\r\n');
}

/** Trigger download of CSV file */
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function KitchenPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [plans, setPlans] = useState<KitchenDayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrder | null>(null);
  const [viewFilter, setViewFilter] = useState<'all' | 'veg' | 'nonveg' | 'dessert' | 'puja'>('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('startDate', format(weekStart, 'yyyy-MM-dd'));
    if (viewFilter !== 'all') params.set('view', viewFilter);

    fetch(`/api/kitchen?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setPlans(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [weekStart, viewFilter]);

  // Summary across the week (events, items, guests, delivery/pickup/live counts)
  const weekSummary = useMemo(() => {
    let totalEvents = 0;
    let veg = 0;
    let nonVeg = 0;
    let dessert = 0;
    let guests = 0;
    let deliveryCount = 0;
    let pickupCount = 0;
    let liveCount = 0;
    plans.forEach((p) => {
      totalEvents += p.summary.totalOrders;
      veg += p.summary.vegItems ?? 0;
      nonVeg += p.summary.nonVegItems ?? 0;
      dessert += p.summary.dessertItems ?? 0;
      guests += p.summary.totalGuests ?? 0;
      p.orders.forEach((o) => {
        const dt = o.deliveryType ?? 'pickup';
        if (dt === 'delivery') deliveryCount += 1;
        else if (dt === 'live') liveCount += 1;
        else pickupCount += 1;
      });
    });
    return { totalEvents, veg, nonVeg, dessert, guests, deliveryCount, pickupCount, liveCount };
  }, [plans]);

  // Weekly category breakdown: aggregate by menuType > category > name+sizeOption
  const breakdownByType = useMemo(() => {
    const map = new Map<string, BreakdownRow>();
    plans.forEach((day) => {
      day.orders.forEach((order) => {
        order.items.forEach((item) => {
          const key = `${item.menuType}\t${item.category}\t${item.name}\t${item.sizeOption}`;
          const existing = map.get(key);
          const lineTotal = item.lineTotal ?? 0;
          if (existing) {
            existing.quantity += item.quantity;
            existing.lineTotal += lineTotal;
          } else {
            map.set(key, {
              menuType: item.menuType,
              category: item.category,
              name: item.name,
              sizeOption: item.sizeOption,
              quantity: item.quantity,
              lineTotal,
            });
          }
        });
      });
    });
    const rows = Array.from(map.values());
    rows.sort((a, b) => {
      const orderA = MENU_TYPE_ORDER[a.menuType] ?? 99;
      const orderB = MENU_TYPE_ORDER[b.menuType] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      if (a.name !== b.name) return a.name.localeCompare(b.name);
      return a.sizeOption.localeCompare(b.sizeOption);
    });
    const byType = new Map<string, BreakdownRow[]>();
    rows.forEach((r) => {
      const list = byType.get(r.menuType) || [];
      list.push(r);
      byType.set(r.menuType, list);
    });
    return byType;
  }, [plans]);

  const selectedPlan = selectedDay ? plans.find((p) => p.date === selectedDay) : null;

  const weekSubtitle = [
    weekSummary.totalEvents,
    'event' + (weekSummary.totalEvents !== 1 ? 's' : ''),
    'this week',
    weekSummary.deliveryCount ? ` · ${weekSummary.deliveryCount} delivery` : '',
    weekSummary.pickupCount ? ` · ${weekSummary.pickupCount} pickup` : '',
    weekSummary.liveCount ? ` · ${weekSummary.liveCount} live catering` : '',
  ].join(' ');

  return (
    <div>
      {/* Print-only header: logo + title (same format as quote/letterhead) */}
      <div className="print-only mb-6 pb-4 border-b-4 border-saffron-500">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-saffron-500 to-amber-600 flex items-center justify-center font-black text-white text-lg">
              NC
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-saffron-500">Nidhi Catering</h1>
              <p className="text-sm text-gray-600">Weekly Kitchen Lineup</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-navy-500">
              Week of {format(weekStart, 'MMMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </div>
            <p className="text-xs text-gray-500 mt-1">{weekSubtitle}</p>
          </div>
        </div>
      </div>

      {/* Controls bar: WEEK OF + date, VIEW + filter chips, Print / Export (match Weekly Plan template) */}
      <div className="mb-0 no-print bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">WEEK OF</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={format(weekStart, 'yyyy-MM-dd')}
              onChange={(e) => setWeekStart(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 font-medium focus:ring-2 focus:ring-saffron-400 focus:border-saffron-500"
            />
            <span className="text-base opacity-80" title="Pick date">📅</span>
          </div>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">VIEW</span>
          <button
            type="button"
            onClick={() => setViewFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold',
              viewFilter === 'all'
                ? 'bg-navy-500 text-white border-navy-500'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('veg')}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5',
              viewFilter === 'veg'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Veg
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('nonveg')}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5',
              viewFilter === 'nonveg'
                ? 'bg-red-700 text-white border-red-700'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-red-600" /> Non-Veg
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('dessert')}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5',
              viewFilter === 'dessert'
                ? 'bg-violet-700 text-white border-violet-700'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-violet-600" /> Desserts
          </button>
          <button
            type="button"
            onClick={() => setViewFilter('puja')}
            className={cn(
              'px-3 py-1.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1.5',
              viewFilter === 'puja'
                ? 'bg-sky-700 text-white border-sky-700'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-sky-600" /> Puja
          </button>
        </div>
        <div className="h-6 w-px bg-gray-200" />
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
        >
          🖨 Print / Save PDF
        </button>
        <button
          type="button"
          onClick={() => {
            const weekEnd = addDays(weekStart, 6);
            const csv = buildWeeklyPlanCSV(plans, breakdownByType, weekStart, weekEnd);
            const filename = `Nidhi-Catering-Weekly-Plan-${format(weekStart, 'yyyy-MM-dd')}.csv`;
            downloadCSV(csv, filename);
          }}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-navy-500 text-white text-sm font-semibold hover:bg-navy-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⬇ Export CSV
        </button>
      </div>

      {/* Week title + subtitle + arrows + Today */}
      <div className="mt-6 mb-5 no-print flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy-500">
            Week of {format(weekStart, 'MMMM d')} – {format(addDays(weekStart, 6), 'd, yyyy')}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{weekSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="w-9 h-9 rounded-full border border-gray-300 bg-white flex items-center justify-center text-lg font-medium hover:bg-navy-500 hover:text-white hover:border-navy-500"
            title="Previous week"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-bold hover:bg-gray-100"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="w-9 h-9 rounded-full border border-gray-300 bg-white flex items-center justify-center text-lg font-medium hover:bg-navy-500 hover:text-white hover:border-navy-500"
            title="Next week"
          >
            ›
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading kitchen plan...</div>
      ) : (
        <>
          {/* Summary strip: TOTAL EVENTS, VEG ITEMS, NON-VEG ITEMS, DESSERT ITEMS, TOTAL GUESTS */}
          <div className="grid grid-cols-5 gap-3 mb-6 print-keep-together">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-saffron-500 print-keep-together print-bg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">TOTAL EVENTS</div>
              <div className="text-2xl font-black text-navy-500">{weekSummary.totalEvents}</div>
              <div className="text-xs text-gray-500 mt-0.5">This week</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-emerald-600 print-keep-together print-bg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">VEG ITEMS</div>
              <div className="text-2xl font-black text-navy-500">{weekSummary.veg}</div>
              <div className="text-xs text-gray-500 mt-0.5">Across all events</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-red-700 print-keep-together print-bg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">NON-VEG ITEMS</div>
              <div className="text-2xl font-black text-navy-500">{weekSummary.nonVeg}</div>
              <div className="text-xs text-gray-500 mt-0.5">Across all events</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-violet-600 print-keep-together print-bg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">DESSERT ITEMS</div>
              <div className="text-2xl font-black text-navy-500">{weekSummary.dessert}</div>
              <div className="text-xs text-gray-500 mt-0.5">Across all events</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-sky-600 print-keep-together print-bg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">TOTAL GUESTS</div>
              <div className="text-2xl font-black text-navy-500">{weekSummary.guests}</div>
              <div className="text-xs text-gray-500 mt-0.5">This week</div>
            </div>
          </div>

          {/* 7-day grid with event cards */}
          <div className="grid grid-cols-7 gap-3 mb-8">
            {plans.map((day) => {
              const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
              const isSelected = day.date === selectedDay;
              return (
                <div
                  key={day.date}
                  className={cn(
                    'bg-white rounded-xl shadow-sm overflow-hidden print-keep-together print-bg',
                    isToday && 'ring-2 ring-saffron-400 shadow-saffron-100',
                    isSelected && 'ring-2 ring-saffron-500'
                  )}
                >
                  <div
                    className={cn(
                      'px-3 py-2.5 flex items-center justify-between',
                      isToday ? 'bg-saffron-500 text-white' : 'bg-navy-500 text-white'
                    )}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider">
                      {format(new Date(day.date), 'EEEE')} {format(new Date(day.date), 'd')}
                    </div>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {day.summary.totalOrders === 0
                        ? 'No Events'
                        : `${day.summary.totalOrders} Event${day.summary.totalOrders !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="p-2 min-h-[80px]">
                    {day.orders.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400">No orders scheduled</div>
                    ) : (
                      day.orders.map((order, idx) => {
                        const vegN = order.items.filter((i) => i.menuType === 'Veg Menu').length;
                        const nvN = order.items.filter((i) => i.menuType === 'Non-Veg Menu').length;
                        const desN = order.items.filter((i) => i.menuType === 'Desserts').length;
                        const pujaN = order.items.filter((i) => i.menuType === 'Puja Food').length;
                        const liveN = order.items.filter((i) => i.menuType === 'Live Catering').length;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedDay(day.date);
                              setSelectedOrder({ date: day.date, order });
                            }}
                            className={cn(
                              'w-full text-left rounded-lg border-l-4 p-2 mb-1.5 transition-all hover:shadow-md',
                              getEventCardClass(order.eventType)
                            )}
                          >
                        <div className="text-[10px] font-bold text-gray-500 mb-0.5">
                          {order.eventTime || '—'}{' '}
                          {order.deliveryType === 'delivery'
                            ? 'Delivery'
                            : order.deliveryType === 'pickup'
                            ? 'Pickup'
                            : 'Live Catering'}
                        </div>
                            <div className="text-sm font-bold text-navy-600 leading-tight">{order.customerName}</div>
                            <div className="text-[10px] text-gray-600 mt-0.5">
                              {order.eventType ? `${order.eventType}` : 'Event'}
                            </div>
                            <div className="text-[10px] font-semibold text-gray-600 mt-1">
                              {order.guestCount ? `${order.guestCount} guests` : '—'}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {vegN > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                  Veg ×{vegN}
                                </span>
                              )}
                              {nvN > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                  Non-Veg ×{nvN}
                                </span>
                              )}
                              {desN > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                                  Dessert ×{desN}
                                </span>
                              )}
                              {pujaN > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
                                  Puja ×{pujaN}
                                </span>
                              )}
                              {liveN > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                  Live ×{liveN}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Event detail panel (when an event is clicked) */}
          {selectedOrder && (
            <div className="card mb-8 border-2 border-saffron-200">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div>
                  <h2 className="text-lg font-extrabold text-navy-500">
                    {selectedOrder.order.customerName} — {selectedOrder.order.orderNumber}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {format(new Date(selectedOrder.date), 'EEEE, MMMM d, yyyy')}
                    {selectedOrder.order.eventTime && ` · ${selectedOrder.order.eventTime}`}
                    {selectedOrder.order.guestCount && ` · ${selectedOrder.order.guestCount} guests`}
                    {' · '}
                    {selectedOrder.order.deliveryType === 'delivery'
                      ? 'Delivery'
                      : selectedOrder.order.deliveryType === 'live'
                      ? 'Live Catering'
                      : 'Pickup'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn-ghost text-sm"
                >
                  Close
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-navy-500 text-white text-left text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Size / Option</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.order.items.map((item, j) => (
                      <tr key={j} className={cn('border-b border-gray-100', j % 2 === 1 && 'bg-gray-50/50')}>
                        <td className="py-2 px-3 font-semibold text-navy-600">
                          {getMenuTypeIcon(item.menuType)} {item.name}
                        </td>
                        <td className="py-2 px-3 text-gray-600">{item.category}</td>
                        <td className="py-2 px-3 text-gray-500">{item.sizeOption}</td>
                        <td className="py-2 px-3 text-center font-bold text-navy-600">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                          {item.lineTotal != null ? formatCurrency(item.lineTotal) : '—'}
                        </td>
                        <td className="py-2 px-3 text-gray-400 text-xs">{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Weekly Category Breakdown — Prep Quantities */}
          <section className="mt-10">
            <h2 className="text-base font-extrabold text-navy-500 flex items-center gap-2 mb-2">
              Weekly Category Breakdown — Prep Quantities
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              All items sorted by category — sub-category — item name. Quantities represent totals across all events this week.
            </p>

            {breakdownByType.size === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl py-12 text-center text-gray-500 text-sm">
                No orders this week. Category breakdown will appear when orders exist.
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from(breakdownByType.entries())
                .filter(([menuType]) => MENU_TYPE_PANEL[menuType])
                .map(([menuType, rows]) => {
                  const panel = MENU_TYPE_PANEL[menuType];
                  const totalQty = rows.reduce((s, r) => s + r.quantity, 0);
                  // Group rows by category (sub-category) for structure: category → item list
                  const byCategory = new Map<string, typeof rows>();
                  rows.forEach((r) => {
                    const cat = r.category?.trim() || 'Other';
                    if (!byCategory.has(cat)) byCategory.set(cat, []);
                    byCategory.get(cat)!.push(r);
                  });
                  const categoryOrder = Array.from(byCategory.keys()).sort((a, b) => a.localeCompare(b));
                  return (
                    <div key={menuType} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 print-keep-together print-bg">
                      <div className={cn('px-4 py-3 text-white print-bg', panel.headerClass)}>
                        <h3 className="text-sm font-extrabold">
                          {menuType === 'Veg Menu' && '🟢 '}
                          {menuType === 'Non-Veg Menu' && '🔴 '}
                          {menuType === 'Desserts' && '🟣 '}
                          {menuType === 'Puja Food' && '🔵 '}
                          {panel.label}
                        </h3>
                      </div>
                      <div className="divide-y divide-gray-200">
                        {/* Table header: Item Name + Qty only (no dollar amounts) */}
                        <div className="grid grid-cols-[1fr_80px] gap-0 bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          <div className="py-2 px-3 border-r border-gray-200">Item Name</div>
                          <div className="py-2 px-3 text-center">Qty</div>
                        </div>
                        {/* Sub-categories with item list (same structure as reference) */}
                        {categoryOrder.map((cat) => (
                          <div key={cat}>
                            <div
                              className={cn(
                                'px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b border-gray-200',
                                menuType === 'Veg Menu' && 'bg-emerald-50 text-emerald-800',
                                menuType === 'Non-Veg Menu' && 'bg-red-50 text-red-800',
                                menuType === 'Desserts' && 'bg-violet-50 text-violet-800',
                                menuType === 'Puja Food' && 'bg-sky-50 text-sky-800',
                                !['Veg Menu', 'Non-Veg Menu', 'Desserts', 'Puja Food'].includes(menuType) && 'bg-gray-100 text-gray-700'
                              )}
                            >
                              {cat}
                            </div>
                            {byCategory.get(cat)!.map((row, i) => (
                              <div
                                key={`${row.name}-${row.sizeOption}-${i}`}
                                className={cn(
                                  'grid grid-cols-[1fr_80px] gap-0 text-xs border-b border-gray-100',
                                  i % 2 === 1 && 'bg-cream-50/50'
                                )}
                              >
                                <div className="py-2.5 px-3 border-r border-gray-100 font-semibold text-navy-600">
                                  {row.name}
                                </div>
                                <div className="py-2.5 px-3 text-center font-bold text-navy-600">
                                  {row.quantity}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                        <div
                          className={cn(
                            'grid grid-cols-[1fr_80px] gap-0 font-bold text-sm border-t-2 border-gray-200',
                            panel.totalClass
                          )}
                        >
                          <div className="py-2.5 px-3">
                            {menuType.toUpperCase().replace('-', ' ')} TOTAL
                          </div>
                          <div className="py-2.5 px-3 text-center">{totalQty}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            )}
          </section>

          {/* Print footer: visible only when printing */}
          <div className="print-only mt-8 pt-4 border-t-2 border-gray-200 flex justify-between items-center text-xs text-gray-500">
            <span>Nidhi Catering · Kitchen Prep Plan · Week of {format(weekStart, 'MMM d')}–{format(addDays(weekStart, 6), 'MMM d, yyyy')}</span>
            <span>Printed: {format(new Date(), 'PPp')}</span>
          </div>
          <div className="no-print mt-8 pt-4 border-t-2 border-gray-200 flex justify-between items-center text-xs text-gray-500">
            <span>Nidhi Catering · Kitchen Prep Plan · Week of {format(weekStart, 'MMM d')}–{format(addDays(weekStart, 6), 'MMM d, yyyy')}</span>
          </div>
        </>
      )}
    </div>
  );
}
