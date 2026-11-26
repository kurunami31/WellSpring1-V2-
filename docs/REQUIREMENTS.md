# WellSpring One — Requirements Specification

**Project:** WellSpring One integrated pharmacy POS, inventory, and supplier management
**Client:** WellSpring Pharmacy & Retail Corp., Davao City
**Source:** `RFP_POS_Inventory_System.pdf`
**Version:** 2.0 (rebuild)
**Status:** Prototype requirements with production gap analysis; not a production acceptance certificate

This specification describes the functionality of the rebuilt browser prototype. Where behaviour is simulated or partial, the evidence column says so. Commercial terms from the RFP are retained but not restated as engineering results.

## 1. Evidence terms

- **Implemented** — working in the browser prototype and exercised by the demo flow.
- **Partial** — the core behaviour exists; a stated sub-requirement is missing.
- **API/schema only** — present in source, not exposed in the browser prototype.
- **Target** — an RFP acceptance criterion that has not been measured.

## 2. Business objectives

1. Keep one authoritative stock ledger per branch, with batch and expiry detail.
2. Sell short-dated stock first and stop expired stock from reaching a customer.
3. Receive deliveries against a purchase order with invoice and batch evidence.
4. Protect revenue with permissioned voids, refunds, and a durable audit trail.
5. Give head office a network view without merging branch ledgers.
6. Keep the counter selling through a connection interruption.

## 3. Scope

### 3.1 In scope

Landing page; staff sign-in; branch switching; dashboard; POS with barcode scan, FEFO, statutory discounts, loyalty, four payment methods and receipt printing; inventory with batch ledger, expiry monitoring, per-batch counts, and movements; purchasing with approval and GRN; supplier directory with accreditation; returns and voids; branch and consolidated reports with CSV; offline queue and sync; staff administration and audit.

### 3.2 Out of scope

Live payment processing; production identity and MFA; accounting integration; RFID; inter-branch transfers in the UI; supplier creation/edit; e-commerce; verified PostgreSQL runtime for the API; BIR certification.

## 4. Stakeholders

| Role | Requirement focus |
|---|---|
| Cashier | Fast checkout, correct change, same-day void |
| Pharmacist | Prescription control, batch integrity |
| Inventory staff | Counting, receiving, expiry control |
| Store supervisor | Void/refund approval, count adjustments, branch reports |
| Purchasing officer | Ordering, GRN, accreditation |
| Branch manager | PO approval, refunds, branch oversight |
| Head-office manager | Consolidated reporting, network approval |
| System administrator | Users, configuration, audit |

Branch-assigned accounts see only their branch. Accounts without a branch may switch branches.

## 5. Functional requirements

| ID | Requirement | Status | Evidence | Remaining production gap |
|---|---|---|---|---|
| FR-01 | Process cash, card, e-wallet, and installment payments | Implemented (recorded) | POS payment selector; cash change; mandatory references; installment agreement field | Gateway/terminal integration and settlement |
| FR-02 | Print an official receipt and support void/refund with audit | Partial | 80 mm receipt with branch, serial, VAT, discounts, batches; returns desk with reasons and audit | BIR permit/serial registration, accredited printer validation |
| FR-03 | Real-time stock across all branches | Implemented (single device) | Eight branch inventories; every sale/receipt/count/return posts to the active branch | Central server and concurrency testing |
| FR-04 | Batch and expiry tracking with FEFO | Implemented | `allocateFefo`, batch records, expired exclusion, receipt batch lines; automated tests | Concurrent allocation under load |
| FR-05 | Reorder and near-expiry alerts | Implemented | Dashboard alerts, inventory filters, 90-day window, expired separation | Push/scheduled notifications |
| FR-06 | Manage suppliers, purchase orders, and GRNs | Implemented (single-line PO) | Supplier directory and accreditation; draft→approve→send; GRN with invoice, batch, expiry, quantity | Multi-line PO form, partial receipts, invoice matching |
| FR-07 | Consolidate branch sales and inventory dashboards | Implemented | Head-office branch performance panel; reports "All branches"; branch switcher | Central data freshness; inventory consolidation screen |
| FR-08 | Role-based access control | Implemented (prototype) | Shared permission map, route guards, navigation filtering, branch pinning | Server-side session security and escalation testing |
| FR-09 | Accounting-system integration | Not built | API surface and audit model only | Contract, mapping, delivery, reconciliation |
| FR-10 | Offline operation and synchronization | Partial | Offline queue, pending badge, manual sync with duplicate protection | Automatic reconnect, durable upload, conflict handling |
| FR-11 | Barcode scanning (RFID optional) | Implemented (keyboard wedge) | Dedicated scan input, exact barcode/SKU match on Enter | Hardware validation; RFID not implemented |
| FR-12 | Complete, tamper-evident audit trail | Partial | Actor, branch, reason, and entity data captured for money and stock events | Hash chain/WORM storage, retention enforcement |
| FR-13 | Promotions, discounts, loyalty | Partial | Statutory discounts; loyalty enrolment, accrual, redemption, reversal; per-line discount support | Campaign engine and stacking rules |
| FR-14 | Prescription control at checkout | Implemented | Pharmacist confirmation required for Rx lines | Integration with e-prescription systems |
| FR-15 | Branch-level data isolation | Implemented | Branch-bound accounts cannot switch; store rejects cross-branch requests | Server enforcement verification |
| FR-16 | Reversals excluded from revenue reporting | Implemented | Metrics filter completed receipts; register shows reversed status | Accounting-period closing rules |

