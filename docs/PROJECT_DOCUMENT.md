# WellSpring One — Project Document

**POS · Inventory · Supplier Management for WellSpring Pharmacy & Retail Corp.**

| Item | Detail |
|---|---|
| Client | WellSpring Pharmacy & Retail Corp., Davao City |
| Network | 8 branches (flagship plus seven branches) |
| Source requirement | `RFP_POS_Inventory_System.pdf` |
| Deliverable | Working browser prototype, source API surface, and this document set |
| Document status | Submission copy for evaluation defense |
| Prepared | November 2026 |

---

## 1. Executive summary

WellSpring One is a single operational record for the pharmacy counter, the stockroom, and the supplier desk. The prototype in this folder demonstrates the workflows that decide whether a pharmacy chain is accurate: barcode checkout, batch-level stock with expiry, first-expiry-first-out (FEFO) selling, purchase orders and goods receipt notes, supplier accreditation, returns with an audit trail, branch and consolidated reporting, and an offline queue that survives a dropped connection.

The implementation is a React + TypeScript web application backed by a localStorage data store for demonstration, with an Express + Prisma + PostgreSQL API surface included in the repository for the production boundary. This split is deliberate and stated throughout: the browser prototype runs with `npm ci` and no database, while the API documents how the same operations are meant to be served in production. Nothing in this document claims the API was runtime-verified against PostgreSQL for this submission.

The prototype covers all eight branches in the data model. Branch-assigned staff see only their branch; head-office and administrator accounts can switch branches and compare consolidated numbers without signing out.

### 1.1 What changed in this build

This build replaces the earlier single-branch, single-batch demonstration with:

- eight seeded branches with independent inventory, orders, receipts, and audit entries;
- true batch records per product (`batchNumber`, `expiry`, `quantity`, `receivedAt`) and FEFO allocation on every sale;
- GRN receiving that captures supplier invoice, batch number, expiry, and received quantity per line;
- a supplier directory with accreditation controls that block ordering when suspended;
- void and refund workflows with permission gates, stock restoration to the original batch, and audit reasons;
- loyalty members with points lookup, enrolment, redemption capped at 20% of a sale, and points earned per ₱50;
- barcode scan-to-cart input, installment payment capture, and batch lines on the printed receipt;
- a public landing page, branch switcher, consolidated dashboard, and branch-aware reports.

---

## 2. Business context

WellSpring Pharmacy & Retail Corp. operates eight branches with roughly 120 staff. The branches share a catalogue but not a stockroom. Today, each branch reconciles its own counts, orders, and sales; head office receives totals after the fact. The operational consequences are familiar:

- stock records drift from the shelf because counting and selling live in different places;
- short-dated batches are discovered after they expire rather than before;
- purchase orders, deliveries, and invoices are matched by hand;
- senior and PWD discounts are applied inconsistently at the counter;
- a connection interruption stops checkout entirely;
- a refund or a void leaves no reliable trace of who approved it or which batch came back.

The RFP asks for a POS, inventory, and supplier system that fixes these failure modes across the network, with BIR-compliant receipts, role-based access, offline resilience, and a nine-month rollout.

---

## 3. Objectives and success measures

| Objective | Measure used in this submission |
|---|---|
| One stock truth per branch | Batch ledger is the only source of available quantity; sales, GRN receipts, returns, and counts all post to it |
| Sell short-dated stock first | FEFO allocation is enforced in code and shown on the receipt line |
| Receive with evidence | A GRN cannot be posted without invoice number, batch, and a future expiry |
| Protect margin and compliance | Statutory discount and VAT rules are centralised; void/refund requires a reason and permission |
| Keep the counter open | Offline queue with duplicate protection and manual sync |
| Give head office the network view | Consolidated sales, branch performance, and cross-branch audit in one workspace |
| Meet the RFP's operational targets | Targets below are adopted as acceptance criteria; the prototype verifies behaviour, not load |

