# WellSpring One — Test Plan and QA Evidence

**Version:** 1.0 submission baseline  
**Review date:** November 26, 2026  
**Scope:** Demonstrated React browser prototype, separately implemented Express/Prisma API, and production acceptance planning  
**Status:** Local prototype evidence recorded; PostgreSQL integration and production acceptance remain unverified

> **Evidence boundary.** Browser operations use device/profile-specific `localStorage`. `VITE_USE_API=true` changes authentication only; it does not move POS, inventory, purchasing, reports, administration, dashboard, or Offline/Sync operations to PostgreSQL. A passed local check is not evidence of centralized, secure, compliant, or production-ready operation.

## 1. Objectives

This plan provides reproducible checks for the submitted prototype and a controlled route to production acceptance. It is intended to:

- preserve the exact distinction between observed behavior, source review, prepared tests, and production targets;
- verify the critical sale → receipt → stock relationship without claiming concurrency or accounting proof;
- exercise role handoff, local offline behavior, responsive layouts, and receipt output with synthetic data;
- identify the integration, security, performance, recovery, compliance, and eight-branch evidence still required; and
- prevent an unexecuted case from being reported as a pass.

## 2. Evidence legend and test status

| Label | Meaning |
|---|---|
| **Passed — recorded** | Executed in the submission environment with the result stated in Section 4 |
| **Demonstrated — captured** | Observed in an isolated browser profile and supported by screenshots or recorded check counts |
| **Source finding** | Code inspection identified a behavior or risk; runtime exploit/integration proof was not performed |
| **Ready to run** | Procedure is defined but not executed in this submission |
| **Blocked** | A required service, migration baseline, provider, hardware model, or acceptance environment is unavailable |
| **Production target** | RFP/non-functional acceptance evidence required before release |

Test records must include build/commit identifier, date, environment, tester, data reset method, expected/actual result, evidence link, and defect references. Screenshots alone do not prove security, durability, concurrency, or compliance.

## 3. Scope and test environments

### 3.1 Included in local prototype verification

- Seeded sign-in, local cashier signup, responsive authentication, and route/action visibility;
- Dashboard derivations and local sales reporting;
- POS product search, cart, payment/reference validation, prescription attestation, totals, receipt, and one-time stock deduction;
- Inventory filtering, valuation, expiry indicators, and reasoned physical-count adjustment;
- One-line new purchase orders, manager approval, full receiving, and local stock updates;
- Local staff/audit administration, manual offline queue, explicit Sync, and demo reset;
- Web/API unit tests, TypeScript builds, web lint, and dependency-audit disclosure.

### 3.2 Excluded from claimed passing evidence

- PostgreSQL migrations, seed execution, database persistence, and API runtime workflows;
- Server-backed operational browser pages, multi-client consistency, eight-branch consolidation, and accounting reconciliation;
- Real payment, accounting, hardware, RFID, notification, or deployment-provider integration;
- Automatic connectivity detection/upload, idempotent server replay, conflict resolution, and retry recovery;
- Production security, privacy/BIR certification, load, availability, backup/restore, RTO, and training acceptance.

### 3.3 Environment record

| Item | Submission baseline |
|---|---|
| Runtime requirement | Node.js 20 or later and npm workspaces |
| Browser demonstration | Modern browser, JavaScript and `localStorage` enabled, isolated profile |
| URL / branch | `http://127.0.0.1:5173`; WS01 · Davao Main |
| Administrator | `admin@wellspring.ph` / `password123` — synthetic local demo only |
| Browser storage | `wellspring-prototype-v1`, `wellspring-demo-accounts-v1`, `wellspring-demo-session` |
| Visual evidence | 12 final PNG captures under `docs/screenshots` |
| Database | PostgreSQL unavailable for final QA; no runtime result claimed |
| Versions not preserved | Exact browser, OS, Node/npm, and dependency versions must be recorded on the next run rather than inferred |

Do not enter real patient, customer, employee, payment, or company data. Reset **Offline & sync → Reset demo data** before a repeatable operational run; clear site data for a completely fresh identity/session profile.

