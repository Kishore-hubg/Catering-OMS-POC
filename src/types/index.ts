// Menu types
export type MenuType =
  | 'Veg Menu'
  | 'Non-Veg Menu'
  | 'Desserts'
  | 'Puja Food'
  | 'Live Catering'
  | 'Chafing Dishes'
  | 'Disposable Plates'
  | 'Drinks'
  | 'Breakfast';

export interface PricingOption {
  sizeOption: string;
  price: number | null;
  unit: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  menuType: MenuType;
  notes?: string;
  pricingOptions: PricingOption[];
  minOrder?: number;
  minOrderUnit?: string;
  isQuoteBased?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Order types
export type OrderStatus =
  | 'draft'
  | 'quoted'
  | 'quote_pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';
export type DeliveryType = 'pickup' | 'delivery' | 'live';

export interface OrderLineItem {
  menuItemId: string;
  menuItemName: string;
  menuType: MenuType;
  category: string;
  sizeOption: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  isQuoteBased?: boolean;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address?: string;
  dietaryNotes?: string;
}

export interface EventInfo {
  eventDate: string;
  eventTime?: string;
  eventType?: string;
  guestCount?: number;
  venue?: string;
  deliveryType: DeliveryType;
  deliveryAddress?: string;
  deliveryNotes?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  setupTimeOption?: string;
  liveSetupArrivalTime?: string;
  liveStaffCount?: number;
  liveKitchenType?: string;
  liveSetupNotes?: string;
  eventNotes?: string;
}

export interface ChangeRecord {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: string;
  reason?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: CustomerInfo;
  event: EventInfo;
  lineItems: OrderLineItem[];
  subtotal: number;
  discount: number;
  discountType: 'flat' | 'percent';
  deliveryFee: number;
  tax: number;
  taxRate: number;
  total: number;
  advancePayment: number;
  balanceDue: number;
  status: OrderStatus;
  adminNotes?: string;
  changeHistory: ChangeRecord[];
  quoteSentAt?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Kitchen Plan types
export interface KitchenDayPlan {
  date: string;
  orders: {
    orderNumber: string;
    customerName: string;
    eventTime?: string;
    eventType?: string;
    guestCount?: number;
    deliveryType: DeliveryType;
    items: {
      category: string;
      menuType: MenuType;
      name: string;
      sizeOption: string;
      quantity: number;
      lineTotal?: number;
      notes?: string;
    }[];
  }[];
  summary: {
    totalOrders: number;
    totalGuests: number;
    vegItems: number;
    nonVegItems: number;
    dessertItems?: number;
    pujaItems?: number;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
