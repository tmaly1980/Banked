# Variable Balance Bills Implementation Guide

## Overview
This feature adds support for variable balance bills (credit cards, utilities) where the amount changes each billing cycle.

## Database Changes (✅ COMPLETED)
- Created migration: `/Users/tomas/sites/Banked/migrations/add_variable_bills.sql`
- Added `is_variable` BOOLEAN column to `bills` table
- Made `bills.amount` nullable
- Created `bill_statements` table with:
  - `balance`: Current statement balance
  - `minimum_due`: Minimum payment required
  - `statement_date`: Date of statement
- Added `additional_fees` column to `bill_payments`
- Created `get_latest_bill_statement()` function to calculate updated balance

## Model Changes (✅ COMPLETED)
- Updated `BillModel.ts` to include:
  - `is_variable?: boolean`
  - `amount: number | null` (nullable)
  - Statement fields: `statement_balance`, `statement_minimum_due`, `statement_date`, `updated_balance`

## Components To Update

### 1. BillFormModal (NEEDS IMPLEMENTATION)
**Changes needed:**
- Add state: `const [isVariable, setIsVariable] = useState(editingBill?.is_variable || false)`
- Add state: `const [balance, setBalance] = useState('')`
- Add state: `const [minimumDue, setMinimumDue] = useState('')`
- Add PillPicker above Amount/Due row:
  ```tsx
  <PillPicker
    options={['fixed', 'variable']}
    value={isVariable ? 'variable' : 'fixed'}
    onChange={(value) => setIsVariable(value === 'variable')}
    labels={{ fixed: 'Fixed Amount', variable: 'Variable Balance' }}
  />
  ```
- Conditionally show Amount input (if !isVariable) or Balance input (if isVariable)
- Show "Minimum Due" input below Amount/Due row when isVariable
- Update handleSubmit to save balance and minimum_due to bill_statements table when isVariable

### 2. PaymentForm (NEEDS IMPLEMENTATION)
**Changes needed:**
- Set default Applied Month to current month/year:
  ```tsx
  useEffect(() => {
    if (!appliedMonthYear) {
      const now = new Date();
      const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      onAppliedMonthYearChange(currentMonthYear);
    }
  }, []);
  ```
- Add "Additional Fees" input next to Applied Month:
  ```tsx
  <AmountInput
    label="Additional Fees"
    value={additionalFees}
    onChangeText={onAdditionalFeesChange}
    placeholder="0.00"
  />
  <Text style={styles.helpText}>Late fees, etc.</Text>
  ```

### 3. BillDetailsModal (NEEDS IMPLEMENTATION)
**Changes needed:**
- Add "Update Balance" button next to "Make a Payment" when bill.is_variable
- Show modal with inputs for:
  - Current Balance
  - Minimum Due
  - Statement Date (defaults to today)
- Display statement info for variable bills:
  - "Minimum Due: $XX.XX"
  - "Statement Balance: $XX.XX"
  - "Updated Balance: $XX.XX" (calculated from payments since statement_date)
- Pre-fill payment amount with minimum_due (or updated_balance as fallback) when clicking Make Payment

### 4. Bills List Component (NEEDS IMPLEMENTATION)
**Changes needed:**
- For variable bills, display minimum_due (or updated_balance) instead of amount
- Calculate updated_balance = statement_balance - sum(payments since statement_date)

### 5. BillsContext (NEEDS IMPLEMENTATION)
**Add functions:**
```typescript
createBillStatement: (billId: string, balance: number, minimumDue: number) => Promise<{ data: BillStatement | null; error: Error | null }>;
getLatestBillStatement: (billId: string) => Promise<{ data: BillStatement | null; error: Error | null }>;
```

## Implementation Priority
1. ✅ Database schema (DONE)
2. ✅ Model updates (DONE)
3. BillFormModal - Add pill toggle and conditional inputs
4. PaymentForm - Default Applied Month and Additional Fees
5. BillsContext - Add statement functions
6. BillDetailsModal - Update Balance button and display logic
7. Bills list - Display logic for variable bills

## SQL To Run in Supabase
Run the contents of `/Users/tomas/sites/Banked/migrations/add_variable_bills.sql` in your Supabase SQL editor.

## Next Steps
Would you like me to:
1. Implement the BillFormModal changes (pill toggle, conditional inputs)?
2. Implement the PaymentForm changes (default Applied Month, Additional Fees)?
3. Or proceed with a different component first?

Let me know which component you'd like me to implement next, or if you'd like me to tackle them all at once.
