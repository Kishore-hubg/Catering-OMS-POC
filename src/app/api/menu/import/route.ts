import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MenuService } from '@/lib/services/MenuService';
import type { MenuType } from '@/types';

export const dynamic = 'force-dynamic';

const MENU_TYPES: MenuType[] = [
  'Veg Menu',
  'Non-Veg Menu',
  'Desserts',
  'Puja Food',
  'Live Catering',
  'Chafing Dishes',
  'Disposable Plates',
  'Drinks',
  'Breakfast',
];

const MENU_TYPE_ALIASES: Record<string, MenuType> = {
  veg: 'Veg Menu',
  'veg menu': 'Veg Menu',
  nonveg: 'Non-Veg Menu',
  'non-veg': 'Non-Veg Menu',
  'non-veg menu': 'Non-Veg Menu',
  dessert: 'Desserts',
  desserts: 'Desserts',
  puja: 'Puja Food',
  'puja food': 'Puja Food',
  live: 'Live Catering',
  'live catering': 'Live Catering',
  chafing: 'Chafing Dishes',
  'chafing dishes': 'Chafing Dishes',
  disposable: 'Disposable Plates',
  'disposable plates': 'Disposable Plates',
  drinks: 'Drinks',
  beverages: 'Drinks',
  breakfast: 'Breakfast',
};

function normalizeMenuType(value: string): string {
  const key = value.toLowerCase().trim().replace(/\s+/g, ' ');
  return MENU_TYPE_ALIASES[key] || value.trim();
}

