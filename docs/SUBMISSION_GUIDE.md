# WellSpring One — User Guide and Walkthrough

This guide walks through the rebuilt browser prototype. It assumes the demo data has not been reset; if screens look different, use **Offline & sync → Reset demo data**.

## 1. Before you start

```bash
npm ci
npm run dev --workspace=@wellspring/web -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. Node.js 20+ is required. No database is needed for the prototype.

Password for all seeded accounts: `password123`.

| Account | Role | Branch |
|---|---|---|
| `admin@wellspring.ph` | System administrator | All branches |
| `ho.manager@wellspring.ph` | Head-office manager | Head office |
| `branch1.mgr@wellspring.ph` | Branch manager | WS01 |
| `cashier1@wellspring.ph` | Cashier | WS01 |
| `pharmacist1@wellspring.ph` | Pharmacist | WS02 |
| `inventory1@wellspring.ph` | Inventory staff | WS03 |
| `purchasing1@wellspring.ph` | Purchasing officer | WS01 |
| `supervisor1@wellspring.ph` | Store supervisor (inactive in the seed) | WS05 |

Demo data is synthetic and stays in this browser. **Offline & sync** can clear it.

## 2. Landing page and sign-in

The public page at `/` introduces the system, shows a register sample, lists capabilities and the eight branches, and states the prototype boundaries. Choose **Open prototype** or **Staff sign in**.

Sign-in accepts a seeded account or a browser-only demo account. Demo sign-up creates a cashier profile and is not production authentication. The link **Back to overview** returns to the landing page.

## 3. Shell and branch switching

- The sidebar shows only pages your role can use.
- The header shows the active branch and register. Head-office and administrator accounts get a branch dropdown; branch-assigned accounts see a fixed label.
- The Wi-Fi button simulates losing or restoring the connection. Queued sales are counted beside it.
- **Returns & voids** is available to every role that can read sales; the actions inside depend on permissions.

## 4. Dashboard

The dashboard summarises the active branch: today's revenue, transactions, sellable units, low-stock count, a seven-day revenue chart, stock by category, recent receipts, stock/expiry attention, and fast-moving products.

For head-office accounts, **Today across the network** ranks all eight branches by revenue and offers **Open** to switch branch. Revenue excludes voided and refunded receipts.

## 5. Point of sale

1. **Scan or search.** Place the cursor in **Scan barcode**, scan, or type a barcode and press Enter. Try `4801234500043` (Bioflu). Typing a name or SKU into the product finder also works.
2. **Adjust the cart.** Use −/+ or type a quantity. The maximum is the unexpired sellable quantity at that branch. Each line shows the batch that FEFO will use.
3. **Choose the customer.** Senior and PWD remove VAT and apply 20%. Loyalty asks for an 11-digit mobile number; try `09171234567` (Maria Santos, 148 points). Unknown numbers can be enrolled inline.
4. **Redeem points.** Enter a value up to the displayed maximum; redemption is capped at 20% of the amount due.
5. **Choose payment.** Cash computes change. Card, e-wallet, and installment require a reference; installment expects the finance agreement number.
6. **Confirm prescriptions.** An Rx line requires the pharmacist checkbox.
7. **Charge.** The receipt appears above the grid with batch lines, discounts, VAT, payment, and points. **Print receipt** uses the 80 mm layout.

Offline mode: complete a sale and it is queued. Reconnect from the header and use **Offline & sync → Synchronize** to upload once.

## 6. Inventory

- Summary cards show sellable units (expired units excluded), stock at cost, products at reorder point, and any batch expiring within 90 days.
- **View batches** expands a product into its batch ledger with expiry and quantity.
- **Count / adjust** opens the per-batch count form. Enter the counted quantity for each batch, choose a reason, and save. Each changed batch writes a movement and the audit trail records the variance.
- The movement table lists sales, GRN receipts, returns, and adjustments with batch and actor. It is scoped to the active branch.

## 7. Purchasing and receiving

1. **New purchase order** (purchasing officer): choose an accredited supplier, product, quantity, unit cost, and expected date. Save as draft.
2. **Approve & send** (branch/head-office manager): the PO moves to sent.
3. **Receive goods** (inventory staff or purchasing officer): enter the supplier invoice number and optional notes. For each line, enter the batch number, expiry date, and received quantity.
4. **Post goods receipt.** Stock increases, the batch merges or is created, the PO becomes received, and the GRN number is audited.
5. Expand a received order to see its GRN, invoice, receiver, batch lines, and notes.

The supplier dropdown lists accredited suppliers only. A suspended supplier is rejected at drafting and approval.

## 8. Suppliers

Cards show contact, payment terms, lead time, rating, notes, order count and value, and last delivery. Use the search or **Accredited only** filter. Purchasing officers can **Suspend** or **Restore** accreditation; suspension blocks new orders and writes an audit entry.

## 9. Returns and voids

1. Find a receipt by number, cashier, or customer, or filter by status.
2. Choose **Review**.
3. Enter a specific reason (at least eight characters).
4. **Void this receipt** is available for today's completed receipts with `sales:void`.
5. **Refund** is available with `sales:refund` for any completed receipt and records the amount.

Both restore the original batches, reverse loyalty points, and write to the reversal audit trail shown below the register.

## 10. Reports

- Choose **This branch** or **All branches** (consolidated permission).
- Choose today, last seven days, or all demo sales.
- Revenue, average sale, units, and discounts exclude reversed receipts; the register still shows them with their status.
- **Export CSV** writes the current view, including branch, status, and loyalty discount.

## 11. Offline and synchronization

The page shows connection state, queue count, queued receipts, and last sync time. **Go offline** (or the header button) forces new sales into the queue. **Synchronize** requires a connection, flips queued receipts to synced, clears the queue, and writes an audit entry. **Reset demo data** restores branches, products, suppliers, receipts, orders, and users.

## 12. Administration

Administrators can create staff accounts (name, email, role, branch), activate or deactivate accounts, and review the audit log. Self-deactivation is blocked. Deactivation writes an audit entry.

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No products at the branch | Branch switched to one without stock? | Switch back to WS01 or reset demo data |
| Scan does nothing | Barcode not in the active branch's catalogue | Use the product finder or check the branch |
| "Only N unexpired units…" | The cart exceeds sellable stock; expired batches are excluded | Reduce the quantity or receive new stock |
| Cannot send a PO | Supplier accreditation suspended or role lacks approval | Restore accreditation; sign in as a manager |
| Void unavailable | Receipt is from an earlier day or role lacks `sales:void` | Process a refund as a supervisor/manager |
| Loyalty lookup fails | Number not enrolled or fewer than 11 digits | Enrol inline or use `09171234567` |
| Print layout includes the app | Browser print styles blocked | Print from the receipt's Print button and enable background graphics |

## 14. Verification summary

- TypeScript: 0 errors.
- Unit tests: 27 passed (sales, inventory/FEFO, dashboard, demo auth).
- Production build: passed.
- Lint: 0 errors.

Not verified: PostgreSQL runtime, scanner hardware, physical printer output, load/availability targets, and assisted-technology review. Full detail is in `PROJECT_DOCUMENT.md` §11.
