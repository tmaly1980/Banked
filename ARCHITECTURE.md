# Banked - Architecture Overview

## Context-Based Architecture

The app now uses React Context API for state management and data access, making the codebase more maintainable and testable.

### Contexts

#### AuthContext (`contexts/AuthContext.tsx`)
Manages authentication state and provides authentication methods throughout the app.

**Exports:**
- `AuthProvider` - Wrapper component
- `useAuth()` - Hook to access auth context

**API:**
```typescript
{
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}
```

#### BillsContext (`contexts/BillsContext.tsx`)
Manages all bills and paychecks data, providing CRUD operations.

**Exports:**
- `BillsProvider` - Wrapper component
- `useBills()` - Hook to access bills context

**API:**
```typescript
{
  bills: BillModel[];              // Array of BillModel instances
  paychecks: Paycheck[];
  loading: boolean;
  error: string | null;
  loadBills: () => Promise<void>;
  loadPaychecks: () => Promise<void>;
  loadBillPayments: (billId: string) => Promise<BillPayment[]>;
  createBill: (bill) => Promise<{ data: Bill | null; error: Error | null }>;
  updateBill: (id, updates) => Promise<{ error: Error | null }>;
  deleteBill: (id) => Promise<{ error: Error | null }>;
  createPaycheck: (paycheck) => Promise<{ data: Paycheck | null; error: Error | null }>;
  updatePaycheck: (id, updates) => Promise<{ error: Error | null }>;
  deletePaycheck: (id) => Promise<{ error: Error | null }>;
  addBillPayment: (billId, amount, date) => Promise<{ data: BillPayment | null; error: Error | null }>;
  refreshData: () => Promise<void>;
}
```

### Models

#### BillModel (`models/BillModel.ts`)
Object-oriented wrapper for Bill data with computed properties.

**Calculated Properties:**
- `totalPaid` - Sum of all payments
- `amountRemaining` - Remaining balance
- `isPaid` - Whether bill is fully paid
- `paymentProgress` - Payment completion percentage
- `isRecurring` - Whether bill repeats monthly
- `nextDueDate` - Next due date for the bill
- `isOverdue` - Whether bill is past due
- `daysUntilDue` - Days until next due date
- `priorityColor` - Color code for priority level

**Methods:**
- `toBill()` - Convert back to plain Bill object
- `addPayment(payment)` - Add a payment to the bill
- `static fromDatabase(bill, payments)` - Factory method

### Component Updates

All components have been refactored to use contexts instead of direct Supabase calls:

1. **Auth.tsx** - Uses `useAuth()` for sign in/up
2. **app/(tabs)/profile.tsx** - Uses `useAuth()` for user info and sign out
3. **app/(tabs)/index.tsx** - Uses `useBills()` for data loading
4. **components/modals/AddItemModal.tsx** - Uses `useBills()` for creating/updating
5. **components/modals/BillDetailsModal.tsx** - Uses `useBills()` for payments

### Provider Hierarchy

```tsx
<AuthProvider>
  <BillsProvider>
    <App />
  </BillsProvider>
</AuthProvider>
```

The AuthProvider must wrap BillsProvider because BillsContext depends on the authenticated user from AuthContext.

### Benefits

1. **Separation of Concerns** - Data access logic separated from UI
2. **Reusability** - Contexts can be used by any component
3. **Testability** - Easy to mock contexts for testing
4. **Type Safety** - Full TypeScript support with proper typing
5. **Calculated Properties** - BillModel provides computed values without duplicating logic
6. **Centralized State** - Single source of truth for bills and auth state

### Migration Guide

**Old Pattern:**
```typescript
const { data, error } = await supabase.from('bills').select('*');
```

**New Pattern:**
```typescript
const { bills, loadBills } = useBills();
useEffect(() => { loadBills(); }, []);
```

**Old Pattern:**
```typescript
const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
```

**New Pattern:**
```typescript
const billModel = BillModel.fromDatabase(bill, payments);
const totalPaid = billModel.totalPaid;
```
