# Deferred Bills View Migration

## To Apply This Migration

Run the SQL in `lib/schema/migrations/create_deferred_bills_view.sql` in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `lib/schema/migrations/create_deferred_bills_view.sql`
4. Paste and run the SQL

## What This Creates

A dedicated `deferred_bills_view` that:
- Returns all bills with active deferments (`is_active = true`)
- No date range filtering (unlike `user_bills_view` which filters by upcoming dates)
- Orders by `decide_by_date` (nulls last), then bill name
- Includes all payment tracking, statement info, and deferment details

## Usage

The Plan tab now uses this view:

```typescript
const { data: deferredData } = await supabase
  .from('deferred_bills_view')
  .select('*');
```

This ensures all deferred bills are retrieved regardless of their due dates.
