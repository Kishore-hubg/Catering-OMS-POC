import { NextRequest, NextResponse } from 'next/server';
import { KitchenService } from '@/lib/services/KitchenService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const date = searchParams.get('date');

    if (date) {
      const dayPlan = await KitchenService.getDayPlan(date);
      return NextResponse.json({ success: true, data: dayPlan });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const weeklyPlan = await KitchenService.getWeeklyPlan(start);
    return NextResponse.json({ success: true, data: weeklyPlan });
  } catch (error) {
    console.error('Kitchen API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch kitchen plan' },
      { status: 500 }
    );
  }
}