## 4. Recorded verification results

| Check | Recorded result | Evidence and limitation |
|---|---|---|
| Web unit tests | **Passed — 21/21**, 3 files | Sales calculations, dashboard derivations, local signup/login; not end-to-end server tests |
| API unit tests | **Passed — 4/4**, 2 files | JWT identity/malformed token and shared permission examples only |
| Production builds | **Passed** for API, web, shared | TypeScript/build verification only |
| Web ESLint | **Passed** | `apps/web/src` only |
| Root test command | API/web tests complete; shared reports **no test script** | Root command is not a clean all-workspace pass |
| Root lint command | **Failed** | API/shared ESLint configuration is missing |
| Authentication browser checks | **16/16 passed** in earlier browser QA | Prototype checks; exact environment versions not retained |
| Responsive browser checks | **28/28 passed** in earlier browser QA | Selected pages/device sizes; not a complete compatibility matrix |
| Captured sale | Receipt `WS-2026-01009`; Paracetamol **184 → 182**, alcohol **64 → 63** | One isolated local transaction; no concurrency/payment/accounting claim |
| Offline behavior | Pending local sale captured; queue/stock workflow observed | Manual local simulation; no server acknowledgement |
| Dependency audit | **4 moderate, 8 high, 2 critical** findings | `npm audit --json`; no blind force remediation applied |
| PostgreSQL/API integration | **Not executed / blocked** | No PostgreSQL runtime, migrations, seed, or API workflow evidence |

## 5. Reproducible local commands

Run from the repository root after installing Node.js 20+:

```bash
npm ci
npm test --workspace=@wellspring/web
npm test --workspace=@wellspring/api
npm run build --workspace=@wellspring/shared
npm run build --workspace=@wellspring/api
npm run build --workspace=@wellspring/web
npm run lint --workspace=@wellspring/web
npm run dev --workspace=@wellspring/web -- --host 127.0.0.1
```

Useful aggregate/diagnostic commands, with known qualifications:

```bash
npm test          # API/web run; shared currently reports no test script
npm run build     # all workspaces
npm run lint      # expected to fail until API/shared lint configuration is fixed
npm audit --json  # record and review; do not apply an unreviewed force fix
```

A future clean CI gate must run installation, lint, unit tests, builds, database integration tests, and artifact checks on a documented commit. The checked-in CI currently uses pnpm without a pnpm lockfile; its Web Tests job builds but does not run web tests, and staging deployment is an echo placeholder.

## 6. Functional manual test cases

Unless a recorded result is stated, these cases are **ready to run** on a fresh local profile. Record actual results rather than marking the table preemptively.

