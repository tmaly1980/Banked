# Variable Balance Bills Implementation

## Overview
Support for bills with variable amounts (credit cards, utilities) that change each billing cycle. Users can track statement balances, minimum payments, and see updated balances after making payments.

## Status: COMPLETE ✅

All components have been implemented.

## Implementation Details

### 1. Database Schema ✅
**File:** `migrations/add_variable_bills.sql`

- Added `is_variable` BOOLEAN flag to `bills` table
- Made `bills.amount` nullable (required for variable bills)
- Created `bill_statements` table:
  - `id`, `user_id`, `bill_id`
  - `statement_date` (when statement was issued)
  - `balance` (statement amount)
  - `minimum_due` (minimum payment required)
- Added `additional_fees` DECIMAL column to `bill_payments` (for late fees, etc.)
- Created `get_latest_bill_statement(p_bill_id UUID)` function:
  - Returns `updated_balance` = statement balance - sum of payments since statement date
- Set up RLS policies for `bill_statements` table

**To Execute:** Run the SQL in Supabase SQL editor

### 2. TypeScript Models ✅
**File:** `models/BillModel.ts`

- Updated `Bill` interface:
  ```typescript
  amount: number | null; // Changed from number
  is_variable?: boolean;
  statement_balance?: number;
  statement_minimum_due?: number;
  statement_date?: string;
  updated_balance?: number;
  ```
- Updated `BillModel` class constructor to initialize statement fields

### 3. Bill Form Modal ✅
**File:** `components/modals/BillFormModal.tsx`

**Added State:**
- `isVariable`: Boolean toggle for fixed vs variable bill
- `balance`: Current statement balance (for variable bills)
- `minimumDue`: Minimum payment due (for variable bills)

**UI Changes:**
- Added `PillPicker` component: "Fixed Amount" vs "Variable Balance"
- Conditional input labels:
  - Fixed bills: "Amount"
  - Variable bills: "Current Balance"
- Additional "Minimum Due" input shown for variable bills

**Logic Updates:**
- `validateForm()`: Checks `balance` instead of `amount` for variable bills
- `handleSubmit()`:
  - Saves bill with `is_variable` flag
  - For variable bills, calls `createBillStatement()` to save initial statement
  - Uses context function instead of fetch API

### 4. Payment Form ✅
**File:** `components/BillDetailsModal/PaymentForm.tsx`

**Enhancements:**
- Default Applied Month: useEffect sets to current month/year if not provided
- Additional Fees input:
  - Label: "Additional Fees"
  - Help text: "Late fees, etc." (italicized)
  - Supports decimal input
- Added `helpText` style for hint text

**Interface Updates:**
```typescript
interface PaymentFormProps {
  additionalFees: string;
  onAdditionalFeesChange: (value: string) => void;
  // ... other props
}
```

### 5. Bill Details Modal ✅
**File:** `components/modals/BillDetailsModal.tsx`

**New Features:**
- "Update Balance" button (purple) for variable bills
  - Appears above "Make a Payment" button
  - Opens form with Balance and Minimum Due inputs
  - Calls `createBillStatement()` on save
- Pre-fill payment amount:
  - Uses `statement_minimum_due` if available
  - Falls back to `updated_balance` if no minimum
  - Only for variable bills

**Update Balance Form:**
- Two inputs: New Balance, Minimum Due (optional)
- Cancel and Save buttons
- Integrated with BillsContext `createBillStatement()` function

### 6. Bill Info Header ✅
**File:** `components/BillDetailsModal/BillInfoHeader.tsx`

**Variable Bill Display:**
- Shows multiple amounts stacked:
  - Statement: $XXX (primary, larger)
  - Current: $XXX (secondary, smaller)
  - Min Due: $XXX (secondary, smaller)
- Statement Date shown in info grid below
- Falls back to regular amount display for fixed bills

**Styling:**
- `billAmount`: Primary statement balance (32px, bold)
- `billAmountSecondary`: Current/Min Due (18px, gray)

### 7. Bills List Display ✅
**File:** `components/Expenses/Bills.tsx`

**Updated Logic:**
- `renderBillRow()` calculates `displayAmount`:
  ```typescript
  const displayAmount = bill.is_variable 
    ? (bill.statement_minimum_due || bill.updated_balance || bill.statement_balance || 0)
    : (bill.remaining_amount || bill.amount || 0);
  ```
