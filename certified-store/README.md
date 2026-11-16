# Certified Ortho – Online Store

React (Vite) storefront + Express API, **Node 20**, **MongoDB** – same stack as the Certified CRM,
using the CRM's colours, font (Inter) and components style.

The CRM code is **not changed**. The store talks to the CRM only through its existing API.

## What is inside

| | |
|---|---|
| **Catalog** | 1,221 products (every Product ID, description, list price, unit) + all section/group headings and notes – exactly the CRM price list (`products-export-2026-11-14.xlsx`). |
| **Product pages** | All 94 live pages of certifiedortho.com – every heading, paragraph, list, table, image (543), order‑form PDF, tab and FAQ copied as on the live site. Each page gets an **Order** panel with its SKUs and prices. |
| **Full price list** | `/catalog` – General / Custom / Third Party, search, section filter, add to cart. |
| **Login popup** | "Add to cart" as a guest opens *Log in to buy*; "Request an account" uses the same fields as the website form and is sent to **CRM › Leads** (same `/api/public/leads` endpoint the site uses) + emailed to the owner. |
| **Accounts** | The owner creates the login in **Store admin** (`/admin`), linked to the CRM customer. The customer gets an email with name, login email and temporary password, and must choose their own password at first login. |
| **Orders** | Checkout (ship‑to from the CRM account, P.O #, patient, notes, file upload for order forms/scans). No online payment. Each order is created in the CRM as a **Quote** (with CRM product ids, the customer's general/custom discounts, ship‑to, attached files). If the CRM is unreachable the order is kept and retried automatically. |
| **Customer portal** | `/account` – orders with live status from the CRM (Quote › Work order › Shipped › Invoice › Paid), invoices with balance/status and PDF download, all work orders on the account (also phone/fax orders), profile & password. |

## Order flow

```
Customer adds to cart ──► popup: Log in / Request an account
Request an account ──► CRM Leads + email to owner
Owner: CRM › create customer  ──►  Store admin › Account requests › Create login
                                   (customer gets login email)
Customer places order ──► Store order WEB-10001 ──► CRM Quote (Q-…)
CRM team: Quote ► Work Order ► Ship ► Invoice (CRM emails invoice) ► Payment
Customer portal shows each step + invoice balance / paid
```

## Deploy on Vercel

The repo is Vercel-ready: `api/index.js` runs the Express API as a serverless function,
`client/dist` is served from Vercel's CDN (`vercel.json`).

1. Create a free MongoDB Atlas cluster → *Network Access*: allow `0.0.0.0/0` → copy the connection string.
2. Vercel › *Add New Project* › import this repo › **Root Directory = `certified-store`** (framework: Other – `vercel.json` sets everything).
3. Environment Variables (Project › Settings › Environment Variables):

| Name | Value |
|---|---|
| `MONGODB_URI` | `mongodb+srv://…/certified_store` (required) |
| `JWT_SECRET` | long random string (required) |
| `STORE_URL` | `https://<your-project>.vercel.app` or your domain |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | first store admin – created automatically if no admin exists |
| `CRM_URL`, `CRM_SERVICE_EMAIL`, `CRM_SERVICE_PASSWORD` | CRM connection |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `OWNER_EMAIL` | email |
| `CRON_SECRET` | optional – protects `/api/cron/crm-retry` |

4. Deploy. On the first request the catalog (1,221 products) and the 94 pages are loaded into MongoDB automatically
   (no `npm run seed` needed). Check `https://<site>/api/health` → `{"ok":true,"db":true}`.

Vercel notes: order file uploads are limited to 4 MB per file (Vercel request limit) and are forwarded to the CRM
immediately; failed CRM syncs are retried by a daily Vercel Cron (`/api/cron/crm-retry`) and from Store admin.

## Setup (own server / VPS)

```bash
# 1. install
npm run install:all

# 2. configure
cp server/.env.example server/.env      # fill in MONGODB_URI, JWT_SECRET, CRM_*, SMTP_*

# 3. load catalog + pages into MongoDB (safe to re-run; never touches customers/orders)
npm run seed

# 4. create a store admin (Certified Ortho staff)
npm run create-admin -- owner@certifiedortho.com "Owner Name" "StrongPassword123"

# 5. build the storefront and start (serves API + website on PORT)
npm run build
npm start
```

### CRM connection (one time, no code change)
1. In the CRM go to **Users** and add a user for the store, e.g. `store@certifiedortho.com`.
2. Put its email/password in `CRM_SERVICE_EMAIL` / `CRM_SERVICE_PASSWORD`.
3. Store admin › Dashboard shows "CRM connected".

### Images
By default images/PDFs/video load from certifiedortho.com. Before the WordPress site is switched off run
`npm run mirror-media` once (downloads every file into `server/media/`), then set `MEDIA_MODE=local`.

### Development
`npm run dev:server` (port 5050) and `npm run dev:client` (port 5173, proxies `/api`).

## Updating the catalog
`tools/` contains the scripts that produced `server/seed/*.json` from the live site and the CRM export:
`extract_pages.py` (site content), `build_catalog.py` (price list + page links, writes `tools/report.txt`),
`verify_store.py` (checks the running store against the Excel and the live-site capture),
`e2e_test.py` + `mock-crm.mjs` (full flow test without touching the live CRM).
