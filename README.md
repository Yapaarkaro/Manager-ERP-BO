# Manager

**Your entire business, in your pocket.**

Manager is a mobile app that helps small and medium business owners in India run their shops and businesses from their phone. Think of it like a super-smart assistant that remembers everything about your business -- what you sold, what you bought, who owes you money, how much stock you have, and who works for you. Instead of writing things in notebooks or spreadsheets, you just use Manager, and it keeps everything organized, safe, and easy to find.

## What Does Manager Do?

Imagine you own a shop. Every day, you need to:

- **Sell things** to customers and give them a bill
- **Keep track** of what items you have left on your shelves
- **Remember** which customers owe you money
- **Order more items** from your suppliers when you run low
- **Pay your suppliers** for the things they send you
- **Know how much money** you made today, this week, or this month
- **Manage your staff** -- who works where and what they do

Manager does ALL of this for you, in one app. No paper, no mess, no forgetting.

### For the Simplest Understanding

- **Sales**: You tap, you sell, you get a bill. Done.
- **Inventory**: Manager tells you "Hey, you're running low on rice!" before you even realize it.
- **Customers**: Remember every customer's name, phone number, what they bought, and how much they owe.
- **Suppliers**: Keep track of everyone you buy from, what you ordered, and what you paid.
- **Money**: See exactly how much cash you have, how much is in your bank, and where it all went.
- **Staff**: Know who's working at which branch and how they're doing.
- **Reports**: Beautiful charts that show you if your business is growing or needs attention.
- **Multiple Locations**: Got 2 shops? 5 warehouses? Manager handles them all.

---

## Features

### Sales and Billing
- Create professional GST-compliant invoices with tax breakdown (CGST/SGST/CESS)
- Support for both individual and business customers
- Multiple payment methods -- Cash, UPI, Card, Bank Transfer
- Barcode scanning for fast product lookup
- Cart management with quantity editing and round-off
- Invoice history and payment tracking
- Return and refund processing

### Inventory Management
- Complete product catalog with categories, HSN codes, and batch numbers
- Real-time stock tracking across multiple locations
- Low stock alerts with urgency levels (normal, low, critical)
- Stock-in from purchase invoices with discrepancy reporting
- Stock-out with reason tracking and mandatory proof photos
- Custom barcode generation (unique 13-character alphanumeric codes)
- Compound unit support (e.g., Box of 12 Pieces)
- Per-location stock tracking

### Customer Management
- Individual and business customer profiles
- GSTIN verification and auto-fill for business customers
- Credit limits and payment terms
- Purchase history and spending patterns
- Direct sales from customer profile

### Supplier and Purchasing
- Supplier database with GSTIN/PAN verification
- Purchase order creation and tracking
- Purchase invoice management with delivery status
- Payment tracking (paid, pending, overdue)

### Financial Management
- Cash and bank balance tracking
- Multiple bank account support
- Receivables dashboard (who owes you)
- Payables dashboard (who you owe)
- Financial year configuration (Apr-Mar or Jan-Dec)
- Invoice numbering with custom prefix and patterns

### Location Management
- Primary business address with Google Maps integration
- Branch management with manager assignment
- Warehouse management with stock tracking
- Staff assignment per location

### Staff Management
- Staff profiles with roles, departments, and salary info
- Location assignment
- Sales and invoice target setting
- Emergency contact tracking
- Permission management

### Marketing Campaigns
- Create campaigns across WhatsApp, Email, Instagram, Facebook, Google, and Offline
- Budget and spend tracking
- Audience targeting
- Performance metrics (impressions, clicks, conversions)

### Notifications
- Real-time in-app notifications (urgent, warning, info, success)
- Category filtering (orders, stock, payments, staff, system, customer)
- Priority levels and action tracking

### Reports and Analytics
- Daily, weekly, and monthly sales reports
- Payment method breakdown
- Stock level analytics
- Customer and supplier insights

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native 0.79 + Expo SDK 53 |
| **Language** | TypeScript (strict mode) |
| **Navigation** | Expo Router (file-based routing) |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions + Storage) |
| **State** | React Hooks + AsyncStorage (debounced, batched writes) |
| **Maps** | MapLibre GL + Google Maps Geocoding |
| **Icons** | Lucide React Native |
| **Notifications** | React Native Toast Message |

---

## Architecture

