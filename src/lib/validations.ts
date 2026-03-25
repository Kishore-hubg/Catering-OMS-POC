import { z } from 'zod';

// Menu types enum
export const MenuTypeEnum = z.enum([
  'Veg Menu',
  'Non-Veg Menu',
  'Desserts',
  'Puja Food',
  'Live Catering',
  'Chafing Dishes',
  'Disposable Plates',
  'Drinks',
  'Breakfast',
]);

export const OrderStatusEnum = z.enum([
  'draft',
  'quoted',
  'quote_pending',
  'confirmed',
  'completed',
  'cancelled',
]);

export const DeliveryTypeEnum = z.enum(['pickup', 'delivery', 'live']);

/**
 * International-friendly phone check (no extra dependencies).
 * Uses E.164-style bounds: 8–15 digits after stripping formatting; rejects obvious junk.
 * US/Canada NANP numbers (10 digits, optional leading 1) must still pass NANP rules when applicable.
 */
export function isValidPhoneNumber(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return false;
  if (/^0+$/.test(digits)) return false;
  if (/^(\d)\1{7,}$/.test(digits)) return false;

  const isUsStyleInput =
    digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  let n = digits;
  if (digits.length === 11 && digits.startsWith('1')) n = n.slice(1);
  if (isUsStyleInput && n.length === 10) {
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(n);
  }

  return true;
}

// Customer validation
export const CustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email(
      'Enter a valid email address – if this is wrong, false responses will propagate to the wrong customer.'
    )
    .max(254, 'Email is too long'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .refine(isValidPhoneNumber, {
      message:
        'Enter a valid phone number (US/Canada: 10 digits, optional +1; other countries: 8–15 digits with country code)',
    }),
  address: z.string().optional(),
  dietaryNotes: z.string().optional(),
});

// Event validation
export const EventSchema = z.object({
  eventDate: z.string().min(1, 'Event date is required'),
  eventTime: z.string().optional(),
  eventType: z.string().optional(),
  guestCount: z.number().min(1).optional(),
  venue: z.string().optional(),
  deliveryType: DeliveryTypeEnum,
  deliveryAddress: z.string().optional(),
  deliveryNotes: z.string().optional(),
  deliveryCity: z.string().optional(),
  deliveryState: z.string().optional(),
  deliveryZip: z.string().optional(),
  setupTimeOption: z.string().optional(),
  liveSetupArrivalTime: z.string().optional(),
  liveStaffCount: z.number().min(1).optional(),
  liveKitchenType: z.string().optional(),
  liveSetupNotes: z.string().optional(),
  eventNotes: z.string().optional(),
}).refine(
  (data) => {
    if (data.deliveryType === 'delivery') {
      return !!data.deliveryAddress;
    }
    return true;
  },
  { message: 'Delivery address is required for delivery orders', path: ['deliveryAddress'] }
);

// Line item validation
export const LineItemSchema = z.object({
  menuItemId: z.string().min(1),
  menuItemName: z.string().min(1),
  menuType: MenuTypeEnum,
  category: z.string().min(1),
  sizeOption: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
  notes: z.string().optional(),
  isQuoteBased: z.boolean().optional(),
});

// Create order validation
export const CreateOrderSchema = z.object({
  customer: CustomerSchema,
  event: EventSchema,
  lineItems: z.array(LineItemSchema).min(1, 'At least one item is required'),
  discount: z.number().min(0).default(0),
  discountType: z.enum(['flat', 'percent']).default('flat'),
  deliveryFee: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(8.25),
  advancePayment: z.number().min(0).default(0),
  adminNotes: z.string().optional(),
});

// Update order validation (partial)
export const UpdateOrderSchema = z.object({
  customer: CustomerSchema.optional(),
  event: EventSchema.optional(),
  lineItems: z.array(LineItemSchema).optional(),
  discount: z.number().min(0).optional(),
  discountType: z.enum(['flat', 'percent']).optional(),
  deliveryFee: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  advancePayment: z.number().min(0).optional(),
  adminNotes: z.string().optional(),
  status: OrderStatusEnum.optional(),
  changeReason: z.string().optional(),
});

// Email compose validation
export const EmailComposeSchema = z.object({
  orderId: z.string().min(1),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  attachQuote: z.boolean().default(true),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type EmailComposeInput = z.infer<typeof EmailComposeSchema>;