| ID | Requirement / area | Procedure and expected result | Submission status |
|---|---|---|---|
| M-01 | FR-08 · seeded login | Sign in with each seeded authorized identity. Expect the correct display identity and role-aware landing page; invalid credentials produce an error. | Partial recorded coverage; 16/16 earlier login checks |
| M-02 | FR-08 · local signup | Create a unique demo account with matching 8+ character passwords. Expect a browser-only cashier at WS01; sign out/in using different email casing. | Web unit coverage; rerun manually for release evidence |
| M-03 | FR-08 · authorization | Attempt disallowed routes/actions as cashier, purchasing, pharmacist, and branch manager. Expect navigation/action restrictions. | Source/browser behavior; not a backend security test |
| M-04 | Dashboard | Complete a known sale and compare revenue, transaction count, stock units, trend, fast movers, alerts, and recent receipts before/after. | Dashboard unit derivations passed; full manual reconciliation ready |
| M-05 | FR-01 · cash sale | Add available products, select Exact amount, charge, and verify receipt, change, sale record, and once-only stock deduction. | Captured local transaction; receipt WS-2026-01009 |
| M-06 | FR-01 · payment validation | Test insufficient cash, blank card/e-wallet reference, and installment agreement. Expect validation; do not expect provider authorization. | Ready to run; providers not integrated |
| M-07 | FR-13 · discount/tax | Compare regular and senior/PWD carts, including item discount, VAT removal, and receipt rounding. Reconcile against an approved statutory rule. | Browser unit coverage; frontend/API rules differ |
| M-08 | FR-02 · prescription/receipt | Add prescription merchandise without attestation; expect a block. Attest, complete sale, print to PDF at 80 mm, and inspect required demo fields. | Receipt captured; regulatory compliance not tested |
| M-09 | FR-01/FR-03 · stock boundaries | Try zero, negative, fractional, and above-stock quantities. Expect rejection and no partial sale/stock update. | Ready to run |
| M-10 | FR-03/FR-05 · inventory | Filter low/out/expiry states, enter a nonnegative count and reason, save, and reconcile stock, movement, valuation, and audit event. | Local behavior implemented; fresh end-to-end record required |
| M-11 | FR-06 · purchasing handoff | Purchasing drafts a one-line PO; branch/head-office manager approves; purchasing/inventory receives. Expect DRAFT → SENT → RECEIVED and full stock addition. | Local behavior implemented; fresh role-handoff record required |
| M-12 | FR-06 · receiving boundaries | Attempt approval without a manager, receive twice, and request partial/discrepant receiving. Expect role controls; document that partial/discrepant UI is absent. | Ready to run; repeated-receive guard requires explicit verification |
| M-13 | FR-07 · reports | Compare today/seven-day/all filters and CSV rows/amounts with the local transaction register. Expect selected local records only. | Ready to run; no consolidated eight-branch claim |
| M-14 | FR-12 · administration/audit | Add and activate/deactivate a local staff-table record; inspect audit events and read-only branch-manager behavior. | Ready to run; records are not working credentials |
| M-15 | FR-10 · offline sale | Simulate offline, complete a sale, and verify receipt, local stock deduction, and pending queue entry. | Demonstrated/captured locally |
| M-16 | FR-10 · explicit Sync | Restore the simulated connection, select Sync, and verify cleared queue with unchanged stock. Then reset and verify baseline restoration. | Demonstrated locally; no server upload |
| M-17 | FR-10 · interruption | Reload or close/reopen during pending offline state; verify persistence and document any loss/duplication. | Ready to run; not durability proof |
| M-18 | NFR-09 · responsive UI | Repeat core navigation and POS at agreed desktop/tablet/mobile sizes; check overlay, switcher, tables, dialogs, focus, and horizontal overflow. | 28 earlier checks passed; matrix/version record open |
| M-19 | FR-11 · scanner/receipt hardware | On named branch hardware, test full/invalid barcode input, focus, 80 mm printer, cash drawer if supported, and reprint. | Blocked by hardware; RFID not implemented |
| M-20 | FR-02 · void/refund | Verify browser feature absence, then test future API permissions, reasons, stock/accounting reversal, serial preservation, and audit. | API source only; runtime blocked |
| M-21 | FR-04 · batch/FEFO | Create multiple unexpired/expired batches and concurrent sales; require earliest eligible batch allocation and no expired issue. | Blocked; automatic FEFO not demonstrated |
| M-22 | FR-09 · accounting | In a vendor sandbox, reconcile sales, VAT, payables, retries, duplicates, and failed delivery with the accounting system. | Blocked; no vendor contract/client |

## 7. API, database, and integration test gate

The following procedures are **ready to run but unexecuted**. Do not run them against a shared or production database.

1. Create an isolated PostgreSQL database and secret-safe `.env` from the example file.
2. Establish a versioned migration baseline; `db:push` is acceptable only for disposable development setup, not migration evidence.
3. Generate the Prisma client, apply migrations, seed representative data, and record row counts and referential checks.
4. Start API and verify `/health` separately from an actual database-health query.
5. Exercise authentication, refresh/me/session restoration, inactive-user denial, password change, and logout behavior.
6. Run one vertical slice: authenticate → read catalog → create sale → read receipt → verify stock/audit after restart.
7. Repeat with two clients and explicit branch credentials to verify fresh shared state and cross-branch denial.
8. Test transactional rollback for stock, sale, purchasing, transfer, and audit failures.
9. Replace simulated offline completion with durable commands and test unique idempotency, replay, conflicts, expired sessions, and interrupted upload.

