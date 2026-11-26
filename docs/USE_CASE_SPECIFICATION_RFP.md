**DAVAO ORIENTAL STATE UNIVERSITY**

GUANG-GUANG, DAHICAN, MATI CITY, DAVAO ORIENTAL

**SYSTEM INTEGRATION & ARCHETECTURE 1**

<img src="docs\diagrams\use-case-media/media/image1.png" style="width:2.05in;height:1.94583in" />**(ITP 133)**

**USE CASE SPECIFICATION**

**Integrated Point-of-Sale, Inventory & Supplier Management System**

WellSpring Pharmacy & Retail Corp.

**Submitted by:**

Christopher Lyod B. Mercado

Frankie Dhon M. Pelayo

Mark Steven S. Punto\
Rick Lorenz T. Perez\
Asaph Andrie R. Ildefonso\
Mave M. Ancog\
John Lloyd B. Otero\
Jannel C. Pondoyo\
Erlyn A. Ongcoy\
Bianca Benaldo\
***Students***

Submitted to:\
Ms. Jessa May Condino\
***Instructor***

**December 11, 2026**

**Table of Contents**

1\. Introduction

2\. Actors

3\. Use Case Diagram

3.1 Use Case List

3.2 Relationships

4\. Detailed Use Case Specifications

5\. Basic, Alternative, and Exception Flows

6\. Business Rules and Conditions

7\. Use Case Diagram

# 1. Introduction

This document presents the use case specification for the Integrated Point-of-Sale, Inventory & Supplier Management System (called "WellSpring One") proposed for WellSpring Pharmacy & Retail Corp. The company operates eight branches across the Davao Region and currently uses standalone POS terminals, spreadsheets, and manual logs. This setup causes stockouts, expiry losses, slow purchasing, and delayed reporting.

The use case model below is based on the requirements stated in the Request for Proposal (RFP) issued on November 10, 2026. It identifies the actors who use the system, the use cases that describe what the system does, and the relationships between them. This document covers the four required deliverables: the use case diagram, its detailed specification, the basic, alternative, and exception flows, and the business rules and conditions.

# 2. Actors

Actors are the people or external systems that interact with WellSpring One. Primary actors start the use cases. Secondary actors are external systems that support them.

## 2.1 Primary Actors

| **Actor** | **Description** |
|----|----|
| Cashier | Processes sales, accepts payments, prints BIR-compliant receipts, and handles voids and refunds. |
| Store Supervisor | Approves overrides and discounts, monitors shift sales, and manages promotions and loyalty. |
| Inventory Staff | Handles stock counts, goods receiving, stock adjustments, batch and expiry tracking, and transfers. |
| Pharmacist | Validates prescriptions, dispenses controlled drugs, and ensures regulatory compliance. |
| Purchasing Officer | Manages suppliers, purchase orders, goods-received notes, and supplier invoices. |
| Branch Manager | Reviews branch performance, approves transfers and POs above threshold, and investigates shrinkage. |
| Head Office Manager | Views consolidated dashboards, analyzes trends across branches, and reviews compliance reports. |
| System Administrator | Manages users and roles, configures the system, monitors integration, and handles backups. |

## 2.2 Secondary Actors

| **Actor** | **Description** |
|----|----|
| Supplier | Receives purchase orders and delivers goods; provides invoices and price lists. |
| Accounting System | Receives sales, payables, and inventory valuation data through a REST API. |
| Payment Gateway | Authorizes debit/credit card and e-wallet payments. |

## 2.3 Actor Generalization

To keep the diagram clean, Cashier, Store Supervisor, Inventory Staff, and Pharmacist are treated as specialized types of Store User. Purchasing Officer, Branch Manager, and Head Office Manager are specialized types of Management User. System Administrator is a specialized type of Admin User.

# 3. Use Case Diagram

The use case diagram shows the system boundary "WellSpring One — POS, Inventory & Supplier Management System", the actors, the use cases, and the relationships. The actual screenshot is shown in Section 7. The use cases are grouped by functional area below.

## 3.1 Use Case List

### 3.1.1 Sales and POS

| **ID** | **Use Case** | **Primary Actor** | **Description** |
|----|----|----|----|
| UC-01 | Process Sale Transaction | Cashier | Ring up items, accept payment, print BIR-compliant receipt, apply discounts, and handle void/refund. |
| UC-02 | Manage Price Promotions & Loyalty | Store Supervisor | Create and manage promotions, discounts, loyalty points, and member pricing. |
| UC-03 | Process Prescription Sale | Pharmacist | Validate prescription, record dispensing, and enforce controlled drug rules. |

### 3.1.2 Inventory Management

