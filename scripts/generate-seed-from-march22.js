/**
 * Generate menu_seed_data.json from NC Pricing — Master List March 22.xlsx
 *
 * Classification fixes applied (7 issues):
 *  Fix 1 — "Chaat- Live" category      → Live Catering  (live station, not tray)
 *  Fix 2 — "Extras" category           → Live Catering  (equipment/service, not food)
 *  Fix 3 — Items with "-Live" suffix   → Live Catering  (Tawa Vegetables-Live, Poori-Live)
 *            regex: /-\s*live$/i  (catches "- Live", "-Live", "- live" variants)
 *  Fix 4 — Deduplicate Gobi/Baby Corn Manchurian (in both Appetizer + Indo-Chinese)
 *            keep only Indo-Chinese; skip Appetizer occurrence
 *  Fix 5 — Indo-Mexican "N Veg" items  → Non-Veg Menu  (wrongly in Veg Menu sheet)
 *  Fix 6 — "Drinks" category           → Drinks menuType  (new)
 *  Fix 7 — "Breakfast" category        → Breakfast menuType  (new)
 *
 *  Non-Veg Menu, Puja Food, Desserts, Chafing Dishes sheets: unchanged
 *  Existing Live Catering + Disposable Plates: preserved from old seed
 *
 * Category name normalizations:
 *  - "Indo- Mexican" → "Indo-Mexican"
 *  - "Chaat- Live"   → "Chaat Live"
 *
 * Run from project root:
 *   node scripts/generate-seed-from-march22.js
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const EXCEL_PATH = path.resolve(
  process.cwd(),
  'data/Latest_Update/Client Vlaidated Pricing/NC Pricing \u2014 Master List March 22.xlsx'
);
const OLD_SEED_PATH = path.resolve(process.cwd(), 'menu_seed_data.json');
const OUT_SEED_PATH = path.resolve(process.cwd(), 'menu_seed_data.json');

// ── helpers ────────────────────────────────────────────────────────────────

function normalizeCategory(cat) {
  return cat
    .replace(/Indo-\s+Mexican/i, 'Indo-Mexican')
    .replace(/Chaat-\s+Live/i, 'Chaat Live')
    .trim();
}

function isNonVegItem(itemName, category) {
  const n = itemName.toLowerCase();
  // Indo-Mexican items that explicitly say "n veg" or "non veg" or "non-veg"
  if (n.includes('n veg') || n.includes('non veg') || n.includes('non-veg')) return true;
  return false;
}

function isLiveItem(itemName, category) {
  const nCat = normalizeCategory(category);
  // Fix 1: Chaat Live → Live Catering
  if (nCat === 'Chaat Live') return true;
  // Fix 2: Extras (equipment/service items) → Live Catering, not Veg Menu food list
  if (nCat === 'Extras') return true;
  // Fix 3: Item names ending with "-Live" or "- Live" (any spacing around dash)
  // Covers "Tawa Vegetables- Live", "Poori- Live", "Item - Live"
  if (/-\s*live\s*$/i.test(itemName.trim())) return true;
  return false;
}

// Fix 4: Items duplicated across categories in Excel — keep only one canonical category
// Key format: "itemName||sheetName", value: category to KEEP
const DEDUP_KEEP_CATEGORY = {
  'Gobi Manchurian||Veg Menu': 'Indo-Chinese',
  'Baby Corn Manchurian||Veg Menu': 'Indo-Chinese',
};

function isDuplicate(itemName, rawCategory, sheetName) {
  const key = itemName + '||' + sheetName;
  const keepCat = DEDUP_KEEP_CATEGORY[key];
  if (!keepCat) return false;
  return normalizeCategory(rawCategory) !== keepCat;
}

function resolveMenuType(sheetMenuType, itemName, category) {
  const nCat = normalizeCategory(category);

  if (nCat === 'Drinks') return 'Drinks';
  if (nCat === 'Breakfast') return 'Breakfast';

  if (sheetMenuType === 'Veg Menu') {
    if (isLiveItem(itemName, category)) return 'Live Catering';
    if (isNonVegItem(itemName, nCat)) return 'Non-Veg Menu';
    return 'Veg Menu';
  }

  return sheetMenuType;
}

function parseSheet(wb, sheetName, sheetMenuType) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  // Row 0 = title banner, Row 1 = column headers
  const headers = (rows[1] || []).map((h) => String(h || '').trim().toLowerCase());
  const catIdx   = headers.findIndex((h) => h === 'category');
  const nameIdx  = headers.findIndex((h) => h.includes('item name') || h === 'name');
  const descIdx  = headers.findIndex((h) => h.includes('description') || h === 'desc');
  const sizeIdx  = headers.findIndex((h) => h.includes('size') || h.includes('option'));
  const priceIdx = headers.findIndex((h) => h.includes('price'));
  const unitIdx  = headers.findIndex((h) => h === 'unit');
  const minOIdx  = headers.findIndex((h) => h.includes('min order') && !h.includes('unit'));
  const minUIdx  = headers.findIndex((h) => h.includes('unit (min)'));
  const notesIdx = headers.findIndex((h) => h === 'notes');

  const entries = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] || [];
    const category = String(row[catIdx] || '').trim();
    const itemName = String(row[nameIdx] || '').trim();
    if (!itemName) continue;

    const sizeOption = String(row[sizeIdx] || '').trim() || 'per pc';
    const rawPrice   = row[priceIdx];
    const price      = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice || ''));
    const unit       = String(row[unitIdx] || '').trim();
    const minOrder   = row[minOIdx] != null && row[minOIdx] !== '' ? parseInt(Number(row[minOIdx]), 10) : null;
    const minOrderUnit = String(row[minUIdx] || '').trim() || null;
    const description = descIdx >= 0 ? String(row[descIdx] || '').trim() : '';
    const notes       = notesIdx >= 0 ? String(row[notesIdx] || '').trim() : '';

    const normalizedCat = normalizeCategory(category);

    // Fix 4: Skip duplicate rows (e.g. Gobi Manchurian in both Appetizer and Indo-Chinese)
    if (isDuplicate(itemName, category, sheetName)) continue;

    const menuType = resolveMenuType(sheetMenuType, itemName, category);

    // Fix 3 cont.: Clean "- Live" suffix from names going to Live Catering
    // e.g. "Tawa Vegetables- Live" → "Tawa Vegetables Live", "Poori- Live" → "Poori Live"
    const cleanedName = menuType === 'Live Catering'
      ? itemName.replace(/-\s*live\s*$/i, ' Live').replace(/\s{2,}/g, ' ').trim()
      : itemName;

    entries.push({
      category: normalizedCat,
      itemName: cleanedName,
      menuType,
      description,
      notes,
      sizeOption: sizeOption || 'per pc',
      price: isNaN(price) ? null : price,
      unit: unit || 'each',
      minOrder,
      minOrderUnit,
    });
  }
  return entries;
}

function groupIntoSeedItems(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = `${e.menuType}||${e.category}||${e.itemName}`;
    if (!map.has(key)) {
      map.set(key, {
        name: e.itemName,
        category: e.category,
        description: e.description || null,
        menuType: e.menuType,
        notes: e.notes || null,
        pricingOptions: [],
        minOrder: e.minOrder || null,
        minOrderUnit: e.minOrderUnit || null,
        isQuoteBased: false,
      });
    }
    const item = map.get(key);
    // Update description / notes if currently blank
    if (!item.description && e.description) item.description = e.description;
    if (!item.notes && e.notes) item.notes = e.notes;
    if (!item.minOrder && e.minOrder) {
      item.minOrder = e.minOrder;
      item.minOrderUnit = e.minOrderUnit;
    }
    item.pricingOptions.push({
      sizeOption: e.sizeOption,
      price: e.price,
      unit: e.unit,
    });
  }
  return Array.from(map.values());
}

// ── main ──────────────────────────────────────────────────────────────────

if (!fs.existsSync(EXCEL_PATH)) {
  console.error('Excel file not found:', EXCEL_PATH);
  process.exit(1);
}

console.log('Reading March 22 Excel:', EXCEL_PATH);
const wb = XLSX.readFile(EXCEL_PATH);

const SHEET_MAP = [
  { sheet: 'Veg Menu',      menuType: 'Veg Menu'      },
  { sheet: 'Non-Veg Menu',  menuType: 'Non-Veg Menu'  },
  { sheet: 'Puja Food',     menuType: 'Puja Food'     },
  { sheet: 'Desserts',      menuType: 'Desserts'      },
  { sheet: 'Chafing Dishes',menuType: 'Chafing Dishes'},
];

const allEntries = [];
for (const { sheet, menuType } of SHEET_MAP) {
  const entries = parseSheet(wb, sheet, menuType);
  console.log(`  ${sheet}: ${entries.length} raw rows parsed`);
  allEntries.push(...entries);
}

// Group entries into seed items (one item per dish, pricingOptions[] for size variants)
const allItems = groupIntoSeedItems(allEntries);

// ── Preserve Live Catering + Disposable Plates from old seed ──────────────
// Normalise a name for dedup comparison: lowercase, strip spaces + punctuation
function normName(s) { return String(s||'').toLowerCase().replace(/[\s\-–—_().,'\/]+/g,''); }

let oldLiveCatering = [];
let oldDisposablePlates = [];
if (fs.existsSync(OLD_SEED_PATH)) {
  const oldSeed = JSON.parse(fs.readFileSync(OLD_SEED_PATH, 'utf-8'));
  // Filter out any artefacts from previous script runs (items whose name contains
  // a "-live" pattern without a space that indicates a bad cleanup pass)
  oldLiveCatering = (oldSeed['Live Catering'] || []).filter(i => !/\w(live)$/i.test(i.name));
  oldDisposablePlates = oldSeed['Disposable Plates'] || [];
  console.log(`Preserving ${oldLiveCatering.length} existing Live Catering items from old seed`);
  console.log(`Preserving ${oldDisposablePlates.length} existing Disposable Plates items from old seed`);
}

// Merge newly classified Live Catering items with old ones — deduplicate by normalised name
const newLiveItems = allItems.filter(i => i.menuType === 'Live Catering');
const oldLiveNormNames = new Set(oldLiveCatering.map(i => normName(i.name)));
const mergedLiveCatering = [
  ...oldLiveCatering,
  ...newLiveItems.filter(i => !oldLiveNormNames.has(normName(i.name))),
];

// ── Build final seed structure ────────────────────────────────────────────
const MENU_TYPE_ORDER = [
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

const seedData = {};
for (const mt of MENU_TYPE_ORDER) {
  if (mt === 'Live Catering') {
    seedData[mt] = mergedLiveCatering;
  } else if (mt === 'Disposable Plates') {
    seedData[mt] = oldDisposablePlates;
  } else {
    seedData[mt] = allItems.filter(i => i.menuType === mt);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────
console.log('\n=== Seed Summary ===');
let total = 0;
for (const [mt, items] of Object.entries(seedData)) {
  console.log(`  ${mt}: ${items.length} items`);
  total += items.length;
}
console.log(`  TOTAL: ${total} items`);

// ── Write output ──────────────────────────────────────────────────────────
fs.writeFileSync(OUT_SEED_PATH, JSON.stringify(seedData, null, 2), 'utf-8');
console.log('\n✅ Written:', OUT_SEED_PATH);
console.log('Next step: npm run seed  (to load into MongoDB)');
