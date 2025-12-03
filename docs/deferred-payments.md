# Scheduled Payments Feature

## Overview
The scheduled payments feature allows users to create payments with future dates. The system intelligently displays dynamic button states based on when the payment is scheduled:
- **Make Payment (green)**: Payment date is today or in the past
- **Schedule Payment (blue)**: Payment date is between now and the next due date
- **Defer Payment (orange)**: Payment date is beyond the next due date

## Database Changes

### Schema Update
Renamed `applied_date` to `payment_date` in the `bill_payments` table:
```sql
ALTER TABLE bill_payments 
RENAME COLUMN applied_date TO payment_date;
```

Run the migration: `/migrations/add_deferred_date.sql`

## Type Changes

### BillPayment Interface
Updated to use `payment_date`:
```typescript
export interface BillPayment {
  id: string;
  bill_id: string;
  user_id: string;
  amount: number;
  payment_date: string;  // Can be past, present, or future
  created_at: string;
}
```

## Model Changes

### BillModel.next_date Getter
Returns the next effective date for the bill:
1. Returns the scheduled payment date if there's a future payment (payment_date > today)
2. Otherwise, falls back to the regular `nextDueDate`

```typescript
get next_date(): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const scheduledPayment = this.payments.find(payment => {
    const paymentDate = new Date(payment.payment_date);
    paymentDate.setHours(0, 0, 0, 0);
    return paymentDate > today;
  });
  
  if (scheduledPayment?.payment_date) {
    return new Date(scheduledPayment.payment_date);
  }
  
  return this.nextDueDate;
}
```

## UI Changes

### BillDetailsModal - Dynamic Payment Button
The payment form now features:
1. **Single Date Field**: "Payment Date" (no toggle needed)
2. **Dynamic Button**: Color and text change based on selected date relative to due date
3. **Automatic Loading**: Existing scheduled payment automatically loads into the form
4. **Update vs Create**: If a scheduled payment exists, the form updates it instead of creating a new one

### Button States Logic
```typescript
const getPaymentButtonState = () => {
  const today = new Date();
  const selectedDate = new Date(paymentDate);
  const nextDueDate = bill.nextDueDate;
  
  // Make Payment (green) - today or in past
  if (selectedDate <= today) {
    return { text: 'Make Payment', color: '#27ae60' };
  }
  
  // Defer Payment (orange) - beyond next due date
  if (nextDueDate && selectedDate > nextDueDate) {
    return { text: 'Defer Payment', color: '#f39c12' };
  }
  
  // Schedule Payment (blue) - between now and due date
  return { text: 'Schedule Payment', color: '#3498db' };
};
```

### Display Updates
All bill date displays now use `bill.next_date`:
- BillDetailsModal: Shows next_date as the due date
- WeeklyBillGroup: Displays next_date (with fallback for recurring bills)

## API Changes

### addBillPayment
Simplified to accept only payment_date:
```typescript
addBillPayment: (
  billId: string, 
  amount: number, 
  paymentDate: string
) => Promise<{ data: BillPayment | null; error: Error | null }>
```

### updateBillPayment (New)
Updates an existing payment:
```typescript
updateBillPayment: (
  paymentId: string,
  amount: number,
  paymentDate: string
) => Promise<{ data: BillPayment | null; error: Error | null }>
```

## User Flow

1. User opens bill details modal
2. Clicks "Make a Payment"
3. If a scheduled payment exists, it loads automatically
4. User enters/edits payment amount and date
5. Button text and color update based on selected date:
   - Today or earlier → "Make Payment" (green)
   - Between today and due date → "Schedule Payment" (blue)
   - After due date → "Defer Payment" (orange)
6. User clicks the button to save
7. If editing existing scheduled payment, it updates; otherwise creates new payment
8. Bill's next_date reflects the scheduled payment date
9. Bill appears in the weekly view based on the payment date

## Edge Cases Handled

1. **Only One Scheduled Payment**: Only future payments (payment_date > today) are considered
2. **Update vs Create**: Form automatically detects and updates existing scheduled payment
3. **Recurring Bills**: next_date works with recurring bills, respecting scheduled payments
4. **One-time Bills**: next_date uses scheduled payment if available, otherwise original due_date

## Testing Checklist

- [ ] Create a payment for today (green "Make Payment")
- [ ] Create a payment for tomorrow before due date (blue "Schedule Payment")
- [ ] Create a payment after due date (orange "Defer Payment")
- [ ] Verify bill's next_date updates to show scheduled payment date
- [ ] Check bill appears in correct week
- [ ] Edit existing scheduled payment
- [ ] Verify update overwrites instead of creating duplicate
- [ ] Create regular payment (past date)
- [ ] Verify payment history shows all payments correctly
