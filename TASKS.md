# My Mechanic – Modernization Task Plan

Branch: `modernize`. Tick each box when it is done and verified.
Test cases are tracked separately in [TESTING.md](TESTING.md).

## Phase 1 – Organize the repo
- [x] 1.1 Create `modernize` branch
- [x] 1.2 Move client into `client/`
- [x] 1.3 Import admin into `admin/` (with git history)
- [x] 1.4 Import backend into `server/` (with git history)
- [x] 1.5 Remove committed `node_modules` and `.env` files from git; add root `.gitignore`
- [x] 1.6 Add `.env.example` for each app
- [x] 1.7 Root `package.json` with scripts to install/run all three apps

## Phase 2 – Backend (`server/`)
- [x] 2.1 Update packages (Express 5, Mongoose 8, dotenv, cors, bcryptjs, jsonwebtoken, helmet)
- [x] 2.2 Restructure: `src/config`, `src/models`, `src/routes`, `src/middleware`
- [x] 2.3 JWT auth for users, mechanics, admins (`/login` returns a token)
- [x] 2.4 Protect routes: users see only their own data; admin routes need an admin token
- [x] 2.5 Never return password hashes (`select: false`)
- [x] 2.6 Fix login crash (missing `return`) and wrong default dates (`Date.now`)
- [x] 2.7 Public endpoints: list mechanics (safe fields), single store, contact message
- [x] 2.8 First admin is created by a seed script, not an open endpoint
- [x] 2.9 Central error handler, `/api/health` route, CORS limited to the frontend URLs
- [x] 2.10 Test all endpoints locally (46 Playwright API tests passing – see TESTING.md)

## Phase N – Notifications (replaces the old count badge)
- [x] N.1 Notification model (recipient, type, title, body, link, read) with 60-day auto-cleanup
- [x] N.2 Auto-create on order events (new / accepted / completed / cancelled / admin update)
- [x] N.3 Real-time delivery with Server-Sent Events + list / mark read / mark all read endpoints
- [x] N.4 API tests API-NOTIF-01…07
- [x] N.5 Client: bell with live badge, dropdown panel, toasts, auto-refresh dashboards

## Phase 3 – Client (`client/`)
- [x] 3.1 Move from Create React App to Vite + React 19
- [x] 3.2 Replace Bootstrap/reactstrap with Tailwind CSS
- [x] 3.3 React Router 7, auth context (token in localStorage), shared axios client using `VITE_API_URL`
- [x] 3.4 Map: OpenStreetMap via MapLibre + `react-map-gl` 8 (free, no API key – old Mapbox token was dead)
- [x] 3.5 Redesign pages: Home (hero, services, FAQ), Map, Store, User account, Mechanic account, Mechanic register, About, Contact, Login/Register dialogs
- [x] 3.6 Motion design (motion-design skill rules): driving-car hero, meshing gears, wrench, scroll reveals, reduced-motion support, responsive layout, toasts
- [x] 3.7 Remove dated stock photos (src was 25 MB) – visuals are now animated SVG built in code
- [x] 3.8 Fix duplicate FAQ item and other small bugs
- [x] 3.9 Build passes and the app works against the local backend

## Phase 4 – Admin (`admin/`)
- [x] 4.1 Move to Vite + React 19, remove old Material-UI v4
- [x] 4.2 Tailwind CSS, auth with admin token, shared axios client
- [x] 4.3 Redesign: dashboard (stats + charts), users, mechanics, orders, messages, admins, edit drawers
- [x] 4.4 Build passes; admin showcase walk-through passes (desktop + phone)

## Phase T – Automated tests (Playwright, `e2e/`)
- [x] T.1 Playwright workspace, isolated test DB, auto-started test API
- [x] T.2 API tests: health, auth, mechanics, orders, messages, admin, notifications (112 passing)
- [x] T.3 TESTING.md test-case register
- [x] T.3b Visual showcase (`npm run showcase`): real browser walk-through, 25 screenshots + video, run after every task
- [ ] T.4 Client UI tests (UI-CL-01…16) after Phase 3
- [x] T.5 Admin walk-through (`admin.showcase.ts`) covers UI-AD-01…08
- [ ] T.6 Full journey test (E2E-01)

