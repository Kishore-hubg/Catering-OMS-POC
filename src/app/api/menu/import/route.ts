import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MenuService } from '@/lib/services/MenuService';
import type { MenuType } from '@/types';

const MENU_TYPES: MenuType[] = [
  'Veg Menu',
  'Non-Veg Menu',
  'Desserts',
  'Puja Food',
  'Live Catering',
  'Chafing Dishes',
  'Disposable Plates',
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(csvText: string): { name: string; category: string; menuType: string; sizeOption: string; price: number | null; unit: string }[] {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s/g, ''));
  const nameIdx = header.indexOf('name');
  const categoryIdx = header.indexOf('category');
  const menutypeIdx = header.indexOf('menutype');
  const sizeOptionIdx = header.indexOf('sizeoption');
  const priceIdx = header.indexOf('price');
  const unitIdx = header.indexOf('unit');
  if (nameIdx === -1 || categoryIdx === -1 || menutypeIdx === -1 || sizeOptionIdx === -1 || priceIdx === -1) {
    return [];
  }
  const rows: { name: string; category: string; menuType: string; sizeOption: string; price: number | null; unit: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const name = (cells[nameIdx] ?? '').trim();
    const category = (cells[categoryIdx] ?? '').trim();
    const menuType = (cells[menutypeIdx] ?? '').trim();
    const sizeOption = (cells[sizeOptionIdx] ?? '').trim() || 'Default';
    const priceRaw = (cells[priceIdx] ?? '').trim();
    const price = priceRaw === '' ? null : Number(priceRaw);
    const unit = (unitIdx >= 0 ? (cells[unitIdx] ?? '').trim() : '') || 'serving';
    if (name && category && menuType && MENU_TYPES.includes(menuType as MenuType)) {
      rows.push({ name, category, menuType, sizeOption, price: Number.isNaN(price as number) ? null : price, unit });
    }
  }
  return rows;
}

/** Validate a single import item (JSON) and return update payload for an existing item */
function validateImportItem(
  raw: unknown
): { error?: string; id?: string; name?: string; category?: string; menuType?: MenuType; data?: Record<string, unknown> } {
  if (!raw || typeof raw !== 'object') return { error: 'Each item must be an object' };
  const o = raw as Record<string, unknown>;
  const id = typeof o._id === 'string' ? o._id.trim() : undefined;
  const name = typeof o.name === 'string' ? o.name.trim() : undefined;
  const category = typeof o.category === 'string' ? o.category.trim() : undefined;
  const menuType = typeof o.menuType === 'string' ? o.menuType.trim() : undefined;

  if (!id && (!name || !category || !menuType)) {
    return { error: 'Each item must have either _id or (name, category, menuType)' };
  }
  if (menuType && !MENU_TYPES.includes(menuType as MenuType)) {
    return { error: `Invalid menuType: ${menuType}` };
  }

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (category) data.category = category;
  if (menuType) data.menuType = menuType;
  if (o.description !== undefined) data.description = typeof o.description === 'string' ? o.description : '';
  if (o.notes !== undefined) data.notes = typeof o.notes === 'string' ? o.notes : '';
  if (o.minOrder !== undefined) data.minOrder = typeof o.minOrder === 'number' ? o.minOrder : undefined;
  if (o.minOrderUnit !== undefined) data.minOrderUnit = typeof o.minOrderUnit === 'string' ? o.minOrderUnit : undefined;
  if (o.isQuoteBased !== undefined) data.isQuoteBased = Boolean(o.isQuoteBased);
  if (o.isActive !== undefined) data.isActive = Boolean(o.isActive);

  const pricingOptions = o.pricingOptions;
  if (pricingOptions !== undefined) {
    if (!Array.isArray(pricingOptions)) return { ...(id ? { id } : { name, category, menuType: menuType as MenuType }), error: 'pricingOptions must be an array' };
    const opts: { sizeOption: string; price: number | null; unit: string }[] = [];
    for (let i = 0; i < pricingOptions.length; i++) {
      const p = pricingOptions[i];
      if (!p || typeof p !== 'object') return { error: `pricingOptions[${i}] must be an object` };
      const opt = p as Record<string, unknown>;
      opts.push({
        sizeOption: typeof opt.sizeOption === 'string' ? opt.sizeOption : 'Default',
        price: opt.price !== null && opt.price !== undefined ? Number(opt.price) : null,
        unit: typeof opt.unit === 'string' ? opt.unit : 'serving',
      });
    }
    data.pricingOptions = opts;
  }

  return { data, id, name, category, menuType: menuType as MenuType };
}

/**
 * POST /api/menu/import
 * Body: multipart/form-data with field "file" (JSON or CSV).
 * JSON: array of items with _id or (name, category, menuType) and optional pricingOptions, etc.
 * CSV: header name,category,menuType,sizeOption,price,unit — rows grouped by (name,category,menuType) to set pricingOptions.
 * Auth required.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ success: false, error: 'Missing file. Use form field "file".' }, { status: 400 });
    }

    const text = await file.text();
    const fileName = (file as File).name?.toLowerCase() || '';
    const isCSV = fileName.endsWith('.csv');

    const updated: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    if (isCSV) {
      const rows = parseCSV(text);
      if (rows.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'CSV must have header: name,category,menuType,sizeOption,price,unit and at least one data row.',
        }, { status: 400 });
      }
      // Group by name,category,menuType
      const key = (r: typeof rows[0]) => `${r.name}\t${r.category}\t${r.menuType}`;
      const groups = new Map<string, typeof rows>();
      for (const r of rows) {
        const k = key(r);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(r);
      }
      for (const [, groupRows] of groups) {
        const first = groupRows[0];
        const existing = await MenuService.findByNaturalKey(first.name, first.category, first.menuType);
        if (!existing) {
          skipped.push(`${first.name} / ${first.category} / ${first.menuType} (not found)`);
          continue;
        }
        const pricingOptions = groupRows.map((r) => ({
          sizeOption: r.sizeOption,
          price: r.price,
          unit: r.unit,
        }));
        await MenuService.update(String(existing._id), { pricingOptions });
        updated.push(String(existing._id));
      }
    } else {
      // JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 });
      }
      const arr = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown }).items))
        ? (parsed as { items: unknown[] }).items
        : [parsed];

      for (let i = 0; i < arr.length; i++) {
        const v = validateImportItem(arr[i]);
        if (v.error) {
          errors.push(`Row ${i + 1}: ${v.error}`);
          continue;
        }
        if (!v.data || Object.keys(v.data).length === 0) {
          skipped.push(`Row ${i + 1}: no fields to update`);
          continue;
        }
        let id: string | null = null;
        if (v.id) {
          const found = await MenuService.getById(v.id);
          if (found) id = v.id;
        }
        if (!id && v.name && v.category && v.menuType) {
          const found = await MenuService.findByNaturalKey(v.name, v.category, v.menuType);
          if (found) id = String(found._id);
        }
        if (!id) {
          skipped.push(`Row ${i + 1}: ${v.id ? 'id not found' : `${v.name}/${v.category}/${v.menuType} not found`}`);
          continue;
        }
        await MenuService.update(id, v.data as Parameters<typeof MenuService.update>[1]);
        updated.push(id);
      }
    }

    return NextResponse.json({
      success: true,
      updated: updated.length,
      updatedIds: updated,
      skipped: skipped.length,
      skippedDetails: skipped,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    console.error('Menu import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import menu' },
      { status: 500 }
    );
  }
}
