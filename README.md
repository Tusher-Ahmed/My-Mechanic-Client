<div align="center">

# 🔧 My Mechanic

**Find a trusted car mechanic near you – on a live map, with upfront prices, in minutes.**

A full-stack web platform that connects car owners with nearby, verified garages in Bangladesh.

React 19 · Vite · Tailwind CSS · Node.js · Express 5 · MongoDB · Server-Sent Events · Playwright

</div>

![Home page](docs/screenshots/home.webp)

## The idea

When your car breaks down somewhere you don't know, finding a garage street by street takes time – and you
don't know what it will cost. **My Mechanic** shows the garages around you on a map with their services and
prices. You book what you need (or an inspection if you don't know the problem) and follow the mechanic as
they come to you.

It started as my university project (React 17 + Express, three repositories) and was rebuilt as one
repository with a modern stack, a real-time order flow, proper security and automated tests.

## Features

### Car owners

- **Live map** of garages with search, "near me" sorting and a car-type filter.
- **Booking:** your car, where to meet (*mechanic comes to me* or *I'll bring the car in*) and the services.
- **Not sure what's wrong?** Book an **inspection** – pay only the garage's inspection fee and travel. The
  mechanic writes what they found and recommends services, which you book in one tap without paying travel again.
- **Upfront prices** with a distance-based travel charge calculated by the server.
- **Order number, arrival countdown and a 4-digit code** to confirm the right mechanic arrived.
- **Live location sharing** with the mechanic – only after they accept and only during the job.
- **Real-time notifications**; cancel an order with a reason.

### Mechanics

- **Registration with a trade licence** – an admin verifies the garage before it goes live.
- New requests show the **distance and approximate area** before accepting; then the customer's live location.
- Accept with an **arrival time**, verify the customer's code on arrival, finish inspections with findings.
- **Own revenue** – service income and travel charges reported separately; cancelled jobs never count.
- Shop settings: services and prices, inspection fee, car types, location and travel pricing.
- **Subscription plans** (monthly / yearly) with reminders and a loyalty discount on renewal.

### Admins

- **Garage approvals:** check the trade licence, approve or reject with a reason. Garages added by an admin are approved at once.
- Dashboard and **revenue** reports (orders, service and travel charges, subscription income), editable plan prices.
- Manage orders, mechanics, customers, contact messages and admins.

## Screenshots

| Map with nearby garages | Booking an inspection |
|---|---|
| ![Map](docs/screenshots/map.webp) | ![Inspection booking](docs/screenshots/inspection-booking.webp) |

| Inspection result with recommended services | Mechanic: customer's live location |
|---|---|
| ![Inspection result](docs/screenshots/inspection-result.webp) | ![Live location](docs/screenshots/mechanic-live-location.webp) |

| Customer: verification code and arrival countdown | Mechanic: own revenue |
|---|---|
| ![Code and ETA](docs/screenshots/customer-code-eta.webp) | ![Mechanic revenue](docs/screenshots/mechanic-revenue.webp) |

| Registration: approval step | Admin: approving a garage |
|---|---|
| ![Approval step](docs/screenshots/approval-wizard.webp) | ![Admin approval](docs/screenshots/approval-admin.webp) |

| Admin dashboard | Admin revenue |
|---|---|
| ![Admin dashboard](docs/screenshots/admin-dashboard.webp) | ![Admin revenue](docs/screenshots/admin-revenue.webp) |

## Tech stack

| Part | Technologies |
|---|---|
| **Website** (`client/`) | React 19, Vite, React Router 7, Tailwind CSS 4, Motion, MapLibre GL + OpenStreetMap |
| **Admin panel** (`admin/`) | React 19, Vite, Tailwind CSS 4, Motion, hand-built SVG charts |
| **API** (`server/`) | Node.js, Express 5, MongoDB (Mongoose), Zod, JWT, Server-Sent Events |
| **Tests** (`e2e/`) | Playwright – API tests and browser walk-throughs |

Maps use free OpenStreetMap data – no API key needed.

## Run it locally

Needs Node.js 20.6+ and MongoDB (local or a free Atlas cluster).

```bash
npm install
cp server/.env.example server/.env    # set MONGO_URL, JWT_SECRET and the admin login
cp client/.env.example client/.env
cp admin/.env.example  admin/.env
npm run seed:admin                    # create the first admin
npm run seed:demo                     # optional: demo garages + a demo customer (password demo1234)
npm run dev                           # API, website and admin together
```

## Testing

All tests use Playwright against a separate test database. Details in **[TESTING.md](TESTING.md)**.

- **127 API tests**, including 15 security tests that perform real attacks (NoSQL injection, forged tokens,
  price manipulation, mass assignment, brute force).
- **9 browser walk-throughs** of the full customer → mechanic → admin journey on production builds.

```bash
npm run test:api
npm run showcase
```

## Security

- Every request is validated (Zod); unknown fields are dropped and Mongo operators rejected.
- JWT login with instant session revocation on password change; bcrypt-hashed passwords.
- Role checks on every route – users and mechanics only see their own data.
- Prices, travel charges and totals are always calculated by the server.
- Garages are verified by trade licence before they can take bookings.
- Phone numbers are shared only after acceptance; exact location only during the job.
- Helmet headers, CORS allow-list and rate limits on login, registration and the contact form.

## Business model

Customers pay the garage directly – the platform takes **no commission**. It earns from **garage subscriptions**:
low starter prices for the first month or year, and a discount for returning garages. Only approved garages with an
active plan appear on the map. Payments currently use a demo checkout, ready for a real gateway (e.g. SSLCommerz, bKash).

## Author

**Tusher Ahmed** · [GitHub](https://github.com/Tusher-Ahmed) · [LinkedIn](https://www.linkedin.com/in/tusher-ahmed-6b9b70210/)

Project presentation (original version):
[Google Slides](https://docs.google.com/presentation/d/11vKXGPKSR5Irre3PJkIuvo9b7oBikkT3/edit?usp=sharing&ouid=112073153374308217236&rtpof=true&sd=true)
