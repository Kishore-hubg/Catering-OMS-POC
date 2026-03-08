# 🪔 Nidhi Catering — Order Management System

A full-stack catering management application built for **Nidhi Catering**, Dallas TX. Manages the complete workflow from customer order intake through kitchen planning and execution.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Cache:** Redis (sessions, rate limiting, query caching)
- **Auth:** NextAuth.js 4 (Credentials provider, JWT)
- **AI:** Groq API (LLaMA) for email composition; falls back to default template if not configured
- **State:** Zustand (client), React Query pattern (server)
- **Styling:** Tailwind CSS (saffron/navy/cream theme)
- **Validation:** Zod (shared client/server schemas)

## Features

### Core (Phase 3)
- **Multi-step Order Wizard** — 4-step form: Customer → Event → Menu Items → Review
- **Full Menu Catalog** — 233 items across 7 categories (Veg, Non-Veg, Desserts, Puja Food, Live Catering, Chafing Dishes, Disposable Plates)
- **Menu Table View** — Professional table layout: Item, Category, Type, Description, Pricing, Min order, Notes
- **5 Pricing Models** — per piece, per pound, tray-based (S/M/L), per plate, quote-based
- **Quote PDF Generation** — Letterhead-style HTML and PDF quotes (logo, table, totals); PDF attached when sending quote email
- **AI Email Composition** — Groq-powered email drafts with review-before-send; default template fallback
- **Audit Trail** — Full change history on every order

### Kitchen (Phase 4)
- **7-Day Plan-Ahead** — Weekly view grouped by date with Veg/Non-Veg/Dessert/Puja breakdown and category sub-headers
- **Export CSV** — Download weekly events and category breakdown as CSV
- **Print / Save PDF** — Same format as screen (logo, summary cards, 7-day grid, category tables); no trays/unit column
- **Redis-Cached** — Instant load with smart cache invalidation

### Admin & Management
- **Dashboard** — Stats, status breakdown, recent orders
- **Order List** — Order History layout: summary cards, search/filters (status, event type, date range), Export CSV, table with revisions and delivery type
- **Order Detail** — Full view with status management, quote PDF, email compose/send
- **Admin Auth** — Sign in with email/password; all routes except `/login` and `/api/auth` protected
- **Edit Menu** — Admin page to update menu item name, category, type, pricing options, min order, quote-based, active flag
- **Add/Remove Pricing Rows** — Per-item pricing options editable in modal (add row, remove row)
- **Soft Delete** — `isActive` flag to hide items from public menu without deleting
- **Export Backup** — Download full menu as JSON (`GET /api/menu/export`)
- **Import Bulk Update** — Upload CSV or JSON to bulk update prices (`POST /api/menu/import`)

## Implementation Steps (Setup & Run)

Follow these steps in order to get the app running locally or on a server.

### Step 1 — Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ (or yarn/pnpm)
- **MongoDB** — [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier) or local MongoDB
- **Redis** (optional) — For caching and rate limiting; app runs without it with graceful fallback

### Step 2 — Clone and install

```bash
# Clone or unzip the project
cd nidhi-catering-oms-FULL-DEPLOYMENT   # or your project folder name

# Install dependencies
npm install
```

If you see peer dependency conflicts (e.g. with next-auth/nodemailer):

```bash
npm install --legacy-peer-deps
```

### Step 3 — Environment configuration

Create a `.env` file in the project root (copy from `.env.example` if present).

**Required:**

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority`) |
| `NEXTAUTH_SECRET` | Random string for JWT; generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL: `http://localhost:3000` (dev) or `https://yourdomain.com` (production) |