| **ID** | **Use Case** | **Primary Actor** | **Description** |
|----|----|----|----|
| UC-04 | Track Real-Time Inventory | Inventory Staff | View real-time stock per branch, product, batch, and expiry. |
| UC-05 | Manage Batch & Expiry (FEFO) | Inventory Staff | Record batch and expiry, enforce FEFO issuing, and alert on near-expiry items. |
| UC-06 | Perform Stock Count & Adjustment | Inventory Staff | Conduct counts, record variances, and post adjustments with reason codes. |
| UC-07 | Process Stock Transfer | Inventory Staff / Branch Manager | Initiate, approve, and receive inter-branch transfers. |
| UC-08 | Manage Reorder Alerts | Inventory Staff / Purchasing Officer | Configure reorder points and receive alerts for low stock and near-expiry items. |

### 3.1.3 Purchasing and Supplier Management

| **ID** | **Use Case** | **Primary Actor** | **Description** |
|----|----|----|----|
| UC-09 | Manage Suppliers | Purchasing Officer | Maintain supplier data, price lists, lead times, and payment terms. |
| UC-10 | Create & Manage Purchase Orders | Purchasing Officer | Generate POs from alerts or manually, send to suppliers, and track status. |
| UC-11 | Process Goods-Received Note | Inventory Staff / Purchasing Officer | Record received goods against a PO, capture batch/expiry, and flag discrepancies. |
| UC-12 | Manage Supplier Invoices & Payables | Purchasing Officer | Match invoices to POs and GRNs and send payables to accounting. |

### 3.1.4 Reporting and Dashboards

| **ID** | **Use Case** | **Primary Actor** | **Description** |
|----|----|----|----|
| UC-13 | Generate Branch Sales Reports | Store Supervisor / Branch Manager | Daily sales, payment mix, void/refund log, and BIR report formats. |
| UC-14 | Generate Inventory Reports | Inventory Staff / Branch Manager | Stock-on-hand, movement, ageing, expiry, shrinkage, and valuation reports. |
| UC-15 | Generate Consolidated Dashboards | Head Office Manager | Multi-branch sales, margins, stock levels, and performance dashboards. |
| UC-16 | Integrate with Accounting System | System Administrator | Push sales, payables, and inventory valuation through REST API. |

### 3.1.5 User and Access Management

| **ID** | **Use Case** | **Primary Actor** | **Description** |
|----|----|----|----|
| UC-17 | Manage Users & Roles | System Administrator | Create accounts, assign roles, and enforce role-based access per branch. |
| UC-18 | Manage System Configuration | System Administrator | Configure tax, receipt format, reorder parameters, and backup schedules. |
| UC-19 | View Audit Trail | System Administrator / Branch Manager | View the tamper-evident log of transactions, user actions, and system events. |

### 3.1.6 Offline and Synchronization

| **ID** | **Use Case** | **Primary Actor** | **Description** |
|----|----|----|----|
| UC-20 | Operate Offline & Synchronize | Cashier / Inventory Staff | Continue operations during outages and auto-sync with conflict resolution when restored. |

## 3.2 Relationships

The following \<\<include\>\>, \<\<extend\>\>, and generalization relationships are defined.

### 3.2.1 \<\<include\>\> Relationships

| **Base Use Case** | **Included Use Case** | **Reason** |
|----|----|----|
| UC-01 | UC-02 | Promotions and loyalty are evaluated during every sale. |
| UC-01 | UC-03 | Prescription validation is included when a prescription item is scanned. |
| UC-01 | UC-19 | Every transaction writes to the audit trail. |
| UC-04 | UC-05 | Batch and expiry tracking is part of inventory tracking. |
| UC-06 | UC-19 | Stock adjustments write to the audit trail. |
| UC-07 | UC-19 | Stock transfers write to the audit trail. |
| UC-10 | UC-08 | PO creation may come from a reorder alert. |
| UC-11 | UC-05 | GRN captures batch and expiry data. |
| UC-11 | UC-19 | GRN posts to the audit trail. |
| UC-12 | UC-16 | Payables are pushed to the accounting system. |
| UC-13 | UC-19 | Report generation is logged. |
| UC-14 | UC-19 | Report generation is logged. |
| UC-15 | UC-19 | Dashboard access is logged. |
| UC-16 | UC-19 | Integration events are logged. |
| UC-17 | UC-19 | User management actions are logged. |
| UC-20 | UC-19 | Offline and sync events are logged. |

### 3.2.2 \<\<extend\>\> Relationships

