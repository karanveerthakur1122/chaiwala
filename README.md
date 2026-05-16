# Chai Wala Babu

A modern, role-based chai shop ordering and management web app — built with React, Vite, and Supabase.

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

## Overview

Chai Wala Babu is a small but full-featured ordering and shop management application designed for a single chai shop with three distinct user experiences. Customers browse a live menu, build a cart, and place orders from their phones. Receptionists run the floor: they take walk-in orders, assign tables, monitor an order board that updates in real time, and review history and analytics. Admins have full control over the catalog, users, tables, and shop-wide settings.

The frontend is a single-page React application built with Vite and styled with Tailwind CSS v4. State that needs to live across navigations (auth session, cart) is handled by Zustand stores with `persist` middleware, while server data is cached and revalidated by TanStack Query. The backend is Supabase, providing Postgres, authentication, row-level security, and realtime subscriptions out of the box — no custom backend code required.

The app is built mobile-first, ships as an installable PWA, and is designed to be deployed for free on Netlify. Every order transition (placed → accepted → preparing → ready → served → completed) is broadcast over Supabase realtime so all connected clients see updates within milliseconds.

---

## Features

### Customer Features

- Browse the menu by category with item availability indicators
- Search and filter menu items
- Add items to a persistent cart (survives reloads and navigations)
- Place orders and watch their status update live
- View order history with itemized breakdowns
- Edit profile (name, contact details)
- Installable on mobile as a PWA

### Receptionist Features

- Real-time order board that updates as customers place orders
- Create walk-in orders directly from the receptionist UI
- Assign and manage table occupancy (free / occupied / reserved)
- Move orders through the lifecycle: accept, start preparing, mark ready, mark served, complete or cancel
- "Ready (alert)" shortcut to jump straight to the ready state when needed
- Receptionist overview dashboard with today's KPIs
- Receptionist-scoped analytics (today, week, custom range)
- Order history with filters and CSV export
- Audio notification when new orders arrive

### Admin Features

- Full menu management: categories, items, prices, availability, sort order
- User management: list users, change roles, delete profiles
- Table management: add, rename, set capacity, retire tables
- Shop-wide settings
- Cross-role analytics dashboard with charts (revenue, orders, popular items, peak hours)
- CSV exports for analytics

### Shared Features

- Supabase email/password authentication with role-based redirects
- Row-Level Security (RLS) enforced at the database layer for every table
- Realtime subscriptions for live order updates across roles
- Offline-capable PWA shell (installable, instant subsequent loads)
- Route-level code splitting and intelligent prefetch
- Resilient network handling (request timeouts, exponential-backoff retries)
- Friendly error boundaries
- Responsive design tuned for phones first, then tablets and desktop

---

## Tech Stack

| Layer            | Technology                                       | Purpose                                                |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------ |
| UI               | React 19, React DOM 19                           | Component model and rendering                          |
| Routing          | React Router 7                                   | Client-side routing with role-based guards             |
| Client state     | Zustand 5 (with `persist`)                       | Auth session, cart, menu store                         |
| Server state     | TanStack Query 5                                 | Data fetching, caching, background revalidation        |
| Build tooling    | Vite 8, `@vitejs/plugin-react`                   | Dev server and production bundler                      |
| Styling          | Tailwind CSS v4 (`@tailwindcss/vite`)            | Utility-first styling                                  |
| Icons            | Lucide React                                     | Icon set                                               |
| PWA              | `vite-plugin-pwa` (Workbox)                      | Service worker, manifest, runtime caching              |
| Backend (BaaS)   | Supabase (Postgres, Auth, Realtime)              | Database, authentication, realtime channels            |
| Hosting          | Netlify                                          | Static hosting + SPA redirects                         |

--

---

## Architecture

