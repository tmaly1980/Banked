# Quick Start: Scheduled Payments

## Database Setup

Run the migration SQL to rename `applied_date` to `payment_date`:

```bash
# Execute in your Supabase SQL editor
psql -h <your-supabase-host> -U <user> -d <database> -f migrations/add_deferred_date.sql
```

Or manually run:
```sql
ALTER TABLE bill_payments 
RENAME COLUMN applied_date TO payment_date;

CREATE INDEX IF NOT EXISTS idx_bill_payments_payment_date 
ON bill_payments(payment_date);
```

## How to Use

### Creating a Scheduled Payment

1. Open a bill from the weekly view
2. Tap "Make a Payment"
3. Enter the payment amount
4. Select the payment date
5. Button automatically changes based on date:
   - **"Make Payment" (green)**: Date is today or earlier
   - **"Schedule Payment" (blue)**: Date is between today and due date
   - **"Defer Payment" (orange)**: Date is after the due date
6. Tap the button to save

### Viewing Scheduled Payments

- The bill's due date in the details modal will show the scheduled payment date
- In the weekly view, the bill will appear in the week containing the scheduled date
- Payment history shows all payments (past and future)

### Editing Scheduled Payments

When you open the payment form for a bill with an existing scheduled payment:
- The form automatically loads with the scheduled payment amount and date
- You can modify and save changes
- Saving updates the existing payment instead of creating a duplicate

### How It Works

The `next_date` getter on BillModel:
1. Checks for scheduled payments (payment_date > today)
2. Returns the scheduled payment date if found
3. Falls back to the regular due date if no scheduled payment exists

This means:
- Scheduled payments temporarily override the bill's due date
- The button color and text dynamically change as you select different dates
- The system prevents duplicate scheduled payments by updating existing ones

## Dynamic Button States

| Payment Date | Button Text | Color | Use Case |
|--------------|-------------|-------|----------|
| Today or past | Make Payment | Green (#27ae60) | Recording past payment or paying now |
| Between today and due date | Schedule Payment | Blue (#3498db) | Planning payment before it's due |
| After due date | Defer Payment | Orange (#f39c12) | Postponing payment beyond due date |

## Code Reference

- **Model**: `/models/BillModel.ts` - `next_date` getter
- **UI**: `/components/modals/BillDetailsModal.tsx` - Dynamic button logic
- **API**: `/contexts/BillsContext.tsx` - `addBillPayment()` and `updateBillPayment()`
- **Types**: `/types/index.ts` - BillPayment interface
- **Migration**: `/migrations/add_deferred_date.sql`
