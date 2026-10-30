# RescuePlate

RescuePlate is a Bengaluru-focused surplus-food rescue demo for donors, recipient NGOs, and volunteer runners. It demonstrates capacity-aware matching, split allocations, backup dispatch after cancellation, verified pickup/delivery handoffs, and unit-safe impact metrics.

## Stack and structure

- Next.js 14 App Router and strict TypeScript.
- PostgreSQL with PostGIS, modeled and migrated through Prisma (`prisma/schema.prisma`, `prisma/migrations/`).
- Matching has a typed repository contract with a Prisma-backed implementation and an in-memory mock (`src/lib/matching/repository.ts`).
- The PostgreSQL migration enables PostGIS, stores trigger-synchronized `geography(Point,4326)` locations for organizations, donations, and volunteers, and adds GIST indexes for future spatial queries.
- Allocation, recovery, handover, and impact logic live in typed services under `src/lib/`.
- Vitest unit/integration suites and Playwright browser tests are under `tests/`.

The mock matching repository is intended for fast deterministic rule tests; interactive application state is persisted in PostgreSQL. Current matching still uses the documented Haversine route adapter rather than querying PostGIS.

## Run locally

### Prerequisites

- Node.js 18 or newer and npm.
- Docker Desktop (or a PostgreSQL 16 server with PostGIS enabled).

### Install and configure

```powershell
npm ci
Copy-Item .env.example .env
```

For the bundled local database, start the container and set `DATABASE_URL` in `.env` to:

```env
DATABASE_URL="postgresql://rescueplate:rescueplate_password@localhost:5432/rescueplate_db?schema=public"
```

That user/password pair is only the local Docker Compose demo credential; replace it for any shared or deployed database. Set `SESSION_SECRET` to a unique random value of at least 32 characters. Do not commit `.env` or production credentials.

### Initialize and run

```powershell
npm run db:up
npx prisma migrate deploy
npx prisma generate
npm run db:seed
npm run dev
```

These migration commands target a fresh database. If you are reusing a database previously initialized with `prisma db push`, first verify and baseline its migration history (or use a new database); do not run `migrate deploy` against an unbaselined existing schema.

Open [http://localhost:3000](http://localhost:3000). For a clean restore of the synthetic dataset, sign in as the admin and use **Demo Controls → Reset Demo Data**. Reset removes donations and related operational records for the five synthetic donor organizations, then recreates the baseline data. It does not erase unrelated organizations or user accounts.

### Demo accounts

All seeded demo accounts use `Password123!`. Use the persona switcher on the login screen:

- Admin: `admin@rescueplate.org`
- Donors: `donor.mess@rescueplate.org` (campus mess), `donor.caterer@rescueplate.org`, `donor.bistro@rescueplate.org`, `donor.restaurant@rescueplate.org`, `donor.commissary@rescueplate.org`
- NGOs: `ngo.annapurna@rescueplate.org`, `ngo.hungerrelief@rescueplate.org`, `ngo.sneha@rescueplate.org`, `ngo.sahaara@rescueplate.org`
- Volunteers: `vol.aarav@rescueplate.org`, `vol.priya@rescueplate.org`, `vol.karthik@rescueplate.org`, `vol.meera@rescueplate.org`, `vol.farah@rescueplate.org`, `vol.dev@rescueplate.org`, `vol.isha@rescueplate.org`, `vol.rohan@rescueplate.org`

## End-to-end walkthrough

1. Sign in as `donor.mess@rescueplate.org`; open **Publish Surplus Food Batch** and create a donation. The form starts with a pickup window relative to the current time; keep it in the future.
2. Open the donation details page to review ranked NGO matches and the reasons that candidates are excluded. Sign in as an NGO and reserve a quantity from **Discover & Accept Surplus Food**.
3. The reservation checks remaining inventory and a declared capacity window, then dispatches a pickup offer to an eligible available volunteer.
4. Sign in as that volunteer and accept the offer in **Assigned Pickups & Active Offers**. Cancel before pickup to trigger Rescue Mode. The cancelled assignment remains in history, and the next eligible standby volunteer receives an offer.
5. Sign in as the standby volunteer, accept the offer, and open the handover link. Generate and verify the collection challenge to confirm pickup.
6. Sign in as the recipient NGO and verify the delivery challenge, entering accepted and rejected quantities (and a reason for rejected food). The donation item and impact dashboard update from the recorded handoff.
7. Check `/impact` for listed, allocated, collected, accepted-delivery, rejected-delivery, and recovery metrics. SERVINGS, KG, PACKETS, and BOXES remain separate; handover challenges and database uniqueness constraints prevent duplicate completion from being counted twice.

The baseline contains five donors, four NGOs with different food needs and receiving capacities, eight volunteers with varied availability and transport capacity, and twelve donations across active, partially allocated, assigned, expired, rejected, and completed states. Completed scenarios include collection/delivery event history and a completed backup rescue.

## Validation commands

```powershell
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run test:e2e
```

Database-backed tests require the local PostgreSQL/PostGIS service and a seeded database. Playwright tests require the app server and baseline demo accounts.

## Mocked integrations and production limitations

- Map distance and route duration use the adapter's Haversine/straight-line fallback unless a supported routing provider is configured; these are not live traffic ETAs.
- Notifications are persisted in-app. Email/SMS/WhatsApp delivery is not integrated.
- Demo OTPs are surfaced in the UI only when `DEMO_MODE=true`; production delivery of verification codes needs a trusted messaging provider and stricter operational controls.
- Food safety, organization verification, recipient capacity, and volunteer availability are demo records, not external certifications or live checks.
- CO2 impact is "Not calculated" by default. Any estimate requires reviewed factors and documented assumptions.
- Before production, add deployment-grade secrets and access controls, privacy/retention policies, monitoring, rate limits, backup/restore procedures, external provider integrations, and operational review of legal and food-safety requirements.
