# Food Order Management — Setup Guide

A complete, responsive catering/food order management admin tool built with
plain **HTML5 + CSS3 + vanilla JavaScript** and **Supabase (PostgreSQL)** as
the database. No React, no Next.js, no TypeScript, no build step — just
open the HTML files in a browser (or serve the folder with any static
file server).

## 1. Create your Supabase project

1. Go to https://supabase.com and create a new project.
2. Open **SQL Editor → New query**, paste the entire contents of
   `supabase-schema.sql`, and click **Run**. This creates all four tables
   (`customers`, `food_items`, `orders`, `order_items`), foreign keys with
   `ON DELETE CASCADE` / `ON DELETE SET NULL`, Row Level Security policies,
   and a small set of sample food items + customers.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key** (never copy the `service_role` key into frontend code)

## 2. Connect the frontend

Open `js/supabase.js` and replace the two placeholders:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-PUBLIC-ANON-KEY';
```

That's the only configuration needed — every page (`index.html`,
`orders.html`, `order-details.html`, `food-items.html`, `customers.html`,
`reports.html`, `settings.html`) loads `js/supabase.js` first and shares
the same client via `window.db`.

## 3. Run it

Any static server works, e.g. from this folder:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:PORT/index.html`.

> Opening the files directly with `file://` mostly works too, but a local
> server is recommended so relative fetches behave consistently across browsers.

## 4. Folder structure

```
food-order-management/
├── index.html            Dashboard
├── orders.html            Full order list (search/filter/sort)
├── order-details.html     Create / View / Edit order + checklist + print + PDF
├── food-items.html        Food item catalog CRUD
├── customers.html         Customer CRUD + order history
├── reports.html           Revenue & order stats + charts
├── settings.html          Business info used on bills/PDFs
├── css/
│   └── style.css
├── js/
│   ├── supabase.js        Supabase client init (put your keys here)
│   ├── common.js          Shared layout, toasts, modals, formatters, validation
│   ├── dashboard.js
│   ├── orders.js
│   ├── order-details.js
│   ├── food-items.js
│   ├── customers.js
│   └── reports.js
├── assets/
└── supabase-schema.sql    Run once in the Supabase SQL editor
```

## 5. What's implemented

- **Dashboard** — today's KPI cards (orders, guests, revenue, pending,
  completed), date range switch (Today / Tomorrow / This Week / Custom),
  plus status / order-time / customer filters on the order table.
- **Orders** — searchable (order ID, name, phone), filterable (status,
  date, time), sortable (newest/oldest/highest/lowest amount) full list.
- **New / Edit Order** (`order-details.html?new=1` or `?id=...&edit=1`) —
  pick an existing customer or add a new one inline, add any number of
  food items with live quantity × price subtotals, discount + additional
  charge, live grand total, full validation with inline error messages.
- **Order Details** (`order-details.html?id=...`) — customer & order
  info, itemized food list, a **preparation checklist** bound to
  `order_items.is_completed` (persists instantly to Supabase, survives a
  refresh), a live progress bar, inline status changes, Edit, Delete
  (with confirmation), **Print Bill** (dedicated print stylesheet that
  hides all navigation) and **Generate PDF** (via jsPDF + AutoTable).
- **Food Items** — card grid with search + category filter, add/edit
  modal, one-click availability toggle, and delete (safe: past orders
  keep a snapshot of the item name & price, so deleting a catalog item
  never breaks historical bills).
- **Customers** — list with order count / total spent / last order date,
  add/edit/delete, and a history modal listing every past order with a
  link into `order-details.html`.
- **Reports** — today/week/month revenue, total orders & guests, a
  14-day revenue bar chart and an order-status doughnut chart (Chart.js),
  plus a table for any custom date range.
- Toasts for every success/error, confirmation dialogs before every
  delete, loading states, and "no results" empty states throughout —
  no blank screens.
- Fully responsive: collapsible sidebar on tablet/mobile, single-column
  forms, horizontally-scrollable tables on narrow screens.

## 6. Notes on data modeling decisions

- `order_items.item_name` and `order_items.price` are **snapshots** taken
  at the moment the order is saved. If you later edit a food item's price
  in the catalog, existing orders and bills keep the price that was
  charged at the time — exactly as required.
- `orders.total_amount` is the final billed amount:
  `subtotal (Σ item totals) − discount + additional_charge`. The
  `guest_count × per_plate_amount` figure is also captured and shown as a
  **Reference Total** next to the Per Plate field / on the details page,
  since catering quotes are often given per-plate before the exact food
  list is finalized.
- Deleting a **food item** is a true delete (safe, see above). Deleting a
  **customer** detaches (`SET NULL`) their past orders rather than
  deleting order history. Deleting an **order** cascades to its
  `order_items` rows.

## 7. Security note on RLS

This build has no login system, so the SQL schema grants the `anon` key
full read/write access to all four tables (see the policies at the
bottom of `supabase-schema.sql`) — appropriate for an internal admin
tool used by trusted staff on a private link. If you expose this
publicly or add multiple staff accounts, wire up Supabase Auth and
tighten the policies (e.g. `using (auth.role() = 'authenticated')`).


## v2 Pricing & Payment Rules

- Food Items contain **no price/amount**. They are only menu/checklist items.
- Pricing is set only on an order using **Guests × Per Plate Amount + Additional Charge**.
- Order creation/editing has **no discount field**.
- Discounts can be entered only when recording/editing a payment.
- Payments support partial payments. `Balance = Order Total - Paid Amount - Payment Discounts`.
- Orders/customers display **Unpaid / Partially Paid / Fully Paid** badges.
- Reports show Total Amount, Total Paid, Unpaid Amount, and payment status.
- Dashboard has **Today's Orders PDF**.
- Every order has a **Payment Bill PDF** with payment history and balance.
- Customer records are marked fully paid and can be automatically deleted after 3 days using Supabase `pg_cron`; order history remains because orders store `customer_name`.
- Run `supabase-migration-v2.sql` for an existing database, or `supabase-schema-v2.sql` for a fresh database.
