import { create } from 'zustand';
import type { OrderLineItem, CustomerInfo, EventInfo, DeliveryType, MenuType } from '@/types';

export interface ChafingRow {
  id: string;
  typeLabel: string;
  include: boolean;
  quantity: number;
  unitRental: number;
}

export interface DisposableRow {
  id: string;
  typeLabel: string;
  include: boolean;
  quantity: number;
  unitPrice: number;
  notes: string;
}

const CHAFING_ROWS: ChafingRow[] = [
  { id: 'chafing-economic', typeLabel: 'Economic Chafing Dish', include: false, quantity: 0, unitRental: 10 },
  { id: 'chafing-rotating', typeLabel: 'Rotating Chafing Dish', include: false, quantity: 0, unitRental: 25 },
];

const DISPOSABLE_ROWS: DisposableRow[] = [
  { id: 'disp-plate', typeLabel: 'Disposable Dinner Plate', include: false, quantity: 0, unitPrice: 0.5, notes: '' },
  { id: 'disp-bowl', typeLabel: 'Disposable Bowl', include: false, quantity: 0, unitPrice: 0.3, notes: '' },
  { id: 'disp-utensils', typeLabel: 'Disposable Serving Spoons / Utensils Set', include: false, quantity: 0, unitPrice: 1, notes: '' },
  { id: 'disp-cups', typeLabel: 'Disposable Cups / Glasses', include: false, quantity: 0, unitPrice: 0.25, notes: '' },
];

export const LIVE_STATION_OPTIONS = [
  'Chaat Station',
  'Biryani Station',
  'Roti / Paratha Station',
  'Dessert / Halwa Station',
  'Indo-Chinese Station',
  'Indo-Mexican Station',
  'Pizza / Fusion Oven',
  'Pasta Station',
];

export const ADDITIONAL_EQUIPMENT_OPTIONS = [
  'Sterno / Fuel Cans',
  'Serving Spoon Sets',
  'Cooler / Ice Chest',
  'Table Covers / Linens',
  'Extension Cords / Power',
];

interface OrderWizardState {
  // Step tracking
  currentStep: number;

  // Customer info (Step 1)
  customer: CustomerInfo;

  // Event info (Step 2)
  event: EventInfo;

  // Line items (Step 3)
  lineItems: OrderLineItem[];

  // Equipment & Extras (Step 2)
  chafingRows: ChafingRow[];
  disposableRows: DisposableRow[];
  liveStations: string[];
  liveStationNotes: string;
  additionalEquipment: string[];
  additionalEquipmentNotes: string;

  // Pricing adjustments (Step 4)
  discount: number;
  discountType: 'flat' | 'percent';
  deliveryFee: number;
  taxRate: number;
  advancePayment: number;
  adminNotes: string;
  equipmentTotal: number;
  paymentMethod: string;
  advancePaymentDate: string;
  balanceDueDate: string;

  // Actions
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setCustomer: (customer: Partial<CustomerInfo>) => void;
  setEvent: (event: Partial<EventInfo>) => void;
  addLineItem: (item: OrderLineItem) => void;
  updateLineItem: (index: number, item: Partial<OrderLineItem>) => void;
  removeLineItem: (index: number) => void;
  setChafingRow: (index: number, row: Partial<ChafingRow>) => void;
  setDisposableRow: (index: number, row: Partial<DisposableRow>) => void;
  setLiveStations: (stations: string[]) => void;
  toggleLiveStation: (station: string) => void;
  setLiveStationNotes: (notes: string) => void;
  setAdditionalEquipment: (items: string[]) => void;
  toggleAdditionalEquipment: (item: string) => void;
  setAdditionalEquipmentNotes: (notes: string) => void;
  setDiscount: (discount: number) => void;
  setDiscountType: (type: 'flat' | 'percent') => void;
  setDeliveryFee: (fee: number) => void;
  setTaxRate: (rate: number) => void;
  setAdvancePayment: (amount: number) => void;
  setAdminNotes: (notes: string) => void;
  setEquipmentTotal: (total: number) => void;
  setPaymentMethod: (method: string) => void;
  setAdvancePaymentDate: (date: string) => void;
  setBalanceDueDate: (date: string) => void;
  syncEquipmentTotal: () => void;
  reset: () => void;

