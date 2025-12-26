# Bill Date Range Implementation

## Overview
Added optional start_month_year and end_month_year fields to bills to support time-limited recurring bills.

## Database Changes

### 1. Run Migration SQL
Execute the migration in Supabase SQL Editor:
```sql
-- File: migrations/add_bill_date_range.sql
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS start_month_year TEXT,
ADD COLUMN IF NOT EXISTS end_month_year TEXT;

ALTER TABLE bills
ADD CONSTRAINT check_start_month_year_format 
  CHECK (start_month_year IS NULL OR start_month_year ~ '^\d{4}-\d{2}$');

ALTER TABLE bills
ADD CONSTRAINT check_end_month_year_format 
  CHECK (end_month_year IS NULL OR end_month_year ~ '^\d{4}-\d{2}$');

ALTER TABLE bills
ADD CONSTRAINT check_end_after_start
  CHECK (
    start_month_year IS NULL OR 
    end_month_year IS NULL OR 
    end_month_year >= start_month_year
  );
```

### 2. Update get_user_bills View
Execute the updated function in Supabase SQL Editor:
```sql
-- File: lib/schema/functions/get_user_bills.sql
```
The view now:
- Includes start_month_year and end_month_year in the bill_due_dates CTE
- Considers start_month_year when calculating next_due_date for recurring bills without payments
- Sets next_due_date to NULL if it exceeds end_month_year
- Adjusts is_overdue and is_upcoming calculations to respect end_month_year

## UI Changes

### Bill Form Modal
- Added "Set Starting Date" link to show month-year picker (defaults to current month/year)
- Added "Set End Date" link to show month-year picker (defaults to blank)
- Both pickers allow clearing the date
- Dates are saved in 'YYYY-MM' format (e.g., '2025-12' for December 2025)

### Month-Year Picker Component
- Reused existing MonthYearPicker component
- Shows scrollable month and year selection
- Validates that end date is after start date (via database constraint)

## Logic Changes

### Next Due Date Calculation
1. **One-time bills**: Uses due_date as before
2. **Recurring bills with payments**: Same partial payment logic
3. **Recurring bills without payments**: 
   - If start_month_year is set and in the future, uses that month
   - Otherwise uses current month
4. **End date handling**: 
   - If next_due_date would be after end_month_year, sets to NULL
   - Bill will not show as upcoming/overdue after end date

## TypeScript Changes
- Updated Bill interface and BillModel class with optional fields:
  - start_month_year?: string | null
  - end_month_year?: string | null

## Use Cases
1. **Temporary subscriptions**: Set end_month_year when you know the subscription will end
2. **Future-starting bills**: Set start_month_year for bills that start in the future
3. **Limited-time services**: Both start and end dates for temporary services
4. **Normal recurring bills**: Leave both blank (current behavior)

## Testing Checklist
- [ ] Run migration SQL in Supabase
- [ ] Update get_user_bills view in Supabase
- [ ] Create new bill with start date in future - verify it doesn't show until that month
- [ ] Create bill with end date - verify it stops showing after that month
- [ ] Edit existing bill to add date range
- [ ] Verify partial payment logic still works with date ranges
- [ ] Test clearing start/end dates
