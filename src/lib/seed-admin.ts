/**
 * Seed admin user: npx ts-node --compiler-options '{"module":"commonjs"}' src/lib/seed-admin.ts
 * Run once after deploy. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env (or use defaults below).
 */
import mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nidhicatering.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

if (!MONGODB_URI) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['owner', 'staff'], default: 'owner' },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seedAdmin() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected.');

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase().trim() });
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (existing) {
    existing.passwordHash = hash;
    existing.name = 'Admin';
    existing.role = 'owner';
    await existing.save();
    console.log(`✅ Updated admin user: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      email: ADMIN_EMAIL.toLowerCase().trim(),
      passwordHash: hash,
      name: 'Admin',
      role: 'owner',
    });
    console.log(`✅ Created admin user: ${ADMIN_EMAIL}`);
  }

  console.log('Login at /login with the credentials above. Change password after first login by re-running with new ADMIN_PASSWORD.');
  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seed admin failed:', err);
  process.exit(1);
});
