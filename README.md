# DJ SHAGGY — Premium Music Marketplace

A complete, full-stack marketplace for selling DJ playlists & remix packs: storefront, catalogue, cart, manual UPI checkout, admin panel, Google Drive import, digital delivery and branded transactional emails.

**Stack:** Vite + React + TypeScript + Tailwind CSS v4 (SPA) · Node.js API runtime (`server.js`, `/api`) · Supabase (PostgreSQL + Auth + Storage) · Google Drive API · Resend (email) · optional OpenAI-compatible AI chat.

---

## Quick start

```bash
npm install
npm run build       # type-check + production build
npm run dev         # local dev
```

The database schema is managed in the connected Supabase project; see tables: `products`, `genres`, `collections`, `bundles`, `orders`, `faqs`, `discounts`, `messages`, `settings`, `drive_import_log`.

## Admin access

- Admin login lives behind the discreet three-dot menu in the footer (`/admin/login`).
- The currently configured admin allowlist contains **djshaggy2025@gmail.com**. Sign in with that confirmed Supabase Auth account. The `admin@djshaggy.com` address previously shown in this README is not present in the connected project's Auth users or admin allowlist.
- Admin authorization is enforced **server-side**: API routes verify the Supabase session and check the email against `settings → admin.emails` (editable in Admin → Settings → General).

## Payments (manual UPI — active system)

1. Customer checks out → unique Order ID (`DJS-…`) → status **Pending Verification**.
2. Checkout shows the configured **UPI ID**, an auto-generated **UPI QR** (or an admin-uploaded QR image), the **exact amount** and instructions.
3. Customer submits **UTR + screenshot** (stored in a **private** Supabase bucket; admin views via short-lived signed URLs).
4. Admin verifies the payment in their own bank/UPI app and clicks **Approve & Deliver** → only then are Drive links emailed and the order marked **Verified → Delivered**. Reject/Hold also supported.
5. Screenshots/UTRs never auto-approve anything.

Razorpay can be added later behind the same order states (`pending_verification → verified → delivered`) without changing the data model.

## Google Drive import

Admin → Drive Import:
- Scans the configured parent folder for playlist sub-folders.
- Imports each folder as a **Draft** product (name + file count + folder link), skipping duplicates by `drive_folder_id`.
- Resync updates track counts and lists new folders.
- Works with either an API key (public folders) or a service account (shared folders).

## Email templates (Resend)

Order confirmation, delivery (with links), and rejection emails are sent from branded dark/gold templates. Without `RESEND_API_KEY`, the app keeps working and clearly reports that email was not sent so the admin can share links manually.

## AI chatbot

The chat widget answers from the **live catalogue + FAQs** — playlists, genres, budgets, bundles, payment & delivery help. With `AI_API_KEY` set it uses an LLM constrained to catalogue data; without it, a built-in rule-based assistant does the same deterministically. It never fabricates products, prices, discounts or links and hands off to support when unsure.

## Security notes

- Public product endpoints never return delivery links or Drive IDs.
- Payment screenshots live in a private bucket (`payments`); artwork/QR in the public `artwork` bucket; gallery/banners/audio in `media`.
- All admin mutations require a verified admin session token (Supabase Auth + admin email allowlist in `settings.admin.emails`).
- Public endpoints are rate-limited per IP (orders, payment submission, chat, coupons, messages, uploads).
- Deny-all RLS policies exist on every table (`service_only_*`), BUT see the warning below.

### ⚠️ REQUIRED one-time hardening (run once in Supabase → SQL Editor)

Deny-all policies are created, but Row Level Security must be **enabled** per table — policy creation alone does not enable it. Until this runs, the publishable anon key could read/write tables directly via PostgREST. Paste once and run:

```sql
alter table products enable row level security;
alter table product_meta enable row level security;
alter table genres enable row level security;
alter table collections enable row level security;
alter table bundles enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table faqs enable row level security;
alter table coupons enable row level security;
alter table messages enable row level security;
alter table settings enable row level security;
alter table drive_import_log enable row level security;
alter table drive_mappings enable row level security;
alter table drive_files enable row level security;
alter table drive_sync_log enable row level security;
alter table home_sections enable row level security;
alter table banners enable row level security;
alter table gallery enable row level security;
```

The app keeps working unchanged (all data flows through `/api/*` with the service role, which bypasses RLS); only direct anon table access is closed.

## Testing checklist

1. Browse catalogue → filter/sort/search → open a playlist.
2. Add products + a bundle to cart → apply code `SHAGGY10`.
3. Checkout → note the Order ID → pay test amount to the configured UPI → submit UTR + screenshot.
4. Footer → ⋯ → Admin login → Orders → Review → Approve & Deliver (verify email, or the "not sent" notice if Resend isn't configured).
5. Track the order on `/track` with ID + email.
6. Drive Import → scan/import (needs Drive env vars).

## Hostinger Node.js deployment (no Vercel)

This repository includes a built-in Node HTTP runtime in `server.js`. It runs the existing `api/*.js` handlers and serves the Vite production build from `dist/`; no Express dependency or Vercel runtime is required.

### Local development

1. Copy `.env.example` to `.env` and fill the Supabase values (see Environment variables below).
2. Terminal 1: `npm run api` (starts the API on port 8787).
3. Terminal 2: `npm run dev` (Vite proxies `/api/*` to port 8787).
4. Open the local Vite URL. Check `/healthz` on port 8787 for the backend health response.

### Hostinger

1. Use a Hostinger **Business/Unlimited** web hosting plan or a Cloud plan that supports Node.js Web Apps. Hostinger's current documentation does not list Premium web hosting for managed Node.js apps; a static-only plan cannot run this API server.
2. Upload/pull the repository into the Node.js app root and set the app startup file to `server.js` (or startup command `npm start`).
3. Set the environment variables in Hostinger's Node.js app panel. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only; never prefix it with `VITE_` and never put it in client code.
4. Build before starting: `npm ci && npm run build`. The Node app serves `dist/` and handles `/api/*` on the same origin.
5. Set the Node app's document/root path to the repository root and let Hostinger provide `PORT`. The server binds to `0.0.0.0`.
6. Point `djshaggymusic.com` to the Node app using Hostinger's domain/Node.js app controls, then verify `https://djshaggymusic.com/healthz` returns JSON with `ok: true`.

### Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for browser Supabase Auth
- `SUPABASE_SERVICE_ROLE_KEY` for server API handlers; server-only secret
- Optional: `RESEND_API_KEY`, `GOOGLE_DRIVE_API_KEY` or `GOOGLE_SERVICE_ACCOUNT_JSON`, `AI_API_KEY`

Do not commit `.env`. Use `.env.example` as the blank template. A successful build does not prove third-party credentials or Drive permissions are configured; test those separately after deployment.