RFP targets adopted: 98% stock accuracy, POS response under 2 seconds, 99.5% availability, recovery time objective (RTO) of 1 hour, recovery point objective (RPO) of 4 hours with backups every 4 hours, and a nine-month rollout.

---

## 4. Scope

### 4.1 In scope for this prototype

1. Public landing page and staff sign-in with seeded and local demo accounts.
2. Role-based navigation and route guards across eight roles.
3. Branch switching for head-office and administrator accounts.
4. Point of sale: search, barcode scan, cart, FEFO allocation, statutory discounts, loyalty points, cash/card/e-wallet/installment capture, 80 mm receipt printing.
5. Inventory: batch listing, expiry status, per-batch physical counts, stock movements.
6. Purchasing: supplier selection, draft PO, manager approval, GRN posting with batch and expiry.
7. Suppliers: directory, terms, lead times, accreditation suspend/restore, open order value.
8. Returns: same-day void, refund, stock restoration, reversal audit trail.
9. Reporting: branch and consolidated revenue, trend, rankings, CSV export, reversal visibility.
10. Offline mode: queued sales, pending badge, single sync with duplicate protection.
11. Administration: staff accounts, activation, audit log.
12. Documentation: this document, RFP compliance matrix, requirements, test plan, technical guide, presentation, demo script.

### 4.2 Explicitly out of scope

- Real payment processing or card-network integration. Payment references are recorded for reconciliation.
- Production identity, SSO, MFA, and password policy enforcement. Demo sign-up is browser-only.
- Live accounting-system integration. The API surface and audit model anticipate it; no ledger is posted.
- RFID hardware. Barcode input is implemented; RFID is a future adapter.
- Inter-branch stock transfer execution. The shared schema models transfers and permissions exist; the prototype UI does not expose a transfer workflow.
- E-commerce, delivery booking, and customer-facing ordering.
- Runtime verification of the Express/PostgreSQL API against a live database.

---

## 5. Stakeholders and access model

| Role | Primary use | Key permissions |
|---|---|---|
| Cashier | Sell, print receipts, void same-day receipts | `sales:create`, `sales:read`, `sales:void` |
| Pharmacist | Prescription checks, batch handling | `sales:create`, `inventory:batch_manage` |
| Inventory staff | Counts, adjustments, GRN posting | `inventory:read`, `inventory:count`, `inventory:adjust`, `purchasing:grn` |
| Store supervisor | Counter supervision, voids, refunds | `sales:void`, `sales:refund`, `inventory:adjust`, `reports:branch_sales` |
| Purchasing officer | Draft POs, receive goods, supplier accreditation | `purchasing:create_po`, `purchasing:grn`, `supplier:manage` |
| Branch manager | Approve POs, refunds, branch reporting | `purchasing:approve_po`, `sales:refund`, `reports:branch_sales`, `admin:audit` |
| Head-office manager | Consolidated reporting, network approval | `reports:consolidated`, `purchasing:approve_po` |
| System administrator | Users, configuration, audit | all permissions, including `admin:users`, `admin:config`, `admin:audit` |

Permissions are defined once in `packages/shared/src/index.ts` and enforced both in navigation and on routes. The prototype's `useAuth().hasPermission` grants the system administrator every permission; other roles resolve from the shared permission map. Backend middleware mirrors the same map for the API surface.

### 5.1 Branch scope

- Accounts with a `branchId` are pinned to that branch. The branch switcher is hidden and the server-side store rejects cross-branch switching.
- Accounts with `branchId = null` (head office, system administrator) can switch branches; inventory, purchasing, and the transaction register follow the selection.
- Reports additionally offer an "All branches" scope for accounts with `reports:consolidated`.

---

## 6. System architecture

