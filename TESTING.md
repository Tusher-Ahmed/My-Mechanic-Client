# My Mechanic – Test Plan (Playwright)

All automated tests live in [`e2e/`](e2e) and use [Playwright](https://playwright.dev).

## How to run

```bash
# once: install dependencies (and browsers for the UI tests)
npm install
npx playwright install chromium

# make sure MongoDB is running locally (mongodb://127.0.0.1:27017)

npm test            # run every test project
npm run test:api    # only the backend API tests
npm run report -w e2e   # open the last HTML report
```

### Test environment

| Item | Value |
|---|---|
| API under test | `http://localhost:8090/api` (started automatically by Playwright) |
| Database | `my-mechanic-e2e` – **wiped at the start of every run** (your dev DB `my-mechanic` is never touched) |
| Test admin | `admin@e2e.test` / `AdminPass123` (created automatically) |
| Isolation | every test registers its own accounts with unique emails, so tests run in parallel |
| Override DB | set `E2E_MONGO_URL` (name must contain `e2e` or `test`) |

Launcher: [`e2e/scripts/start-test-api.js`](e2e/scripts/start-test-api.js) · Config: [`e2e/playwright.config.ts`](e2e/playwright.config.ts)

Status legend: ✅ passing · ⏳ planned (written when that app is migrated)

---

## 1. API tests (`e2e/tests/api`) – 46 tests

### Health & infrastructure – `health.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-HEALTH-01 | `/api/health` returns `ok` and DB `connected` | ✅ |
| API-HEALTH-02 | Unknown route returns JSON 404 | ✅ |
| API-HEALTH-03 | CORS allows the configured frontend origin | ✅ |
| API-HEALTH-04 | CORS gives no allow-header to unknown origins | ✅ |

### Authentication & profile – `auth.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-AUTH-01 | User registers, receives token, no password in response | ✅ |
| API-AUTH-02 | Email is stored lowercase and must be unique (409) | ✅ |
| API-AUTH-03 | Invalid registration data → 400 with readable message | ✅ |
| API-AUTH-04 | Mechanic registers with shop, location and services | ✅ |
| API-AUTH-05 | Mechanic NID must be 10–17 digits | ✅ |
| API-AUTH-06 | No public admin registration (404) | ✅ |
| API-AUTH-07 | Login with correct credentials | ✅ |
| API-AUTH-08 | Unknown email → 401 and server keeps running (old crash bug) | ✅ |
| API-AUTH-09 | Wrong password → 401 | ✅ |
| API-AUTH-10 | User account can't log in through mechanic login | ✅ |
| API-AUTH-11 | `/auth/me` rejects missing / invalid token | ✅ |
| API-AUTH-12 | `/auth/me` returns own account without password | ✅ |
| API-AUTH-13 | Profile update changes name/phone, email is not changeable | ✅ |
| API-AUTH-14 | Password change requires the current password | ✅ |
| API-AUTH-15 | Mechanic updates own services | ✅ |

### Mechanics (public) – `mechanics.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-MECH-01 | Public list hides email, phone, NID, password | ✅ |
| API-MECH-02 | Search by shop name or service name | ✅ |
| API-MECH-03 | Search with regex characters doesn't break | ✅ |
| API-MECH-04 | Single store page is public and safe | ✅ |
| API-MECH-05 | Invalid id → 400, unknown id → 404 | ✅ |

### Orders – `orders.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-ORD-01 | Only logged-in users (not mechanics) can order | ✅ |
| API-ORD-02 | Total price calculated by server; client value ignored | ✅ |
| API-ORD-03 | Empty / unknown services rejected | ✅ |
| API-ORD-04 | User and mechanic see only their own orders | ✅ |
| API-ORD-05 | Phone/email hidden while order is pending | ✅ |
| API-ORD-06 | Mechanic accepts → contacts shared → completes | ✅ |
| API-ORD-07 | User can cancel only while pending | ✅ |
| API-ORD-08 | User can't accept; other users/mechanics get 403 | ✅ |
| API-ORD-09 | Invalid status transitions rejected | ✅ |

### Contact messages – `messages.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-MSG-01 | Anyone can send a contact message | ✅ |
| API-MSG-02 | Contact message is validated | ✅ |
| API-MSG-03 | Messages can't be read without admin | ✅ |

### Admin – `admin.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-ADM-01 | All admin routes: 401 without token, 403 for user/mechanic | ✅ |
| API-ADM-02 | Admin login | ✅ |
| API-ADM-03 | Lists users (no passwords) and mechanics (with NID) | ✅ |
| API-ADM-04 | Create, edit (incl. password) and delete a user | ✅ |
| API-ADM-05 | Edit a mechanic's shop and services | ✅ |
| API-ADM-06 | Deleting a mechanic deletes its orders | ✅ |
| API-ADM-07 | Admin can't delete own account | ✅ |
| API-ADM-08 | All orders with contacts, filter by status, change status, delete | ✅ |
| API-ADM-09 | Read and delete contact messages | ✅ |
| API-ADM-10 | Dashboard stats shape (counts, revenue, 6 months, top shops) | ✅ |

---

## 2. Client UI tests (`e2e/tests/client`) – browser, Chromium

| ID | Case | Status |
|---|---|---|
| UI-CL-01 | Home page loads: hero, services, FAQ, footer | ⏳ |
| UI-CL-02 | Navigation works on desktop and mobile menu | ⏳ |
| UI-CL-03 | FAQ items expand / collapse | ⏳ |
| UI-CL-04 | User registers from the dialog and is logged in | ⏳ |
| UI-CL-05 | Login shows an error for wrong password | ⏳ |
| UI-CL-06 | Logout clears the session | ⏳ |
| UI-CL-07 | Map page loads and lists shops | ⏳ |
| UI-CL-08 | Store page shows services; guest is asked to log in before ordering | ⏳ |
| UI-CL-09 | User adds services to cart, sees total, places order | ⏳ |
| UI-CL-10 | User account shows the order and can cancel a pending one | ⏳ |
| UI-CL-11 | Mechanic registers with services and location | ⏳ |
| UI-CL-12 | Mechanic accepts an order and sees customer phone | ⏳ |
| UI-CL-13 | Profile settings update name / password | ⏳ |
| UI-CL-14 | Contact form sends a message | ⏳ |
| UI-CL-15 | Protected pages redirect guests | ⏳ |
| UI-CL-16 | Layout works at phone width (no horizontal scroll) | ⏳ |

## 3. Admin UI tests (`e2e/tests/admin`) – browser, Chromium

| ID | Case | Status |
|---|---|---|
| UI-AD-01 | Admin pages redirect to login when logged out | ⏳ |
| UI-AD-02 | Wrong credentials show an error | ⏳ |
| UI-AD-03 | Admin logs in and sees dashboard stats + charts | ⏳ |
| UI-AD-04 | Users list: search, create, edit, delete | ⏳ |
| UI-AD-05 | Mechanics list: edit shop and services, delete | ⏳ |
| UI-AD-06 | Orders: filter by status, change status | ⏳ |
| UI-AD-07 | Messages: read and delete | ⏳ |
| UI-AD-08 | Logout | ⏳ |

## 4. Full journey (`e2e/tests/journey`)

| ID | Case | Status |
|---|---|---|
| E2E-01 | Mechanic registers → user finds shop on map → orders → mechanic accepts → user sees phone → admin sees the order in dashboard | ⏳ |
