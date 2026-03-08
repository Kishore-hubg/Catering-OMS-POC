/**
 * Read Client Validated Pricing Excel files and output structure + data for updating menu_seed_data.json
 * Run: node scripts/read-pricing-xlsx.js
 */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const DATA_DIR = path.resolve(process.cwd(), 'data/Latest_Update/Client Vlaidated Pricing');

if (!fs.existsSync(DATA_DIR)) {
  console.error('Directory not found:', DATA_DIR);
  process.exit(1);
}

const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx'));
console.log('Found files:', files);

files.forEach((file) => {
  const filePath = path.join(DATA_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn('Skip (not found):', file);
    return;
  }
  console.log('\n===', file, '===');
  const wb = XLSX.readFile(filePath);
  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log('Sheet:', sheetName, '| Rows:', rows.length);
    if (rows.length > 0) {
      console.log('Headers:', JSON.stringify(rows[1]));
      // Log first 5 data rows (skip row 0 title, row 1 header)
      for (let i = 2; i < Math.min(7, rows.length); i++) {
        console.log('Row', i, JSON.stringify(rows[i]));
      }
    }
  });
});