```
apps/web (React 18 + Vite + TypeScript)
  ├── pages/            Landing, Login, Dashboard, POS, Inventory, Purchasing,
  │                     Suppliers, Returns, Reports, Offline, Admin
  ├── context/          AuthContext, PrototypeContext (branch + batch store)
  ├── lib/              sales, inventory (FEFO), dashboard, demo-auth, api client
  ├── data/             branches, demo seed (8 branches, suppliers, sales, POs)
  └── components/       AppShell, shared UI, form controls

packages/shared         Roles, permissions, Zod schemas, business constants
apps/api                Express + Prisma + PostgreSQL API surface
docs/                   Requirements, this document, compliance matrix, test plan
```

### 6.1 Runtime data flow (prototype)

1. `PrototypeProvider` loads state from `localStorage` key `wellspring-prototype-v2`, falling back to deterministic seed data.
2. Pages read scoped data (`products`, `sales`, `purchaseOrders`) for the active branch.
3. Mutations validate in the context, update the branch inventory and registers in one state transition, and append stock movements plus audit entries.
4. State is persisted on every change. `resetDemo()` restores the seed.

### 6.2 Production data flow (API surface)

The Express application exposes authentication, products, inventory, sales, purchasing, reports, sync, admin, users, and branch routes with RBAC and audit middleware. Prisma models branches, products, batches, stock levels, sales, suppliers, purchase orders, GRNs, counts, transfers, and audit logs. Wiring the web client to this API requires setting `VITE_USE_API=true` and providing a PostgreSQL instance; the prototype UI intentionally remains on local storage so the demo has no infrastructure dependency.

---

## 7. Domain model

### 7.1 Branch

`id`, `code` (WS01–WS08), `name`, `city`, `address`, `phone`, `type` (FLAGSHIP/BRANCH), `openedAt`.

### 7.2 Product and batch

A product is catalogue data plus a batch ledger:

| Field | Meaning |
|---|---|
| `sku`, `barcode`, `name`, `category`, `unit` | Identification and unit of measure |
| `price`, `cost` | Selling price and unit cost (PHP) |
| `reorderPoint` | Branch reorder threshold |
| `prescription` | Prescription-only flag; checkout requires pharmacist confirmation |
| `batches[]` | `id`, `batchNumber`, `expiry`, `quantity`, `receivedAt` |
| `stock`, `batch`, `expiry` | Derived cache: sellable units, earliest sellable batch, its expiry |

`stock` is always recomputed from batches via `syncProduct()`. Expired batches are excluded from sellable stock and can never be allocated to a sale.

### 7.3 Sale

Header: receipt number, timestamp, branch, cashier, customer type, payment method, totals (subtotal, discount, VAT, loyalty discount, total), cash/change or payment reference, loyalty phone/points, status (`COMPLETED`, `VOIDED`, `REFUNDED`), offline flag, and reversal metadata.

Line: product, quantity, unit price, line total, prescription flag, and `batchAllocations[]` (`batchNumber`, `expiry`, `quantity`). The allocation is the audit link between a receipt and the exact batches that left the shelf.

### 7.4 Stock movement

Every change to a batch produces a movement: `SALE`, `RECEIPT`, `ADJUSTMENT`, or `RETURN`, with branch, product, batch, signed quantity, resulting batch balance, reason/reference, actor, and timestamp.

### 7.5 Supplier and purchase order

Supplier: code, name, contact, phone, email, address, payment terms, lead-time days, category, accreditation flag, rating, last delivery, notes.

Purchase order: number, supplier, branch, dates, status (`DRAFT`, `SENT`, `RECEIVED`), total, line items, and an optional GRN containing `grnNumber`, `invoiceNumber`, `receivedAt`, `receivedBy`, notes, and per-line batch/expiry/quantity.

### 7.6 Loyalty member

Name, mobile number, points balance, join date, tier (`CLASSIC` < 100, `SILVER` ≥ 100, `GOLD` ≥ 300).

### 7.7 Audit record

Action, detail, actor, branch, timestamp. Sales, voids, refunds, stock counts, GRN postings, supplier accreditation changes, and user administration all write here.

---

## 8. Functional specification