```
Manager-ERP-BO/
├── app/                          # Screens (file-based routing)
│   ├── auth/                     # Signup and login flow
│   │   ├── mobile.tsx            # Phone number entry
│   │   ├── otp.tsx               # OTP verification
│   │   ├── gstin-pan.tsx         # Tax ID verification
│   │   ├── business-details.tsx  # Business info
│   │   ├── business-address*.tsx # Address setup
│   │   ├── business-bank*.tsx    # Bank account setup
│   │   └── business-summary.tsx  # Onboarding summary
│   ├── dashboard.tsx             # Main dashboard
│   ├── new-sale/                 # Sales workflow
│   │   ├── index.tsx             # Product selection
│   │   ├── cart.tsx              # Cart and checkout
│   │   └── success.tsx           # Invoice generation
│   ├── inventory/                # Inventory management
│   │   ├── index.tsx             # Product list
│   │   ├── manual-product.tsx    # Add/edit product
│   │   ├── product-details.tsx   # Product detail view
│   │   ├── stock-in/             # Stock receiving
│   │   └── stock-out/            # Stock removal
│   ├── people/                   # People management
│   │   ├── customers.tsx         # Customer list
│   │   └── staff.tsx             # Staff list
│   ├── purchasing/               # Procurement
│   │   ├── suppliers.tsx         # Supplier list
│   │   ├── purchases.tsx         # Purchase orders/invoices
│   │   └── add-supplier.tsx      # Add supplier
│   ├── locations/                # Multi-location
│   │   ├── branches.tsx          # Branch management
│   │   └── warehouses.tsx        # Warehouse management
│   ├── marketing/                # Marketing campaigns
│   ├── sales.tsx                 # Sales history
│   ├── returns.tsx               # Returns list
│   ├── reports.tsx               # Business reports
│   ├── settings.tsx              # App settings
│   ├── notifications.tsx         # Notification center
│   ├── bank-accounts.tsx         # Bank accounts
│   ├── privacy-policy.tsx        # Privacy policy
│   └── terms-and-conditions.tsx  # Terms of service
├── components/                   # Reusable UI components
│   ├── CustomAlert.tsx           # Alert dialogs
│   ├── FAB.tsx                   # Floating action button
│   ├── HamburgerMenu.tsx         # Navigation drawer
│   └── Sidebar.tsx               # Desktop sidebar
├── hooks/                        # Custom React hooks
│   ├── useBusinessData.ts        # Business data fetching + caching
│   └── useSubscription.ts        # Subscription management
├── services/                     # API layer
│   └── backendApi.ts             # 70+ API functions for Supabase
├── utils/                        # Utilities
│   ├── dataStore.ts              # AsyncStorage with batched I/O
│   ├── productStore.ts           # Product state management
│   ├── subscriptionStore.ts      # Subscription state
│   ├── barcodeGenerator.ts       # Barcode generation
│   ├── numberToWords.ts          # Number-to-words conversion
│   └── shadowUtils.ts            # Shadow styling helpers
├── lib/
│   └── supabase.ts               # Supabase client configuration
└── app.json                      # Expo configuration
```

---

## Backend (Supabase)

### Database Schema -- 29 Tables

| Category | Tables |
|---|---|
| **Core** | `businesses`, `users`, `locations`, `user_locations`, `bank_accounts`, `business_settings` |
| **Auth** | `signup_progress`, `device_snapshots` |
| **Commerce** | `invoices`, `invoice_items`, `returns`, `return_items` |
| **Inventory** | `products`, `inventory_logs`, `location_stock`, `assigned_barcodes` |
| **People** | `customers`, `staff`, `suppliers` |
| **Purchasing** | `purchase_orders`, `purchase_order_items`, `purchase_invoices`, `purchase_invoice_items` |
| **Subscription** | `subscription_plans`, `subscriptions`, `subscription_addons`, `subscription_history` |
| **Engagement** | `notifications`, `marketing_campaigns` |

All 29 tables have **Row Level Security (RLS) enabled** with policies that enforce tenant isolation through `business_id`.

### Edge Functions -- 15 Deployed

| Function | Auth | Purpose |
|---|---|---|
| `verify-mobile-otp` | Pre-auth | Mobile OTP verification |
| `auth-mobile-login` | Pre-auth | User authentication and session creation |
| `verify-gstin` | JWT | GSTIN verification via external API |
| `verify-gstin-otp` | JWT | GSTIN OTP verification |
| `verify-pan` | JWT | PAN verification |
| `submit-business-details` | JWT | Business creation with identity verification |
| `manage-addresses` | JWT | CRUD for business addresses |
| `manage-bank-accounts` | JWT | CRUD for bank accounts |
| `complete-onboarding` | JWT | Finalize business setup |
| `manage-signup-progress` | JWT | Track signup steps |
| `manage-device-snapshots` | JWT | Device fingerprinting |
| `manage-staff` | JWT | Staff CRUD operations |
| `update-business-cash-balance` | JWT | Cash balance updates |
| `generate-barcode` | JWT | Barcode image generation |
| `google-maps-geocode` | JWT | Address geocoding |

### Security Features
- All database functions have immutable `search_path` (prevents hijacking)
- Single consolidated RLS helper function (`get_user_business_id`)
- Tenant isolation on every table via `business_id` filtering
- JWT verification on all authenticated edge functions
- Barcode generation with uniqueness guarantees and business ownership verification
- SECURITY DEFINER functions with explicit schema references

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
git clone <repository-url>
cd Manager-ERP-BO
npm install
```

### Environment Variables

Create a `.env` file (not committed to git):

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Running the App

```bash
# Start development server
npx expo start

# iOS
npx expo start --ios

# Android
npx expo start --android

# Web
npx expo start --web
```

### Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## API Layer

The `services/backendApi.ts` file contains 70+ functions organized by domain:

| Domain | Functions | Operations |
|---|---|---|
| Products | 9 | Full CRUD + inventory logs, location stock, barcode |
| Customers | 4 | Full CRUD |
| Suppliers | 4 | Full CRUD |
| Staff | 4 | Full CRUD |
| Addresses | 4 | Full CRUD |
| Bank Accounts | 4 | Full CRUD |
| Invoices | 4 | Create, read, read-with-items, update payment |
| Returns | 2 | Create, read |
| Purchase Orders | 3 | Create, read, update status |
| Purchase Invoices | 2 | Create, read |
| Notifications | 3 | Create, read, update status |
| Marketing | 2 | Create, read |
| Financial | 3 | Receivables, payables, invoice numbering |
| Auth/Signup | 8 | OTP, business details, signup progress, device |
| Business | 5 | Onboarding, cash balance, primary address/bank |
| Subscription | 1 | Create/update subscription |

All functions use a cached `getUserBusinessId()` helper to avoid repeated database lookups (5-minute TTL).

---

## Contact

- **Website**: [getmanager.in](https://getmanager.in)
- **Email**: support@getmanager.in

---

Built for Indian business owners.
