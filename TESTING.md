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
npm run showcase    # opens a real browser and walks through the whole app (screenshots + video)
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

## 1. API tests (`e2e/tests/api`) – 127 tests

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

### Notifications – `notifications.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-NOTIF-01 | New order notifies the mechanic (title, body, link, unread count) | ✅ |
| API-NOTIF-02 | Accept and complete notify the customer | ✅ |
| API-NOTIF-03 | Cancel / decline notify only the other party | ✅ |
| API-NOTIF-04 | Mark one as read, then mark all as read | ✅ |
| API-NOTIF-05 | Notifications are private (401 / 404 for others) | ✅ |
| API-NOTIF-06 | Live stream rejects missing / invalid token | ✅ |
| API-NOTIF-07 | Live stream (SSE) delivers a notification instantly | ✅ |
| API-NOTIF-08 | Deleting a notification (✕ in the bell) removes it from the database – only your own | ✅ |

### Car model & type – `vehicles.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-CAR-01 | Order needs the car (type, make, model); bad type / future year rejected | ✅ |
| API-CAR-02 | Car stored on the order; plate uppercased; year/plate optional | ✅ |
| API-CAR-03 | Mechanic sees the car on the order and in the notification | ✅ |
| API-CAR-04 | Garages list serviced car types (all by default); map filter by type | ✅ |
| API-CAR-05 | Booking a car type the garage doesn't service is refused | ✅ |
| API-CAR-06 | Mechanic keeps at least one car type and can update them | ✅ |
| API-CAR-07 | "Save this car" stores it once, newest first, max 5 | ✅ |
| API-CAR-08 | User manages saved cars in profile; admin can see them | ✅ |

### Security – `security.spec.ts` (each test performs a real attack)
| ID | Attack | Expected | Status |
|---|---|---|---|
| API-SEC-01 | NoSQL injection in login (`{"$ne": null}`, `$regex`) | 400, no token | ✅ |
| API-SEC-02 | `# My Mechanic – Test Plan (Playwright)

All automated tests live in [`e2e/`](e2e) and use [Playwright](https://playwright.dev).

## How to run

```bash
# once: install dependencies (and browsers for the UI tests)
npm install
npx playwright install chromium

# make sure MongoDB is running locally (mongodb://127.0.0.1:27017)

npm test            # run every test project
npm run test:api    # only the backend API tests
npm run showcase    # opens a real browser and walks through the whole app (screenshots + video)
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

## 1. API tests (`e2e/tests/api`) – 76 tests

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

### Notifications – `notifications.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-NOTIF-01 | New order notifies the mechanic (title, body, link, unread count) | ✅ |
| API-NOTIF-02 | Accept and complete notify the customer | ✅ |
| API-NOTIF-03 | Cancel / decline notify only the other party | ✅ |
| API-NOTIF-04 | Mark one as read, then mark all as read | ✅ |
| API-NOTIF-05 | Notifications are private (401 / 404 for others) | ✅ |
| API-NOTIF-06 | Live stream rejects missing / invalid token | ✅ |
| API-NOTIF-07 | Live stream (SSE) delivers a notification instantly | ✅ |
| API-NOTIF-08 | Deleting a notification (✕ in the bell) removes it from the database – only your own | ✅ |

### Car model & type – `vehicles.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-CAR-01 | Order needs the car (type, make, model); bad type / future year rejected | ✅ |
| API-CAR-02 | Car stored on the order; plate uppercased; year/plate optional | ✅ |
| API-CAR-03 | Mechanic sees the car on the order and in the notification | ✅ |
| API-CAR-04 | Garages list serviced car types (all by default); map filter by type | ✅ |
| API-CAR-05 | Booking a car type the garage doesn't service is refused | ✅ |
| API-CAR-06 | Mechanic keeps at least one car type and can update them | ✅ |
| API-CAR-07 | "Save this car" stores it once, newest first, max 5 | ✅ |
| API-CAR-08 | User manages saved cars in profile; admin can see them | ✅ |

