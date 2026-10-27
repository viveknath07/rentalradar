# RentalRadar — Never miss a flat again

Geo-aware rental search where **saved searches run as background jobs** and
alert tenants the moment a matching flat appears.

---

## Problem Statement

Rental listings go stale in hours; checking five portals daily is hopeless.
Distance on rental sites means "same neighbourhood label", not actual
kilometres. RentalRadar searches by real geo-distance and keeps hunting for
you after you close the tab.

## Target Users

- **Tenants** hunting flats near a specific point (office, gym, in-laws).
- **Owners** who want serious inquiries without broker spam.

## Solution

Owners list properties with lat/lng and amenities. Tenants search by rent,
type, amenities and — the core — a **radius around a map point** (haversine
computed server-side, sorted nearest-first). Saving that search registers a
background job: a cron re-runs every saved search every 10 minutes against
newly created listings and queues alerts. Inquiries become threaded
conversations; owners watch views and inquiry counts per listing.

## Key Features

- **Haversine geo-search** — unit-tested against known coordinate pairs;
  radius filtering and distance sorting server-side.
- **Saved-search alert engine** — per-search `lastRunAt` watermark, unique
  alerts (no duplicate pings), manual run endpoint for demos/tests.
- **Inquiry threads** — tenant ↔ owner conversations scoped to both parties.
- **Owner dashboard** — views, inquiries, price-change history, rented toggle.
- **SVG city map** — click-to-place search center with live radius circle and
  price-on-hover pins.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 4, React Router 6, SVG map |
| Backend | Node.js, Express 4, Mongoose 8, Zod, node-cron |
| Auth | JWT (7-day), bcryptjs, `tenant`/`owner` roles, rate-limited auth |
| Database | MongoDB (Atlas or local); `USE_MEMORY_DB=1` zero-config demo |
| Tests | `node:test` + `mongodb-memory-server` (21 checks incl. haversine + matcher tests) |
| Deployment | Render (backend `render.yaml`) + Vercel (frontend `vercel.json`) |

## Architecture

```text
React SPA (Vercel)
   │  axios + JWT bearer
   ▼
Express API (Render)
   │   /api/listings           public geo-search + filters; authed CRUD
   │   ├─ haversineKm()        distance filter + sort (utils/geo.js)
   │   ├─ inquiries            threaded, ownership-scoped
   │   └─ owner dashboard      views/inquiries per listing
   │   /api/searches           saved searches (tenant)
   │   /api/alerts             notification inbox
   │   /api/jobs/run-alerts    manual trigger (cron calls same fn)
   ▼
jobs/alerts.js — runAlerts(): watermark-based matching, unique alerts
   ▼
MongoDB: User · Listing (priceHistory) · SavedSearch · Inquiry · Alert (unique)
```

## Major Workflows

1. **List a property** — owners set rent, deposit, amenities and a map point;
   price changes append to the history shown to buyers.
2. **Geo search** — center + radius + filters; results sorted by real distance;
   map view with interactive pins.
3. **Save the search** — the radar re-runs it every 10 minutes; new matches
   appear as alerts with a "new" badge per search.
4. **Inquire & talk** — threaded messages between tenant and owner only.
5. **Owner dashboard** — aggregate views/inquiries, mark rented, re-list.

## Local Setup

```bash
# 1. Backend
cd backend
npm install
npm test                       # 21-check suite (no database needed)

# Zero-config demo:
USE_MEMORY_DB=1 npm start      # API on http://localhost:5114

# Or with a real MongoDB:
cp .env.example .env           # set MONGODB_URI + JWT_SECRET
npm run seed
npm start

# 2. Frontend
cd ../frontend
npm install
npm run dev                    # app on http://localhost:5314
```

**Demo credentials** (password `Demo@1234`): `owner@demo.com` (8 listings
across real-ish Pune coordinates), `tenant@demo.com` (saved search "2BHK
under 25k near Kothrud" + an open inquiry with an owner reply). Trigger an
alert run with `curl -X POST localhost:5114/api/jobs/run-alerts`.

## Environment Variables

### backend/.env

| Name | Purpose |
|---|---|
| `PORT` | API port (default 5114) |
| `MONGODB_URI` | MongoDB connection string (empty + `USE_MEMORY_DB=1` for demo mode) |
| `USE_MEMORY_DB` | `1` = ephemeral in-memory MongoDB, auto-seeded on boot |
| `JWT_SECRET` | Secret used to sign JWTs — long random string in production |
| `CLIENT_ORIGIN` | Frontend origin allowed by CORS (default http://localhost:5314) |

### frontend/.env

| Name | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL (default http://localhost:5114/api) |

## API Overview

| Method & path | Purpose |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` | Auth (tenant/owner) |
| `GET /api/listings?lat&lng&radiusKm&minRent&maxRent&type&amenity&sort` | Public geo search |
| `POST /api/listings` · `PATCH /api/listings/:id` · `PATCH …/rented` · `DELETE` | Owner CRUD |
| `GET /api/listings/:id` | Detail (increments views) |
| `POST /api/listings/:id/inquiries` · `GET /api/inquiries/:id` · `POST …/reply` | Inquiry threads |
| `POST/GET /api/searches` · `DELETE /api/searches/:id` | Saved searches |
| `GET /api/alerts` · `POST /api/alerts/read` | Alert inbox |
| `GET /api/listings/mine` | Owner dashboard |
| `POST /api/jobs/run-alerts` | Manual alert run |
| `GET /api/health` | Health probe |

## Deployment

- **Backend**: Render web service from `backend/render.yaml`; set `MONGODB_URI`,
  `JWT_SECRET`, `CLIENT_ORIGIN`; health check `/api/health`. The alert cron
  starts with the server (or point a cron service at `/api/jobs/run-alerts`).
- **Frontend**: Vercel from `frontend/` (SPA rewrite); set `VITE_API_URL`.

Live links: backend — [add URL] · frontend — [add URL]

## Error Handling & Security

- Zod validation everywhere; rent floor (₹1000), coordinate bounds, radius
  caps (0.5–50 km) enforced.
- Listing mutations verify ownership; inquiries are visible only to the
  tenant and the listing's owner; owners can't inquire on their own flats.
- Alert uniqueness enforced by a compound unique index — repeated job runs
  never double-notify.
- bcrypt(12) hashing, no account enumeration, rate-limited auth, 7-day JWTs.
- Frontend handles loading/empty/error/success states; toasts on every
  mutation; 401 auto-logout.

- **Price intelligence** — average/median rent per area on the search page.
- **Comparable listings** — "similar flats nearby" (same type, ≤2 km, ±25% rent) on every detail page.

## Roadmap

- Real map tiles (Leaflet) with clustering.
- Email/WhatsApp alert delivery (SMTP pluggable).
- Broker verification badges.
- Rent-vs-area price intelligence charts.
# mern-project