- **Frontend SPA.** A single-page React app built with Vite. Each top-level role (`/customer`, `/reception`, `/admin`) is gated by a `ProtectedRoute` guard that checks the authenticated user's profile role before rendering. Layouts are loaded eagerly so the bottom nav and header don't tear down on every navigation; pages are loaded lazily (`React.lazy`) to keep the initial bundle small.
- **Supabase as backend.** All data lives in Supabase Postgres. The browser talks directly to Supabase via `@supabase/supabase-js` — there is no custom server. Auth is also handled by Supabase (email/password).
- **Row-Level Security.** Access control is enforced at the database layer via PostgreSQL RLS policies (see `supabase/migrations/007_enable_rls.sql` and the `0xx_rls_*.sql` files). Customers can only see and mutate their own orders; receptionists and admins have broader read/write permissions defined per table.
- **Realtime subscriptions.** Order board, customer order list, and reception overview subscribe to Postgres changes via Supabase Realtime. When an order moves from `placed` → `accepted`, all connected clients receive the change instantly.
- **TanStack Query for caching.** Server data (menu, orders, tables, users) is cached and revalidated by TanStack Query. The service worker deliberately does **not** cache `/rest/v1/*` requests — TanStack Query already handles that, and caching live data in the SW caused stale rows to clash with realtime updates.
- **PWA shell.** `vite-plugin-pwa` precaches the static shell (HTML, JS, CSS, fonts, images) so the app boots instantly and is installable on mobile. Supabase REST/auth/realtime/storage paths are explicitly excluded from SW navigation fallbacks.

---

## Project Structure