| **Extending Use Case** | **Base Use Case** | **Condition** |
|----|----|----|
| UC-02 | UC-01 | Promotions extend the sale when eligible items or loyalty apply. |
| UC-03 | UC-01 | Prescription sale extends the sale when a prescription item is scanned. |
| UC-05 | UC-04 | FEFO enforcement extends inventory tracking for batch-tracked items. |
| UC-08 | UC-10 | A reorder alert extends to PO creation when the user generates a PO. |
| UC-11 | UC-10 | A GRN extends a PO when receiving against it. |
| UC-13 | UC-16 | Sales reports extend to accounting sync when triggered. |
| UC-14 | UC-16 | Inventory valuation reports extend to accounting sync. |
| UC-20 | UC-01 | Offline mode extends the sale when connectivity is lost. |
| UC-20 | UC-04 | Offline mode extends inventory operations when connectivity is lost. |

### 3.2.3 Generalization

| **General Actor** | **Specialized Actors**                                  |
|-------------------|---------------------------------------------------------|
| Store User        | Cashier, Store Supervisor, Inventory Staff, Pharmacist  |
| Management User   | Purchasing Officer, Branch Manager, Head Office Manager |
| Admin User        | System Administrator                                    |

# 4. Detailed Use Case Specifications

This section gives the full specification for the six core use case clusters. Each specification lists the use case ID, name, actors, goal, preconditions, postconditions, trigger, main flow reference, and related include/extend use cases.

## 4.1 UC-01: Process Sale Transaction

<table style="width:87%;">
<colgroup>
<col style="width: 20%" />
<col style="width: 66%" />
</colgroup>
<thead>
<tr>
<th><strong>Field</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Use Case ID</td>
<td>UC-01</td>
</tr>
<tr>
<td>Use Case Name</td>
<td>Process Sale Transaction</td>
</tr>
<tr>
<td>Primary Actor</td>
<td>Cashier</td>
</tr>
<tr>
<td>Supporting Actors</td>
<td>Payment Gateway, Customer (implicit)</td>
</tr>
<tr>
<td>Goal</td>
<td>Complete a sale, accept payment, print a BIR-compliant receipt, and record the transaction with a full audit trail.</td>
</tr>
<tr>
<td>Preconditions</td>
<td>1. Cashier is logged in and assigned to an open shift.<br />
2. POS terminal is online (or offline mode is enabled).<br />
3. Product master data is synchronized.<br />
4. Cash drawer is assigned and the float is verified.</td>
</tr>
<tr>
<td>Postconditions (Success)</td>
<td>1. Sale is recorded in the central database.<br />
2. Inventory is reduced in real time.<br />
3. Payment is authorized and recorded.<br />
4. BIR-compliant receipt is printed.<br />
5. Audit trail entry is created.</td>
</tr>
<tr>
<td>Postconditions (Failure)</td>
<td>1. No sale is recorded.<br />
2. Inventory is unchanged.<br />
3. Payment is not captured (or is reversed if authorized).<br />
4. An error is shown to the cashier.<br />
5. A failed-attempt entry is written to the audit trail.</td>
</tr>
<tr>
<td>Trigger</td>
<td>Cashier selects "New Sale" on the POS terminal.</td>
</tr>
<tr>
<td>Main Flow</td>
<td>See Section 5.1.1 (Basic Flow).</td>
</tr>
<tr>
<td>Includes</td>
<td>UC-02, UC-03, UC-19</td>
</tr>
<tr>
<td>Extends</td>
<td>UC-20</td>
</tr>
</tbody>
</table>

## 4.2 UC-04: Manage Inventory (UC-04 to UC-08)

<table style="width:87%;">
<colgroup>
<col style="width: 20%" />
<col style="width: 66%" />
</colgroup>
<thead>
<tr>
<th><strong>Field</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Use Case ID</td>
<td>UC-04 (covers UC-04, UC-05, UC-06, UC-07, UC-08)</td>
</tr>
<tr>
<td>Use Case Name</td>
<td>Manage Inventory</td>
</tr>
<tr>
<td>Primary Actor</td>
<td>Inventory Staff</td>
</tr>
<tr>
<td>Supporting Actors</td>
<td>Branch Manager (approves transfers), Purchasing Officer (receives alerts)</td>
</tr>
<tr>
<td>Goal</td>
<td>Keep accurate, real-time inventory across all branches, with batch and expiry tracking, FEFO, stock counts, transfers, and reorder alerts.</td>
</tr>
<tr>
<td>Preconditions</td>
<td>1. Inventory Staff is logged in with branch permissions.<br />
2. Product, batch, and location data are current.<br />
3. The system is online (or offline mode is enabled).</td>
</tr>
<tr>
<td>Postconditions (Success)</td>
<td>1. Stock levels update in real time.<br />
2. Batch and expiry records are kept.<br />
3. FEFO is applied on issue.<br />
4. Counts and adjustments are posted with audit trail.<br />
5. Transfers are completed with both sides confirming.<br />
6. Reorder alerts are generated.</td>
</tr>
<tr>
<td>Postconditions (Failure)</td>
<td>1. The operation is rolled back.<br />
2. The error is logged with a reason.<br />
3. The user is notified.</td>
</tr>
<tr>
<td>Trigger</td>
<td>Inventory Staff opens an inventory function (view, receive, count, transfer, or configure alerts).</td>
</tr>
<tr>
<td>Main Flow</td>
<td>See Section 5.2 (Basic Flows).</td>
</tr>
<tr>
<td>Includes</td>
<td>UC-05, UC-19</td>
</tr>
<tr>
<td>Extends</td>
<td>UC-08 extends UC-10; UC-20 extends UC-04, UC-06, UC-07</td>
</tr>
</tbody>
</table>

