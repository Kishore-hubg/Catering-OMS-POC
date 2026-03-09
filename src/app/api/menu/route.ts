import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MenuService } from '@/lib/services/MenuService';
import type { MenuType } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const menuType = searchParams.get('menuType') as MenuType | null;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const grouped = searchParams.get('grouped');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (grouped === 'true') {
      const data = await MenuService.getGroupedMenu();
      return NextResponse.json({ success: true, data });
    }

    const filters: { menuType?: MenuType; category?: string; search?: string } = {};
    if (menuType) filters.menuType = menuType;
    if (category) filters.category = category;
    if (search) filters.search = search;

    let items;
    if (includeInactive) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      items = await MenuService.getAllIncludingInactive(filters);
    } else {
      items = await MenuService.getAll(filters);
    }

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Menu API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}