- Shows minimum due (if set), otherwise updated balance
- Maintains partial payment styling

### 8. Context Functions ✅
**File:** `contexts/BillsContext.tsx`

**New Interface Methods:**
```typescript
createBillStatement: (billId, balance, minimumDue?, statementDate?) => Promise<{error}>;
getLatestBillStatement: (billId) => Promise<{statement_balance, statement_minimum_due, statement_date, updated_balance}>;
```

**File:** `hooks/useBillOperations.ts`

**Implementation:**
- `createBillStatement()`:
  - Inserts record into `bill_statements` table
  - Refreshes bills to show new statement data
- `getLatestBillStatement()`:
  - Queries latest statement by `statement_date`
  - Calculates `updated_balance` = balance - sum of payments since statement date
  - Returns statement info object

### 9. Styles ✅
**File:** `styles/billDetailsStyles.ts`

**Added Styles:**
- `updateBalanceButton`: Purple background (#9b59b6)
- `inputGroup`: Margin bottom for form spacing
- `label`: Input labels styling
- `input`: Text input styling
- `actionButtons`: Row layout for Cancel/Save
- `cancelButton`, `cancelButtonText`: Gray cancel button
- `submitButton`, `submitButtonText`: Primary submit button

## User Workflow

### Adding a Variable Bill:
1. Open Bill Form Modal
2. Toggle "Variable Balance" pill
3. Enter bill name
4. Enter "Current Balance" (statement amount)
5. Optionally enter "Minimum Due"
6. Select due date/day
7. Save → Creates bill + initial statement

### Updating Statement Balance:
1. Open bill details
2. Click "Update Balance" (purple button)
3. Enter new statement balance
4. Optionally update minimum due
5. Save → Creates new statement record

### Making Payments:
1. Open bill details
2. Payment amount pre-fills with minimum due (or updated balance)
3. Can add "Additional Fees" (late charges, etc.)
4. Applied Month defaults to current month
5. Save → Payment recorded, updated balance recalculates

### Viewing Variable Bills:
- Bills list shows minimum due or current balance
- Bill details shows:
  - Statement: $XXX (original)
  - Current: $XXX (after payments)
  - Min Due: $XXX (required payment)
  - Statement Date: MMM DD, YYYY

## Database Queries

The system uses these key queries:

1. **Create Statement:**
   ```sql
   INSERT INTO bill_statements (bill_id, user_id, balance, minimum_due, statement_date)
   VALUES (?, ?, ?, ?, ?);
   ```

2. **Get Latest Statement:**
   ```sql
   SELECT * FROM bill_statements
   WHERE bill_id = ? AND user_id = ?
   ORDER BY statement_date DESC
   LIMIT 1;
   ```

3. **Calculate Updated Balance:**
   ```sql
   SELECT SUM(amount) FROM bill_payments
   WHERE bill_id = ? AND user_id = ?
   AND payment_date >= (SELECT statement_date FROM bill_statements WHERE ...);
   ```
   Updated balance = statement.balance - SUM(payments)

## Next Steps

1. **Execute SQL Migration:**
   - Run `migrations/add_variable_bills.sql` in Supabase SQL editor
   
2. **Test Workflow:**
   - Create a test variable bill (e.g., "Credit Card")
   - Update statement balance
   - Make partial payment
   - Verify updated balance calculation
   
3. **Future Enhancements:**
   - Statement history view (show all past statements)
   - Payment allocation (specify which statement a payment applies to)
   - Interest calculation support
   - Autopay minimum due option
   - Statement due date reminders

## Files Modified

- ✅ `migrations/add_variable_bills.sql` - Database schema
- ✅ `models/BillModel.ts` - TypeScript interfaces
- ✅ `components/modals/BillFormModal.tsx` - Add/edit bill UI
- ✅ `components/BillDetailsModal/PaymentForm.tsx` - Payment enhancements
- ✅ `components/modals/BillDetailsModal.tsx` - Update balance feature
- ✅ `components/BillDetailsModal/BillInfoHeader.tsx` - Statement display
- ✅ `components/Expenses/Bills.tsx` - List display logic
- ✅ `contexts/BillsContext.tsx` - Context interface
- ✅ `hooks/useBillOperations.ts` - Statement operations
- ✅ `styles/billDetailsStyles.ts` - Component styles