## 4.3 UC-10: Manage Purchasing and Suppliers (UC-09 to UC-12)

<table style="width:87%;">
<colgroup>
<col style="width: 20%" />
<col style="width: 66%" />
</colgroup>
<thead>
<tr>
<th><strong>Field</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Use Case ID</td>
<td>UC-10 (covers UC-09, UC-10, UC-11, UC-12)</td>
</tr>
<tr>
<td>Use Case Name</td>
<td>Manage Purchasing and Suppliers</td>
</tr>
<tr>
<td>Primary Actor</td>
<td>Purchasing Officer</td>
</tr>
<tr>
<td>Supporting Actors</td>
<td>Supplier, Inventory Staff, Accounting System</td>
</tr>
<tr>
<td>Goal</td>
<td>Manage suppliers, create and track POs, process GRNs with batch/expiry, match invoices, and send payables to accounting.</td>
</tr>
<tr>
<td>Preconditions</td>
<td>1. Purchasing Officer is logged in with the purchasing role.<br />
2. Supplier master data is set up (UC-09).<br />
3. Reorder points and preferred suppliers are defined.</td>
</tr>
<tr>
<td>Postconditions (Success)</td>
<td>1. PO is sent and tracked.<br />
2. GRN is posted and inventory updated with batch/expiry.<br />
3. Invoice is matched (PO, GRN, Invoice).<br />
4. Payables are sent to accounting through REST API.<br />
5. All actions are audited.</td>
</tr>
<tr>
<td>Postconditions (Failure)</td>
<td>1. PO, GRN, or invoice is not saved.<br />
2. Discrepancies are flagged.<br />
3. No data is sent to accounting until resolved.</td>
</tr>
<tr>
<td>Trigger</td>
<td>Purchasing Officer opens the Purchasing module, or a reorder alert suggests a PO.</td>
</tr>
<tr>
<td>Main Flow</td>
<td>See Section 5.3 (Basic Flows).</td>
</tr>
<tr>
<td>Includes</td>
<td>UC-09, UC-11, UC-16, UC-19</td>
</tr>
<tr>
<td>Extends</td>
<td>UC-08 extends UC-10; UC-11 extends UC-10</td>
</tr>
</tbody>
</table>

## 4.4 UC-15: Generate Reports and Dashboards (UC-13 to UC-16)

<table style="width:87%;">
<colgroup>
<col style="width: 20%" />
<col style="width: 66%" />
</colgroup>
<thead>
<tr>
<th><strong>Field</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Use Case ID</td>
<td>UC-15 (covers UC-13, UC-14, UC-15, UC-16)</td>
</tr>
<tr>
<td>Use Case Name</td>
<td>Generate Reports and Dashboards</td>
</tr>
<tr>
<td>Primary Actor</td>
<td>Head Office Manager, Branch Manager, Store Supervisor, Inventory Staff</td>
</tr>
<tr>
<td>Supporting Actors</td>
<td>Accounting System</td>
</tr>
<tr>
<td>Goal</td>
<td>Provide accurate real-time and historical reports for sales, inventory, and branch performance, and push financial data to accounting.</td>
</tr>
<tr>
<td>Preconditions</td>
<td>1. User is logged in with reporting permissions for assigned branches.<br />
2. Transaction data is synchronized.</td>
</tr>
<tr>
<td>Postconditions (Success)</td>
<td>1. Report is generated in the requested format.<br />
2. Data reflects the latest synchronized state.<br />
3. Access is logged.<br />
4. Accounting sync is triggered as scheduled or on demand.</td>
</tr>
<tr>
<td>Postconditions (Failure)</td>
<td>1. An error with the reason is shown.<br />
2. Partial data is flagged if generated offline.</td>
</tr>
<tr>
<td>Trigger</td>
<td>User selects a report, a scheduled job runs, or the accounting sync schedule fires.</td>
</tr>
<tr>
<td>Main Flow</td>
<td>User selects report type, chooses filters, the system queries consolidated data, renders the report, the user exports or prints, and access is logged.</td>
</tr>
<tr>
<td>Includes</td>
<td>UC-13, UC-14, UC-16, UC-19</td>
</tr>
<tr>
<td>Extends</td>
<td>UC-13 and UC-14 extend UC-16 when accounting sync is triggered.</td>
</tr>
</tbody>
</table>

