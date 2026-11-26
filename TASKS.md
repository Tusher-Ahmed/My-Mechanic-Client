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

## Phase 3 – Client (`client/`)
- [ ] 3.1 Move from Create React App to Vite + React 19
- [ ] 3.2 Replace Bootstrap/reactstrap with Tailwind CSS
- [ ] 3.3 React Router 7, auth context (token in localStorage), shared axios client using `VITE_API_URL`
- [ ] 3.4 Upgrade map to `react-map-gl` 8 (Mapbox)
- [ ] 3.5 Redesign pages: Home (hero, services, FAQ), Map, Store, User account, Mechanic account, Mechanic register, About, Contact, Login/Register dialogs
- [ ] 3.6 Animations (Framer Motion), responsive mobile layout, toasts for feedback
- [ ] 3.7 Compress images (src was 25 MB)
- [ ] 3.8 Fix duplicate FAQ item and other small bugs
- [ ] 3.9 Build passes and the app works against the local backend

## Phase 4 – Admin (`admin/`)
- [ ] 4.1 Move to Vite + React 19, remove old Material-UI v4
- [ ] 4.2 Tailwind CSS, auth with admin token, shared axios client
- [ ] 4.3 Redesign: dashboard (stats + charts), users, mechanics, orders, messages, edit forms
- [ ] 4.4 Build passes and the app works against the local backend

## Phase T – Automated tests (Playwright, `e2e/`)
- [x] T.1 Playwright workspace, isolated test DB, auto-started test API
- [x] T.2 API tests: health, auth, mechanics, orders, messages, admin (46 passing)
- [x] T.3 TESTING.md test-case register
- [ ] T.4 Client UI tests (UI-CL-01…16) after Phase 3
- [ ] T.5 Admin UI tests (UI-AD-01…08) after Phase 4
- [ ] T.6 Full journey test (E2E-01)

## Phase 5 – Deployment prep
- [ ] 5.1 `render.yaml` for the backend; `vercel.json` (SPA routing) for client and admin
- [ ] 5.2 Root README: project overview, local setup, deployment guide
- [ ] 5.3 Full end-to-end local test (register → login → map → order → mechanic accepts → admin sees it)

## Phase 6 – Go live (needs your accounts)
- [ ] 6.1 MongoDB Atlas free M0 cluster → connection string
- [ ] 6.2 Render: deploy `server/` with env vars
- [ ] 6.3 Vercel: deploy `client/` and `admin/` with `VITE_API_URL`
- [ ] 6.4 Run admin seed script, restrict Mapbox token to the new URLs
- [ ] 6.5 Push branch / merge to `main`