-operators / dotted keys anywhere in a body | 400 | ✅ |
| API-SEC-03 | Malformed ids (`abc`, SQL-style payloads) | 400 before DB | ✅ |
| API-SEC-04 | Wrong types (arrays/objects for strings) | 400 with field paths | ✅ |
| API-SEC-05 | 200 KB body, over-long message/search/note | 413 / 400 | ✅ |
| API-SEC-06 | HTML/script in a name | stored as text, JSON only | ✅ |
| API-SEC-07 | Weak passwords (short, no digit, no letter, > 72) | 400 | ✅ |
| API-SEC-08 | Mass assignment (`role: admin`, `_id`, `createdAt`, email change) | ignored; still a user | ✅ |
| API-SEC-09 | Price manipulation (fake totals/prices, duplicate services) | server price used | ✅ |
| API-SEC-10 | Forged tokens (wrong secret, `alg: none`, tampered role, expired) | 401 | ✅ |
| API-SEC-11 | Old token after password change (API + live stream) | 401; new token works | ✅ |
| API-SEC-12 | Token after admin password reset / account deletion | 401 immediately | ✅ |
| API-SEC-13 | Email enumeration via login | identical 401 response | ✅ |
| API-SEC-14 | Missing security headers / `x-powered-by` | helmet headers present | ✅ |
| API-SEC-15 | Error responses leaking stack traces | none | ✅ |

### Live location – `location.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-LOC-01 | Hidden from the mechanic until they accept; customer sees their own | ✅ |
| API-LOC-02 | Without consent nothing is stored or shown | ✅ |
| API-LOC-03 | Live updates reach the mechanic instantly over the stream | ✅ |
| API-LOC-04 | Only the customer who placed the order can update it (403 / 401) | ✅ |
| API-LOC-05 | Customer can stop sharing (and restart) | ✅ |
| API-LOC-06 | Completing / cancelling deletes the location and ends sharing | ✅ |
| API-LOC-07 | Coordinates validated | ✅ |
| API-LOC-08 | Admins see whether sharing is on, never the coordinates | ✅ |

### Booking → arrival – `trip.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-TRIP-01 | Unique, increasing order numbers (MM-1001…) visible to customer, mechanic, admin | ✅ |
| API-TRIP-02 | Home service: travel charge from the real distance (৳100 + ৳30/km), added to the total | ✅ |
| API-TRIP-03 | Free within 1 km; bringing the car in has no travel charge and no location | ✅ |
| API-TRIP-04 | Per-garage pricing and service radius (too far → refused); pricing is public | ✅ |
| API-TRIP-05 | Home service needs a location; client-sent fee/total ignored | ✅ |
| API-TRIP-06 | Customer and mechanic both see the travel charge | ✅ |
| API-TRIP-07 | Accepting sets an arrival time – suggested from distance or chosen; customer notified | ✅ |
| API-TRIP-08 | Mechanic updates arrival time ("running late"); customer can't; limits enforced | ✅ |
| API-TRIP-09 | Verification code visible only to the customer (not mechanic, not admin) | ✅ |
| API-TRIP-10 | Correct code verifies, stops location sharing, allows completion | ✅ |
| API-TRIP-11 | Wrong codes: 5 tries, then a 15-minute lock (even the right code) | ✅ |
| API-TRIP-12 | Only the assigned mechanic can verify; malformed / injected codes rejected | ✅ |