**Optional (recommended for full features):**

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Redis URL (e.g. Upstash or Redis Cloud) for cache and rate limiting |
| `GROQ_API_KEY` | [Groq](https://console.groq.com) API key for AI quote email composition |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | SMTP for sending quote emails (PDF attachment supported) |
| `ADMIN_EMAIL` | Admin login email (default: `admin@nidhicatering.com`) |
| `ADMIN_PASSWORD` | Admin password for seed and login (change after first use) |
| `NEXT_PUBLIC_APP_URL` | Public app URL (for links in emails; e.g. `https://yourdomain.com`) |

### Step 4 — Seed menu data

Load the menu catalog (233+ items) into MongoDB:

```bash
npm run seed
```

Run once per environment. To refresh from client-validated Excel pricing:

```bash
# Place Excel files in data/Latest_Update/Client Vlaidated Pricing/
node scripts/apply-client-pricing.js
npm run seed
```

### Step 5 — Create admin user

Create the user used to log in:

```bash
npm run seed:admin
```

Uses `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`. Re-run after changing the password to update it.

### Step 6 — Run the application

**Development (with hot reload):**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` if not authenticated.

**Production (build then run):**

```bash
npm run build
npm start
```

The app listens on `PORT` (default `3000`). Log in at `/login` with your admin email and password.

### Step 7 — Verify

- **Dashboard** — `/`  
- **New Order** — `/orders/new` (multi-step wizard)  
- **Orders** — `/orders` (list, filters, Export CSV)  
- **Send Quote** — `/send-quote`  
- **Weekly Plan** — `/kitchen` (Export CSV, Print / Save PDF)  
- **Reports** — `/reports`  
- **Edit Menu** — `/admin/menu` (export/import, bulk pricing)

---

## Quick Start (copy-paste)

```bash
npm install
# Create .env with MONGODB_URI, NEXTAUTH_SECRET, NEXTAUTH_URL
npm run seed
npm run seed:admin
npm run dev
# Open http://localhost:3000 → log in with ADMIN_EMAIL / ADMIN_PASSWORD
```

---

## Production Implementation (Runnable Application)

Use this section to run the app in production (VPS, cloud VM, or PaaS).

### 1. Build for production

```bash
npm ci --omit=dev    # or: npm install --production
npm run build
```

Ensure `NODE_ENV=production` when building (Next.js sets this automatically when you run `npm run build`).

### 2. Production environment variables

Set these in your host (e.g. `.env.production`, systemd env file, or platform dashboard):

| Variable | Example / Notes |
|----------|------------------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your Atlas (or production MongoDB) URI |
| `NEXTAUTH_SECRET` | Strong random value (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://yourdomain.com` (must match the URL users use) |
| `REDIS_URL` | Production Redis URL (optional) |
| `GROQ_API_KEY` | If using AI email composition |
| `SMTP_*`, `EMAIL_FROM` | Production SMTP for sending quotes |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Set and keep secure |
| `PORT` | Optional; default `3000` |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.com` (for email links) |

### 3. Run the production server

**Option A — Direct run (single process)**

```bash
export NODE_ENV=production
PORT=3000 npm start
```

**Option B — PM2 (recommended on VPS)**

```bash
# Install PM2 globally once: npm install -g pm2
pm2 start npm --name "nidhi-oms" -- start
pm2 save
pm2 startup   # enable start on boot
```

Or use an ecosystem file `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: 'nidhi-oms',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/path/to/nidhi-catering-oms-FULL-DEPLOYMENT',
    instances: 1,
    exec_mode: 'fork',
    env: { NODE_ENV: 'production' },
    env_file: '.env',
  }],
};
```

Then:

```bash
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

**Option C — Docker (example)**

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Note: Next.js standalone output requires `output: 'standalone'` in `next.config.js`; then the start command uses `node server.js` from the standalone folder.

### 4. Reverse proxy (HTTPS)

Run the app on a local port (e.g. `3000`) and put Nginx or Caddy in front:

**Nginx example:**

```nginx
server {
  listen 443 ssl;
  server_name yourdomain.com;
  ssl_certificate /path/to/fullchain.pem;
  ssl_certificate_key /path/to/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

Reload Nginx after changes. Ensure `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` use `https://yourdomain.com`.

### 5. One-time production setup

On a fresh server, run once (with production `.env` in place):

```bash
npm run seed
npm run seed:admin
```

Then start the app with one of the run options above.

### 6. Health check

