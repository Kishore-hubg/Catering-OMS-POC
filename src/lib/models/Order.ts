import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  event: {
    eventDate: Date;
    eventTime?: string;
    eventType?: string;
    guestCount?: number;
    venue?: string;
    deliveryType: 'pickup' | 'delivery' | 'live';
    deliveryAddress?: string;
    deliveryNotes?: string;
  };
  lineItems: {
    menuItemId: string;
    menuItemName: string;
    menuType: string;
    category: string;
    sizeOption: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    notes?: string;
    isQuoteBased?: boolean;
  }[];
  subtotal: number;
  discount: number;
  discountType: 'flat' | 'percent';
  deliveryFee: number;
  tax: number;
  taxRate: number;
  total: number;
  advancePayment: number;
  balanceDue: number;
  status: string;
  adminNotes?: string;
  changeHistory: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
    changedAt: Date;
    reason?: string;
  }[];
  quoteSentAt?: Date;
  confirmedAt?: Date;
}

const LineItemSchema = new Schema(
  {
    menuItemId: { type: String, required: true },
    menuItemName: { type: String, required: true },
    menuType: { type: String, required: true },
    category: { type: String, required: true },
    sizeOption: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    notes: { type: String },
    isQuoteBased: { type: Boolean, default: false },
  },
  { _id: false }
);

const ChangeRecordSchema = new Schema(
  {
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String },
    },
    event: {
      eventDate: { type: Date, required: true, index: true },
      eventTime: { type: String },
      eventType: { type: String },
      guestCount: { type: Number },
      venue: { type: String },
      deliveryType: { type: String, enum: ['pickup', 'delivery', 'live'], required: true },
      deliveryAddress: { type: String },
      deliveryNotes: { type: String },
    },
    lineItems: [LineItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    taxRate: { type: Number, default: 8.25 },
    total: { type: Number, required: true, default: 0 },
    advancePayment: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'quoted', 'confirmed', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    adminNotes: { type: String },
    changeHistory: [ChangeRecordSchema],
    quoteSentAt: { type: Date },
    confirmedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Index for kitchen plan-ahead queries
OrderSchema.index({ 'event.eventDate': 1, status: 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.models.Order ||
  mongoose.model<IOrder>('Order', OrderSchema);
