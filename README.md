# RescueRelay

RescueRelay is a Bengaluru-focused surplus-food rescue prototype. It connects restaurants, caterers, and campus mess halls with NGO kitchens and volunteer couriers through needs-based matching, Rescue Mode backup dispatch, QR handoff passports, and illustrative impact metrics.

## What runs without credentials

The default demo uses a **mock repository with browser localStorage**. You do **not** need PostgreSQL credentials or a Google Maps API key to explore the product.

- The public home page summarizes rescued food, available listings, and estimated CO₂e; sign-in, registration, and demo accounts are at `/login`
- Real email-code authentication requires PostgreSQL, a Resend sender, and an `AUTH_SECRET`; it never falls back to fake codes
- Missing Maps key → schematic map fallback; with a restricted Google Maps JavaScript API key, location boards render real Google Maps
- Device location is requested only after a visitor clicks **Use my location**; the browser sends it to Google Maps for display, and RescueRelay does not store it
- Animal shelters can register as a recipient subtype; they only see food donors explicitly designate for animal shelters
- Theme → light/dark toggle, with a 60-30-10 balance of dominant background, secondary surfaces, and emerald accent
- Donor dashboard → end-of-day leftover estimate from known outcomes in the previous 30 days
- Notifications are labelled as **simulated**
- Route and travel-time figures are labelled as **simulated estimates**
- Impact figures are labelled **Illustrative estimate**

The surplus forecast is a transparent demo heuristic, not a hosted AI model: it averages known leftover quantities from completed, expired, or rejected listings for the donor. Automated alerts/messages and model-based forecasting require a production data source and AI integration.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS + accessible shell/navigation
- Zod validation for donation and needs forms
- Domain engine for matching, status transitions, Rescue Mode, and impact
- Repository interface with `MemoryRescueRepository` (demo) and `PostgresRescueRepository` (optional)
- PostgreSQL + PostGIS schema/migrations under `prisma/`
- Recharts for failure-reason analytics

## Quick start (demo mode)

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Open the public overview at `/`. Choose **Sign in / Register** to enter a **Demo account** (demonstration only — it skips email verification and uses localStorage sample data):

1. Donor
2. NGO coordinator
3. Animal shelter
4. Volunteer
5. Platform administrator

**Reset Demo Data** regenerates seed listings with pickup windows relative to the current time.

## Google Maps

Create a Google Maps Platform project, enable billing and the Maps JavaScript API, then create a browser key restricted to your site’s referrers. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env` and restart the development server. The key is necessarily visible in browser requests; never use an unrestricted key or put server secrets in this variable. Without a key, location boards use the schematic fallback. Device location is requested only after the visitor clicks the location button.

Animal shelters can register as an NGO recipient subtype and are matched only with listings donors explicitly designate as animal-shelter-only. Donors must confirm suitability for the intended species; the app does not certify food safety. These deliveries are reported separately and excluded from human meal-equivalent and CO₂e estimates.

## Native PostgreSQL + PostGIS

```powershell
Copy-Item .env.example .env
# Install PostGIS for your PostgreSQL version, then update DATABASE_URL in .env
# with the username and password of a local PostgreSQL role.
npx prisma migrate deploy
npx prisma generate
```

The database must have the PostGIS extension available. Have a PostgreSQL administrator create the database and enable the extension before running migrations:

```sql
CREATE DATABASE rescuerelay_db;
\connect rescuerelay_db
CREATE EXTENSION postgis;
```

Then configure `DATABASE_URL` in `.env`, for example `postgresql://postgres:your-local-password@localhost:5432/rescuerelay_db?schema=public`. URL-encode any special characters in the password. Do not commit `.env`.

To load the optional demo seed data:

```powershell
npm run db:seed
```

Set `RESCUE_RELAY_PERSISTENCE=postgres` only after `DATABASE_URL` points at a PostGIS-enabled database. The interactive UI still defaults to the mock/localStorage path unless you wire server handlers to the Postgres adapter.

## Real account authentication

Set `DATABASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and a random `AUTH_SECRET` in `.env`, then apply the Prisma migrations. Registration supports donor, NGO, and volunteer accounts. Registration and every password login send a six-digit email code through Resend; codes expire after 10 minutes, are limited to five attempts, and are stored only as keyed hashes. Sessions use HTTP-only cookies. Configure a verified sender address in Resend before testing real email delivery.

The app's operational demo data still uses the browser localStorage repository. Configure a server-side operational data repository separately before using registered accounts for shared production workflows.

## Demo walkthrough

1. Switch to **Donor** → **Create donation** and publish a listing (ack handling info).
2. Switch to **NGO coordinator** → review match reasons → **Accept & request volunteer**.
3. Switch to **Volunteer** → accept the task → **Simulate volunteer cancellation** (Rescue Mode).
4. Continue as **Priya Shah (standby)** → accept the backup task.
5. Confirm pickup (manual or QR passport).
6. Switch back to the NGO → confirm accepted quantity.
7. Open **Admin → Impact & failures** and confirm meals/CO2e moved only from accepted quantity.
8. Open the donor dashboard to view its history-based end-of-day surplus estimate.

Seed baseline includes 5 donors, 4 NGOs, 8 volunteers, 12 donations (including completed backup rescue, rejected, and expired), handoff history, and failure analytics.

## Validation

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Mocked integrations and limits

| Area | Demo behaviour |
| --- | --- |
| Persistence | localStorage mock repository |
| Maps / ETA | Haversine + simulated minutes; list fallback without Maps key |
| Notifications | In-app simulated SMS/email labels |
| Impact / CO2e | Config factors in `src/lib/config/impact.ts`; not certified savings |
| Authentication | Resend email codes + database-backed accounts when configured; demo accounts remain localStorage-only |

## Remaining work before production

- Production-grade role authorization, account recovery, email delivery monitoring, and audit logging
- Operational food-safety policy and organization verification
- Live routing/notifications providers with privacy controls
- Reviewed impact factors and legal review
- Hardened secrets, rate limits, backups, and monitoring
- Full relational write-path (beyond AppSnapshot) if Postgres is the system of record
