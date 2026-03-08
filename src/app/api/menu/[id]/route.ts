import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MenuService } from '@/lib/services/MenuService';
import type { MenuType } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing menu item ID' }, { status: 400 });
    }
    const item = await MenuService.getById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Menu item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Menu [id] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch menu item' },
      { status: 500 }
    );
  }
}

const MENU_TYPES: MenuType[] = [
  'Veg Menu',
  'Non-Veg Menu',
  'Desserts',
  'Puja Food',
  'Live Catering',
  'Chafing Dishes',
  'Disposable Plates',
];

function validatePutBody(body: unknown): { error?: string; data?: Record<string, unknown> } {
  if (!body || typeof body !== 'object') return { error: 'Invalid body' };
  const b = body as Record<string, unknown>;

  const name = b.name;
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) return { error: 'name must be a non-empty string' };

  const category = b.category;
  if (category !== undefined && (typeof category !== 'string' || !category.trim())) return { error: 'category must be a non-empty string' };

  const menuType = b.menuType;
  if (menuType !== undefined && (typeof menuType !== 'string' || !MENU_TYPES.includes(menuType as MenuType))) return { error: 'menuType must be a valid menu type' };

  const pricingOptions = b.pricingOptions;
  if (pricingOptions !== undefined) {
    if (!Array.isArray(pricingOptions)) return { error: 'pricingOptions must be an array' };
    for (let i = 0; i < pricingOptions.length; i++) {
      const o = pricingOptions[i];
      if (!o || typeof o !== 'object') return { error: `pricingOptions[${i}] must be an object` };
      const opt = o as Record<string, unknown>;
      if (typeof opt.sizeOption !== 'string') return { error: `pricingOptions[${i}].sizeOption must be a string` };
      if (opt.price !== null && opt.price !== undefined && typeof opt.price !== 'number') return { error: `pricingOptions[${i}].price must be a number or null` };
      if (typeof opt.unit !== 'string') return { error: `pricingOptions[${i}].unit must be a string` };
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = (name as string).trim();
  if (category !== undefined) data.category = (category as string).trim();
  if (menuType !== undefined) data.menuType = menuType;
  if (b.description !== undefined) data.description = typeof b.description === 'string' ? b.description : '';
  if (b.notes !== undefined) data.notes = typeof b.notes === 'string' ? b.notes : '';
  if (b.pricingOptions !== undefined) data.pricingOptions = pricingOptions;
  if (b.minOrder !== undefined) data.minOrder = typeof b.minOrder === 'number' ? b.minOrder : undefined;
  if (b.minOrderUnit !== undefined) data.minOrderUnit = typeof b.minOrderUnit === 'string' ? b.minOrderUnit : undefined;
  if (b.isQuoteBased !== undefined) data.isQuoteBased = Boolean(b.isQuoteBased);
  if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);

  return { data };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing menu item ID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = validatePutBody(body);
    if (validation.error) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    if (!validation.data || Object.keys(validation.data).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const updated = await MenuService.update(id, validation.data as Parameters<typeof MenuService.update>[1]);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Menu item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Menu [id] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update menu item' },
      { status: 500 }
    );
  }
}