### 8.1 Landing page

Public route `/`. A product-led hero states the proposition ("Every counter, every batch, one ledger"), shows a register sample, and lists capabilities, a day-in-the-life sequence, and the eight branches. The page states the prototype's boundaries before sign-in. Both "Open prototype" and "Staff sign in" lead to `/login`; signed-in users are offered `/dashboard`.

### 8.2 Authentication and session

Seeded accounts share the demo password `password123`. The session is stored under `wellspring-demo-session`. Local demo sign-up creates a cashier profile only when the API is disabled; it is explicitly labelled as non-production. Sign-out clears the session.

### 8.3 Dashboard

- Greeting, date, active branch, connectivity state.
- Four metrics for the active branch: today's revenue, transactions, sellable units, low-stock products.
- Consolidated "Today across the network" panel for head-office accounts, with per-branch revenue bars and an "Open" action that switches branch.
- Quick actions filtered by permission.
- Seven-day revenue trend, stock-by-category donut, recent receipts, stock/expiry attention list, fast-moving products.
- Revenue metrics exclude voided and refunded sales.

### 8.4 Point of sale

1. **Barcode scan.** A dedicated input accepts scanner keystrokes; Enter matches barcode or SKU exactly and adds the item. Unknown codes produce an inline error without leaving the field.
2. **Search.** Name, SKU, barcode, or category, scoped to the active branch.
3. **Cart.** Quantity controls capped at sellable stock; per-line FEFO batch and expiry shown; clear-all.
4. **Customer type.** Regular, senior citizen, PWD, or loyalty member. Senior/PWD applies a 20% discount and removes VAT.
5. **Loyalty.** Enter an 11-digit mobile number to load the member, points, and tier. Unknown numbers can be enrolled inline. Redemption is capped at 20% of the sale at ₱1 per point. Points are earned at one point per ₱50 of the final total and reversed on void/refund.
6. **Payment.** Cash with change; card and e-wallet with authorization reference; installment with agreement number and a note that the signed form is retained with the receipt copy.
7. **Prescription check.** A cart containing an Rx item requires an explicit pharmacist confirmation.
8. **Receipt.** 80 mm print stylesheet, branch, receipt number, cashier, timestamp, per-line batch, statutory and loyalty discounts, VAT, payment reference, points, and sync status.

### 8.5 Inventory

- Summary: sellable units (with expired units excluded), stock at cost, reorder count, expiry watch (any batch within 90 days).
- Ledger rows: product, next batch, sellable quantity, reorder point, status, expandable batch list.
- Count/adjust opens a per-batch form. Counted quantities replace the ledger for each batch, producing one movement per changed batch and an audit entry with the total variance.
- Movements table lists the branch's sales, receipts, returns, and adjustments with batch and actor.

### 8.6 Purchasing

- Draft a one-line PO from an accredited supplier, with expected date, quantity, and unit cost.
- Approval and sending require `purchasing:approve_po`; non-accredited suppliers are rejected at drafting and approval.
- Receiving requires `purchasing:grn` and opens a GRN form: supplier invoice number, optional notes, then per line a batch number, future expiry, and received quantity.
- Posting the GRN merges or creates batches, recomputes stock, writes movements, stamps the order `RECEIVED`, and records the GRN number in the audit trail.
- Received orders display the GRN, invoice, receiver, timestamp, batch lines, and notes.

### 8.7 Suppliers

- Card directory with contact, terms, lead time, rating, notes, order count, order value, last delivery.
- Accreditation badge; authorized users can suspend or restore. Suspension immediately blocks new POs and approvals.
- Search and accredited-only filter. Summary shows accredited ratio, open order value, average lead time, most recent delivery.

### 8.8 Returns and voids

- Register of receipts scoped to the active branch with status filter and search.
- Review panel shows lines and batches, then requires a reason of at least eight characters.
- **Void** is limited to receipts created today and requires `sales:void`.
- **Refund** requires `sales:refund` and records the refunded amount, approver, and reason.
- Both restore exact batch quantities and reverse loyalty points.
- A dedicated reversal audit table lists void and refund events across branches.