## 4.5 UC-17: Manage Users, Access Control, and Audit Trail (UC-17 to UC-19)

<table style="width:87%;">
<colgroup>
<col style="width: 20%" />
<col style="width: 66%" />
</colgroup>
<thead>
<tr>
<th><strong>Field</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Use Case ID</td>
<td>UC-17 (covers UC-17, UC-18, UC-19)</td>
</tr>
<tr>
<td>Use Case Name</td>
<td>Manage Users, Access Control, and Audit Trail</td>
</tr>
<tr>
<td>Primary Actor</td>
<td>System Administrator</td>
</tr>
<tr>
<td>Supporting Actors</td>
<td>None (internal administrative functions)</td>
</tr>
<tr>
<td>Goal</td>
<td>Administer accounts, enforce role-based access, configure the system, and keep a tamper-evident audit trail.</td>
</tr>
<tr>
<td>Preconditions</td>
<td>1. System Administrator is logged in with the admin role.<br />
2. Branch and role definitions are current.</td>
</tr>
<tr>
<td>Postconditions (Success)</td>
<td>1. Accounts are created, modified, or deactivated.<br />
2. Roles and branch permissions are enforced.<br />
3. System parameters are updated.<br />
4. All admin actions are recorded in the audit log.</td>
</tr>
<tr>
<td>Postconditions (Failure)</td>
<td>1. Changes are rolled back.<br />
2. The error is logged.<br />
3. The administrator is notified.</td>
</tr>
<tr>
<td>Trigger</td>
<td>System Administrator opens the Administration module.</td>
</tr>
<tr>
<td>Main Flow</td>
<td>Admin selects a function, performs the action, the system validates, saves, and logs it to the audit trail.</td>
</tr>
<tr>
<td>Includes</td>
<td>UC-18, UC-19</td>
</tr>
<tr>
<td>Extends</td>
<td>None</td>
</tr>
</tbody>
</table>

## 4.6 UC-20: Operate Offline and Synchronize

<table style="width:87%;">
<colgroup>
<col style="width: 20%" />
<col style="width: 66%" />
</colgroup>
<thead>
<tr>
<th><strong>Field</strong></th>
<th><strong>Details</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Use Case ID</td>
<td>UC-20</td>
</tr>
<tr>
<td>Use Case Name</td>
<td>Operate Offline &amp; Synchronize</td>
</tr>
<tr>
<td>Primary Actor</td>
<td>Cashier, Inventory Staff</td>
</tr>
<tr>
<td>Supporting Actors</td>
<td>None (system-internal synchronization)</td>
</tr>
<tr>
<td>Goal</td>
<td>Allow operations to continue during connectivity loss and sync local changes automatically when the connection returns, with conflict detection.</td>
</tr>
<tr>
<td>Preconditions</td>
<td>1. The branch app is configured for offline mode.<br />
2. The local database has current master data.<br />
3. The user logged in before the outage.</td>
</tr>
<tr>
<td>Postconditions (Success)</td>
<td>1. Local operations complete and are queued.<br />
2. On reconnect, queued transactions are sent.<br />
3. Conflicts are detected and resolved.<br />
4. The central database updates and the local cache refreshes.<br />
5. Sync status is reported and logged.</td>
</tr>
<tr>
<td>Postconditions (Failure)</td>
<td>1. Queued transactions stay local.<br />
2. The sync error is logged.<br />
3. The user is notified of pending sync.<br />
4. A retry is scheduled.</td>
</tr>
<tr>
<td>Trigger</td>
<td>Connectivity is lost, or connectivity is restored.</td>
</tr>
<tr>
<td>Main Flow</td>
<td>The system detects the loss, switches to the local database, operations continue, it detects the restore, sends queued operations, resolves conflicts, confirms, and refreshes the local cache.</td>
</tr>
<tr>
<td>Includes</td>
<td>UC-19</td>
</tr>
<tr>
<td>Extends</td>
<td>UC-01, UC-04, UC-06, UC-07</td>
</tr>
</tbody>
</table>

# 5. Basic, Alternative, and Exception Flows

This section gives the step-by-step flows for the main use case clusters. Each has a basic flow (normal path), alternative flows (valid variations), and exception flows (errors or unexpected conditions).

## 5.1 UC-01: Process Sale Transaction

### 5.1.1 Basic Flow

