/**
 * Apply Client Validated Pricing from Excel files to menu_seed_data.json and report chafing defaults.
 * Run from project root: node scripts/apply-client-pricing.js
 */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const DATA_DIR = path.resolve(process.cwd(), 'data/Latest_Update/Client Vlaidated Pricing');
const SEED_PATH = path.resolve(process.cwd(), 'menu_seed_data.json');

const MENU_TYPE_MAP = {
  'Veg Menu': 'Veg Menu',
  'Non-Veg Menu': 'Non-Veg Menu',
  'Desserts': 'Desserts',
  'Puja Food': 'Puja Food',
};

function normalize(s) {
  return String(s || '').trim().toLowerCase();
}

function parseExcelFile(filePath, sheetName) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[sheetName] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  // Row 0: title, Row 1: headers
  const headers = (rows[1] || []).map((h) => String(h || '').trim().toLowerCase());
  const catIdx = headers.findIndex((h) => h.includes('category'));
  const nameIdx = headers.findIndex((h) => h.includes('item name') || h === 'item name');
  const sizeIdx = headers.findIndex((h) => h.includes('size') || h.includes('option'));
  const priceIdx = headers.findIndex((h) => h.includes('price'));
  const unitIdx = headers.findIndex((h) => h === 'unit');
  const minOrderIdx = headers.findIndex((h) => h.includes('min order'));
  const minUnitIdx = headers.findIndex((h) => h.includes('unit (min)'));

  const entries = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] || [];
    const category = (row[catIdx] || '').toString().trim();
    const itemName = (row[nameIdx] || '').toString().trim();
    const sizeOption = (row[sizeIdx] || '').toString().trim();
    const price = parseFloat(row[priceIdx]);
    const unit = (row[unitIdx] || '').toString().trim() || 'each';
    const minOrder = row[minOrderIdx] != null && row[minOrderIdx] !== '' ? parseInt(Number(row[minOrderIdx]), 10) : null;
    const minOrderUnit = (row[minUnitIdx] || '').toString().trim() || null;

    if (!itemName || category.toLowerCase() === 'summary' || category.toLowerCase() === 'total items') break;
    if (isNaN(price) && !sizeOption) continue;
    entries.push({
      category,
      itemName,
      sizeOption: sizeOption || 'per pc',
      price: isNaN(price) ? null : price,
      unit,
      minOrder,
      minOrderUnit,
    });
  }
  return entries;
}

function loadAllPricing() {
  const byMenuType = {};
  if (!fs.existsSync(DATA_DIR)) {
    console.error('Directory not found:', DATA_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx'));
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const wb = XLSX.readFile(filePath);
    for (const sheetName of wb.SheetNames) {
      let menuType = sheetName;
      if (file.includes('Veg') && !menuType) menuType = 'Veg Menu';
      if (file.includes('Non-Veg') && !menuType) menuType = 'Non-Veg Menu';
      if (file.includes('Dessert')) menuType = 'Desserts';
      if (file.includes('Puja')) menuType = 'Puja Food';
      if (file.includes('Chafing')) menuType = 'Chafing Dishes';
      const entries = parseExcelFile(filePath, sheetName);
      if (!byMenuType[menuType]) byMenuType[menuType] = [];
      byMenuType[menuType].push(...entries);
    }
  }
  return byMenuType;
}

function buildLookup(byMenuType) {
  const lookup = {};
  for (const [menuType, entries] of Object.entries(byMenuType)) {
    if (!MENU_TYPE_MAP[menuType] && menuType !== 'Chafing Dishes') continue;
    lookup[menuType] = {};
    for (const e of entries) {
      const key = normalize(e.itemName);
      if (!lookup[menuType][key]) lookup[menuType][key] = [];
      lookup[menuType][key].push({
        sizeOption: e.sizeOption,
        price: e.price,
        unit: e.unit,
        minOrder: e.minOrder,
        minOrderUnit: e.minOrderUnit,
      });
    }
  }
  return lookup;
}

function matchSizeOption(jsonOpt, excelOpts) {
  const js = normalize(jsonOpt);
  for (const ex of excelOpts) {
    const es = normalize(ex.sizeOption);
    if (js === es) return ex;
    if (es && js && (es.includes(js) || js.includes(es))) return ex;
  }
  return null;
}

function applyPricingToSeed(seed, lookup) {
  let updated = 0;
  for (const [menuTypeKey, items] of Object.entries(seed)) {
    if (menuTypeKey === 'Live Catering' || !Array.isArray(items)) continue;
    const menuType = menuTypeKey;
    const excelData = lookup[menuType];
    if (!excelData) continue;
    for (const item of items) {
      const nameKey = normalize(item.name);
      const opts = excelData[nameKey];
      if (!opts || !item.pricingOptions) continue;
      for (const po of item.pricingOptions) {
        const match = matchSizeOption(po.sizeOption, opts);
        if (match && match.price != null) {
          const oldPrice = po.price;
          po.price = match.price;
          if (match.unit) po.unit = match.unit;
          if (oldPrice !== match.price) updated++;
        }
      }
      if (opts.length > 0 && opts[0].minOrder != null && item.minOrder !== opts[0].minOrder) {
        item.minOrder = opts[0].minOrder;
        if (opts[0].minOrderUnit) item.minOrderUnit = opts[0].minOrderUnit;
      }
    }
  }
  return updated;
}

// --------- main ---------
console.log('Loading Client Validated Pricing from', DATA_DIR);
const byMenuType = loadAllPricing();
const lookup = buildLookup(byMenuType);

// Chafing defaults for store (report and use in store update)
let chafingDefaults = {};
if (byMenuType['Chafing Dishes']) {
  for (const e of byMenuType['Chafing Dishes']) {
    const n = (e.itemName || '').toLowerCase();
    if (n.includes('economic')) chafingDefaults.economic = e.price;
    if (n.includes('rotating') && !n.includes('rose')) chafingDefaults.rotating = e.price;
    if (n.includes('premium') || n.includes('rose')) chafingDefaults.premium = e.price;
  }
  console.log('Chafing defaults from Excel:', chafingDefaults);
}

if (!fs.existsSync(SEED_PATH)) {
  console.error('menu_seed_data.json not found at', SEED_PATH);
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
const updatedCount = applyPricingToSeed(seed, lookup);
console.log('Updated', updatedCount, 'prices in menu_seed_data.json');

fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), 'utf-8');
console.log('Written', SEED_PATH);

// Export chafing defaults for store update (script can write to a small JSON or we update store manually)
const chafingPath = path.resolve(process.cwd(), 'scripts/chafing-defaults.json');
fs.writeFileSync(chafingPath, JSON.stringify(chafingDefaults, null, 2), 'utf-8');
console.log('Chafing defaults written to', chafingPath);
