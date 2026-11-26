# WellSpring One

A branch-aware pharmacy POS, inventory, purchasing, supplier, and reporting prototype for WellSpring Pharmacy & Retail Corp. Built with React, TypeScript, Vite, Express, Prisma, and PostgreSQL.

> **Prototype boundary:** the demonstrated browser workflows store data in `localStorage`. The Express/PostgreSQL layer is present in source for the production boundary but is not the runtime data source for these pages, and was not verified against a live database for this submission. Payment methods are recorded, not processed.

## What this build adds

- **Landing page** with a product-led hero at `/`, public before sign-in.
- **Eight branches** (WS01–WS08) with independent inventory, orders, receipts, and audit entries; head-office accounts switch branches from the header.
- **Batch-level inventory with FEFO** — every product carries batch, expiry, and quantity; sales take the earliest expiry first and receipts print the batch.
- **GRN receiving** — invoice number, batch, expiry, and received quantity per line, with stock and PO status updated together.
- **Supplier directory** with accreditation that blocks ordering when suspended.
- **Returns and voids** with permission gates, mandatory reasons, batch restoration, loyalty reversal, and a reversal audit trail.
- **Loyalty members** with lookup, inline enrolment, capped redemption, and points earned per ₱50.
- **Barcode scan-to-cart**, installment agreement capture, per-batch stock counts, branch performance and consolidated reports.

## Run the browser prototype

Requirements: Node.js 20+ and npm.

```bash
npm ci
npm run dev --workspace=@wellspring/web -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173` for the landing page, then **Open prototype**.

### Demo accounts

Password for every seeded account: `password123`.

| Account | Role | What to try |
|---|---|---|
| `admin@wellspring.ph` | System administrator | Branch switching, consolidated dashboard, users, audit |
| `ho.manager@wellspring.ph` | Head-office manager | All-branch reports, PO approval |
| `branch1.mgr@wellspring.ph` | Branch manager | PO approval, refunds, branch reports |
| `cashier1@wellspring.ph` | Cashier | Selling, same-day voids |
| `pharmacist1@wellspring.ph` | Pharmacist | Prescription checkout, batch review |
| `inventory1@wellspring.ph` | Inventory staff | Batch counts, GRN receiving |
| `purchasing1@wellspring.ph` | Purchasing officer | Draft POs, supplier accreditation |
| `supervisor1@wellspring.ph` | Store supervisor | Voids, refunds, counts |

Synthetic data only. Use **Offline & sync → Reset demo data** to restore the seed.

## Feature map

| Area | Route | Highlights |
|---|---|---|
| Landing | `/` | Hero, capabilities, branch network, prototype boundaries |
| Dashboard | `/dashboard` | Branch metrics, network performance, 7-day trend, stock attention |
| POS | `/pos` | Scan/search, FEFO cart, senior/PWD, loyalty, cash/card/e-wallet/installment, 80 mm receipt |
| Inventory | `/inventory` | Batch ledger, expiry watch, per-batch counts, movements |
| Purchasing | `/purchasing` | Draft → approve → GRN with batch and expiry |
| Suppliers | `/suppliers` | Accreditation, terms, contacts, open order value |
| Returns | `/returns` | Void/refund with reasons and batch restoration |
| Reports | `/reports` | Branch or consolidated, reversals excluded, CSV export |
| Offline | `/offline` | Connection mode, queue, sync, reset |
| Administration | `/admin` | Staff accounts and audit trail |

## Documentation

| Document | Purpose |
|---|---|
| **[docs/PROJECT_DOCUMENT.md](docs/PROJECT_DOCUMENT.md)** | Full project document: scope, architecture, data model, modules, rules, verification, operations |
| [docs/RFP_COMPLIANCE_MATRIX.md](docs/RFP_COMPLIANCE_MATRIX.md) | Requirement-by-requirement status with evidence |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Formal requirements and measurable targets |
| [docs/TECHNICAL_GUIDE.md](docs/TECHNICAL_GUIDE.md) | Architecture, API inventory, data model, security |
| [docs/TEST_PLAN.md](docs/TEST_PLAN.md) | Test cases, evidence, acceptance gates |
| [docs/SUBMISSION_GUIDE.md](docs/SUBMISSION_GUIDE.md) | User guide and walkthrough |
| [docs/PRESENTATION.md](docs/PRESENTATION.md) | Defense narrative |
| [docs/PRESENTER_DEMO_SCRIPT.md](docs/PRESENTER_DEMO_SCRIPT.md) | Timed demo script |
| [docs/USE_CASE_SPECIFICATION_RFP.md](docs/USE_CASE_SPECIFICATION_RFP.md) | Use cases |
| [docs/GANTT_TWO_WEEK_PLAN.md](docs/GANTT_TWO_WEEK_PLAN.md) | Build plan |

## Verification snapshot

| Check | Result |
|---|---|
| `npx tsc --noEmit -p apps/web/tsconfig.json` | Passed, 0 errors |
| `npm test --workspace=apps/web` | 27 tests passed (sales, inventory/FEFO, dashboard, demo auth) |
| `npm run build --workspace=apps/web` | Passed |
| `npm run lint --workspace=apps/web` | 0 errors |

Not verified: PostgreSQL runtime, scanner hardware, physical printer output, load/availability targets, and assisted-technology review. See the project document §11.

## Repository layout

```
apps/web        React + Vite prototype
apps/api        Express + Prisma API surface
packages/shared Roles, permissions, Zod schemas, business constants
docs            Project document, compliance matrix, guides, plan
```

This folder is a rebuild of the original `wellspring-pos` project; the original is left untouched for comparison.
