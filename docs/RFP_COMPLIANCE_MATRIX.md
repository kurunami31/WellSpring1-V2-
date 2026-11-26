# WellSpring One — RFP Compliance Matrix

Source: `RFP_POS_Inventory_System.pdf`. Status reflects the **browser prototype** in this folder; production status is stated separately where it differs.

Legend:

- **Implemented** — working in the prototype and covered by the demo flow.
- **Partial** — core behaviour exists; an RFP sub-requirement remains.
- **API/schema only** — modelled in `apps/api` or `packages/shared`, not exposed in the prototype UI.
- **Not built** — outside this submission.

| # | RFP requirement | Status | Evidence / notes |
|---|---|---|---|
| **Point of sale** ||||
| 1 | Barcode-driven checkout | Implemented | POS scan field matches barcode or SKU on Enter (`POSPage.tsx`); keyboard-wedge scanners work |
| 2 | Product search by name, SKU, category | Implemented | POS finder filters name, SKU, barcode, category |
| 3 | Cart quantity control limited to available stock | Implemented | Quantity validation against sellable batch stock |
| 4 | Cash payment with change | Implemented | Tendered amount, change calculation, receipt lines |
| 5 | Card payment | Implemented (recorded) | Authorization reference required; no gateway |
| 6 | E-wallet payment | Implemented (recorded) | Wallet transaction reference required |
| 7 | Installment payment | Partial | Agreement reference captured and printed; no financing provider integration |
| 8 | Statutory senior/PWD discount and VAT exemption | Implemented | 20% discount, VAT removed, shown on receipt |
| 9 | BIR-style official receipt | Partial | 80 mm receipt with branch, serial, VAT, discounts, payment, batches; serial registration is a production task |
| 10 | Receipt printing | Implemented | Dedicated print stylesheet |
| 11 | Prescription item control | Implemented | Pharmacist confirmation required before payment |
| 12 | Void transaction | Implemented | Same-day only, `sales:void`, reason, stock and loyalty reversal |
| 13 | Refund transaction | Implemented | `sales:refund`, reason, amount, audit |
| 14 | Loyalty points earn/redeem | Implemented | Member lookup/enrolment, 1 pt per ₱50, redeem at ₱1 capped at 20% |
| 15 | Promotions and discount campaigns | Partial | Per-line discount support and loyalty pricing exist; no campaign manager |
| 16 | Customer record on sale | Partial | Customer type and loyalty number; no full customer profile |
| **Inventory** ||||
| 17 | Real-time stock by branch | Implemented | Eight independent branch inventories; every sale updates the active branch |
| 18 | Batch tracking | Implemented | Batch number, expiry, quantity, received date per product |
| 19 | FEFO selling | Implemented | `allocateFefo`; expired batches excluded; tests cover ordering and partial allocation |
| 20 | Expiry monitoring | Implemented | 90-day watch, expired-batch separation, badges and alerts |
| 21 | Reorder point alerts | Implemented | Per-product reorder point, dashboard and inventory filters |
| 22 | Stock adjustment with reason | Implemented | Per-batch count, movement per batch, audit entry |
| 23 | Stock movement history | Implemented | Sale, receipt, adjustment, return; batch and actor recorded |
| 24 | Inter-branch stock transfer | API/schema only | Transfer schema and permissions exist; no UI |
| 25 | Physical count tolerance workflow | Partial | Counts captured; no approval tolerance threshold screen |
| 26 | Expired/damaged stock write-off | Partial | Count adjustment with reason; no dedicated write-off document |
| **Purchasing and suppliers** ||||
| 27 | Supplier directory | Implemented | Six seeded suppliers with contacts, terms, lead time, rating |
| 28 | Supplier accreditation control | Implemented | Suspend/restore blocks drafting and approval; audit entry |
| 29 | Create purchase order | Implemented | One-line draft with product, quantity, cost, expected date |
| 30 | PO approval before sending | Implemented | `purchasing:approve_po` required |
| 31 | Goods receipt note against PO | Implemented | Invoice, notes, batch, expiry, received quantity per line |
| 32 | GRN updates stock and audit | Implemented | Batch merge/create, movement, PO status, audit |
| 33 | Partial delivery / short receipt | Partial | Received quantity can be below ordered; PO is then marked received; no back-order tracking |
| 34 | Invoice matching | Partial | Invoice number captured on GRN; no three-way match screen |
| 35 | Supplier creation/edit | Not built | Directory seeded; accreditation toggle only |
| 36 | Purchase spend reporting | Partial | PO totals per supplier/branch displayed; no aged spend report |
| **Reporting and dashboards** ||||
| 37 | Branch sales dashboard | Implemented | Branch-scoped metrics, trend, categories, alerts, rankings |
| 38 | Consolidated multi-branch dashboard | Implemented | Head-office network panel with per-branch revenue |
| 39 | Branch switching | Implemented | Header and mobile switcher; branch-bound accounts pinned |
| 40 | Sales report with date range | Implemented | Today / 7 days / all |
| 41 | Consolidated sales report | Implemented | "All branches" scope for `reports:consolidated` |
| 42 | CSV export | Implemented | Includes branch, status, discounts, loyalty |
| 43 | Reversals excluded from revenue | Implemented | Metrics filter `COMPLETED`; reversed receipts visible |
| 44 | Inventory valuation | Implemented | Sellable units at cost per branch |
| 45 | Accounting system integration | Not built | API surface and audit model only |
| **Security, roles, audit** ||||
| 46 | Role-based access control | Implemented | Eight roles, shared permission map, route guards, nav filtering |
| 47 | Branch-level data isolation | Implemented | Branch-bound staff cannot switch; store rejects cross-branch switch |
| 48 | Audit trail | Implemented | Sales, voids, refunds, counts, GRNs, supplier and user events with actor/branch |
| 49 | Audit retention | API/schema only | 10-year constant defined; production retention policy not enforced in browser |
| 50 | Secure authentication | Not built | Demo credentials and browser session only; production auth is explicitly out of scope |
| 51 | Payment secrecy | Implemented | Only references and last-4-free metadata stored; no card numbers |
| **Reliability and offline** ||||
| 52 | Offline sales queue | Implemented | Queued receipts, pending badge, manual sync |
| 53 | Duplicate protection on sync | Implemented | Sync by sale id; stock not deducted twice |
| 54 | 48-hour offline queue limit | Partial | Queue is unbounded; constant exists in shared rules |
| 55 | 99.5% availability | Not measured | Target only |
| 56 | POS response under 2 seconds | Not measured | Client-side operations; no load test |
| 57 | RTO 1 hour / RPO 4 hours / 4-hour backups | Not measured | Targets and constants defined; no production backup test |
| **Technical and delivery** ||||
| 58 | Web-based, responsive | Implemented | React/Vite; layouts collapse to mobile |
| 59 | REST API surface | API/schema only | Present in `apps/api`; not runtime-verified |
| 60 | PostgreSQL persistence | API/schema only | Prisma schema and Docker Compose present |
| 61 | Shared validation and domain types | Implemented | `packages/shared` Zod schemas and constants |
| 62 | Receipt serial control | Partial | Sequential per-year numbers; no BIR permit registration |
| 63 | 8-branch, ~120-staff operating model | Implemented (data) | Branches and roles seeded; concurrency not tested |
| 64 | Nine-month rollout plan | Documented | See project document §13 and Gantt artifacts |
| 65 | One-time cost ₱6,144,000 + contingency ₱307,200 | Documented | Commercial baseline retained in project document |
| 66 | Annual maintenance ₱780,000 | Documented | Commercial baseline retained in project document |

## Summary

- **Implemented:** 37 items (working prototype behaviour).
- **Partial:** 14 items (core behaviour present, sub-requirement open).
- **API/schema only:** 6 items.
- **Not built:** 4 items.
- **Not measured:** 4 non-functional targets (availability, response time, RTO/RPO execution, backup test).

The prototype is strongest on the operational core the RFP describes: FEFO batch selling, expiry and reorder control, PO-to-GRN receiving, supplier accreditation, reversal accountability, branch isolation, and offline continuity. The largest remaining production gaps are live payment processing, production identity, three-way invoice matching, transfers, and API/database runtime verification.
