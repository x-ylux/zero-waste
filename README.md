# RescueRelay

**RescueRelay helps restaurants get surplus food to community kitchens and animal shelters before it goes to waste.** The prototype coordinates donors, recipients, and volunteer couriers from listing through pickup and handoff.

## What it does

- **List surplus food:** donors share quantity, dietary and allergen information, handling requirements, pickup location, and collection window.
- **Match recipients to food:** NGOs and community kitchens find listings aligned with their needs. Animal shelters only see food explicitly designated for animals.
- **Coordinate delivery:** volunteers accept pickup tasks, confirm handoffs, and support QR-based tracking.
- **Handle disruptions:** Rescue Mode can reassign a cancelled delivery to an available backup volunteer.
- **Show impact and forecasts:** dashboards summarize rescued food, illustrative CO₂e estimates, and a history-based end-of-day surplus forecast.
- **View locations:** location boards show nearby listings. Device location is requested only after the visitor chooses to share it.
- **Support multiple roles:** donor, NGO coordinator, animal shelter, volunteer, and platform administrator.

## Run locally

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then choose **Sign in / Register** and select a demo account to explore. Demo accounts use sample data and do not require email credentials.

## PostgreSQL and PostGIS

The project uses **PostgreSQL with PostGIS** for account and application-state persistence. Docker is not required. Configure `DATABASE_URL` in a local environment file for a PostgreSQL database with PostGIS enabled, then run:

```powershell
npm run db:migrate
npm run db:generate
npm run dev
```

Enable PostGIS in the target database before migrations:

```sql
CREATE EXTENSION postgis;
```

The demo state is persisted in PostgreSQL as a shared application snapshot. The user-owned local PostgreSQL cluster configured for this workspace runs on `127.0.0.1:5434`; its connection string is kept in the ignored `.env.local`.

## Technology

- Next.js 16, React, and TypeScript
- PostgreSQL, PostGIS, and Prisma
- Tailwind CSS and Recharts
- Domain logic and validation for food matching, delivery workflows, and impact reporting

## Integrations and assumptions

- Real email verification requires a configured Resend API key and verified sender.
- Real Google Maps requires a restricted Maps JavaScript API key; otherwise, the app displays a schematic map.
- Forecasting uses past listing outcomes as a transparent prototype heuristic, not a hosted AI model.
- CO₂e values are illustrative estimates, not certified impact measurements. Notifications and travel-time estimates are simulated.

## Verify

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