```
chaiwala/
├── public/
│   ├── _redirects              # Netlify SPA fallback
│   └── pwa-icon.svg
├── src/
│   ├── App.jsx                 # Routes, role guards, providers
│   ├── main.jsx                # React root + StrictMode
│   ├── index.css               # Tailwind entry
│   ├── components/
│   │   ├── analytics/
│   │   │   └── CssCharts.jsx
│   │   ├── AdminSearchBar.jsx
│   │   ├── BottomNav.jsx
│   │   ├── ChaiLoader.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── OrderReadyNotifier.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── Skeleton.jsx
│   │   └── TopBar.jsx
│   ├── hooks/
│   │   ├── useDebounce.js
│   │   ├── useNavCounts.js
│   │   ├── useOnlineStatus.js
│   │   ├── usePagination.js
│   │   └── useRealtime.js
│   ├── layouts/
│   │   ├── AdminLayout.jsx
│   │   ├── CustomerLayout.jsx
│   │   └── ReceptionLayout.jsx
│   ├── lib/
│   │   ├── adminAnalyticsData.js
│   │   ├── analyticsRange.js
│   │   ├── audio.js
│   │   ├── constants.js          # ROLES, ROLE_HOME_ROUTES
│   │   ├── enrichOrders.js
│   │   ├── exportCsv.js
│   │   ├── orderDisplay.js
│   │   ├── orderStateMachine.js  # ORDER_STATUSES, transitions
│   │   ├── popularItems.js
│   │   ├── prefetchRoutes.js
│   │   ├── queryClient.js
│   │   ├── receptionAnalyticsData.js
│   │   └── supabase.js           # createClient + helpers
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── customer/
│   │   │   ├── Cart.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Menu.jsx
│   │   │   ├── Orders.jsx
│   │   │   └── Profile.jsx
│   │   ├── reception/
│   │   │   ├── Analytics.jsx
│   │   │   ├── History.jsx
│   │   │   ├── NewWalkIn.jsx
│   │   │   ├── OrderBoard.jsx
│   │   │   ├── Overview.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Tables.jsx
│   │   └── admin/
│   │       ├── Analytics.jsx
│   │       ├── Dashboard.jsx
│   │       ├── MenuManagement.jsx
│   │       ├── Settings.jsx
│   │       ├── TableManagement.jsx
│   │       └── UserManagement.jsx
│   └── stores/
│       ├── authStore.js
│       ├── cartStore.js
│       └── menuStore.js
├── supabase/
│   └── migrations/             # Numbered SQL migrations (see below)
├── .env.example
├── .gitignore
├── .nvmrc
├── index.html
├── netlify.toml
├── package.json
├── vite.config.js
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** (an LTS release is recommended; see `.nvmrc`)
- **npm** (ships with Node)
- A free **Supabase** project ([supabase.com](https://supabase.com/))

### 1. Clone the repository

```bash
git clone https://github.com/your-username/chaiwala.git
cd chaiwala
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [app.supabase.com](https://app.supabase.com/).
2. Once it's ready, open **Project Settings → API** and copy:
   - the **Project URL** (e.g. `https://xxxx.supabase.co`)
   - the **anon public** key

Documentation: [Supabase Quickstart](https://supabase.com/docs/guides/getting-started).

### 4. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Vite only exposes variables prefixed with `VITE_` to the client.

### 5. Run database migrations

You have two options:

**Option A — Supabase SQL Editor (simplest):**

1. Open your project in Supabase.
2. Go to **SQL Editor → New query**.
3. Open `supabase/migrations/000_run_all.sql` from this repo, paste it into the editor, and run it. This creates the schema, RLS policies, the auto-profile trigger, and enables realtime.
4. Then run, in order, the additive migrations that come after the bundled `000_run_all.sql` snapshot (see [Migration Order](#migration-order) below). Each file is safe to run as a separate SQL Editor query.

**Option B — Supabase CLI:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

See the [Supabase CLI docs](https://supabase.com/docs/guides/cli) for details.

### 6. (Optional) Promote your account to admin

After signing up through the app once, run `supabase/migrations/016_set_admin_user.sql` against your project — but first edit it to use **your** email address rather than the placeholder. Or run a one-off SQL statement in the editor:

```sql
update public.profiles
set role = 'admin'
where user_id = (select id from auth.users where email = 'you@example.com');
```

### 7. Start the dev server

```bash
npm run dev
```

The app will open at `http://localhost:5173`.

### Available scripts

| Command           | What it does                                                    |
| ----------------- | --------------------------------------------------------------- |
| `npm run dev`     | Start Vite dev server with HMR on port 5173                     |
| `npm run build`   | Production build to `dist/` (with PWA manifest + service worker)|
| `npm run preview` | Serve the production build locally for smoke-testing            |

---

## Environment Variables

| Variable                 | Required | Description                                                   |
| ------------------------ | -------- | ------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes      | Your Supabase project URL (`https://<ref>.supabase.co`)       |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase anon (public) key — safe to expose to the browser    |

The anon key is designed to be public; security is enforced by Row-Level Security on the database. Never commit a service-role key.

---

## Database Schema

The app uses six core tables, all in the `public` schema:

| Table         | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `profiles`    | One row per auth user. Stores `role` (`customer` / `receptionist` / `admin`), display name, contact info. Auto-created on signup via trigger. |
| `categories`  | Menu categories (e.g., "Chai", "Snacks") with sort order and active flag. |
| `menu_items`  | Items belonging to a category — name, description, price, availability, image. |
| `tables`      | Physical tables in the shop — number, capacity, occupancy state.        |
| `orders`      | One row per order — customer reference, table reference, status, totals, timestamps. |
| `order_items` | Line items for each order — menu item snapshot, quantity, unit price.   |

**Row-Level Security is enabled on every table.** Policies are defined in migrations `008_rls_profiles.sql` through `013_rls_order_items.sql`, with refinements in `017`, `018`, `023`, `024`, `025`, and `026`. In short:

- Customers can read/write only their own profile and their own orders/order items.
- Receptionists can read all orders and tables, and can move orders through the lifecycle.
- Admins have full read/write access on every table.

The order lifecycle is enforced both in the UI (`src/lib/orderStateMachine.js`) and via RLS:

```
placed → accepted → preparing → ready → served → completed
                                       ↘
                                        cancelled  (from any active state)
```

Realtime is enabled for `orders` and `order_items` (see `015_enable_realtime.sql`).

---

## Migration Order

Run migrations in this exact numerical order. The first file (`000_run_all.sql`) is a convenience bundle that contains the snapshot for `001`–`015` and is the recommended starting point for a fresh database; everything from `016` onward must be applied on top of it in order.

```
000_run_all.sql                       (bundled snapshot of 001–015)
001_create_profiles.sql
002_create_categories.sql
003_create_menu_items.sql
004_create_tables.sql
005_create_orders.sql
006_create_order_items.sql
007_enable_rls.sql
008_rls_profiles.sql
009_rls_categories.sql
010_rls_menu_items.sql
011_rls_tables.sql
012_rls_orders.sql
013_rls_order_items.sql
014_trigger_auto_profile.sql
015_enable_realtime.sql
016_set_admin_user.sql                (edit email before running)
017_rls_admin_update_profiles.sql
018_fix_admin_crud_policies.sql
019_seed_tables_categories_menu.sql   (optional — sample seed data)
020_simplify_roles.sql
021_order_ready_reminder.sql
022_seed_real_menu.sql                (optional — production seed)
023_fix_rls_security.sql
024_fix_insert_rls.sql
025_admin_delete_profiles.sql
026_fix_reception_orders_select.sql
```

The seed files (`019` and `022`) are optional — skip them if you'd rather populate the menu yourself from the admin panel.

---

## Authentication & Roles

The app has three roles, defined in `src/lib/constants.js`:

| Role           | Default landing route | What they can do                                                |
| -------------- | --------------------- | --------------------------------------------------------------- |
| `customer`     | `/customer`           | Browse menu, place and track orders                             |
| `receptionist` | `/reception`          | Run the floor, take walk-ins, advance the order lifecycle       |
| `admin`        | `/admin`              | Manage menu, users, tables, settings, view full analytics       |

When a new user signs up via `/signup`, the `014_trigger_auto_profile.sql` trigger automatically inserts a row in `public.profiles` with role `customer`. To promote a user, an admin can change their role from **Admin → User Management**, or you can run SQL directly:

```sql
update public.profiles
set role = 'admin'  -- or 'receptionist'
where user_id = (select id from auth.users where email = 'someone@example.com');
```

The first admin must be promoted via SQL (see step 6 of [Getting Started](#getting-started)) — there's no admin in a fresh database.

---

## Deployment

### Netlify (recommended)

This repo ships with a `netlify.toml` and `public/_redirects` configured for SPA routing.

**Drag-and-drop deploy:**

```bash
npm run build
```

Then drag the `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop). Don't forget to set the env vars in **Site configuration → Environment variables** on Netlify before customers can sign in.

**Git-based deploy:**

1. Push this repository to GitHub (or another provider Netlify supports).
2. In Netlify, **Add new site → Import from Git** and select this repo.
3. Build settings are picked up from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Under **Site configuration → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. The redirect rule in `netlify.toml` (and `public/_redirects`) makes deep links like `/admin/menu` work on hard refresh.

### Other static hosts

The build output in `dist/` is plain static files and works on any host (Vercel, Cloudflare Pages, GitHub Pages, S3 + CloudFront, etc.). Just make sure your host serves `index.html` for all unknown paths so client-side routing works.

---

## PWA / Offline Support

The app is configured as an installable Progressive Web App via `vite-plugin-pwa`:

- The shell (HTML, JS, CSS, fonts, icons) is precached, so subsequent loads are instant and the app opens even on a flaky connection.
- The service worker activates immediately on update (`skipWaiting` + `clientsClaim`) and clears outdated precaches, so users never get stuck on stale chunks after a redeploy.
- Supabase paths (`/rest/v1/*`, `/auth/v1/*`, `/realtime/*`, `/storage/v1/*`) are deliberately excluded from the SW's navigation fallback and runtime cache — that's live application data and TanStack Query already handles caching for it.
- On Chrome/Edge mobile, users can tap **Add to Home Screen** to install the app; iOS supports the same via Safari's Share menu.

The web manifest is generated at build time from the `manifest` block in `vite.config.js`.

---

## Performance Optimizations

- **Route-level code splitting** — every page is `React.lazy`-loaded, layouts are eager so the chrome doesn't unmount on navigation.
- **Vendor chunk splitting** — React, React DOM, React Router, Zustand, TanStack Query, Supabase, and Lucide each get their own chunk for better long-term caching (`manualChunks` in `vite.config.js`).
- **Route prefetching** — `src/lib/prefetchRoutes.js` warms likely next routes after the first interactive paint.
- **TanStack Query caching** — server state is cached, deduped, and revalidated in the background; the configured `queryClient` keeps reasonable `staleTime` to cut redundant requests.
- **Persistent client state** — auth and cart are persisted in `localStorage` via Zustand `persist`, so reloads are seamless.
- **Resilient network helpers** — `withSupabaseTimeout`, `ensureSession`, and `withRetry` in `src/lib/supabase.js` keep the UI from spinning forever if a request stalls.
- **DNS prefetch + preconnect** to the Supabase project in `index.html` shaves off connection setup on the first request.

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/short-description`.
3. Make your changes and commit them with clear, conventional messages (`feat: ...`, `fix: ...`, `docs: ...`).
4. Push your branch and open a pull request against `main`.
5. In the PR description, please include:
   - A short summary of what changed and why.
   - Steps to test the change locally.
   - Screenshots for UI changes.

For larger changes, please open an issue first to discuss the approach.

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## Acknowledgments

- [Supabase](https://supabase.com/) for an excellent open-source backend platform.
- [Vite](https://vitejs.dev/) for a delightful build tool.
- [React](https://react.dev/) and the wider React ecosystem.
- [Tailwind CSS](https://tailwindcss.com/) for making styling fun.
- [TanStack Query](https://tanstack.com/query) for principled server-state management.
- [Lucide](https://lucide.dev/) for the icon set.
- The chai. Always the chai.

---

## Contact / Support

Issues and questions: please open an issue on this repository.

Maintainer: Karan Veer Thakur / karanveerthakur1122@gmail.com .
