import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/EmailService';
import { OrderService } from '@/lib/services/OrderService';
import { EmailComposeSchema } from '@/lib/validations';
import { format } from 'date-fns';

// POST /api/email - compose AI email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'compose') {
      const { orderId } = body;
      const order = await OrderService.getById(orderId);
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      type OrderType = import('@/types').Order;
      const o = order as OrderType;

      const composed = await EmailService.composeWithAI({
        orderNumber: o.orderNumber,
        customerName: o.customer.name,
        eventDate: format(new Date(o.event.eventDate), 'MMMM d, yyyy'),
        eventType: o.event.eventType,
        total: o.total,
        itemCount: o.lineItems.length,
      });

      return NextResponse.json({ success: true, data: composed });
    }

    if (action === 'send') {
      const parsed = EmailComposeSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const result = await EmailService.send({
        to: parsed.data.to,
        subject: parsed.data.subject,
        body: parsed.data.body,
        orderId: parsed.data.orderId,
        attachQuote: parsed.data.attachQuote ?? true,
      });

      if (result.success) {
        // Update order status to quoted and record send time
        await OrderService.update(parsed.data.orderId, {
          status: 'quoted',
          changeReason: 'Quote email sent',
        });
      }

      return NextResponse.json({ success: result.success, error: result.error });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { success: false, error: 'Email operation failed' },
      { status: 500 }
    );
  }
}
