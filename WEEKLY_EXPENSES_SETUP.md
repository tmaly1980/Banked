# Weekly Expenses Feature - Setup Guide

## ✅ Completed

1. **Database Migration SQL Created** (`lib/migration_weekly_expenses.sql`)
2. **TypeScript Types Updated** (`types/index.ts`)
   - Renamed `amount` → `allocated_amount`
   - Added `spent_amount` field
   - New interfaces: `WeeklyExpenseWithType`, `WeeklyExpenseGroup`
3. **Context Methods Added** (`contexts/BillsContext.tsx`)
   - `createWeeklyExpense()` - Add new expense
   - `updateWeeklyExpense()` - Update existing expense
   - `deleteWeeklyExpense()` - Delete expense
4. **Expenses Tab Created** (`app/(tabs)/expenses.tsx`)
   - Weekly grouping with progress bars
   - Inline add/edit forms
   - Accordion for notes display
   - Floating modal for adding to spent amount
   - Color-coded progress bars (green/orange/red)
5. **Tab Navigation Updated** (`app/(tabs)/_layout.tsx`)
   - Added Expenses tab with wallet icon
6. **All Existing Code Updated**
   - `app/(tabs)/index.tsx` - Net income uses max(spent, allocated)
   - `components/modals/WeeklyExpensesModal.tsx` - Uses `allocated_amount`
   - `components/modals/PaycheckWeekModal.tsx` - Uses `allocated_amount`
   - `hooks/useExpenseOperations.ts` - All CRUD operations updated

## 🔧 Required: Run Database Migration

**IMPORTANT:** You must run this SQL in your Supabase SQL editor before using the app:

```sql
-- Add spent_amount column
ALTER TABLE weekly_expenses 
ADD COLUMN spent_amount NUMERIC DEFAULT 0 NOT NULL;

-- Rename amount to allocated_amount
ALTER TABLE weekly_expenses 
RENAME COLUMN amount TO allocated_amount;
```

## 🎨 Features Implemented

### Weekly Expenses Tab (`/expenses`)

**Header with Subtotals:**
- Shows `$spent / $allocated` for each week
- Plus icon to show inline add form

**Progress Bars:**
- Green: < 90% spent
- Orange: 90-100% spent
- Red: > 100% spent (overspending)

**Individual Expense Display:**
- Name and `$spent/$allocated` shown
- Pencil icon to enter edit mode
- Dollar bill icon opens "Add to Spent" modal
- Notes accordion with chevron icon

**Add Expense Form:**
- Name input
- Spent amount input
- Allocated budget input
- Notes textarea
- Save/Cancel buttons

**Edit Expense Form:**
- Same fields as add form
- Trash icon to delete
- Update/Cancel buttons

**Add to Spent Modal:**
- Shows current spent amount
- Input for additional amount
- Shows new total preview
- Option to edit allocated amount
- Updates expense on save

## 📊 Net Income Calculation

The net income calculation now uses `max(spent_amount, allocated_amount)` for each weekly expense. This ensures:
- If you spend less than allocated → uses allocated (conservative)
- If you overspend → uses actual spent amount (accurate)

## 🧪 Testing Checklist

1. Run database migration in Supabase
2. Restart your Expo app
3. Navigate to Expenses tab
4. Test adding a new expense
5. Test editing an expense
6. Test deleting an expense
7. Test adding to spent amount via dollar icon
8. Verify progress bar colors
9. Test notes accordion
10. Check net income calculation on Home tab

## 🗂️ File Structure

```
/Users/tomas/sites/Banked/
├── lib/
│   └── migration_weekly_expenses.sql         # Database migration
├── types/
│   └── index.ts                               # Updated types
├── contexts/
│   └── BillsContext.tsx                       # Added 3 methods
├── hooks/
│   └── useExpenseOperations.ts                # CRUD operations
├── app/(tabs)/
│   ├── _layout.tsx                            # Tab navigation
│   ├── index.tsx                              # Updated net income calc
│   └── expenses.tsx                           # NEW - Full expenses tab
└── components/modals/
    ├── WeeklyExpensesModal.tsx                # Updated for new schema
    └── PaycheckWeekModal.tsx                  # Updated for new schema
```

## 💡 Usage Tips

1. **Adding Expenses:** Click the + icon in the week header
2. **Quick Spent Updates:** Use the dollar icon for fast updates
3. **Viewing Notes:** Tap the chevron to expand/collapse notes
4. **Color Coding:** Keep an eye on progress bar colors to avoid overspending
5. **Net Income:** Check Home tab to see how expenses affect your net income