### Subscriptions – `subscriptions.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-SUB-01 | Garage without a plan: hidden from the map, bookings refused, store page says not accepting | ✅ |
| API-SUB-02 | First plan at the starter price (৳99 / ৳1,499), activates the garage, notifies the mechanic | ✅ |
| API-SUB-03 | No renewing while a plan is running (checkout refused); afterwards the loyalty price (20 %) applies | ✅ |
| API-SUB-03b | A checkout opened before activation (e.g. second tab) can’t be paid once a plan is running | ✅ |
| API-SUB-04 | Cancelled payments don't activate; no re-use; can't pay someone else's checkout | ✅ |
| API-SUB-05 | Expired plan hides the garage; renewal at the discount brings it back from today | ✅ |
| API-SUB-06 | Reminders at 7 days, 1 day and on expiry – each sent once | ✅ |
| API-SUB-07 | Only mechanics can buy; invalid plans rejected; plan list public | ✅ |
| API-SUB-08 | Admin revenue report: totals, this month, new vs renewals, per plan, garages, recent payments | ✅ |
| API-SUB-09 | Admin edits plan prices / discount; mechanics see new prices; invalid values rejected | ✅ |

### Cancelling – `cancellation.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-CXL-01 | Cancelling / declining without a reason (or a too-short one) is refused | ✅ |
| API-CXL-02 | Customer cancels: reason stored, shown to both sides, mechanic notified with it | ✅ |
| API-CXL-03 | Mechanic declines (pending) or cancels after verifying – customer told which and why | ✅ |
| API-CXL-04 | Cancelled orders never count as money earned (top garages, revenue) | ✅ |
| API-CXL-05 | Admin can cancel; a default reason is recorded | ✅ |

### Inspection visits – `inspection.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-INS-01 | Opening a shop requires an inspection fee; each garage sets and edits its own | ✅ |
| API-INS-02 | An inspection charges only the garage's fee plus travel | ✅ |
| API-INS-03 | An order is an inspection or services – never empty, never both; the browser can't set the fee | ✅ |
| API-INS-04 | Completing an inspection needs findings; recommended services must be from the garage's list; customer notified | ✅ |
| API-INS-05 | Follow-up order after a home inspection: travel waived within 24 h, linked to the inspection | ✅ |
| API-INS-06 | Follow-up only to your own completed inspection at the same garage | ✅ |
| API-INS-07 | Inspection fee counts as service revenue, travel stays separate | ✅ |

### Garage approval – `approval.spec.ts`
| ID | Case | Status |
|---|---|---|
| API-APR-01 | Trade licence required, validated, unique (friendly 409) and never shown publicly | ✅ |
| API-APR-02 | Self-registered garage waits: hidden from the map (even with a plan), not bookable, can't buy a plan | ✅ |
| API-APR-03 | Admin approves → mechanic notified, garage can buy a plan, appears on the map, bookable | ✅ |
| API-APR-04 | Rejecting needs a reason (sent to the mechanic); a new trade licence puts the garage back to pending | ✅ |
| API-APR-05 | Changing the licence of an approved garage hides it until checked again (same licence: no change) | ✅ |
| API-APR-06 | Garage created by an admin is approved at once (licence still required) | ✅ |
| API-APR-07 | Only admins can approve/reject; a mechanic can't approve themselves via the profile | ✅ |

---

## 1b. Visual showcase (`e2e/tests/showcase`) – run after every task

`npm run showcase` builds the client + admin for production, seeds 3 garages in Dhaka + a customer, then drives a visible browser through the app and saves
screenshots to `e2e/showcase-output/` (video in `e2e/test-results/`). It also asserts the key steps:

| Step | Checked | Status |
|---|---|---|
| Home hero, how-it-works, features, mechanics band, FAQ render | ✅ screenshots 01–05 | ✅ |
| Map lists 3 shops, "My car type" filter (SUV → 2 shops), "Near me" sorts by distance, pin → popup | ✅ 06–07 | ✅ |
| Guest logs in, enters the car (type, make, model, year, plate), selects services, total updates, books | ✅ 08–10 | ✅ |
| Mechanic receives the order **live** (badge, toast, dashboard) and sees the car + plate | ✅ 11–13 | ✅ |
| Booking shows travel charge (4.1 km → ৳220) and order number; accept asks for an arrival time (suggested); customer sees countdown + 4-digit code; wrong code refused, right code verifies; job completed | ✅ 09–17e | ✅ |
| Mechanic accepts → live map of the customer, pin follows when the customer moves ~1 km (15b–15d) | ✅ 15b–15d | ✅ |
| Mechanic accepts → customer phone revealed; customer notified **live** + mechanic phone shown; car saved in "My cars" | ✅ 14–17b | ✅ |
| Shop editor (services + location map), About, Contact, 404, register-wizard validation | ✅ 18–22 | ✅ |
| Phone width (390px): home, menu, map – no horizontal scroll | ✅ 23–25 | ✅ |

