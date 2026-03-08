'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  useOrderWizard,
  LIVE_STATION_OPTIONS,
  ADDITIONAL_EQUIPMENT_OPTIONS,
} from '@/stores/orderWizard';
import {
  formatCurrency,
  getMenuTypeIcon,
  getMenuTypeColor,
  cn,
} from '@/lib/utils/format';
import type { MenuItem, MenuType, OrderLineItem } from '@/types';

/* ---------- Step components ---------- */

function StepCustomer({ showTitle = true }: { showTitle?: boolean }) {
  const { customer, setCustomer } = useOrderWizard();
  return (
    <div className="space-y-4">
      {showTitle && (
        <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            value={customer.name}
            onChange={(e) => setCustomer({ name: e.target.value })}
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="label">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            value={customer.phone}
            onChange={(e) => setCustomer({ phone: e.target.value })}
            placeholder="(___) ___-____"
          />
        </div>
        <div>
          <label className="label">Email Address</label>
          <input
            className="input-field"
            type="email"
            value={customer.email}
            onChange={(e) => setCustomer({ email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <label className="label">Address</label>
          <input
            className="input-field"
            value={customer.address}
            onChange={(e) => setCustomer({ address: e.target.value })}
            placeholder="Street, City, State ZIP"
          />
        </div>
        <div className="col-span-2">
          <label className="label">Special Dietary Requirements / Allergies</label>
          <input
            className="input-field"
            value={customer.dietaryNotes || ''}
            onChange={(e) => setCustomer({ dietaryNotes: e.target.value })}
            placeholder="e.g. No garlic or onion, nut-free, jain food..."
          />
          <p className="text-[11px] text-gray-500 mt-1">
            This will be noted on the order and communicated to the kitchen.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepEvent({ showTitle = true }: { showTitle?: boolean }) {
  const { event, setEvent } = useOrderWizard();
  return (
    <div className="space-y-4">
      {showTitle && (
        <h2 className="text-xl font-semibold mb-4">Event Details</h2>
      )}
      <div className="space-y-4">
        {/* Row 1: Event Date *, Event Time *, Number of Guests, Event Type */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Event Date <span className="text-red-500">*</span></label>
            <input className="input-field" type="date" value={event.eventDate} onChange={(e) => setEvent({ eventDate: e.target.value })} />
          </div>
          <div>
            <label className="label">Event Time <span className="text-red-500">*</span></label>
            <input className="input-field" type="time" value={event.eventTime} onChange={(e) => setEvent({ eventTime: e.target.value })} />
          </div>
          <div>
            <label className="label">Number of Guests</label>
            <input className="input-field" type="number" min={1} value={event.guestCount || ''} onChange={(e) => setEvent({ guestCount: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="e.g. 75" />
          </div>
          <div>
            <label className="label">Event Type</label>
            <select
              className="input-field"
              value={event.eventType}
              onChange={(e) => setEvent({ eventType: e.target.value })}
            >
              <option value="">Select type...</option>
              <option value="Wedding / Shaadi">Wedding / Shaadi</option>
              <option value="Birthday Party">Birthday Party</option>
              <option value="Corporate Event">Corporate Event</option>
              <option value="Puja / Religious Ceremony">Puja / Religious Ceremony</option>
              <option value="Anniversary">Anniversary</option>
              <option value="Baby Shower / Bridal Shower">Baby Shower / Bridal Shower</option>
              <option value="Graduation Party">Graduation Party</option>
              <option value="Housewarming">Housewarming</option>
              <option value="Festival Gathering">Festival Gathering</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Delivery Type * - card-style options with icons */}
        <div>
          <label className="label">
            Delivery Type <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
            {[
              {
                value: 'delivery' as const,
                label: 'Delivery',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a3 3 0 116 0h.375c1.035 0 1.875-.84 1.875-1.875V15z" />
                    <path d="M8.25 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15.75 19.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    <path d="M18.75 6.375h.75v7.5h-.75a.75.75 0 01-.75-.75v-6a.75.75 0 01.75-.75z" />
                  </svg>
                ),
              },
              {
                value: 'pickup' as const,
                label: 'Pickup',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.061l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 101.061 1.06l8.69-8.689z" />
                    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                  </svg>
                ),
              },
              {
                value: 'live' as const,
                label: 'Live Catering (On-site)',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63v-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                  </svg>
                ),
              },
            ].map(({ value, label, icon }) => {
              const isSelected = event.deliveryType === value;
              return (
                <label
                  key={value}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150',
                    isSelected
                      ? 'border-saffron-500 bg-saffron-50 text-saffron-700 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  )}
                >
                  <input
                    type="radio"
                    name="deliveryType"
                    value={value}
                    checked={isSelected}
                    onChange={() => setEvent({ deliveryType: value })}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      isSelected ? 'border-saffron-500 bg-saffron-500' : 'border-gray-300 bg-white'
                    )}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span className={cn('mt-4', isSelected ? 'text-saffron-600' : 'text-gray-500')}>
                    {icon}
                  </span>
                  <span className={cn('text-sm font-semibold text-center', isSelected && 'border-b-2 border-saffron-500 pb-0.5')}>
                    {label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Row 2: Venue / Location Name, Setup Time Required */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Venue / Location Name</label>
            <input className="input-field" value={event.venue} onChange={(e) => setEvent({ venue: e.target.value })} placeholder="e.g. Grand Ballroom, Marriott Dallas" />
          </div>
          <div>
            <label className="label">Setup Time Required</label>
            <select
              className="input-field"
              value={event.setupTimeOption || ''}
              onChange={(e) => setEvent({ setupTimeOption: e.target.value })}
            >
              <option value="">No setup needed</option>
              <option value="30 minutes before">30 minutes before</option>
              <option value="1 hour before">1 hour before</option>
              <option value="2 hours before">2 hours before</option>
              <option value="3 hours before">3 hours before</option>
              <option value="Other (see notes)">Other (see notes)</option>
            </select>
          </div>
        </div>

        {event.deliveryType === 'delivery' && (
          <div className="space-y-4">
            <div>
              <label className="label">Delivery Address <span className="text-red-500">*</span></label>
              <input
                className="input-field"
                value={event.deliveryAddress}
                onChange={(e) => setEvent({ deliveryAddress: e.target.value })}
                placeholder="Street address, Suite / Apt"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">City</label>
                <input
                  className="input-field"
                  value={event.deliveryCity || ''}
                  onChange={(e) => setEvent({ deliveryCity: e.target.value })}
                  placeholder="Dallas"
                />
              </div>
              <div>
                <label className="label">State</label>
                <input
                  className="input-field"
                  value={event.deliveryState || ''}
                  onChange={(e) => setEvent({ deliveryState: e.target.value })}
                  placeholder="TX"
                />
              </div>
              <div>
                <label className="label">ZIP Code</label>
                <input
                  className="input-field"
                  value={event.deliveryZip || ''}
                  onChange={(e) => setEvent({ deliveryZip: e.target.value })}
                  placeholder="75001"
                />
              </div>
            </div>
            <div>
              <label className="label">Venue / Location Name</label>
              <input
                className="input-field"
                value={event.venue}
                onChange={(e) => setEvent({ venue: e.target.value })}
                placeholder="e.g. Grand Ballroom, Marriott Dallas"
              />
            </div>
            <div>
              <label className="label">Delivery Notes</label>
              <textarea
                className="input-field"
                rows={2}
                value={event.deliveryNotes}
                onChange={(e) => setEvent({ deliveryNotes: e.target.value })}
                placeholder="Gate code, parking instructions, etc."
              />
            </div>
          </div>
        )}
        {event.deliveryType === 'live' && (
          <div className="rounded-xl border-2 border-saffron-200 bg-saffron-50/60 p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-saffron-200">
              <span className="text-saffron-600" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63v-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                </svg>
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-navy-600">Live Catering Requirements</h3>
            </div>
            <div>
              <label className="label">Delivery / Venue Address <span className="text-red-500">*</span></label>
              <input
                className="input-field"
                value={event.deliveryAddress}
                onChange={(e) => setEvent({ deliveryAddress: e.target.value })}
                placeholder="Full event address"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">City</label>
                <input
                  className="input-field"
                  value={event.deliveryCity || ''}
                  onChange={(e) => setEvent({ deliveryCity: e.target.value })}
                  placeholder="Dallas"
                />
              </div>
              <div>
                <label className="label">State</label>
                <input
                  className="input-field"
                  value={event.deliveryState || ''}
                  onChange={(e) => setEvent({ deliveryState: e.target.value })}
                  placeholder="TX"
                />
              </div>
              <div>
                <label className="label">ZIP Code</label>
                <input
                  className="input-field"
                  value={event.deliveryZip || ''}
                  onChange={(e) => setEvent({ deliveryZip: e.target.value })}
                  placeholder="75201"
                />
              </div>
            </div>
            <div>
              <label className="label">Setup Arrival Time <span className="text-red-500">*</span></label>
              <input
                type="time"
                className="input-field"
                value={event.liveSetupArrivalTime || ''}
                onChange={(e) => setEvent({ liveSetupArrivalTime: e.target.value })}
                placeholder="--:--"
              />
              <p className="text-xs text-gray-500 mt-0.5">Time the team should arrive to set up</p>
            </div>
            <div>
              <label className="label">Number of Staff Required</label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={event.liveStaffCount ?? ''}
                onChange={(e) =>
                  setEvent({
                    liveStaffCount: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="label">Available Kitchen / Prep Space</label>
              <select
                className="input-field"
                value={event.liveKitchenType || ''}
                onChange={(e) => setEvent({ liveKitchenType: e.target.value })}
              >
                <option value="">Please select…</option>
                <option value="Full kitchen on-site">Full kitchen on-site</option>
                <option value="Outdoor cooking area">Outdoor cooking area</option>
                <option value="Tent / canopy">Tent / canopy</option>
                <option value="None — bring all equipment">None — bring all equipment</option>
              </select>
            </div>
            <div>
              <label className="label">Special Setup Notes</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="e.g. Parking near venue, elevator access needed, generator required..."
                value={event.liveSetupNotes || ''}
                onChange={(e) => setEvent({ liveSetupNotes: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Event Notes / Special Instructions - full width at bottom */}
        <div>
          <label className="label">Event Notes / Special Instructions</label>
          <textarea
            className="input-field w-full resize-y"
            rows={3}
            value={event.eventNotes || ''}
            onChange={(e) => setEvent({ eventNotes: e.target.value })}
            placeholder="Any additional event-level notes for the kitchen or delivery team..."
          />
        </div>
      </div>
    </div>
  );
}

function StepCustomerAndEvent() {
  return (
    <div className="space-y-6">
      {/* Customer Information - separate card with icon, title, subheading, ample top spacing */}
      <div className="card !pt-8">
        <div className="flex items-start gap-3 pb-4">
          <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center text-lg shrink-0 text-navy-600" aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-navy-500">Customer Information</h2>
            <p className="text-sm text-gray-500 mt-0.5">Primary contact for this order</p>
          </div>
        </div>
        <StepCustomer showTitle={false} />
      </div>

      {/* Event Details - separate card with icon, title, subheading, ample top spacing */}
      <div className="card !pt-8">
        <div className="flex items-start gap-3 pb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-100 via-amber-100 to-sky-100 flex items-center justify-center text-xl shrink-0" aria-hidden>
            🎉
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-navy-500">Event Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tell us about the occasion</p>
          </div>
        </div>
        <StepEvent showTitle={false} />
      </div>
    </div>
  );
}

const LIVE_STATION_ICONS: Record<string, string> = {
  'Chaat Station': '🥘',
  'Biryani Station': '🍛',
  'Roti / Paratha Station': '🫓',
  'Dessert / Halwa Station': '🍰',
  'Indo-Chinese Station': '🥢',
  'Indo-Mexican Station': '🌯',
  'Pizza / Fusion Oven': '🍕',
  'Pasta Station': '🍝',
};

const ADDITIONAL_EQUIPMENT_ICONS: Record<string, string> = {
  'Sterno / Fuel Cans': '🔥',
  'Serving Spoon Sets': '🧂',
  'Cooler / Ice Chest': '🪣',
  'Table Covers / Linens': '🧻',
  'Extension Cords / Power': '💡',
};

function StepMenuItems() {
  const {
    lineItems,
    addLineItem,
    removeLineItem,
    updateLineItem,
    getSubtotal,
    syncEquipmentTotal,
    chafingRows,
    setChafingRow,
    disposableRows,
    setDisposableRow,
    liveStations,
    toggleLiveStation,
    liveStationNotes,
    setLiveStationNotes,
    additionalEquipment,
    toggleAdditionalEquipment,
    additionalEquipmentNotes,
    setAdditionalEquipmentNotes,
    equipmentTotal,
    getTax,
    getTotal,
  } = useOrderWizard();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/menu')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMenuItems(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Categories with Veg / Non-Veg prefix: "Veg - Appetizer", "Non-Veg - Main Course", etc.
  const categoriesWithPrefix = useMemo(() => {
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [];
    menuItems.forEach((i) => {
      const key = `${i.menuType}|${i.category}`;
      if (seen.has(key)) return;
      seen.add(key);
      const prefix = i.menuType === 'Non-Veg Menu' ? 'Non-Veg' : i.menuType === 'Veg Menu' ? 'Veg' : i.menuType;
      const label = i.menuType === 'Veg Menu' || i.menuType === 'Non-Veg Menu'
        ? `${prefix} - ${i.category}`
        : `${i.category}`;
      out.push({ value: key, label });
    });
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [menuItems]);

  const handleChafingChange = (index: number, updates: Parameters<typeof setChafingRow>[1]) => {
    setChafingRow(index, updates);
    setTimeout(() => syncEquipmentTotal(), 0);
  };

  const handleDisposableChange = (index: number, updates: Parameters<typeof setDisposableRow>[1]) => {
    setDisposableRow(index, updates);
    setTimeout(() => syncEquipmentTotal(), 0);
  };

  const getVegLabel = (menuType: MenuType): string =>
    menuType === 'Non-Veg Menu' ? 'Non-Veg' : 'Veg';

  const renderVegChip = (menuType?: MenuType) => {
    if (!menuType) return null;
    const isNonVeg = menuType === 'Non-Veg Menu';
    return (
      <span
        className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-semibold border',
          isNonVeg
            ? 'bg-red-50 text-red-600 border-red-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        )}
      >
        {isNonVeg ? 'Non-Veg' : 'Veg'}
      </span>
    );
  };

  const handleCategoryChange = (index: number, compositeValue: string) => {
    if (!compositeValue) {
      updateLineItem(index, {
        category: '',
        menuItemId: '',
        menuItemName: '',
        sizeOption: '',
        unit: '',
        unitPrice: 0,
        quantity: 1,
        lineTotal: 0,
      });
      return;
    }
    const [menuType, category] = compositeValue.split('|');
    updateLineItem(index, {
      menuType: menuType as MenuType,
      category: category || '',
      menuItemId: '',
      menuItemName: '',
      sizeOption: '',
      unit: '',
      unitPrice: 0,
      quantity: 1,
      lineTotal: 0,
    });
  };

  const handleItemChange = (index: number, menuId: string) => {
    if (!menuId) return;
    const item = menuItems.find((m) => m._id === menuId);
    if (!item) return;
    const opt = item.pricingOptions[0];
    if (!opt) return;

    const current = lineItems[index];
    const quantity = current?.quantity || item.minOrder || 1;
    const unitPrice = opt.price || 0;

    updateLineItem(index, {
      menuItemId: item._id,
      menuItemName: item.name,
      menuType: item.menuType,
      category: item.category,
      sizeOption: opt.sizeOption,
      unit: opt.unit,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
      isQuoteBased: item.isQuoteBased,
    });
  };

  const handleSizeOptionChange = (index: number, optIndexStr: string) => {
    const optIndex = parseInt(optIndexStr, 10);
    const current = lineItems[index];
    if (!current?.menuItemId) return;
    const item = menuItems.find((m) => m._id === current.menuItemId);
    if (!item) return;
    const opt = item.pricingOptions[optIndex] ?? item.pricingOptions[0];
    if (!opt) return;

    const quantity = current.quantity || 1;
    const unitPrice = opt.price || 0;

    updateLineItem(index, {
      sizeOption: opt.sizeOption,
      unit: opt.unit,
      unitPrice,
      lineTotal: quantity * unitPrice,
    });
  };

  const handleQtyChange = (index: number, qtyStr: string) => {
    const qty = Math.max(1, parseInt(qtyStr || '1', 10));
    const current = lineItems[index];
    if (!current) return;
    updateLineItem(index, {
      quantity: qty,
      lineTotal: qty * current.unitPrice,
    });
  };

  const handlePriceChange = (index: number, priceStr: string) => {
    const price = Math.max(0, parseFloat(priceStr || '0'));
    const current = lineItems[index];
    if (!current) return;
    updateLineItem(index, {
      unitPrice: price,
      lineTotal: price * current.quantity,
    });
  };

  const handleAddRow = () => {
    if (menuItems.length === 0) {
      toast.error('Menu has not loaded yet.');
      return;
    }
    const item = menuItems[0];
    const opt = item.pricingOptions[0] || { sizeOption: 'Custom', unit: 'each', price: 0 };
    const quantity = item.minOrder || 1;
    const unitPrice = opt.price || 0;
    const newItem: OrderLineItem = {
      menuItemId: item._id,
      menuItemName: item.name,
      menuType: item.menuType,
      category: item.category,
      sizeOption: opt.sizeOption,
      unit: opt.unit,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
      isQuoteBased: item.isQuoteBased,
    };
    addLineItem(newItem);
  };

  const handleAddItem = (item: MenuItem, optionIndex: number) => {
    const opt = item.pricingOptions[optionIndex];
    const newItem: OrderLineItem = {
      menuItemId: item._id,
      menuItemName: item.name,
      menuType: item.menuType,
      category: item.category,
      sizeOption: opt?.sizeOption || 'Custom',
      unit: opt?.unit || 'each',
      quantity: item.minOrder || 1,
      unitPrice: opt?.price || 0,
      lineTotal: (opt?.price || 0) * (item.minOrder || 1),
      isQuoteBased: item.isQuoteBased,
    };
    addLineItem(newItem);
    toast.success(`Added ${item.name}`);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading menu...</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Menu Selection</h2>
      <p className="text-xs text-gray-500 mb-4">
        Add all items and sizes. Each row is one item–size combination.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-500 text-white text-xs uppercase tracking-wide">
              <th className="py-2 px-3 text-left">Category</th>
              <th className="py-2 px-3 text-left">Item Name</th>
              <th className="py-2 px-3 text-left">Size / Option</th>
              <th className="py-2 px-3 text-center">Qty</th>
              <th className="py-2 px-3 text-right">Unit Price</th>
              <th className="py-2 px-3 text-right">Total</th>
              <th className="py-2 px-3 text-left">Item Notes</th>
              <th className="py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => {
              const rowCategoryValue = item.menuType && item.category
                ? `${item.menuType}|${item.category}`
                : '';
              const [rowMenuType, rowCategory] = rowCategoryValue ? rowCategoryValue.split('|') : ['', ''];
              const categoryItems = menuItems.filter(
                (m) => m.menuType === rowMenuType && m.category === rowCategory
              );
              const selectedMenuItemId = item.menuItemId || '';
              const selectedMenu = menuItems.find((m) => m._id === selectedMenuItemId);
              const selectedOptIndex = selectedMenu
                ? selectedMenu.pricingOptions.findIndex(
                    (opt) => opt.sizeOption === item.sizeOption && opt.price === item.unitPrice
                  )
                : -1;
              const effectiveOptIndex = selectedOptIndex >= 0 ? selectedOptIndex : 0;

              return (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2 px-3 align-top">
                    <select
                      className="input-field text-xs"
                      value={rowCategoryValue}
                      onChange={(e) => handleCategoryChange(idx, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {categoriesWithPrefix.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 align-top">
                    <div className="flex items-center gap-2">
                      {renderVegChip(item.menuType)}
                      <select
                        className="input-field text-xs"
                        value={selectedMenuItemId}
                        onChange={(e) => handleItemChange(idx, e.target.value)}
                      >
                        <option value="">
                          {rowCategoryValue ? 'Select item…' : 'Select category first'}
                        </option>
                        {categoryItems.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-2 px-3 align-top">
                    {selectedMenu && selectedMenu.pricingOptions.length > 1 ? (
                      <select
                        className="input-field text-xs"
                        value={effectiveOptIndex}
                        onChange={(e) => handleSizeOptionChange(idx, e.target.value)}
                      >
                        {selectedMenu.pricingOptions.map((opt, oi) => (
                          <option key={oi} value={oi}>
                            {opt.sizeOption}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input-field text-xs bg-gray-50"
                        value={item.sizeOption}
                        readOnly
                        placeholder="e.g. Large Tray"
                      />
                    )}
                  </td>
                  <td className="py-2 px-3 align-top text-center">
                    <input
                      type="number"
                      min={1}
                      className="input-field w-20 text-xs text-center"
                      value={item.quantity}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-3 align-top text-right">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      className="input-field w-24 text-xs text-right"
                      value={item.unitPrice}
                      onChange={(e) => handlePriceChange(idx, e.target.value)}
                    />
                  </td>
                  <td className="py-2 px-3 align-top text-right font-semibold text-emerald-600">
                    {item.isQuoteBased ? 'Quote' : formatCurrency(item.lineTotal)}
                  </td>
                  <td className="py-2 px-3 align-top">
                    <input
                      className="input-field text-xs"
                      placeholder="Notes..."
                      value={item.notes || ''}
                      onChange={(e) => updateLineItem(idx, { notes: e.target.value })}
                    />
                  </td>
                  <td className="py-2 px-3 align-top text-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="text-red-400 hover:text-red-600 text-lg"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}

            {lineItems.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="py-6 px-4 text-center text-sm text-gray-400"
                >
                  No items yet. Use &quot;Add Menu Item&quot; to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1 px-4 py-2 border border-dashed border-saffron-500 text-saffron-600 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            ＋ Add Menu Item
          </button>
        </div>
      </div>

      {/* Totals summary matching design */}
      <div className="mt-4 rounded-xl bg-navy-500 text-white px-6 py-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-navy-100">Subtotal (Food)</span>
          <span>{formatCurrency(getSubtotal())}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-navy-100">Equipment (if any)</span>
          <span>{formatCurrency(equipmentTotal)}</span>
        </div>
        <div className="flex justify-between text-sm border-b border-navy-400 pb-2 mb-1">
          <span className="text-navy-100">Taxes / Fees</span>
          <span>{formatCurrency(getTax())}</span>
        </div>
        <div className="flex justify-between text-lg font-extrabold">
          <span className="text-gold-300">ESTIMATED TOTAL</span>
          <span className="text-gold-300">{formatCurrency(getTotal())}</span>
        </div>
      </div>

      {/* Equipment & Extras card */}
      <div className="mt-8 card">
        <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg shrink-0">
            🔧
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Equipment & Extras</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select all equipment needed alongside this order. Rental items are tracked for return.
            </p>
          </div>
        </div>
        <div className="pt-4 space-y-6">
          {/* 1 · Chafing Dishes — Rental */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">
              1 · Chafing Dishes — Rental
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                    <th className="py-2 px-3">Include?</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-3">Unit Rental ($)</th>
                    <th className="py-2 px-3">Rental Total</th>
                    <th className="py-2 px-3">Return Date</th>
                    <th className="py-2 px-3">Return Status</th>
                  </tr>
                </thead>
                <tbody>
                  {chafingRows.map((row, idx) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="py-2 px-3">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={(e) =>
                              handleChafingChange(idx, { include: e.target.checked })
                            }
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs">Yes</span>
                        </label>
                      </td>
                      <td className="py-2 px-3 font-medium">{row.typeLabel}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          className="input-field w-16 text-xs"
                          value={row.quantity || ''}
                          onChange={(e) =>
                            handleChafingChange(idx, {
                              quantity: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step={0.01}
                          min={0}
                          className="input-field w-20 text-xs"
                          value={row.unitRental}
                          onChange={(e) =>
                            handleChafingChange(idx, {
                              unitRental: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-emerald-600">
                        {row.include && row.quantity > 0
                          ? formatCurrency(row.quantity * row.unitRental)
                          : '$0.00'}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="date"
                          className="input-field text-xs w-36"
                          value={row.returnDate}
                          onChange={(e) =>
                            setChafingRow(idx, { returnDate: e.target.value })
                          }
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          className="input-field text-xs w-28"
                          value={row.returnStatus}
                          onChange={(e) =>
                            setChafingRow(idx, { returnStatus: e.target.value })
                          }
                        >
                          <option value="Pending">Pending</option>
                          <option value="Returned">Returned</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2 · Disposable Chinaware & Plates */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">
              2 · Disposable Chinaware & Plates
            </div>
            <p className="text-xs text-gray-500 mb-2">
              One-time use items — no return required.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                    <th className="py-2 px-3">Include?</th>
                    <th className="py-2 px-3">Type / Description</th>
                    <th className="py-2 px-3">Quantity</th>
                    <th className="py-2 px-3">Unit Price ($)</th>
                    <th className="py-2 px-3">Total</th>
                    <th className="py-2 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {disposableRows.map((row, idx) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="py-2 px-3">
                        <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={row.include}
                            onChange={(e) =>
                              handleDisposableChange(idx, { include: e.target.checked })
                            }
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-xs">Yes</span>
                        </label>
                      </td>
                      <td className="py-2 px-3 font-medium">{row.typeLabel}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          className="input-field w-16 text-xs"
                          value={row.quantity || ''}
                          onChange={(e) =>
                            handleDisposableChange(idx, {
                              quantity: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          step={0.01}
                          min={0}
                          className="input-field w-20 text-xs"
                          value={row.unitPrice}
                          onChange={(e) =>
                            handleDisposableChange(idx, {
                              unitPrice: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-emerald-600">
                        {row.include && row.quantity > 0
                          ? formatCurrency(row.quantity * row.unitPrice)
                          : '$0.00'}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          className="input-field text-xs"
                          placeholder="Notes…"
                          value={row.notes}
                          onChange={(e) =>
                            setDisposableRow(idx, { notes: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3 · Live Catering Stations */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">
              3 · Live Catering Stations
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Only applicable for Live Catering events. Select all stations required at the venue.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Stations Required</label>
                <div className="flex flex-wrap gap-2">
                  {LIVE_STATION_OPTIONS.map((station) => (
                    <label
                      key={station}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors',
                        liveStations.includes(station)
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={liveStations.includes(station)}
                        onChange={() => toggleLiveStation(station)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 sr-only"
                      />
                      <span>{LIVE_STATION_ICONS[station] || '•'}</span>
                      <span>{station}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Station Notes</label>
                <textarea
                  className="input-field min-h-[100px]"
                  placeholder="Staffing notes, space requirements, power needs, special instructions…"
                  value={liveStationNotes}
                  onChange={(e) => setLiveStationNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 4 · Other / Additional Equipment */}
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">
              4 · Other / Additional Equipment
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Additional Items Needed</label>
                <div className="flex flex-wrap gap-2">
                  {ADDITIONAL_EQUIPMENT_OPTIONS.map((item) => (
                    <label
                      key={item}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors',
                        additionalEquipment.includes(item)
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={additionalEquipment.includes(item)}
                        onChange={() => toggleAdditionalEquipment(item)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 sr-only"
                      />
                      <span>{ADDITIONAL_EQUIPMENT_ICONS[item] || '•'}</span>
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notes on Additional Items</label>
                <textarea
                  className="input-field min-h-[100px]"
                  placeholder="Any additional equipment or special requests not listed above…"
                  value={additionalEquipmentNotes}
                  onChange={(e) => setAdditionalEquipmentNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepReview() {
  const store = useOrderWizard();
  const total = store.getTotal();
  const balanceDue = store.getBalanceDue();
  const eventDateDisplay = store.event.eventDate
    ? (() => {
        try {
          const d = new Date(store.event.eventDate);
          return isNaN(d.getTime()) ? store.event.eventDate : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
          return store.event.eventDate;
        }
      })()
    : '—';

  return (
    <div className="space-y-6">
      {/* Order Summary card */}
      <div className="card">
        <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center text-lg shrink-0">
            📋
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            <p className="text-xs text-gray-500 mt-0.5">Review before generating quote</p>
          </div>
        </div>
        <div className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">CUSTOMER</p>
              <p className="font-medium text-navy-700 mt-1">{store.customer.name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">EVENT DATE</p>
              <p className="font-medium text-navy-700 mt-1">{eventDateDisplay}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">ORDER TOTAL</p>
              <p className="font-bold text-lg text-emerald-600 mt-1">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details card */}
      <div className="card">
        <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg shrink-0">
            💰
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">Record advance payment and outstanding balance</p>
          </div>
        </div>
        <div className="pt-4 space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <span className="shrink-0">⚠️</span>
            <span>Remind customer payment and outstanding balance</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Order Total (auto)</label>
              <input
                type="text"
                readOnly
                className="input-field bg-amber-50 border-amber-200 text-gray-900 font-semibold"
                value={formatCurrency(total)}
              />
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select
                className="input-field"
                value={store.paymentMethod}
                onChange={(e) => store.setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Check">Check</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Advance Payment Received ($) <span className="text-red-500">*</span></label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="0.01"
                value={store.advancePayment || ''}
                onChange={(e) => store.setAdvancePayment(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="label">Advance Payment Date</label>
              <input
                className="input-field"
                type="date"
                value={store.advancePaymentDate}
                onChange={(e) => store.setAdvancePaymentDate(e.target.value)}
              />
              <p className="text-[11px] text-gray-400 mt-0.5">dd-mm-yyyy</p>
            </div>
            <div>
              <label className="label">Balance Due</label>
              <input
                type="text"
                readOnly
                className="input-field bg-amber-50 border-amber-200 text-gray-900 font-semibold"
                value={formatCurrency(balanceDue)}
              />
            </div>
            <div>
              <label className="label">Balance Due Date</label>
              <input
                className="input-field"
                type="date"
                value={store.balanceDueDate}
                onChange={(e) => store.setBalanceDueDate(e.target.value)}
              />
              <p className="text-[11px] text-gray-400 mt-0.5">dd-mm-yyyy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notes card */}
      <div className="card">
        <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0">
            📝
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Notes</h2>
            <p className="text-xs text-gray-500 mt-0.5">Internal notes — not visible to customer</p>
          </div>
        </div>
        <div className="pt-4">
          <textarea
            className="input-field min-h-[120px]"
            rows={4}
            value={store.adminNotes}
            onChange={(e) => store.setAdminNotes(e.target.value)}
            placeholder="Any internal notes about this order, kitchen instructions, special handling."
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Main Wizard ---------- */

const STEPS = ['Customer & Event', 'Menu & Equipment', 'Payment & Review'];

export default function NewOrderPage() {
  const router = useRouter();
  const store = useOrderWizard();
  const [submitting, setSubmitting] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Reset wizard on mount
  useEffect(() => {
    store.reset();
    setLastSavedAt(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update "seconds ago" every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const canProceed = () => {
    switch (store.currentStep) {
      case 0:
        return (
          store.customer.name &&
          store.customer.phone &&
          store.event.eventDate &&
          store.event.deliveryType
        );
      case 1:
        return store.lineItems.length > 0;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async (redirectToQuote = false) => {
    setSubmitting(true);
    try {
      const equipmentLineItems = store.getEquipmentLineItems();
      const allLineItems = [...store.lineItems, ...equipmentLineItems];
      const equipmentNotes: string[] = [];
      if (store.liveStations.length > 0) {
        equipmentNotes.push(`Live stations: ${store.liveStations.join(', ')}.`);
      }
      if (store.liveStationNotes.trim()) {
        equipmentNotes.push(`Station notes: ${store.liveStationNotes.trim()}`);
      }
      if (store.additionalEquipment.length > 0) {
        equipmentNotes.push(`Additional equipment: ${store.additionalEquipment.join(', ')}.`);
      }
      if (store.additionalEquipmentNotes.trim()) {
        equipmentNotes.push(`Additional notes: ${store.additionalEquipmentNotes.trim()}`);
      }
      const paymentNote =
        store.paymentMethod || store.advancePaymentDate || store.balanceDueDate
          ? `Payment: ${store.paymentMethod || '—'}; Advance date: ${store.advancePaymentDate || '—'}; Balance due date: ${store.balanceDueDate || '—'}.`
          : '';
      const combinedAdminNotes = [store.adminNotes, paymentNote, ...equipmentNotes]
        .filter(Boolean)
        .join('\n');

      const payload = {
        customer: {
          ...store.customer,
          email: store.customer.email?.trim() || '',
        },
        event: {
          ...store.event,
          eventDate: String(store.event.eventDate || ''),
          guestCount:
            typeof store.event.guestCount === 'number' && !Number.isNaN(store.event.guestCount)
              ? store.event.guestCount
              : undefined,
        },
        lineItems: allLineItems.filter(
          (li) =>
            li.menuItemId &&
            li.menuItemName &&
            li.category &&
            li.sizeOption &&
            li.unit &&
            typeof li.quantity === 'number' &&
            typeof li.unitPrice === 'number' &&
            typeof li.lineTotal === 'number'
        ),
        discount: Number(store.discount) || 0,
        discountType: store.discountType,
        deliveryFee: Number(store.deliveryFee) || 0,
        taxRate: Number(store.taxRate) || 8.25,
        advancePayment: Number(store.advancePayment) || 0,
        adminNotes: combinedAdminNotes || undefined,
      };

      if (payload.lineItems.length === 0) {
        toast.error('Add at least one menu item before submitting.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(redirectToQuote ? `Order ${data.data.orderNumber} created!` : 'Draft saved.');
        setLastSavedAt(new Date());
        store.reset();
        if (redirectToQuote) {
          router.push(`/orders/${data.data._id}?sendQuote=1`);
        } else {
          router.push('/orders');
        }
      } else {
        const details = data.details as { formErrors?: string[]; fieldErrors?: Record<string, string[]> } | undefined;
        const firstError =
          details?.fieldErrors &&
          Object.values(details.fieldErrors).flat().find(Boolean);
        const message =
          firstError || details?.formErrors?.[0] || data.error || 'Failed to create order';
        toast.error(message);
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - matches New Order prototype */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-500 flex items-center gap-3">
            New Catering Order
            <span className="badge bg-saffron-50 text-saffron-700 border border-saffron-200">
              Draft
            </span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Fill in all required fields. Order will be saved automatically as you type.
          </p>
        </div>
      </div>

      {/* Step indicator - horizontal bar similar to HTML mockup */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex overflow-hidden">
        {STEPS.map((step, i) => {
          const isActive = i === store.currentStep;
          const isDone = i < store.currentStep;

          return (
            <button
              key={step}
              type="button"
              onClick={() => isDone && store.setStep(i)}
              className={cn(
                'flex-1 flex items-center gap-3 px-4 py-3 border-b-4 text-left transition-colors',
                i > 0 && 'border-l border-gray-100',
                isActive && 'bg-saffron-50 border-b-saffron-500',
                isDone && !isActive && 'bg-emerald-50 border-b-emerald-500',
                !isActive && !isDone && 'bg-white border-b-transparent'
              )}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                  isActive && 'bg-saffron-500 text-white',
                  isDone && !isActive && 'bg-emerald-500 text-white',
                  !isActive && !isDone && 'bg-gray-200 text-gray-500'
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-semibold',
                  isActive && 'text-saffron-700',
                  isDone && !isActive && 'text-emerald-700',
                  !isActive && !isDone && 'text-gray-500'
                )}
              >
                {step}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      {store.currentStep === 0 && <StepCustomerAndEvent />}
      {store.currentStep === 1 && (
        <div className="card">
          <StepMenuItems />
        </div>
      )}
      {store.currentStep === 2 && (
        <div className="card">
          <StepReview />
        </div>
      )}

      {/* Navigation footer - light cream/yellow bar */}
      <div className="bg-saffron-50/80 border-t border-saffron-100 -mx-6 md:-mx-8 px-6 md:px-8 py-4 rounded-b-xl">
        <div className="flex items-center justify-between gap-4">
          {/* Auto-save status - left */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
            {submitting ? (
              <span>Saving...</span>
            ) : lastSavedAt ? (
              <span>
                Auto-saved {Math.max(0, Math.floor((now.getTime() - lastSavedAt.getTime()) / 1000))} seconds ago
              </span>
            ) : (
              <span>Auto-saved 0 seconds ago</span>
            )}
          </div>

          {/* Actions - right */}
          <div className="flex items-center gap-3">
            {store.currentStep > 0 && (
              <button
                onClick={store.prevStep}
                disabled={store.currentStep === 0}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
            )}

            {store.currentStep < 2 ? (
              <>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="btn-outline disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={store.nextStep}
                  disabled={!canProceed()}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {store.currentStep === 0 && 'Next: Menu & Equipment →'}
                  {store.currentStep === 1 && 'Next: Payment & Review →'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting || !canProceed()}
                  className="btn-outline disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting || !canProceed()}
                  className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-lg px-6 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Generate Quote & Email →'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