## 6. Business rules

- Currency is PHP, rounded to centavos.
- VAT is 12% on regular sales; prices are treated as VAT-exclusive in the prototype.
- Senior/PWD sales receive a 20% statutory discount on the net subtotal and are VAT-exempt.
- Loyalty redemption occurs after VAT, is capped at 20% of the amount due, and is valued at ₱1 per point. Points accrue at one point per ₱50 of the final total.
- FEFO is mandatory: batches are consumed by ascending expiry; expired batches are never sellable. A sale that cannot be fully covered by unexpired stock is rejected.
- Prescription lines require explicit pharmacist confirmation.
- Card, e-wallet, and installment sales require a non-empty reference. Cash must cover the total.
- GRNs require an invoice number, one line per ordered item, a batch number, a future expiry, and a quantity between 1 and the ordered quantity.
- Only today's receipts may be voided; earlier receipts require a refund. Both require a reason of at least eight characters.
- Reversals restore the exact batch and reverse loyalty point movements.
- Stock counts require whole numbers, zero or more, per batch; each changed batch produces a movement and the net variance is audited.
- Supplier accreditation suspension blocks PO drafting and approval.

## 7. Non-functional requirements

| ID | Requirement | Status |
|---|---|---|
| NFR-01 | Responsive web interface usable at counter width | Implemented; visual review pending |
| NFR-02 | POS confirmation under 2 seconds | Target; untested |
| NFR-03 | 99.5% availability | Target; untested |
| NFR-04 | RTO 1 hour, RPO 4 hours, backups every 4 hours | Target; constants defined |
| NFR-05 | Offline sales survive a connection drop and sync once | Implemented in prototype storage |
| NFR-06 | Keyboard and screen-reader access with labelled controls | Designed in; no assisted-technology audit |
| NFR-07 | 80 mm receipt printing | Implemented via print stylesheet; hardware untested |
| NFR-08 | Audit retention of 10 years | Constant defined; not enforced |
| NFR-09 | No card data stored | Implemented; references only |
| NFR-10 | Synthetic data only in the demo | Implemented |

## 8. Assumptions and dependencies

- The demo runs on a modern Chromium-based browser with local storage available.
- Node.js 20+ and npm are available to build and serve the web client.
- Branch workstations use keyboard-wedge barcode scanners and 80 mm thermal printers.
- Production requires PostgreSQL, TLS, a secret manager, and an identity provider.
- The RFP's nine-month rollout, ₱6,144,000 one-time cost, ₱307,200 contingency, and ₱780,000 annual maintenance remain commercial inputs, not implementation evidence.

## 9. Acceptance boundaries

The prototype demonstrates workflow correctness and permission behaviour. It does not demonstrate concurrency, availability, recovery, regulatory certification, or payment settlement. Acceptance for production requires the remaining gaps in §5 to be closed and the NFR targets in §7 to be measured.

See `PROJECT_DOCUMENT.md` for the full system description and `RFP_COMPLIANCE_MATRIX.md` for the item-by-item response.