## Phase V – Car model & type
- [x] V.1 Order requires the car: type, make, model (+ optional year, number plate)
- [x] V.2 Garages choose which car types they service; map filter "My car type"; server refuses unsupported types
- [x] V.3 Customers can save up to 5 cars to their profile ("save this car")
- [x] V.4 Car shown on order cards and in the mechanic's notification
- [x] V.5 API tests API-CAR-01…08
- [x] V.6 Client UI: car picker in booking, map filter, garage car types, "My cars" in settings, showcase

## Phase S – Security hardening
- [x] S.1 Zod validation on every endpoint (types, formats, lengths, enums; unknown fields stripped)
- [x] S.2 NoSQL-injection blocking ($-keys / dotted keys rejected) + mongoose sanitizeFilter
- [x] S.3 Strong passwords (8–72 chars, letter + number), bcrypt cost 12
- [x] S.4 Token version: password change / admin reset / account deletion revoke sessions instantly
- [x] S.5 JWT algorithm pinned (HS256); weak JWT_SECRET refused in production
- [x] S.6 Timing-safe login (no email enumeration); register rate limit; search/note length caps
- [x] S.7 maplibre-gl upgraded to 6.19 (critical XSS advisory) – `npm audit`: 0 vulnerabilities; worker bundled via Vite so the map renders in dev + production (showcase now asserts street tiles load)
- [x] S.8 15 security tests (API-SEC-01…15) – all attacks fail safely

## Phase D – Requested improvements
- [x] D.1 Car type picker: searchable dropdown (single + multi select, keyboard, portal) instead of chip rows
- [x] D.2 Live customer location shared with the mechanic after acceptance (consent, auto-stop, live map, Navigate) – 8 API tests + showcase
- [x] D.4 Booking → arrival flow: "mechanic comes to me" vs "I bring the car", distance-based travel charge (per-garage pricing + service radius), arrival time on accept (suggested from distance, "running late" updates), order numbers MM-1001…, 4-digit customer code verified by the mechanic on arrival (5 tries, 15-min lock) before completing – 12 API tests + showcase
- [x] D.5 Cancel / decline with a required reason in a styled dialog (no browser confirm), shown to both sides and in notifications; cancelled jobs never count as revenue; service revenue and travel charges reported separately (mechanic + admin)
- [x] D.3 Showcases run against production builds; fix blank page after refreshing a lazy page (Suspense inside layout) + regression test

## Phase P – Mechanic subscriptions (business model) – demo checkout (real gateway can be added later)
- [x] P.1 Plans: monthly + yearly, low introductory first period, loyal-customer renewal discount (admin-editable)
- [x] P.2 Choose a plan during mechanic registration → demo checkout → subscription active
- [x] P.3 Only garages with an active subscription appear on the map / can receive orders
- [x] P.4 Expiry reminders (7 days, 1 day), renew screen with returning-customer discount
- [x] P.5 Admin "Revenue" page: subscription income per month / plan, new vs renewals, active + expiring garages; plan prices
- [x] P.7 Mechanic dashboard: own orders + revenue over time (monthly charts)
- [ ] P.8 (later) Real payment gateway (SSLCommerz / bKash) – checkout step is isolated in routes/subscriptions.js `startCheckout()`
- [x] P.6 API tests + showcase

## Phase 5 – Deployment prep
- [ ] 5.1 `render.yaml` for the backend; `vercel.json` (SPA routing) for client and admin
- [ ] 5.2 Root README: project overview, local setup, deployment guide
- [ ] 5.3 Full end-to-end local test (register → login → map → order → mechanic accepts → admin sees it)

## Phase 6 – Go live (needs your accounts)
- [ ] 6.1 MongoDB Atlas free M0 cluster → connection string
- [ ] 6.2 Render: deploy `server/` with env vars
- [ ] 6.3 Vercel: deploy `client/` and `admin/` with `VITE_API_URL`
- [ ] 6.4 Run admin seed script on the production database
- [ ] 6.5 Push branch / merge to `main`

## Later – to discuss after the build (no code now)
- [x] B.1 Business model chosen: mechanic subscriptions (Phase P). Interview talking points still to write up – (commission, featured garages, subscriptions, partnerships…) – interview talking points