Required integration cases include action-specific RBAC for every mutation, object-level branch predicates, product mutation denial under read-only permission, GRN-to-batch/stock posting, stock-count variance approval, consistent senior/PWD calculations, redacted audit payloads, and idempotent sync replay.

## 8. Security, accessibility, and resilience testing

### 8.1 Security — ready to run after remediation

- Map every API route/method to allowed roles and branch scope; test vertical and horizontal privilege escalation.
- Verify secrets, passwords, tokens, patient/customer fields, and authorization headers never enter logs, audit JSON, CSV, screenshots, or committed files.
- Test malformed/expired tokens, inactive users, session expiry, CORS, rate limits, validation boundaries, and content-security/security headers.
- Review audit completeness and tamper detection under failed writes, clock drift, privileged access, retention, and export.
- Scan dependencies in an isolated change branch; remediate deliberately and rerun all tests/builds instead of applying `npm audit fix --force` blindly.
- Conduct an authorized dynamic assessment only against an isolated test deployment. No exploit was executed for this submission.

### 8.2 Accessibility and usability — ready to run

Use keyboard-only navigation, visible focus, logical dialog focus/return, screen-reader names/roles/states, form error association, 200% zoom, reduced motion, touch targets, and automated WCAG 2.2 AA scanning followed by manual verification. Confirm receipt and charts remain understandable without color alone. No accessibility conformance claim is made from the existing responsive checks.

### 8.3 Resilience and recovery — production targets

Inject API/database/network interruption during sale, receiving, and sync; confirm no duplicate sale/stock movement and a recoverable user state. Exercise backup integrity, restore, rollback, disaster declaration, and reconciliation in an authorized isolated environment.

## 9. Non-functional acceptance matrix

| ID | Acceptance method | Current status |
|---|---|---|
| **PR-01** | Measure production-path checkout submission to confirmed receipt; document data/network/provider conditions, sample size, and p50/p95/p99. Mandatory acceptance samples must meet the agreed **under 2 seconds** criterion. | Not verified; artificial login delay is not a POS benchmark |
| **PR-02** | Run at least **50 concurrent users per branch**, then the agreed eight-branch profile, with sales/stock/report workload, error ceiling, and reconciliation. | Not verified |
| **PR-03** | Monitor agreed business hours over an approved production window; calculate available minutes / total minutes ≥ **99.5%**. | Not verified |
| **PR-04** | Measure nightly eight-branch start to acknowledged/reconciled completion within **60 minutes**, with no unresolved conflict. | Not verified; manual local queue only |
| **PR-05** | Inspect at least 48 hours of scheduler/logs, prove no backup gap exceeds **4 hours**, validate integrity, and restore a copy. | Not implemented/proven; placeholder endpoint is insufficient |
| **PR-06** | Conduct an isolated recovery exercise from failure declaration to validated restored service within **1 hour RTO**. | Not verified |
| **NFR-07** | Enforce and scan HTTPS/TLS for external access and remote administration; reject plaintext credentials. | Production target; local HTTP only |
| **NFR-08** | Complete privacy/BIR data and receipt reviews, retention/access/incident procedures, and formal sign-off. | Not assessed or certified |
| **NFR-09** | Publish and pass a named current OS/browser/device support matrix. | Partial prototype checks only |
| **NFR-10** | Reconcile independent physical counts by SKU/batch/branch using a documented formula; achieve ≥ **98%** at eight branches. | Not verified |
| **NFR-11** | Retain attendance and role-based assessment evidence for ≥ **90%** of intended users before full rollout. | Production target |
| **NFR-12** | Validate versioned API documentation against runnable integration examples and deliver editable English documentation. | Partial; source inventory/docs exist, no OpenAPI certification |

## 10. Requirement traceability and release gates

