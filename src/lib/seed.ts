/**
 * Seed script: npx ts-node --compiler-options '{"module":"commonjs"}' src/lib/seed.ts
 *
 * Loads all 233 menu items from the master pricing spreadsheet into MongoDB.
 * Run once during setup or to reset menu data.
 */
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

// Inline schema to avoid import issues with ts-node
const PricingOptionSchema = new mongoose.Schema(
  { sizeOption: String, price: Number, unit: String },
  { _id: false }
);

const MenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    description: String,
    menuType: { type: String, required: true },
    notes: String,
    pricingOptions: [PricingOptionSchema],
    minOrder: Number,
    minOrderUnit: String,
    isQuoteBased: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const MenuItem = mongoose.model('MenuItem', MenuItemSchema);

// Counter for order numbers
const CounterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', CounterSchema);

/* ---------- MENU DATA (extracted from NC_Master_Pricing___Source_of_Truth.xlsx) ---------- */
// This will be populated by the build script. For now, use the JSON file.

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected.');

  // Clear existing data
  await MenuItem.deleteMany({});
  await Counter.deleteMany({});
  console.log('Cleared existing menu items and counters.');

  // Load seed data
  const fs = require('fs');
  const path = require('path');

  // Load from JSON file in the current working directory (project root when run as documented)
  // Expected at: <project_root>/menu_seed_data.json
  const dataPath = path.resolve(process.cwd(), 'menu_seed_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Seed data file not found at ${dataPath}`);
    console.log('Please run this script from the project root and ensure menu_seed_data.json is in that directory.');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let totalInserted = 0;

  for (const [menuType, items] of Object.entries(rawData)) {
    const menuItems = (items as Record<string, unknown>[]).map((item) => ({
      name: item.name,
      category: item.category,
      description: item.description || undefined,
      menuType: item.menuType || menuType,
      notes: item.notes || undefined,
      pricingOptions: (item.pricingOptions as Record<string, unknown>[]) || [],
      minOrder: item.minOrder || undefined,
      minOrderUnit: item.minOrderUnit || undefined,
      isQuoteBased: item.isQuoteBased || false,
      isActive: true,
    }));

    await MenuItem.insertMany(menuItems);
    totalInserted += menuItems.length;
    console.log(`  ✓ ${menuType}: ${menuItems.length} items`);
  }

  // Initialize order counter
  await Counter.create({ _id: 'orderNumber', seq: 0 });
  console.log('  ✓ Order counter initialized');

  console.log(`\n✅ Seeded ${totalInserted} menu items successfully.`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