  // Computed
  getSubtotal: () => number;
  getEquipmentTotalFromExtras: () => number;
  getDiscountAmount: () => number;
  getTax: () => number;
  getTotal: () => number;
  getBalanceDue: () => number;
  getEquipmentLineItems: () => OrderLineItem[];
}

const initialCustomer: CustomerInfo = {
  name: '',
  email: '',
  phone: '',
  address: '',
  dietaryNotes: '',
};

const initialEvent: EventInfo = {
  eventDate: '',
  eventTime: '',
  eventType: '',
  guestCount: undefined,
  venue: '',
  deliveryType: 'delivery' as DeliveryType,
  deliveryAddress: '',
  deliveryNotes: '',
  deliveryCity: '',
  deliveryState: '',
  deliveryZip: '',
  setupTimeOption: '',
  liveSetupArrivalTime: '',
  liveStaffCount: undefined,
  liveKitchenType: '',
  liveSetupNotes: '',
  eventNotes: '',
};

export const useOrderWizard = create<OrderWizardState>((set, get) => ({
  currentStep: 0,
  customer: { ...initialCustomer },
  event: { ...initialEvent },
  lineItems: [],
  chafingRows: CHAFING_ROWS.map((r) => ({ ...r })),
  disposableRows: DISPOSABLE_ROWS.map((r) => ({ ...r })),
  liveStations: [],
  liveStationNotes: '',
  additionalEquipment: [],
  additionalEquipmentNotes: '',
  discount: 0,
  discountType: 'flat',
  deliveryFee: 0,
  taxRate: 8.25,
  advancePayment: 0,
  adminNotes: '',
  equipmentTotal: 0,
  paymentMethod: 'Cash',
  advancePaymentDate: '',
  balanceDueDate: '',

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 3) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),

  setCustomer: (customer) =>
    set((s) => ({ customer: { ...s.customer, ...customer } })),

  setEvent: (event) =>
    set((s) => ({ event: { ...s.event, ...event } })),

  addLineItem: (item) =>
    set((s) => ({ lineItems: [...s.lineItems, item] })),

  updateLineItem: (index, item) =>
    set((s) => ({
      lineItems: s.lineItems.map((li, i) => (i === index ? { ...li, ...item } : li)),
    })),

  removeLineItem: (index) =>
    set((s) => ({
      lineItems: s.lineItems.filter((_, i) => i !== index),
    })),

  setChafingRow: (index, row) =>
    set((s) => ({
      chafingRows: s.chafingRows.map((r, i) => (i === index ? { ...r, ...row } : r)),
    })),

  setDisposableRow: (index, row) =>
    set((s) => ({
      disposableRows: s.disposableRows.map((r, i) => (i === index ? { ...r, ...row } : r)),
    })),

  setLiveStations: (stations) => set({ liveStations: stations }),

  toggleLiveStation: (station) =>
    set((s) => ({
      liveStations: s.liveStations.includes(station)
        ? s.liveStations.filter((x) => x !== station)
        : [...s.liveStations, station],
    })),

  setLiveStationNotes: (notes) => set({ liveStationNotes: notes }),

  setAdditionalEquipment: (items) => set({ additionalEquipment: items }),

  toggleAdditionalEquipment: (item) =>
    set((s) => ({
      additionalEquipment: s.additionalEquipment.includes(item)
        ? s.additionalEquipment.filter((x) => x !== item)
        : [...s.additionalEquipment, item],
    })),

  setAdditionalEquipmentNotes: (notes) => set({ additionalEquipmentNotes: notes }),

  setDiscount: (discount) => set({ discount }),
  setDiscountType: (discountType) => set({ discountType }),
  setDeliveryFee: (deliveryFee) => set({ deliveryFee }),
  setTaxRate: (taxRate) => set({ taxRate }),
  setAdvancePayment: (advancePayment) => set({ advancePayment }),
  setAdminNotes: (adminNotes) => set({ adminNotes }),
  setEquipmentTotal: (equipmentTotal) => set({ equipmentTotal }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setAdvancePaymentDate: (advancePaymentDate) => set({ advancePaymentDate }),
  setBalanceDueDate: (balanceDueDate) => set({ balanceDueDate }),

  syncEquipmentTotal: () => {
    const total = get().getEquipmentTotalFromExtras();
    set({ equipmentTotal: total });
  },

  reset: () =>
    set({
      currentStep: 0,
      customer: { ...initialCustomer },
      event: { ...initialEvent },
      lineItems: [],
      chafingRows: CHAFING_ROWS.map((r) => ({ ...r })),
      disposableRows: DISPOSABLE_ROWS.map((r) => ({ ...r })),
      liveStations: [],
      liveStationNotes: '',
      additionalEquipment: [],
      additionalEquipmentNotes: '',
      discount: 0,
      discountType: 'flat',
      deliveryFee: 0,
      taxRate: 8.25,
      advancePayment: 0,
      adminNotes: '',
      equipmentTotal: 0,
      paymentMethod: 'Cash',
      advancePaymentDate: '',
      balanceDueDate: '',
    }),

  getSubtotal: () => {
    const { lineItems } = get();
    return lineItems
      .filter(
        (item) =>
          !item.isQuoteBased &&
          item.menuType !== 'Chafing Dishes' &&
          item.menuType !== 'Disposable Plates'
      )
      .reduce((sum, item) => sum + item.lineTotal, 0);
  },

  getEquipmentTotalFromExtras: () => {
    const { chafingRows, disposableRows } = get();
    const chafingTotal = chafingRows
      .filter((r) => r.include && r.quantity > 0)
      .reduce((sum, r) => sum + r.quantity * r.unitRental, 0);
    const disposableTotal = disposableRows
      .filter((r) => r.include && r.quantity > 0)
      .reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);
    return chafingTotal + disposableTotal;
  },

  getEquipmentLineItems: () => {
    const { chafingRows, disposableRows } = get();
    const items: OrderLineItem[] = [];
    chafingRows.forEach((r) => {
      if (r.include && r.quantity > 0) {
        items.push({
          menuItemId: r.id,
          menuItemName: r.typeLabel,
          menuType: 'Chafing Dishes' as MenuType,
          category: 'Rental',
          sizeOption: r.typeLabel,
          unit: 'each',
          quantity: r.quantity,
          unitPrice: r.unitRental,
          lineTotal: r.quantity * r.unitRental,
        });
      }
    });
    disposableRows.forEach((r) => {
      if (r.include && r.quantity > 0) {
        items.push({
          menuItemId: r.id,
          menuItemName: r.typeLabel,
          menuType: 'Disposable Plates' as MenuType,
          category: 'Disposable',
          sizeOption: r.typeLabel,
          unit: 'each',
          quantity: r.quantity,
          unitPrice: r.unitPrice,
          lineTotal: r.quantity * r.unitPrice,
          notes: r.notes || undefined,
        });
      }
    });
    return items;
  },

  getDiscountAmount: () => {
    const { discount, discountType, equipmentTotal } = get();
    const foodSubtotal = get().getSubtotal();
    const base = foodSubtotal + equipmentTotal;
    return discountType === 'percent' ? base * (discount / 100) : discount;
  },

  getTax: () => {
    const { taxRate, equipmentTotal } = get();
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    return Math.max(0, subtotal + equipmentTotal - discountAmount) * (taxRate / 100);
  },

  getTotal: () => {
    const { deliveryFee, equipmentTotal } = get();
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const tax = get().getTax();
    return Math.max(0, subtotal + equipmentTotal - discountAmount) + tax + deliveryFee;
  },

  getBalanceDue: () => {
    const { advancePayment } = get();
    return Math.max(0, get().getTotal() - advancePayment);
  },
}));