| Requirement group | Prototype evidence | Evidence still required |
|---|---|---|
| FR-01–FR-02 | Local payment selections, validation, receipt; API void/refund source | Providers, receipt compliance, void/refund runtime, accounting/audit reconciliation |
| FR-03–FR-06 | Local stock, alerts, counts, PO approval/receiving; broader API source | Central eight-branch state, multi-batch/FEFO, complete GRN/stock posting, concurrency |
| FR-07–FR-09 | Local reports, role-aware UI, API consolidated/report source | Runtime authorization, central dashboard, accounting integration |
| FR-10–FR-12 | Manual local queue, barcode text field, local/source audit records | Durable idempotent sync, scanner hardware, tamper-evident protected audit |
| FR-13 | Browser senior/PWD calculation and limited API points logic | Approved tax rule, promotions/loyalty lifecycle, frontend/backend reconciliation |
| PR-01–PR-06 | No production measurements | Independent performance, load, availability, sync, backup, and recovery evidence |

**Prototype demonstration entry criteria:** clean isolated profile, synthetic data, successful install/build, documented demo credentials, screenshots/PDF fallback, and explicit local-only narration.

**Production release exit criteria:** all mandatory shall requirements accepted; should items FR-10/FR-13 explicitly resolved; clean reproducible CI; no critical UAT defects; security/privacy/BIR approvals; eight-branch/accounting reconciliation; PR-01–PR-06 evidence; recovery/support/training approval; and rollback-ready deployment.

## 11. Known defect and risk register

| ID | Severity | Finding / required disposition |
|---|---|---|
| D-01 | Critical | Browser identity, operational data, local passwords, and audit are client-controlled; restrict to labeled synthetic demo and implement authoritative server controls |
| D-02 | High | Product mutations inherit `inventory:read`; sync lacks operation-specific RBAC |
| D-03 | High | Several direct-ID handlers do not visibly enforce returned-entity branch scope |
| D-04 | High | Sync `clientId` is not persisted/checked; replay may duplicate a sale |
| D-05 | High | Audit middleware lacks visible secret/sensitive-field redaction |
| D-06 | High | Frontend/API senior/PWD tax calculations differ; obtain compliance review |
| D-07 | High | API session restoration does not rehydrate a validated database identity |
| D-08 | Medium | GRN does not post stock/batches; large stock-count variance lacks approval endpoint |
| D-09 | Medium | Demo staff administration does not govern actual seeded login |
| D-10 | Medium | Offline wording must retain local-simulation meaning until real acknowledgement exists |
| D-11 | Medium | Root lint is not green; shared has no test script; CI package/test/deployment definitions are inconsistent |
| D-12 | High | Audit reports 4 moderate, 8 high, 2 critical dependency findings; remediate with compatibility review |
| D-13 | Blocker for integration | No migration directory or verified PostgreSQL runtime path is included |

Severity definitions: **Critical** = unsafe production trust boundary/data integrity exposure; **High** = release-blocking authorization, correctness, duplication, or sensitive-data risk; **Medium** = material incomplete workflow or quality-gate gap; **Blocker** = required environment/artifact prevents execution. Production UAT must have no open critical defects and an explicit buyer decision for every remaining high/medium item.

## 12. Handover QA checklist

- [ ] Record commit, Node/npm/browser/OS versions, tester, dates, and raw command output.
- [ ] Repeat clean `npm ci`, all lint/tests/builds, and retain logs without secrets.
- [ ] Re-run the local sale, inventory, purchasing, report, admin, and offline cases after a documented reset.
- [ ] Add a real browser automation suite with named projects, trace/video on failure, and CI execution.
- [ ] Establish migrations and PostgreSQL integration/security tests before wiring operational pages.
- [ ] Close or formally accept D-01–D-13; verify dependency remediation rather than suppressing audit output.
- [ ] Execute accessibility, hardware, integration, resilience, performance, backup/restore, and eight-branch UAT in approved environments.
- [ ] Preserve raw results alongside this plan; never change an unexecuted case to “passed” without reproducible evidence.
