import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/OrderService';
import { CreateOrderSchema } from '@/lib/validations';
import type { OrderStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as OrderStatus | null;
    const search = searchParams.get('search');
    const eventType = searchParams.get('eventType');
    const startDate = searchParams.get('startDate') || searchParams.get('from');
    const endDate = searchParams.get('endDate') || searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (searchParams.get('stats') === 'true') {
      const stats = await OrderService.getStats();
      return NextResponse.json({ success: true, data: stats });
    }

    const result = await OrderService.getAll({
      status: status || undefined,
      search: search || undefined,
      eventType: eventType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Orders GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const order = await OrderService.create(parsed.data);
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Orders POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === 'development' ? message : 'Failed to create order',
      },
      { status: 500 }
    );
  }
}