> 1\. Cashier selects "New Sale" on the POS terminal.
>
> 2\. Cashier scans the barcode or searches for the product; the system shows the item, price, and running total.
>
> 3\. If the item is prescription-only, the system asks for prescription validation; the Pharmacist validates before the item can be sold.
>
> 4\. The system checks real-time stock at the branch and warns if stock is low.
>
> 5\. The system checks applicable promotions and loyalty and applies discounts, or asks for supervisor approval if the discount is over the cashier limit.
>
> 6\. Cashier confirms the items and selects "Payment".
>
> 7\. Cashier chooses the payment method: Cash, Card, E-Wallet, or Installment.
>
> 8\. For card or e-wallet, the system sends an authorization request to the Payment Gateway and waits for the response.
>
> 9\. For cash, the cashier enters the tendered amount and the system computes the change.
>
> 10\. For installment, the system validates eligibility and records the schedule.
>
> 11\. The system records the sale with the time, cashier, branch, items, prices, discounts, and payment details.
>
> 12\. The system reduces inventory in real time and assigns batches using FEFO.
>
> 13\. The system builds BIR-compliant receipt data (TIN, business name, address, MIN, serial number, date/time, and VAT breakdown).
>
> 14\. The receipt prints and the cash drawer opens for cash sales.
>
> 15\. The system writes a full audit trail entry.
>
> 16\. Cashier hands the receipt to the customer; the sale is complete.

### 5.1.2 Alternative Flows

- A1: Split Payment: At step 7 the customer pays with more than one method. The cashier chooses "Split Payment", enters each amount, and the system processes each authorization before continuing.

- A2: Loyalty Redemption: At step 5 the customer presents a loyalty card. The system shows the points balance and the customer redeems points for a discount.

- A3: SC/PWD Discount: At step 5 the cashier selects "SC/PWD Discount". The system asks for ID verification and applies the 20% VAT-exempt discount, logging the exemption for BIR reporting.

- A4: Price Override: At step 5 the Store Supervisor authorizes a manual price change beyond the promotion rules. The system logs the override and the reason.

- A5: Return or Exchange: The cashier selects "Return" and scans the original receipt. The system checks the return policy, refunds to the original payment method or store credit, reverses inventory, and logs the return.

### 5.1.3 Exception Flows

- E1: Payment Authorization Failed: At step 8 the gateway declines or times out. The system shows an error and the cashier tries another method. If all methods fail, the cashier cancels the sale.

- E2: Sale Cancelled: Before payment is confirmed, the cashier cancels the sale. The system voids the transaction, does not reduce inventory, and logs the cancellation with a reason.

- E3: Insufficient Stock: At step 4 the system finds zero stock. The cashier removes the item or cancels the sale. Zero-stock override is not allowed.

- E4: Receipt Printer Failure: At step 13 the printer fails. The system queues the receipt, the cashier fixes the printer, and the receipt is reprinted with the same serial number. The reprint is logged.

- E5: Offline Mode Activated: If connectivity is lost, the system switches to the local database. The sale completes locally with an "OFFLINE" mark on the receipt, and the transaction is queued for sync.

- E6: BIR Serial Gap: At step 12 the system detects a non-sequential receipt serial. It flags the sale for admin review and marks the gap in the audit trail.

## 5.2 UC-04: Manage Inventory (UC-04 to UC-08)

### 5.2.1 Basic Flow — View Real-Time Inventory (UC-04)

> 1\. Inventory Staff logs in and selects "Inventory \> Stock Inquiry".
>
> 2\. The system queries the central inventory database and returns real-time quantities per branch, product, and batch.
>
> 3\. Staff filters by branch, category, batch, expiry range, or stock status.
>
> 4\. Staff views on-hand, committed, available, and reorder point columns.
>
> 5\. Staff exports to Excel or prints a count sheet.

### 5.2.2 Basic Flow — Receive Goods with Batch/Expiry (UC-05 and UC-11)

> 1\. Inventory Staff selects "Inventory \> Receive Goods (GRN)".
>
> 2\. Staff selects or scans a Purchase Order to fill in the expected items.
>
> 3\. For each line, staff enters the received quantity; the system asks for the batch number and expiry date.
>
> 4\. The system rejects a past expiry date and checks the batch format.
>
> 5\. Staff confirms; the system updates inventory, records the batch and expiry, and adds it to the FEFO queue.
>
> 6\. The system creates a GRN linked to the PO and updates the PO status.
>
> 7\. An audit trail entry is created.

### 5.2.3 Basic Flow — Perform Stock Count (UC-06)

> 1\. Inventory Staff selects "Inventory \> Stock Count" and chooses Cycle Count or Full Count.
>
> 2\. The system generates a count sheet with system quantities.
>
> 3\. Staff performs the physical count.
>
> 4\. Staff enters the counts; the system computes the variance.
>
> 5\. For variances beyond tolerance, the system requires a reason code.
>
> 6\. Staff submits; the system posts the adjustment with the user and timestamp.
>
> 7\. An audit trail entry is created and the Branch Manager is notified for large variances.

