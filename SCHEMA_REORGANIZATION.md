# Schema Reorganization - Expense Budgets Refactor

## Overview
This document describes the schema reorganization that splits the monolithic `schema.sql` into modular files and refactors the expense system from `weekly_expenses` to `expense_budgets` with enhanced functionality.

## Schema Files Created

### `/lib/schema/` Directory Structure
```
lib/schema/
├── bills.sql          # Bills and bill_payments tables
├── paychecks.sql      # Paychecks table
├── expenses.sql       # Expense types, budgets, and purchases
└── gigs.sql          # Gigs and gig_paychecks tables
```

### 1. `bills.sql`
- **bills** table: Core bill tracking
- **bill_payments** table: Payment history for bills
- RLS policies for user isolation
- Indexes for performance

### 2. `paychecks.sql`
- **paychecks** table: Paycheck tracking
- Nullable `date` field (updated in earlier migration)
- RLS policies and indexes

### 3. `expenses.sql`
- **expense_types** table: Reusable expense categories
- **expense_budgets** table (formerly `weekly_expenses`):
  - Renamed `week_start_date` → `start_date`
  - Added `end_date` (nullable) for flexible date ranges
  - Removed `notes` field
  - Kept `allocated_amount` and `spent_amount`
- **expense_purchases** table (NEW):
  - Tracks individual expense purchases
  - Fields: `expense_type_id`, `amount`, `date`, `notes`
  - Links to expense types via foreign key
- RLS policies and indexes for all tables

### 4. `gigs.sql`
- **gigs** table: Freelance gig tracking
- **gig_paychecks** table: Junction table linking gigs to paychecks
- RLS policies and indexes

## Database Migration

### Migration File: `/lib/migration_expense_budgets.sql`

**What it does:**
1. Creates `expense_purchases` table with RLS policies
2. Renames `weekly_expenses` → `expense_budgets`
3. Renames `week_start_date` → `start_date`
4. Adds `end_date` column (nullable)
5. Drops `notes` column
6. Updates unique constraint to use new column name
7. Creates appropriate indexes

**How to run:**
```sql
-- Connect to your Supabase database and execute:
-- lib/migration_expense_budgets.sql
```

## TypeScript Type Changes

### Updated Types (`/types/index.ts`)

**Renamed:**
- `WeeklyExpense` → `ExpenseBudget`
- `WeeklyExpenseWithType` → `ExpenseBudgetWithType`
- `WeeklyExpenseGroup` → `ExpenseBudgetGroup`

**New Type:**
```typescript
export interface ExpensePurchase {
  id: string;
  user_id: string;
  expense_type_id: string;
  amount: number;
  date: string;
  notes?: string;
  created_at: string;
}
```

**Updated Structure:**
```typescript
export interface ExpenseBudget {
  id: string;
  user_id: string;
  expense_type_id: string;
  start_date: string;      // was: week_start_date
  end_date?: string;       // NEW: optional end date
  allocated_amount: number;
  spent_amount: number;
  created_at: string;
  // REMOVED: notes field
}
```

## Context & Hook Changes

### `/contexts/BillsContext.tsx`

**State:**
- `weeklyExpenses` → `expenseBudgets`
- Added `expensePurchases` state

**Methods:**
- `loadWeeklyExpenses()` → `loadExpenseBudgets()`
- Added `loadExpensePurchases()`
- `saveWeeklyExpenses()` → `saveExpenseBudgets()`
- `createWeeklyExpense()` → `createExpenseBudget()`
- `updateWeeklyExpense()` → `updateExpenseBudget()`
- `deleteWeeklyExpense()` → `deleteExpenseBudget()`
- Added `createExpensePurchase()`
- Added `updateExpensePurchase()`
- Added `deleteExpensePurchase()`

### `/hooks/useExpenseOperations.ts`

**Updated:**
- All database operations now use `expense_budgets` table instead of `weekly_expenses`
- Column references updated to use `start_date` instead of `week_start_date`
- Removed `notes` field handling
- Added `end_date` field support

**New Functions:**
- `createExpensePurchase()` - Create expense purchase record
- `updateExpensePurchase()` - Update expense purchase
- `deleteExpensePurchase()` - Delete expense purchase

## UI Component Changes

### `/app/(tabs)/expenses.tsx`

**Updated:**
- All type references: `WeeklyExpenseWithType` → `ExpenseBudgetWithType`
- Context usage: `weeklyExpenses` → `expenseBudgets`
- Method calls: `createWeeklyExpense` → `createExpenseBudget`, etc.
- Removed `notes` field from all forms
- Updated parameter: `week_start_date` → `start_date`

**Key Changes:**
- `AddExpenseForm`: Updated to use `createExpenseBudget()`
- `ExpenseRow`: Type changed to `ExpenseBudgetWithType`
- `EditExpenseModal`: Uses `updateExpenseBudget()` and `deleteExpenseBudget()`
- `AddSpentModal`: Uses `updateExpenseBudget()`

### `/app/(tabs)/index.tsx`

**Updated:**
- Context destructuring: `weeklyExpenses` → `expenseBudgets`
- Method references: `saveWeeklyExpenses` → `saveExpenseBudgets`
- Filter operations: `.week_start_date` → `.start_date`
- Dependencies in useEffect updated

### `/lib/utils.ts`

**Updated:**
- Function signature: `groupExpensesByWeek(expenseBudgets, expenseTypes)`
- Parameter type: `WeeklyExpense[]` → `ExpenseBudget[]`
- Return type: `WeeklyExpenseGroup[]` → `ExpenseBudgetGroup[]`
- Internal type: `WeeklyExpenseWithType` → `ExpenseBudgetWithType`
- Filter property: `.week_start_date` → `.start_date`

## Benefits of This Refactor

1. **Modular Schema**: Easier to maintain and understand with separate files
2. **Flexible Date Ranges**: `end_date` allows budgets to span multiple weeks
3. **Purchase Tracking**: New `expense_purchases` table enables detailed expense tracking
4. **Cleaner Data Model**: Removed redundant `notes` field from budgets
5. **Better Naming**: `expense_budgets` more accurately describes the purpose
6. **Consistent Naming**: `start_date` aligns with `end_date` naming pattern

## Next Steps (Future Enhancements)

### 1. Expense Purchases UI
- [ ] Create modal/form for adding expense purchases
- [ ] Display expense purchases in expenses tab
- [ ] Link purchases to expense budgets
- [ ] Calculate spent_amount from purchases automatically

### 2. Enhanced Expense Budgets
- [ ] Support for budgets spanning multiple weeks using `end_date`
- [ ] Automatic rollover of unused budget amounts
- [ ] Budget templates for recurring expenses

### 3. Reports & Analytics
- [ ] Expense trends over time
- [ ] Category-wise spending analysis
- [ ] Budget vs actual comparison charts

## Migration Checklist

- [x] Create modular schema files
- [x] Create migration SQL file
- [x] Update TypeScript types
- [x] Update BillsContext
- [x] Update useExpenseOperations hook
- [x] Update expenses.tsx component
- [x] Update index.tsx (home screen)
- [x] Update lib/utils.ts
- [ ] Run migration on Supabase database
- [ ] Test all expense-related functionality
- [ ] Implement expense_purchases CRUD UI
- [ ] Update documentation

## Testing Notes

After running the migration, test:
1. Creating new expense budgets
2. Updating existing expense budgets
3. Deleting expense budgets
4. Weekly expense grouping and display
5. Progress bars and calculations
6. Integration with bills and paychecks
7. Net income calculations
