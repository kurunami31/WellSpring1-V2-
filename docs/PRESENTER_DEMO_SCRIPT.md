# WellSpring One — Presenter and Live-Demo Script

**Deck:** `WELLSPRING_ONE_DEFENSE.pptx`  
**Target:** 8–10 minutes, including a short evidence-focused live moment  
**Administrator:** `admin@wellspring.ph` / `password123`  
**URL:** `http://127.0.0.1:5173`

## 1. Before the defense

1. Use Node.js 20+, run `npm ci`, then start the browser prototype with:
   ```bash
   npm run dev --workspace=@wellspring/web -- --host 127.0.0.1
   ```
2. Open an isolated browser profile. Do not enable API mode.
3. Sign in as administrator, open **Offline & sync**, and reset demo data.
4. Verify Dashboard, POS, Inventory, Purchasing, Reports, and Offline & sync open.
5. Keep the PDF deck and screenshots available as a no-server fallback.
6. Do not enter real personal, patient, payment, or company data.

**Timing strategy:** The talk track below is approximately 8 minutes 25 seconds. Use the optional 60-second live moment on Slide 6 for a total near 9 minutes 25 seconds. If time is tight, stay on the captures; do not improvise extra workflows.

## 2. Slide-by-slide talk track

### Slide 1 — WellSpring One | 0:30

“WellSpring One is a pharmacy operations prototype that brings sales, inventory, purchasing, reporting, and an offline workflow into one coherent workstation. I will show what works in the browser, then separate that evidence from the backend source and the production work still required.”

**Transition:** “The design starts with the operational dependency behind every sale.”

### Slide 2 — The operational gap | 0:45

“A pharmacy sale affects more than revenue. Stock must change, purchasing must see what is running low, and managers need the same transaction history. When these records are disconnected, staff reconcile them manually and decisions arrive late. WellSpring One addresses that shared operational story rather than treating POS as an isolated screen.”

**Transition:** “The prototype organizes that story into four daily capabilities.”

### Slide 3 — One shared operational story | 0:45

“From one login, an authorized user can sell and print, count and replenish, approve and receive, and report and audit. This dashboard is not a static mock-up: its metrics and alerts derive from the same local demo records used by the other pages. The important qualifier is ‘local’; this is not yet a centralized eight-branch database.”

**Transition:** “The clearest example is checkout.”

### Slide 4 — A checkout that updates the operation | 1:10

“In this captured transaction, two Paracetamol and one alcohol move through cart, payment, receipt, and stock update. Receipt WS-2026-01009 records the sale. Paracetamol falls from 184 to 182, and alcohol from 64 to 63. That demonstrates the intended sale-to-stock relationship, including one-time deduction. It does not prove concurrent tills, payment-provider settlement, or accounting integration.”

**Optional pointer:** Indicate the receipt and the two stock figures; do not read every screen label.

**Transition:** “The same recordkeeping continues into inventory and supply.”

### Slide 5 — Stock and supply stay connected | 0:50

“Inventory supports search, low-stock and expiry filters, valuation, and physical counts with a reason. Purchasing uses a role handoff: purchasing drafts, a manager approves, and purchasing or inventory receives. Receiving updates local stock. Multi-line seeded orders are visible, although the new-order form creates one line. Partial receiving, supplier maintenance, and automatic multi-batch FEFO remain outside the browser demo.”

**Transition:** “The offline workflow uses the same shared state, with an important boundary.”

### Slide 6 — Offline continuity, honestly labeled | 1:00 + optional 1:00 live

“When the user simulates offline mode, a sale is saved and queued in this browser, and stock is deducted immediately. After the user restores the simulated connection and selects Sync, the queue clears without a second stock deduction. This demonstrates state handling and duplicate-deduction prevention in the prototype. It is not real server synchronization: there is no connectivity detection, server acknowledgement, conflict resolution, or central upload.”

**Optional 60-second live moment:**
1. Show the pending entry in `11-offline-pending.png` or the already prepared Offline & sync page.
2. State the product quantity before restoring the connection.
3. Restore online, select **Sync now**, and show the cleared queue and unchanged quantity.
4. Stop there; do not claim a network upload occurred.