### 5.2.4 Basic Flow — Inter-Branch Stock Transfer (UC-07)

> 1\. Sending branch staff selects "Inventory \> Stock Transfer \> Create".
>
> 2\. Staff selects the receiving branch and items; the system checks available stock.
>
> 3\. Staff submits; the transfer is created as "Pending Approval".
>
> 4\. The receiving Branch Manager approves or rejects it.
>
> 5\. On approval, the sending staff picks and scans the items; the system marks them "Shipped".
>
> 6\. The receiving staff scans and confirms the items as "Received".
>
> 7\. The system updates both branches in real time and marks the transfer "Completed".
>
> 8\. Audit trail entries are written at each step.

### 5.2.5 Alternative Flows

- A1: Near-Expiry Action: The system highlights items expiring within the set window. Staff can start a markdown promotion or a return-to-supplier.

- A2: FEFO Override: If staff must issue a different batch, the Supervisor authorizes the override and the reason is logged.

- A3: Bulk Transfer Template: For recurring transfers, staff uses a template that pre-fills items and quantities.

- A4: Offline Stock Count: If connectivity is lost, counts are saved locally and synced when the connection returns.

### 5.2.6 Exception Flows

- E1: GRN Exceeds PO: Received quantity is more than the PO. The system flags the over-receipt and requires Purchasing Officer approval.

- E2: Missing Batch or Expiry: Staff tries to save a medicine without batch or expiry. The system blocks the save.

- E3: Transfer Rejected: The receiving manager rejects the transfer. The sending branch is notified and the items stay in stock.

- E4: Large Count Variance: The variance is over the threshold. The system requires dual authorization before posting.

- E5: Sync Conflict: During sync, the same items were transferred offline at two branches. The system detects the conflict and asks both managers to reconcile.

## 5.3 UC-10: Manage Purchasing and Suppliers (UC-09 to UC-12)

### 5.3.1 Basic Flow — Create PO from Reorder Alert (UC-08 to UC-10)

> 1\. The system checks reorder points and generates alerts for items below the threshold.
>
> 2\. Purchasing Officer opens "Purchasing \> Reorder Alerts" and sees the consolidated list.
>
> 3\. Officer selects alerts and clicks "Generate PO".
>
> 4\. The system groups items by preferred supplier and creates draft POs.
>
> 5\. Officer reviews quantities and supplier prices and adjusts them as needed.
>
> 6\. Officer sends the PO to the supplier; the status becomes "Sent".
>
> 7\. The system logs the PO creation and sending.

### 5.3.2 Basic Flow — Process GRN and Invoice Matching (UC-11 to UC-12)

> 1\. Goods arrive and Inventory Staff processes the GRN.
>
> 2\. The supplier submits an invoice; the Officer opens "Purchasing \> Invoice Matching".
>
> 3\. The system performs a 3-way match: PO vs. GRN vs. Invoice.
>
> 4\. If within tolerance, the Officer approves; the invoice is "Matched" and a payable is created.
>
> 5\. If there is a mismatch, the system flags the lines and the Officer resolves it with the supplier.
>
> 6\. The payable is sent to the Accounting System through REST API.
>
> 7\. Audit trail entries are written at each step.

### 5.3.3 Alternative Flows

- A1: Manual PO: The Officer creates a PO without an alert, for example for a new product or a promotional buy.

- A2: Blanket PO: For high-volume items, the Officer creates one PO with several delivery schedules.

- A3: Price Update: The Officer updates a supplier price list; the system flags open POs with old prices.

- A4: Partial Payment: For disputed lines, the Officer pays only the matched lines and holds the rest.

### 5.3.4 Exception Flows

- E1: Late Delivery: The PO passes its due date. The system escalates to the Officer and Branch Manager, who may cancel and re-source.

- E2: Price Mismatch: The invoice price differs beyond tolerance. The system blocks the match until a credit note or approval is given.

- E3: Accounting Sync Failure: The API call fails. The system queues the payable and alerts the System Administrator.

- E4: Duplicate Invoice: The system detects the same invoice number from a supplier and flags it for review.

- E5: Offline GRN: If connectivity is lost, the GRN is saved locally and synced when the connection returns.

# 6. Business Rules and Conditions

The rules below come from the RFP requirements, Philippine regulations (BIR, FDA, Data Privacy Act), and normal pharmacy and retail practice. Each rule has an ID so it can be traced to the use cases.

