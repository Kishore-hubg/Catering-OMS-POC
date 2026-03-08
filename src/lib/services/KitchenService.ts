import { connectDB } from '@/lib/db';
import Order from '@/lib/models/Order';
import { getCached, setCache } from '@/lib/redis';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';
import type { KitchenDayPlan } from '@/types';

export class KitchenService {
  static async getWeeklyPlan(startDate?: Date): Promise<KitchenDayPlan[]> {
    const start = startDate || new Date();
    const cacheKey = `kitchen:weekly:${format(start, 'yyyy-MM-dd')}`;

    // Try cache first
    const cached = await getCached<KitchenDayPlan[]>(cacheKey);
    if (cached) return cached;

    await connectDB();

    const weekStart = startOfDay(start);
    const weekEnd = endOfDay(addDays(weekStart, 6));

    const orders = await Order.find({
      'event.eventDate': { $gte: weekStart, $lte: weekEnd },
      status: { $in: ['draft', 'quoted', 'confirmed'] },
    })
      .sort({ 'event.eventDate': 1, 'event.eventTime': 1 })
      .lean();

    // Group by date
    const dayPlans: KitchenDayPlan[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayOrders = orders.filter(
        (o) => format(new Date(o.event.eventDate), 'yyyy-MM-dd') === dateStr
      );

      let totalGuests = 0;
      let vegItems = 0;
      let nonVegItems = 0;
      let dessertItems = 0;
      let pujaItems = 0;

      const mappedOrders = dayOrders.map((order) => {
        totalGuests += order.event.guestCount || 0;

        const items = order.lineItems.map((item: {
          category: string;
          menuType: string;
          menuItemName: string;
          sizeOption: string;
          quantity: number;
          lineTotal?: number;
          notes?: string;
        }) => {
          if (item.menuType === 'Veg Menu') vegItems++;
          if (item.menuType === 'Puja Food') pujaItems++;
          if (item.menuType === 'Non-Veg Menu') nonVegItems++;
          if (item.menuType === 'Desserts') dessertItems++;

          return {
            category: item.category,
            menuType: item.menuType as KitchenDayPlan['orders'][0]['items'][0]['menuType'],
            name: item.menuItemName,
            sizeOption: item.sizeOption,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            notes: item.notes,
          };
        });

        return {
          orderNumber: order.orderNumber,
          customerName: order.customer.name,
          eventTime: order.event.eventTime,
          eventType: order.event.eventType,
          guestCount: order.event.guestCount,
          deliveryType: order.event.deliveryType as 'pickup' | 'delivery' | 'live',
          items,
        };
      });

      dayPlans.push({
        date: dateStr,
        orders: mappedOrders,
        summary: {
          totalOrders: dayOrders.length,
          totalGuests,
          vegItems,
          nonVegItems,
          dessertItems,
          pujaItems,
        },
      });
    }

    // Cache for 5 minutes
    await setCache(cacheKey, dayPlans, 300);

    return dayPlans;
  }

  static async getDayPlan(date: string): Promise<KitchenDayPlan> {
    const plans = await this.getWeeklyPlan(new Date(date));
    return plans.find((p) => p.date === date) || {
      date,
      orders: [],
      summary: { totalOrders: 0, totalGuests: 0, vegItems: 0, nonVegItems: 0, dessertItems: 0, pujaItems: 0 },
    };
  }
}