**Transition:** “That distinction reflects the wider architecture.”

### Slide 7 — Two layers, not one integrated system | 1:00

“The repository has two layers. The React browser demonstrates operational workflows with localStorage. Separately, Express, Prisma, and PostgreSQL implement 62 API handlers plus health in source. API mode changes authentication only; it does not move POS or inventory onto the database. PostgreSQL runtime integration was not verified in this environment. Presenting these as one deployed system would be inaccurate.”

**Transition:** “The test report follows the same evidence standard.”

### Slide 8 — Evidence, not assumptions | 0:55

“All 25 discovered unit tests passed: 21 in the web workspace and four in the API. API, web, and shared builds passed, web lint passed, and twelve final screens were captured. But root lint is not green because API and shared lint configuration is missing, the shared workspace has no test script, and the dependency audit reports fourteen findings. These are recorded handover items, not hidden behind a success claim.”

**Transition:** “Those findings define the route to production.”

### Slide 9 — The path from prototype to production | 0:55

“The first gate is stabilization: migrations, reproducible CI, complete lint and tests, and dependency remediation. The second is integration: one server-backed operational data path, strong action and branch authorization, consistent tax rules, and idempotent offline commands. The third is proof: eight-branch acceptance, recovery exercises, compliance review, and measured performance, availability, synchronization, and backup targets. None of those production claims is made today.”

**Transition:** “The value of the submission is both the workflow and the clarity of its next step.”

### Slide 10 — One coherent workflow. A clear next step. | 0:35

“WellSpring One demonstrates a usable pharmacy workflow, supports it with transparent evidence, and documents the remaining integration and production gates. The next step is not more screens; it is a secure shared data path, proven end to end. Thank you. I can now answer questions or walk through a specific workflow.”

## 3. Questions to expect

### “Is this already connected to PostgreSQL?”

“No. The browser workflows use localStorage. Express/Prisma/PostgreSQL source exists, but operational browser pages are not wired to it, and database runtime verification remains open.”

### “Does offline mode really synchronize?”

“Not to a server. The demonstrated queue is a manual local simulation. It proves local queue/state behavior and once-only stock deduction; durable upload, idempotent acknowledgement, and conflict handling are future integration work.”

### “What was actually tested?”

“Twenty-five discovered unit tests, three workspace builds, web lint, earlier login/responsive browser checks, and captured local sale/offline workflows. Root lint and clean root test execution have documented workspace issues. Database, concurrency, load, security, and production NFR tests remain unexecuted.”

### “Can different branches use it now?”

“Not as a centralized system. Each browser profile has its own demo state. Eight-branch consolidation is a production target requiring the shared backend, authorization verification, reconciliation, and UAT.”

### “What is the highest-risk next task?”

“Establish the server-backed operational path safely: action- and branch-specific authorization, consistent tax calculations, audit redaction, idempotent sync, migrations, and integration tests must come before exposure or scale.”

### “Why are there dependency findings?”

“The current lockfile reports fourteen findings. They are disclosed rather than hidden. Remediation should be deliberate, with compatibility testing and CI verification, rather than a blind force upgrade during the submission.”

## 4. Fallback demo without a running server

Use Slides 3–6 and the files under `docs/screenshots`:

1. Dashboard: `03-dashboard.png`
2. Checkout and receipt: `04-pos-checkout.png`, `05-receipt.png`
3. Inventory and purchasing: `06-inventory.png`, `07-purchasing.png`
4. Reports: `08-reports.png`
5. Offline pending: `11-offline-pending.png`

Say: “These are fresh isolated-profile captures of the browser prototype. They demonstrate the local workflow; they are not recordings of a deployed multi-branch service.”

## 5. Demonstration do / do not

| Do | Do not |
|---|---|
| Reset demo data before a repeatable run | Use real credentials or patient data |
| Describe localStorage and manual sync precisely | Say “cloud synced,” “production ready,” or “BIR certified” |
| Use the captured receipt as concrete evidence | Treat sample sales as business performance |
| Show role handoff only if time allows | Attempt database setup during the defense |
| Refer detailed API questions to the technical guide | Claim unexecuted tests or RFP targets passed |