| **ID** | **Rule** | **Description** | **Use Case** |
|----|----|----|----|
| BR-01 | BIR-compliant receipts | Every sale prints a BIR-compliant receipt with TIN, business name, address, MIN, serial number, date/time, and VAT breakdown. Voids and refunds keep the original serial number with a note. | UC-01 |
| BR-02 | FEFO is mandatory | Batch-tracked items are issued earliest-expiry first. An override needs Supervisor approval and a reason code. | UC-04, UC-05, UC-07 |
| BR-03 | Expiry block | Medicine items cannot be received without a valid future expiry date. Expired stock cannot be received. | UC-05, UC-11 |
| BR-04 | Reorder point | Reorder point = (Average Daily Usage x Lead Time) + Safety Stock. Parameters are set per item per branch. | UC-08 |
| BR-05 | Count tolerance | Cycle count tolerance is plus or minus 2%. Full count tolerance is plus or minus 1%. Larger variances need a reason and dual approval for high-value items. | UC-06 |
| BR-06 | Transfer approval | Transfers up to PHP 10,000 may be approved by Inventory Staff. Above that, the Branch Manager approves; above PHP 50,000, the Head Office Manager approves. | UC-07 |
| BR-07 | Prescription required | Prescription-only medicines cannot be sold without a valid prescription record (patient, doctor, license number, date, drug, quantity, and directions). The Pharmacist validates it. | UC-03 |
| BR-08 | Controlled drug check | Dangerous drugs need two-person verification (Cashier and Pharmacist). The dispensing log is printed and signed. | UC-03 |
| BR-09 | SC/PWD discount | Senior Citizen and PWD discounts are 20% VAT-exempt on eligible items. A valid ID is required and the exemption is printed on the receipt. | UC-01 (A3) |
| BR-10 | Payment timeout | Card and e-wallet authorization must finish within 2 seconds. A timeout is treated as a decline and may be retried once. | UC-01 (E1) |
| BR-11 | Cash accountability | Each cashier has one cash drawer per shift. The system computes expected cash and logs any variance; a variance over PHP 100 is investigated. | UC-01 |
| BR-12 | Void/refund approval | Same-shift voids need only a reason. Refunds after the shift need Supervisor approval. All voids and refunds keep the original receipt serial. | UC-01 (A5, E2) |
| BR-13 | Audit trail is append-only | Audit entries cannot be edited or deleted and are hash-chained to detect tampering. Retention is at least 10 years. | UC-19 |
| BR-14 | Role-based access | Access is enforced at the UI, API, and database. Permissions are set per role per branch. There is no superuser backdoor. | UC-17 |
| BR-15 | Offline limits | Offline mode allows cash sales, inventory adjustments, and counts. It does not allow card payments, user or role changes, sending POs, or accounting sync. The offline queue is valid for 48 hours. | UC-20 |
| BR-16 | Sync conflict resolution | Sales are replayed centrally. Inventory adjustments use last-write-wins with a notice. Counts use the most recent count. Offline transfers need manual reconciliation. | UC-20 |
| BR-17 | Accounting sync schedule | Sales and payables are sent every 4 hours and on demand. Valuation is sent nightly. Failed syncs retry every 30 minutes for 4 hours, then escalate to the System Administrator. | UC-16 |
| BR-18 | Data privacy | Personal data is encrypted at rest (AES-256) and in transit (TLS 1.2+). Access is logged. Data subject requests are answered within 15 days under RA 10173. | UC-01, UC-03, UC-19 |
| BR-19 | Availability | The system is available 99.5% during business hours (8 AM to 9 PM). Planned maintenance is Sundays 12 AM to 4 AM. | All (PR-03) |
| BR-20 | Backup and recovery | Backups run every 4 hours. Recovery time is 1 hour and recovery point is 4 hours. Backups are test-restored monthly. | UC-18, PR-05, PR-06 |

# 7. Use Case Diagram

The completed use case diagram for WellSpring One is shown below. It contains the 20 use cases, the 11 actors, the actor associations, and the \<\<include\>\> and \<\<extend\>\> relationships listed in Section 3.2.

**Figure 1. WellSpring One — Use Case Diagram** <img src="docs\diagrams\use-case-media/media/image2.png" style="width:9.2in;height:6.93943in" />

**The diagram includes the following elements:**

- \[x\] System boundary labeled "WellSpring One — POS, Inventory & Supplier Management System"

- \[x\] All 11 actors (8 primary, 3 secondary) placed outside the boundary

- \[x\] All 20 use cases (UC-01 to UC-20) as ovals inside the boundary, grouped by functional area

- \[x\] Solid association lines from actors to their use cases

- \[x\] Blue dashed arrows for the 16 \<\<include\>\> relationships in Section 3.2.1

- \[x\] Red dashed arrows for the 9 \<\<extend\>\> relationships in Section 3.2.2

- \[x\] Actor generalization (Store User, Management User, Admin User) described in Section 2.3

*Legend: solid lines are actor associations; blue dashed arrows are \<\<include\>\>; red dashed arrows are \<\<extend\>\>.*
