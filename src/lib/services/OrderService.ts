import { connectDB } from '@/lib/db';
import Order from '@/lib/models/Order';
import { getNextOrderNumber } from '@/lib/models/Counter';
import { invalidateCache } from '@/lib/redis';
import type { CreateOrderInput, UpdateOrderInput } from '@/lib/validations';
import type { Order as OrderType, OrderStatus } from '@/types';

function calculateTotals(data: {
  lineItems: { lineTotal: number; isQuoteBased?: boolean }[];
  discount: number;
  discountType: 'flat' | 'percent';
  deliveryFee: number;
  taxRate: number;
  advancePayment: number;
}) {
  const subtotal = data.lineItems
    .filter((item) => !item.isQuoteBased)
    .reduce((sum, item) => sum + item.lineTotal, 0);

  let discountAmount = 0;
  if (data.discountType === 'percent') {
    discountAmount = subtotal * (data.discount / 100);
  } else {
    discountAmount = data.discount;
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const tax = afterDiscount * (data.taxRate / 100);
  const total = afterDiscount + tax + data.deliveryFee;
  const balanceDue = Math.max(0, total - data.advancePayment);

  return { subtotal, tax, total, balanceDue };
}

export class OrderService {
  static async create(input: CreateOrderInput) {
    await connectDB();

    const orderNumber = await getNextOrderNumber();
    const { subtotal, tax, total, balanceDue } = calculateTotals({
      lineItems: input.lineItems,
      discount: input.discount,
      discountType: input.discountType,
      deliveryFee: input.deliveryFee,
      taxRate: input.taxRate,
      advancePayment: input.advancePayment,
    });

    const order = await Order.create({
      orderNumber,
      customer: input.customer,
      event: {
        ...input.event,
        eventDate: new Date(input.event.eventDate),
      },
      lineItems: input.lineItems,
      subtotal,
      discount: input.discount,
      discountType: input.discountType,
      deliveryFee: input.deliveryFee,
      tax,
      taxRate: input.taxRate,
      total,
      advancePayment: input.advancePayment,
      balanceDue,
      status: 'draft',
      adminNotes: input.adminNotes,
      changeHistory: [],
    });

    await invalidateCache('kitchen:*');

    return order.toObject();
  }

  static async getAll(filters?: {
    status?: OrderStatus;
    search?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    await connectDB();

    const query: Record<string, unknown> = {};

    if (filters?.status) query.status = filters.status;
    if (filters?.search) {
      query.$or = [
        { orderNumber: { $regex: filters.search, $options: 'i' } },
        { 'customer.name': { $regex: filters.search, $options: 'i' } },
        { 'customer.email': { $regex: filters.search, $options: 'i' } },
        { 'event.eventType': { $regex: filters.search, $options: 'i' } },
      ];
    }
    if (filters?.eventType) query['event.eventType'] = filters.eventType;
    if (filters?.startDate || filters?.endDate) {
      query['event.eventDate'] = {};
      if (filters?.startDate) {
        (query['event.eventDate'] as Record<string, unknown>).$gte = new Date(filters.startDate);
      }
      if (filters?.endDate) {
        (query['event.eventDate'] as Record<string, unknown>).$lte = new Date(filters.endDate);
      }
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const [orders, total, stats] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
      this.getListStats(),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  /** Stats for Order History: totalOrders, confirmed, awaitingApproval, revised */
  static async getListStats() {
    await connectDB();
    const thisYearStart = new Date(new Date().getFullYear(), 0, 1);
    const [totalOrders, confirmed, awaitingApproval, revised] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: { $in: ['confirmed', 'completed'] }, createdAt: { $gte: thisYearStart } }),
      Order.countDocuments({ status: 'quoted' }),
      Order.countDocuments({ $expr: { $gt: [{ $size: { $ifNull: ['$changeHistory', []] } }, 0] } }),
    ]);
    return { totalOrders, confirmed, awaitingApproval, revised };
  }

  static async getById(id: string) {
    await connectDB();
    return Order.findById(id).lean();
  }

  static async getByOrderNumber(orderNumber: string) {
    await connectDB();
    return Order.findOne({ orderNumber }).lean();
  }

  static async update(id: string, input: UpdateOrderInput) {
    await connectDB();

    const existing = await Order.findById(id);
    if (!existing) throw new Error('Order not found');

    const changes: { field: string; oldValue: unknown; newValue: unknown; changedAt: Date; reason?: string }[] = [];

    // Track changes for audit trail
    if (input.lineItems) {
      changes.push({
        field: 'lineItems',
        oldValue: `${existing.lineItems.length} items`,
        newValue: `${input.lineItems.length} items`,
        changedAt: new Date(),
        reason: input.changeReason,
      });
    }

    if (input.discount !== undefined && input.discount !== existing.discount) {
      changes.push({
        field: 'discount',
        oldValue: existing.discount,
        newValue: input.discount,
        changedAt: new Date(),
        reason: input.changeReason,
      });
    }

    if (input.status && input.status !== existing.status) {
      changes.push({
        field: 'status',
        oldValue: existing.status,
        newValue: input.status,
        changedAt: new Date(),
        reason: input.changeReason,
      });
    }

    // Apply updates
    if (input.customer) existing.customer = { ...existing.customer, ...input.customer } as typeof existing.customer;
    if (input.event) {
      existing.event = {
        ...existing.event,
        ...input.event,
        eventDate: input.event.eventDate ? new Date(input.event.eventDate) : existing.event.eventDate,
      } as typeof existing.event;
    }
    if (input.lineItems) existing.lineItems = input.lineItems as typeof existing.lineItems;
    if (input.discount !== undefined) existing.discount = input.discount;
    if (input.discountType) existing.discountType = input.discountType;
    if (input.deliveryFee !== undefined) existing.deliveryFee = input.deliveryFee;
    if (input.taxRate !== undefined) existing.taxRate = input.taxRate;
    if (input.advancePayment !== undefined) existing.advancePayment = input.advancePayment;
    if (input.adminNotes !== undefined) existing.adminNotes = input.adminNotes;
    if (input.status) {
      existing.status = input.status;
      if (input.status === 'confirmed') existing.confirmedAt = new Date();
    }

    // Recalculate totals
    const { subtotal, tax, total, balanceDue } = calculateTotals({
      lineItems: existing.lineItems,
      discount: existing.discount,
      discountType: existing.discountType as 'flat' | 'percent',
      deliveryFee: existing.deliveryFee,
      taxRate: existing.taxRate,
      advancePayment: existing.advancePayment,
    });

    existing.subtotal = subtotal;
    existing.tax = tax;
    existing.total = total;
    existing.balanceDue = balanceDue;

    if (changes.length > 0) {
      existing.changeHistory.push(...changes);
    }

    await existing.save();
    await invalidateCache('kitchen:*');

    return existing.toObject();
  }

  static async delete(id: string) {
    await connectDB();
    const result = await Order.findByIdAndDelete(id);
    if (result) await invalidateCache('kitchen:*');
    return result;
  }

  static async getStats() {
    await connectDB();

    const [statusCounts, recentOrders, totalRevenue] = await Promise.all([
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
      Order.aggregate([
        { $match: { status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    return {
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s._id, s.count])),
      recentOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
  }
}