- **App:** `https://yourdomain.com/` (should redirect to `/login` if not authenticated).
- **API:** e.g. `https://yourdomain.com/api/orders` (returns 401 without auth; confirms app is up).

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | ✅ (for auth) | Random secret for JWT (e.g. `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ (for auth) | App URL (e.g. `http://localhost:3000`) |
| `REDIS_URL` | ❌ | Redis connection URL (optional) |
| `GROQ_API_KEY` | ❌ | AI email composition via Groq (falls back to template) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | ❌ | SMTP for sending quote emails (quote is attached as HTML) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | ❌ | Twilio WhatsApp (see below) |
| `NEXT_PUBLIC_APP_URL` | ❌ | App base URL (for quote link in WhatsApp; e.g. `https://yourapp.com`) |
| `ADMIN_EMAIL` | ❌ | Admin login email (default: admin@nidhicatering.com) |
| `ADMIN_PASSWORD` | ❌ | Admin password for seed (default: ChangeMe123!) |

**Quote email:** When you send a quote by email, the quote is attached as a **PDF** (`Nidhi-Catering-Quote-{orderNumber}.pdf`) with the same logo and table format as the on-screen quote. If PDF generation fails, an HTML attachment is used as fallback.

**WhatsApp:** To send quotes via WhatsApp, configure [Twilio](https://www.twilio.com/):

1. Create a Twilio account and get **Account SID** and **Auth Token** from the [Console](https://console.twilio.com).
2. Go to **Messaging → Try it out → Send a WhatsApp message** and join the sandbox (send the code to the Twilio number).
3. In `.env` add:
   - `TWILIO_ACCOUNT_SID=ACxxxx...`
   - `TWILIO_AUTH_TOKEN=your_token`
   - `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (use the sandbox “From” number shown in Twilio, e.g. `whatsapp:+14155238886`).
4. Set `NEXT_PUBLIC_APP_URL` to your app’s public URL (e.g. `https://your-domain.com`) so the quote link in the WhatsApp message works for the customer.

For production, use Twilio’s WhatsApp Business API with your approved business number.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── orders/         # CRUD + stats
│   │   ├── menu/           # Menu catalog, GET/PUT [id], export, import
│   │   ├── quotes/         # PDF quote generation
│   │   ├── email/          # Compose (AI/template) + SMTP send
│   │   └── kitchen/        # Weekly plan queries
│   ├── (login)/login/      # Login page (no sidebar)
│   ├── admin/menu/         # Edit menu (table + modal, import/export)
│   ├── orders/
│   │   ├── new/            # Multi-step order wizard
│   │   └── [id]/           # Order detail view
│   ├── kitchen/            # 7-day plan-ahead
│   ├── menu/               # Menu catalog (table view)
│   └── send-quote/         # Draft orders list → link to order detail
├── components/             # Sidebar, layout, Providers
├── lib/
│   ├── models/             # Mongoose (MenuItem, Order, User, Counter)
│   ├── services/           # MenuService, OrderService, KitchenService, EmailService
│   ├── auth.ts             # NextAuth config (credentials, JWT)
│   ├── seed-admin.ts       # Create/update admin user
│   ├── validations.ts      # Zod schemas
│   ├── db.ts               # MongoDB connection
│   └── redis.ts            # Redis + rate limiting
├── stores/                 # Zustand (e.g. order wizard)
└── types/                  # TypeScript interfaces
```

## Menu Data

The `menu_seed_data.json` file contains all 233 menu items extracted from the master pricing spreadsheet:

| Category | Items | Priced Options | Pricing Model |
|---|---|---|---|
| Veg Menu | 86 | 333 | per pc / per lb / tray tiers / per plate |
| Non-Veg Menu | 54 | 156 | tray tiers / per pc |
| Desserts | 16 | 40 | per pc / per lb / tray tiers |
| Puja Food | 32 | 69 | per pc / per lb / tray tiers |
| Live Catering | 38 | 0 | Quote-based |
| Chafing Dishes | 3 | 2 | Flat rate |
| Disposable Plates | 4 | 0 | Contact for pricing |

### Menu Import/Export (Edit menu page)

- **Export:** Click **Export backup** to download the full menu as JSON (includes `exportedAt`, `count`, `items`). Auth required.
- **Import CSV:** Header must be `name,category,menuType,sizeOption,price,unit`. Rows with the same (name, category, menuType) are grouped and set that item’s pricing options.
- **Import JSON:** Array of objects. Each object must have either `_id` or `name`, `category`, `menuType`; optional fields include `pricingOptions`, `description`, `notes`, `minOrder`, `minOrderUnit`, `isQuoteBased`, `isActive`.

## Deployment (VPS / Hostinger / similar)

For full steps see **Production Implementation** above. Short checklist:

1. Upload the project (or clone from repo) to the server.
2. Create `.env` with production values (`MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, SMTP, etc.).
3. Run: `npm ci --omit=dev`, `npm run build`, `npm run seed`, `npm run seed:admin` (seed once).
4. Start the app: `npm start` or use PM2/Docker as in the Production section.
5. Put Nginx (or Caddy) in front with HTTPS and proxy to the app port.
6. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL.

## Architecture Decisions

- **MongoDB over SQL** — 5 different pricing models with variable item attributes made document DB the natural choice
- **Mongoose over Prisma** — Purpose-built for MongoDB, more mature MongoDB support
- **NextAuth credentials + JWT** — No OAuth required; middleware protects all routes except login and auth API
- **Server-side HTML quotes** — Simpler than PDF libraries; browser Print-to-PDF produces identical results
- **AI email with fallback** — Groq LLaMA for composition; if `GROQ_API_KEY` is missing, default template is used
- **Redis optional** — App works without Redis; caching and rate limiting degrade gracefully

---

Built for Nidhi Catering, Dallas TX.