### 8.9 Reports

- Range: today, last seven days, all demo sales. Scope: this branch or all branches (consolidated permission).
- Metrics exclude reversed receipts and count reversals separately.
- Revenue trend, top-five product ranking, and transaction register with status and sync columns.
- CSV export includes branch, status, and loyalty discount.

### 8.10 Offline and synchronization

The shell toggles connectivity. Sales completed while offline are tagged `offline`, queued with their receipt, and counted in the header badge. On reconnect, "Synchronize" uploads the queue once, flips receipts to synced, clears the queue, and writes an audit entry. Stock is not deducted twice.

### 8.11 Administration

- Staff table with role, branch, last activity, and active status; authorized administrators can add accounts with a target branch and activate/deactivate staff.
- Audit table with timestamp, action, detail, actor, and branch association.
- Self-deactivation is blocked.

---

## 9. Business rules

### 9.1 Pricing and tax

- VAT is 12% on VAT-exempt-category sales. Prices in the prototype are VAT-exclusive, and VAT is added at checkout; the printed receipt shows the VAT line separately.
- Senior citizen and PWD sales receive a 20% statutory discount on the net amount and are VAT-exempt.
- Loyalty redemption is applied after VAT, capped at 20% of the amount due.
- All currency values are rounded to centavos at the boundary.

### 9.2 FEFO

For each cart line, batches are sorted by expiry ascending; expired batches are skipped; quantities are taken until the line is satisfied. If the remaining quantity is non-zero, the sale is rejected with the number of sellable units. Allocations are stored on the sale line and drive stock deduction, refund restoration, and receipt printing.

### 9.3 Receiving

A GRN requires one line per ordered item, a non-empty batch, a future expiry, and a quantity between one and the ordered quantity. The same batch number and expiry merge into the existing batch; otherwise a new batch is created. GRN numbers are sequential per year.

### 9.4 Voids and refunds

Voids apply only to today's receipts; earlier transactions must be refunded. A reversal requires a reason, restores stock to the original batches, reverses earned points and restores redeemed points, and writes an audit entry naming the actor and branch.

### 9.5 Loyalty

Earn one point per ₱50 of the final total. Redeem at ₱1 per point, up to 20% of the amount due, subject to the member's balance. Tiers: classic below 100 points, silver from 100, gold from 300.

### 9.6 Stock counts

Counted quantities must be whole numbers, zero or greater. Each changed batch produces a movement; the net variance is recorded in the audit trail with the reason. Expired batches remain visible for write-off.

---

## 10. Non-functional design

| Area | Decision |
|---|---|
| Performance | Client-side filtering and precomputed totals; FEFO allocation is linear in batch count. The POS screen avoids network round-trips in prototype mode. |
| Availability | Local-first checkout; sales continue offline and reconcile later. Production target is 99.5%. |
| Recovery | RPO 4 hours / RTO 1 hour per the RFP; production backup schedule every 4 hours. |
| Security | Permission checks in navigation, routes, and mutations; mutation validation in the store; no secrets in client code; API middleware mirrors RBAC; audit entries for sensitive actions. Demo auth is explicitly not production-grade. |
| Privacy | Seed data is synthetic. No real patient or customer data is stored. Browser data can be cleared from Offline & sync. |
| Accessibility | Semantic landmarks, labelled controls, visible focus, skip link, minimum 44 px targets, status text paired with colour, chart descriptions via `aria-label`. |
| Printing | Dedicated 80 mm receipt stylesheet that hides application chrome. |
| Responsiveness | Sidebar collapses to a menu on small screens; cart and tables stack; POS remains usable at counter width. |
| Auditability | Actor, branch, reason, and batch are captured for stock and money movements. |

---

## 11. Verification performed