**Subscription walk-through** (`subscription.showcase.ts`): new garage → red "choose a plan" banner on every visit →
plans (৳99 / ৳1,499 starter) → demo checkout (Nagad, "no real money") → paid → banner gone, on the map, next renewal
shows 20 % off → an expired garage: customers see "not taking bookings" with booking disabled, the mechanic sees
"Your plan expired … 20 % off" + a reminder → admin Revenue page. Screenshots: `sub-*.png`. ✅

**Approval walk-through** (`approval.showcase.ts`): mechanic registers through the wizard with a trade licence
(required), sees "Waiting for approval" and locked plans; the admin dashboard shows the pending garage, the admin
rejects it with a reason; the mechanic is told live, fixes the licence in My shop (back to pending); the admin
approves – the mechanic's page updates live and plans open; a garage the admin adds is approved at once.
Screenshots: `approval-*.png`. ✅

**Inspection walk-through** (`inspection.showcase.ts`): customer picks "Not sure what's wrong? Book an inspection"
(fee + travel only, services and inspection are mutually exclusive), mechanic finishes it with findings and recommended
services, customer sees the findings and books them in one tap – recommended services preselected, travel waived.
Screenshots: `inspection-*.png`. ✅

**Cancel walk-through** (`cancel.showcase.ts`): styled dialog instead of the browser confirm box (asserts no native
dialog ever opens), reason required, mechanic cancels a verified job and declines a new one, customer sees who cancelled
and why, the cancelled job adds ৳0 to the mechanic's revenue, customer cancels with "Other" + own reason.
Screenshots: `cancel-*.png`. ✅

**Layout stress** (`layout-stress.showcase.ts`, desktop + phone): the API is faked with extreme garages –
12 car types (incl. unknown future types), very long shop / owner / address / service names, 15 services.
Checks that no element overflows the page, that car types collapse to 3 chips + "+N more" (expandable),
and that a garage servicing every type shows a single "All car types" badge. Screenshots: `stress-*.png`. ✅

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
| UI-CL-17 | Notification bell: badge appears live, panel lists it, mark all read | ⏳ |

## 3. Admin UI tests – covered by `admin.showcase.ts`

Admin walk-through (seeded with 3 garages, 4 customers, 8 orders, 2 messages): wrong-password error, dashboard
tiles + charts + tooltip, orders filter / drawer / status change, mechanics + drawer, customer search, messages,
weak-password rejection when adding an admin, phone width without horizontal scroll. Screenshots: `admin-*.png`. ✅

### Original admin checklist

| ID | Case | Status |
|---|---|---|
| UI-AD-01 | Admin pages redirect to login when logged out | ✅ |
| UI-AD-02 | Wrong credentials show an error | ✅ |
| UI-AD-03 | Admin logs in and sees dashboard stats + charts | ✅ |
| UI-AD-04 | Users list: search, create, edit, delete | ✅ |
| UI-AD-05 | Mechanics list: edit shop and services, delete | ✅ |
| UI-AD-06 | Orders: filter by status, change status | ✅ |
| UI-AD-07 | Messages: read and delete | ✅ |
| UI-AD-08 | Logout | ✅ |

## 4. Full journey (`e2e/tests/journey`)

| ID | Case | Status |
|---|---|---|
| E2E-01 | Mechanic registers → user finds shop on map → orders → mechanic accepts → user sees phone → admin sees the order in dashboard | ⏳ |
