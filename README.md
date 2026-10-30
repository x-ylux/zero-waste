# RescuePlate

> **Capacity-Aware Surplus Food Redistribution Platform**
> Built for Food Donors, Recipient NGOs, and Volunteer Runners.

RescuePlate solves the fundamental failure modes of surplus food redistribution:
1. **Capacity-Aware NGO Matching:** Validates candidate NGOs against verified operating hours, declared storage capacity windows, and collection radii. Missing capacity is never treated as unlimited.
2. **Transactional Split Allocation:** Safely divides large surplus batches (e.g., 100 meals split 60/40 across two NGOs) with atomic database locking to prevent concurrent over-booking.
3. **Durable Failed-Pickup Recovery:** Preserves volunteer assignment history on dropout or timeout and automatically locates and dispatches offers to eligible backup runners without losing track of custody.
4. **Verified Handover Auditing:** Reconciles physical collection and delivery via cryptographically hashed 6-digit challenge codes, separately tracking accepted vs. rejected quantities.

---

## Technical Stack

- **Framework:** Next.js 14 (App Router, Server Components & Route Handlers)
- **Language:** TypeScript (Strict mode enabled)
- **Styling:** Tailwind CSS with accessible contrast and custom warm cream/emerald palette
- **Database:** PostgreSQL with PostGIS extension (`postgis/postgis:16-3.4` container)
- **ORM & Migrations:** Prisma ORM 5 with SQL migrations (`prisma/migrations/20261030000000_init/migration.sql`)
- **Validation:** Zod schemas for server-side input and state validation
- **Authentication:** Database-backed sessions with signed HMAC-SHA256 tokens (`jose`) & bcrypt password hashing
- **Map & Routing:** Clean `IMapAdapter` interface with Haversine distance and straight-line urban travel estimation fallback (clearly labeled as demonstration estimates)
- **Background Worker:** Database-backed `RecoveryWorker` for idempotent timeout processing and backup dispatching
- **Testing:** Vitest for unit & integration test suites; Playwright for end-to-end browser workflows

---

## Architecture Overview

```
                            ┌────────────────────────┐
                            │    RescuePlate Web     │
                            │   (Next.js App Router) │
                            └───────────┬────────────┘
                                        │
           ┌────────────────────────────┼───────────────────────────┐
           │                            │                           │
┌──────────▼──────────┐     ┌───────────▼───────────┐   ┌───────────▼───────────┐
│   Donor Portal      │     │      NGO Portal       │   │   Volunteer Dispatch  │
│  - Publish Batches  │     │ - Capacity Windows    │   │ - Pickup Offers       │
│  - Collection OTPs  │     │ - Atomic Split Claims │   │ - Recovery / Backup   │
└──────────┬──────────┘     └───────────┬───────────┘   └───────────┬───────────┘
           │                            │                           │
           └────────────────────────────┼───────────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────┐
                 │       Deterministic Engine & Services       │
                 │ - MatchingEngine (Capacity & Hours Checks)  │
                 │ - AllocationService (Transactional Locks)   │
                 │ - HandoverService (Bcrypt OTP Verification) │
                 │ - RecoveryWorker (Backup Volunteer Engine)  │
                 │ - ImpactCalculator (Separate Units Accounting)│
                 └──────────────────────┬──────────────────────┘
                                        │
                 ┌──────────────────────▼──────────────────────┐
                 │    PostgreSQL + PostGIS (Docker Container)   │
                 │    16 Relational Tables & Audit Ledger      │
                 └─────────────────────────────────────────────┘
```

---

## Quick Start & Setup Instructions

### 1. Prerequisites
- **Node.js:** v18+ (tested on v24.16.0)
- **Docker & Docker Compose:** For running local PostgreSQL with PostGIS

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration values in `.env`:
```env
DATABASE_URL="postgresql://rescueplate:rescueplate_password@localhost:5432/rescueplate_db?schema=public"
NODE_ENV="development"
DEMO_MODE="true"
SESSION_SECRET="rescueplate-super-secure-session-secret-key-at-least-32-chars-long"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
DEFAULT_TIMEZONE="Asia/Kolkata"
GEO_PROVIDER="adapter_fallback"
GOOGLE_MAPS_API_KEY=""
CO2_FACTOR_ENABLED="false"
CO2_FACTOR_PER_KG="2.5"
CO2_FACTOR_SOURCE="UN FAO Food Wastage Footprint / WRI Protocol (Simulated benchmark)"
NOTIFICATION_PROVIDER="in_app"
```