Environment: Node.js 20+, Windows, repository `wellspring-pos-v2`.

| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit -p apps/web/tsconfig.json` | Passed, 0 errors |
| Unit tests | `npm test --workspace=apps/web` | 27 passed across 4 files |
| Production build | `npm run build --workspace=apps/web` | Passed; bundle emitted |
| Lint | `npm run lint --workspace=apps/web` | 0 errors |

New automated coverage in this build:

- `lib/inventory.test.ts` — FEFO ordering, expired-batch exclusion, partial allocation, deduction/restoration, sellable quantity.
- `lib/sales.test.ts` — loyalty credit applied after VAT and rejection of over-discounting.
- `lib/dashboard.test.ts` — existing metrics updated for the new sale/product shape.

Not verified in this environment:

- PostgreSQL runtime for the Express API.
- Physical barcode scanner hardware (keyboard-wedge input is implemented).
- Receipt printer output beyond the print stylesheet.
- Load, availability, and recovery targets. These are RFP acceptance criteria, not prototype results.
- Visual inspection in a browser was not part of the recorded checks for this document; run the dev server and review before the defense.

---

## 12. Demo guide

```bash
npm ci
npm run dev --workspace=@wellspring/web -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`.

| Account | Password | Use |
|---|---|---|
| `admin@wellspring.ph` | `password123` | All branches, consolidated dashboard, users, audit |
| `branch1.mgr@wellspring.ph` | `password123` | Approve POs, refund, branch reports |
| `cashier1@wellspring.ph` | `password123` | Sell, void today's receipt |
| `pharmacist1@wellspring.ph` | `password123` | Prescription checkout, batch review |
| `inventory1@wellspring.ph` | `password123` | Counts, GRN receiving |
| `purchasing1@wellspring.ph` | `password123` | Draft POs, supplier accreditation |

Suggested five-minute flow:

1. Landing page → enter prototype → sign in as administrator.
2. Switch from WS01 to WS02 in the header, then back.
3. Open POS, scan `4801234500043` (Bioflu), add a water item, complete a cash sale, print the receipt and point out the batch line.
4. Open Inventory, expand Bioflu batches, and record a count.
5. Open Purchasing, approve a draft, receive it with invoice, batch, and expiry; then open the order to show the GRN.
6. Open Suppliers and suspend an accreditation; attempt a new PO to show the block.
7. Open Returns, refund the morning receipt with a reason; show the restored stock and audit entry.
8. Toggle offline, complete a sale, reconnect, synchronize, and show the queue clearing.
9. Open Reports with "All branches" to show consolidation and reversed receipts excluded from revenue.

---

## 13. Deployment and operations (production path)

1. Provision PostgreSQL; apply Prisma migrations and seed branches, roles, and the catalogue.
2. Configure API environment variables (database URL, JWT secret, receipt serials, branch defaults).
3. Build the web client with `VITE_USE_API=true` and serve behind TLS.
4. Point each branch workstation at the web host; register receipt printers at 80 mm.
5. Schedule backups every four hours; retain audit records for ten years per the shared constants.
6. Run a pilot at WS01 for two weeks, then waves of two branches, with stock baseline counts before each go-live.

The RFP's nine-month plan, one-time cost of ₱6,144,000, contingency of ₱307,200, and annual maintenance of ₱780,000 remain the commercial baseline; this document does not restate or alter them.

---

## 14. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Local-storage demo mistaken for production persistence | Data loss, false confidence | Boundary stated on the landing page, README, and this document; API boundary documented |
| Expiry data entered incorrectly at receiving | FEFO sells wrong stock | Expiry is required and must be in the future; batch visible on receipt and ledger |
| Staff bypassing approval | Unauthorized spend | PO approval permission enforced in UI and store; audit entry per approval |
| Refund abuse | Revenue leakage | Separate refund permission, mandatory reason, reversal audit, branch manager role |
| Accreditation lapse | Regulated stock from unlicensed supplier | Accreditation flag blocks drafting and sending; audit records the change |
| Offline queue divergence | Duplicate or missing sales | Single sync pass, duplicate protection by sale id, pending badge |
| Browser storage cleared | Demo reset | Explicit reset action; seeded data restores |
| API and UI drift | Integration defects | Shared Zod schemas and permission map in `packages/shared` |

---

## 15. Known limitations

- The web prototype is not connected to PostgreSQL at runtime; API routes exist but are not the data source for the demo.
- Payments are recorded, not processed; no gateway, terminal, or installment provider integration.
- Loyalty enrolment is local to the browser and has no SMS verification.
- Supplier creation and editing are seeded; accreditation can be toggled but new suppliers are not added through the UI.
- Stock transfers between branches are modelled in the shared schema and permissions but have no screen.
- BIR receipt fields are represented in the print layout, but official serial registration and accreditation are production tasks.
- Reports cover sales and stock movement; purchase spend and supplier scorecards are partial.
- Accessibility was designed in but not audited with assistive technology for this submission.

---

## 16. Next steps

1. Connect the web client to the Express API and PostgreSQL; replace localStorage in a branch pilot.
2. Add inter-branch transfer screens and approval thresholds.
3. Add supplier creation/edit forms and invoice matching against GRNs.
4. Integrate the accounting export and BIR serial registration.
5. Run accessibility and load testing against the RFP targets.
6. Add end-to-end tests for the ten critical flows in `docs/TEST_PLAN.md`.

---

## Appendix A — Seed data

- **Branches:** WS01 Davao Main (flagship), WS02 Bajada, WS03 Lanang, WS04 Tagum, WS05 General Santos, WS06 Digos, WS07 Mati, WS08 Panabo.
- **Catalogue:** 12 products across prescription, OTC, vitamins, personal care, medical supplies, and baby care, each with one or two batches per branch. WS01 is seeded with two low-stock products, a near-expiry Bioflu batch, and a mask batch below reorder point.
- **Suppliers:** six, including one suspended (Mindanao Pharma Link) to demonstrate the order block.
- **Sales:** fifteen seeded receipts across six branches over seven days, including one voided and one refunded receipt, three loyalty sales, and mixed payment methods.
- **Purchase orders:** five, covering draft, sent, and received states with two complete GRNs.
- **Loyalty members:** four, spanning all three tiers.
- **Staff:** eight seeded accounts across roles; an inactive supervisor demonstrates deactivation.

## Appendix B — Glossary

| Term | Meaning |
|---|---|
| FEFO | First-expiry-first-out; the batch with the nearest expiry is sold first |
| GRN | Goods receipt note; the record of what actually arrived against a PO |
| PO | Purchase order |
| RTO / RPO | Recovery time objective / recovery point objective |
| SKU | Stock keeping unit |
| Statutory discount | The 20% senior citizen / PWD discount required by Philippine law |
| Batch | A production lot with a specific expiry date |
| Consolidated view | Head-office reporting across branches, distinct from a single branch's ledger |

## Appendix C — Document map

| Document | Purpose |
|---|---|
| `docs/PROJECT_DOCUMENT.md` | This document: system, scope, design, verification, operations |
| `docs/RFP_COMPLIANCE_MATRIX.md` | Requirement-by-requirement status and evidence |
| `docs/REQUIREMENTS.md` | Formal requirements and measurable targets |
| `docs/TECHNICAL_GUIDE.md` | Deep technical reference and API inventory |
| `docs/TEST_PLAN.md` | Test cases, evidence, and acceptance gates |
| `docs/SUBMISSION_GUIDE.md` | User guide and walkthrough |
| `docs/PRESENTATION.md` / `docs/PRESENTER_DEMO_SCRIPT.md` | Defense narrative and demo script |
| `docs/USE_CASE_SPECIFICATION_RFP.*` | Use cases |
| `docs/GANTT_TWO_WEEK_PLAN.*` | Two-week build plan |