/** Parse price from string: strip commas, currency symbols, whitespace; return number or null. */
function parsePrice(raw: string): number | null {
  if (raw === '' || raw == null) return null;
  const s = String(raw).trim().replace(/,/g, '').replace(/[\s\u20B9₹$€£]/g, '');
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

/** Detect CSV delimiter from first line: comma or semicolon (e.g. European Excel). */
function detectDelimiter(firstLine: string): ',' | ';' {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

function parseCSVLine(line: string, delimiter: ',' | ';' = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/** Find column index by trying several possible header names (lowercase, no spaces). */
function findHeaderIndex(headerRow: string[], ...candidates: string[]): number {
  const normalized = headerRow.map((h) => h.toLowerCase().replace(/\s/g, ''));
  for (const c of candidates) {
    const key = c.toLowerCase().replace(/\s/g, '');
    const i = normalized.indexOf(key);
    if (i >= 0) return i;
  }
  for (const c of candidates) {
    const key = c.toLowerCase().replace(/\s/g, '');
    const j = normalized.findIndex((n) => n.includes(key) || key.includes(n));
    if (j >= 0) return j;
  }
  return -1;
}

function parseCSV(csvText: string): { name: string; category: string; menuType: string; sizeOption: string; price: number | null; unit: string }[] {
  const raw = stripBOM(csvText.trim());
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delimiter = detectDelimiter(lines[0]);
  const headerRow = parseCSVLine(lines[0], delimiter);
  const nameIdx = findHeaderIndex(headerRow, 'name', 'item name', 'item', 'itemname');
  const categoryIdx = findHeaderIndex(headerRow, 'category', 'cat');
  const menutypeIdx = findHeaderIndex(headerRow, 'menutype', 'menu type', 'type');
  const sizeOptionIdx = findHeaderIndex(headerRow, 'sizeoption', 'size option', 'size');
  const priceIdx = findHeaderIndex(headerRow, 'price', 'unit price', 'unitprice');
  const unitIdx = findHeaderIndex(headerRow, 'unit', 'uom');
  if (nameIdx === -1 || categoryIdx === -1 || menutypeIdx === -1 || sizeOptionIdx === -1 || priceIdx === -1) {
    return [];
  }
  const rows: { name: string; category: string; menuType: string; sizeOption: string; price: number | null; unit: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i], delimiter);
    const name = (cells[nameIdx] ?? '').trim();
    const category = (cells[categoryIdx] ?? '').trim();
    const menuType = normalizeMenuType((cells[menutypeIdx] ?? '').trim());
    const sizeOption = (cells[sizeOptionIdx] ?? '').trim() || 'Default';
    const priceRaw = (cells[priceIdx] ?? '').trim();
    const price = parsePrice(priceRaw);
    const unit = (unitIdx >= 0 ? (cells[unitIdx] ?? '').trim() : '') || 'serving';
    if (name && category && menuType && MENU_TYPES.includes(menuType as MenuType)) {
      rows.push({ name, category, menuType, sizeOption, price: price ?? null, unit });
    }
  }
  return rows;
}

function normalizeExcelHeaderCell(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function findExcelHeaderRowIndex(rows: unknown[][]): number {
  const maxScan = Math.min(30, rows.length);
  for (let i = 0; i < maxScan; i++) {
    const row = Array.isArray(rows[i]) ? (rows[i] as unknown[]) : [];
    const normalized = row.map(normalizeExcelHeaderCell);
    if (normalized.includes('category') && normalized.includes('item name')) return i;
    // Allow alternate headers if the customer sheet differs slightly.
    if (normalized.includes('category') && normalized.some((x) => x === 'name' || x === 'item')) return i;
  }
  return -1;
}

function inferMenuTypeFromSheetName(sheetName: string): MenuType | null {
  const inferred = normalizeMenuType(sheetName);
  return MENU_TYPES.includes(inferred as MenuType) ? (inferred as MenuType) : null;
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

    const fileName = (file as File).name?.toLowerCase() || '';
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const isExcelFile = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b);
    const errors: string[] = [];

    let text: string;
    let isCSV: boolean;

    if (isExcelFile) {
      try {
        const XLSX = await import('xlsx');
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        if (!wb.SheetNames?.length) {
          return NextResponse.json({ success: false, error: 'Excel file has no sheets.' }, { status: 400 });
        }

        // Read ALL sheets and infer menuType from sheet name if menuType column is missing
        const excelRows: { name: string; category: string; menuType: string; sizeOption: string; price: number | null; unit: string }[] = [];
        const sheetErrors: string[] = [];

        for (const sheetName of wb.SheetNames) {
          // Skip non-menu informational sheets
          if (normalizeExcelHeaderCell(sheetName).includes('change log')) continue;

          const inferredMenuType = inferMenuTypeFromSheetName(sheetName);
          const sheet = wb.Sheets[sheetName];
          if (!sheet) continue;

          // header: 1 = array of arrays so we control column mapping
          const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' }) as unknown[][];
          if (rows.length < 2) continue;

          const headerRowIndex = findExcelHeaderRowIndex(rows);
          if (headerRowIndex === -1) {
            // Don't hard-fail the entire import if one sheet is formatted differently.
            sheetErrors.push(`Sheet "${sheetName}": could not find header row (expected Category + Item Name).`);
            continue;
          }

          const headerRow = (rows[headerRowIndex] || []).map((c) => String(c ?? '').trim());
          const nameIdx = findHeaderIndex(headerRow, 'name', 'item name', 'item', 'itemname');
          const categoryIdx = findHeaderIndex(headerRow, 'category', 'cat');
          const menutypeIdx = findHeaderIndex(headerRow, 'menutype', 'menu type', 'type');
          const sizeOptionIdx = findHeaderIndex(headerRow, 'sizeoption', 'size option', 'size');
          const priceIdx = findHeaderIndex(headerRow, 'price', 'unit price', 'unitprice', 'price (usd)');
          const unitIdx = findHeaderIndex(headerRow, 'unit', 'uom');

          if (nameIdx === -1 || categoryIdx === -1 || sizeOptionIdx === -1 || priceIdx === -1) {
            sheetErrors.push(`Sheet "${sheetName}": missing required columns (name/category/size/price).`);
            continue;
          }

          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i] as unknown[];
            const cells = Array.isArray(row) ? row : [];
            const getCell = (idx: number) => String(cells[idx] ?? '').trim();
            const name = getCell(nameIdx);
            const category = getCell(categoryIdx);
            const menuTypeRaw = menutypeIdx >= 0 ? getCell(menutypeIdx) : '';
            const menuType =
              menuTypeRaw
                ? normalizeMenuType(menuTypeRaw)
                : inferredMenuType
                  ? inferredMenuType
                  : '';
            const sizeOption = getCell(sizeOptionIdx) || 'Default';
            const priceVal = cells[priceIdx];
            const price =
              typeof priceVal === 'number' && !Number.isNaN(priceVal)
                ? priceVal
                : parsePrice(String(priceVal ?? ''));
            const unit = unitIdx >= 0 ? (getCell(unitIdx) || 'serving') : 'serving';
            if (name && category && menuType && MENU_TYPES.includes(menuType as MenuType)) {
              excelRows.push({ name, category, menuType, sizeOption, price, unit });
            }
          }
        }

        if (excelRows.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error:
                'No valid data rows found across sheets. Ensure sheets contain columns like Category, Item Name, Size / Option, Price (USD). ' +
                (sheetErrors.length ? `Sheet issues: ${sheetErrors.slice(0, 3).join(' | ')}` : ''),
            },
            { status: 400 }
          );
        }

        const updated: string[] = [];
        const skipped: string[] = [];
        const key = (r: typeof excelRows[0]) => `${r.name}\t${r.category}\t${r.menuType}`;
        const groups = new Map<string, typeof excelRows>();
        for (const r of excelRows) {
          const k = key(r);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k)!.push(r);
        }
        for (const [, groupRows] of Array.from(groups.entries())) {
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
        return NextResponse.json({
          success: true,
          updated: updated.length,
          updatedIds: updated,
          skipped: skipped.length,
          skippedDetails: skipped,
          errors: errors.length || sheetErrors.length ? [...errors, ...sheetErrors] : undefined,
        });
      } catch (err) {
        console.error('Excel parse error:', err);
        return NextResponse.json({
          success: false,
          error: 'Could not read Excel file. Try saving the sheet as CSV (Save As → CSV) and import the CSV instead.',
        }, { status: 400 });
      }
    } else {
      text = stripBOM(new TextDecoder().decode(arrayBuffer));
      const looksLikeCSV = fileName.endsWith('.csv') || (text.trim().length > 0 && !text.trim().startsWith('[') && !text.trim().startsWith('{') && (text.includes(',') || text.includes(';')));
      isCSV = looksLikeCSV;
    }

    const updated: string[] = [];
    const skipped: string[] = [];

    if (isCSV) {
      const rows = parseCSV(text);
      if (rows.length === 0) {
        const firstLine = text.trim().split(/\r?\n/)[0] || '(empty)';
        return NextResponse.json({
          success: false,
          error: 'CSV could not be parsed. Use comma or semicolon as separator. First row = header. Required columns (any case): name (or Item Name), category, menuType (or Menu Type/Type), sizeOption (or Size), price, unit (optional). menuType must be one of: ' + MENU_TYPES.join(', ') + '. Your first line: ' + firstLine.slice(0, 120) + (firstLine.length > 120 ? '...' : ''),
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
      for (const [, groupRows] of Array.from(groups.entries())) {
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