### 3. Start Database (PostgreSQL + PostGIS)
Start the PostgreSQL container via Docker Compose:
```bash
docker compose up -d
```
Verify container status:
```bash
docker ps --filter "name=rescueplate-postgres"
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Initialize Schema & Seed Synthetic City Data
Push the schema to the database and generate the Prisma Client:
```bash
npx prisma db push
```
Seed synthetic test data for Bengaluru (3 donors, 3 NGOs, 4 volunteers, 1 admin):
```bash
npm run db:seed
```

### 6. Run the Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Suites & Verification

### Unit & Integration Tests (Vitest)
Executes all 6 test suites covering matching, atomic split allocations, overbooking prevention, OTP hashing, failed-pickup recovery, and metrics reconciliation:
```bash
npm run test
```

### Run Background Worker Locally
Executes the database-backed recovery worker to scan for expired offers, time them out, and dispatch backup volunteers:
```bash
npm run worker:run
```

### Production Build Check
Verifies Next.js App Router static compilation and strict TypeScript types:
```bash
npm run build
```

---

## Deterministic Hackathon Demo Walkthrough

RescuePlate includes a persistent **Admin Demo Control Panel** (visible via the top banner in `DEMO_MODE`) and a **Quick Persona Switcher** in the navigation header.

### Target Scenario:
1. **Campus Mess Lists 100 Portions:**
   - Sign in as **Suresh Patil** (`donor.mess@rescueplate.org`).
   - Navigate to `/donor` to see the listed donation: *Campus Lunch Surplus (100 servings)*.
2. **Deterministic 60/40 Split Across Two NGOs:**
   - Click **Demo Controls** in the top banner and click **Step 1: Stage Campus Split Allocation**.
   - Annapurna Seva Kendra accepts **60 servings** (matching its 60-portion capacity window).
   - Bengaluru Hunger Relief accepts **40 servings** (matching its 40-portion capacity window).
   - Volunteer **Aarav Sharma** accepts the assignment for Annapurna's 60 portions.
3. **Volunteer Dropout & Automatic Backup Recovery:**
   - Click **Step 2: Trigger Volunteer Cancellation** (Simulates Aarav having a flat tire).
   - Notice that Aarav's assignment is preserved as `CANCELLED` with reason `"Motorcycle flat tire on Outer Ring Road."`
   - The system automatically evaluates available volunteers within range and dispatches an offer to **Priya Venkatesh** (`vol.priya@rescueplate.org`).
4. **Backup Volunteer Acceptance:**
   - Click **Step 3: Backup Volunteer Accepts Offer** (or switch to Priya and click Accept).
   - Allocation status updates to `ASSIGNED`.
5. **Collection & Delivery Verification (OTP Handover):**
   - Navigate to `/handover/<allocationAId>`.
   - Click **Generate 6-Digit Challenge**. In demo mode, the code is highlighted in the helper box (e.g. `839102`).
   - Click **Verify & Commit COLLECTION Handover**. Verified quantity: 60 servings. Allocation updates to `COLLECTED`.
   - In stage 2 (DELIVERY), enter the NGO challenge, record 58 accepted, 2 rejected (reason: `"Broken container lid during transport"`), and submit.
   - Allocation status updates to `PARTIALLY_DELIVERED`.
6. **Operational Impact Dashboard:**
   - Visit `/impact` to inspect the reconciled metrics:
     - Listed: 100 servings
     - Allocated: 100 servings
     - Collected: 60 servings
     - Delivered Accepted: 58 servings
     - Delivered Rejected: 2 servings
     - Uncollected: 40 servings
     - Pickup completion rate with explicit denominator shown.

---

## Pre-Seeded Demonstration Personas

All accounts use the password: `Password123!`

| Persona | Role | Organisation | Email |
|---|---|---|---|
| **Radha Krishnan** | ADMIN | System Administrator | `admin@rescueplate.org` |
| **Suresh Patil** | DONOR | Apex Campus Mess (Koramangala) | `donor.mess@rescueplate.org` |
| **Vikram Singhania** | DONOR | Grand Pavilion Banquets (Indiranagar) | `donor.caterer@rescueplate.org` |
| **Ananya Deshmukh** | DONOR | GreenHarvest Bistro (MG Road) | `donor.bistro@rescueplate.org` |
| **Sister Teresa** | NGO | Annapurna Seva Kendra (Koramangala) | `ngo.annapurna@rescueplate.org` |
| **Devendra Hegde** | NGO | Bengaluru Hunger Relief (HSR Layout) | `ngo.hungerrelief@rescueplate.org` |
| **Kavita Rao** | NGO | Sneha Shelter Foundation (Domlur) | `ngo.sneha@rescueplate.org` |
| **Aarav Sharma** | VOLUNTEER | Two-Wheeler Runner (Koramangala) | `vol.aarav@rescueplate.org` |
| **Priya Venkatesh** | VOLUNTEER | Four-Wheeler Runner (Backup) | `vol.priya@rescueplate.org` |
| **Karthik Rao** | VOLUNTEER | Two-Wheeler Runner (HSR Layout) | `vol.karthik@rescueplate.org` |
| **Meera Nair** | VOLUNTEER | Two-Wheeler Runner (Indiranagar) | `vol.meera@rescueplate.org` |

---

## Disclosures & Boundary Labeling

- **Food Safety:** Handling information is provided by participants. The application does not certify food safety, legal compliance, or shelf life.
- **Distance & Routing:** Unless configured with a live Google Maps API key, distances use great-circle Haversine calculations and straight-line urban demonstration estimates. They are never represented as real-time traffic ETAs.
- **Emissions:** Carbon emissions default to `"Not calculated"`. Estimates are only shown if explicit emission factors and waste diversion assumptions are configured.
- **Messaging:** Notification events are stored in the local database and labeled with their simulated channel. The application never falsely claims an SMS or WhatsApp message was transmitted.

