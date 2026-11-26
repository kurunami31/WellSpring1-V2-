# WellSpring One — 10-Slide Defense Presentation

**Target length:** 8–10 minutes  
**Format:** 16:9, editable PowerPoint with speaker notes  
**Design:** Ocean title fields, mint accents, warm white content, Arial, real WellSpring UI captures  
**Companion:** [Presenter and live-demo script](PRESENTER_DEMO_SCRIPT.md)

## Slide 1 — WellSpring One

**Subtitle:** One workstation for pharmacy sales, stock, and supply  
**Supporting line:** Functional browser prototype · Systems Integration and Architecture  
**Footer:** WS01 · Davao Main | November 2026  
**Visual:** Ocean cover with a cropped dashboard workstation and a small “functional prototype” label.

## Slide 2 — The operational gap

**Headline:** A sale is never just a sale.  
**Three points:**
- Stock must change immediately.
- Purchasing must respond to what is running low.
- Managers need the same transaction story.

**Closing line:** Disconnected records create reconciliation work and delayed decisions.  
**Visual:** Sales → stock → purchasing → management chain with a highlighted break between separate records.

## Slide 3 — One shared operational story

**Headline:** From login to decision, each module uses the same local demo state.  
**Four capabilities:**
- Sell and print
- Count and replenish
- Approve and receive
- Report and audit

**Footer label:** DEMONSTRATED · browser prototype  
**Visual:** Dashboard capture with four concise capability callouts.

## Slide 4 — A checkout that updates the operation

**Headline:** Cart → receipt → stock movement  
**Evidence:**
- Receipt `WS-2026-01009`
- Paracetamol: **184 → 182**
- Alcohol: **64 → 63**

**Footer label:** OBSERVED · one captured local transaction  
**Visual:** POS checkout beside the receipt, with the stock-change figures as the dominant evidence.

## Slide 5 — Stock and supply stay connected

**Headline:** Count what is on hand. Receive what was ordered.  
**Two workflows:**
- Inventory: filters, valuation, expiry watch, reasoned physical counts.
- Purchasing: draft → manager approval → receive → stock update.

**Footer label:** DEMONSTRATED · role-aware local workflows  
**Visual:** Inventory and purchasing captures in a balanced two-column layout.

## Slide 6 — Offline continuity, honestly labeled

**Headline:** Save locally. Deduct once. Sync on command.  
**Flow:** Simulate offline → save sale + queue → restore connection → select Sync  
**Boundary:** Local simulation only — no server upload or conflict resolution.  
**Footer label:** DEMONSTRATED · manual browser queue  
**Visual:** Four-state offline flow plus the pending-queue capture.

## Slide 7 — Two layers, not one integrated system

**Headline:** The browser demo and PostgreSQL API are separate today.  
**Left layer:** React + localStorage; operational pages demonstrated locally.  
**Right layer:** Express + Prisma + PostgreSQL; 62 API handlers plus health in source.  
**Bridge:** API mode changes authentication only. Operational integration remains future work.  
**Footer label:** SOURCE-VERIFIED · database runtime unverified  
**Visual:** Split architecture diagram with a deliberately broken/unconnected bridge.

## Slide 8 — Evidence, not assumptions

**Headline:** What passed — and what did not.  
**Metrics:**
- **25** discovered unit tests passed: 21 web + 4 API
- **3** workspace builds passed
- **12** final screens captured

**Qualification:** Web lint passed. Root lint is not green; API/shared config is missing.  
**Risk:** 14 dependency findings: 4 moderate · 8 high · 2 critical  
**Footer:** PostgreSQL integration, load, security, and production NFRs remain unverified.  
**Visual:** Three large evidence numbers with a clearly separated qualification band.

## Slide 9 — The path from prototype to production

**Headline:** Integrate safely before scaling widely.  
**Three stages:**
1. **Stabilize:** migrations, clean CI, lint, dependency remediation.
2. **Integrate:** server-backed operations, RBAC/branch isolation, idempotent offline sync.
3. **Prove:** eight-branch UAT, recovery, compliance, and PR-01–PR-06 measurements.

**Closing line:** No production-readiness claim is made today.  
**Visual:** Three gated milestones with explicit exit evidence.

## Slide 10 — One coherent workflow. A clear next step.

**Takeaways:**
- A usable pharmacy operations prototype
- Transparent evidence and documented boundaries
- A practical path to a shared, production-ready system

**Closing line:** WellSpring One makes the daily workflow visible — and the remaining integration work explicit.  
**Visual:** Ocean closing field, small product montage, repository and documentation pointers.
