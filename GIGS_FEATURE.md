# Gigs Feature - Implementation Summary

## Overview
Complete gigs tracking system with weekly grouping, paycheck linking, and full CRUD operations.

## Database Changes

### Run this SQL in Supabase:
```sql
-- See /lib/migration_gigs.sql for complete migration
```

**Tables Created:**
1. `gigs` - Main gigs table with:
   - name, description
   - start_date, end_date (DATE fields)
   - total_hours (optional), total_amount
   - RLS policies for user isolation

2. `gig_paychecks` - Junction table linking gigs to paychecks:
   - gig_id, paycheck_id
   - Unique constraint prevents duplicate links
   - RLS policies

## TypeScript Types Added

**New Interfaces:**
- `Gig` - Base gig interface
- `GigPaycheck` - Junction table interface
- `GigWithPaychecks` - Gig with linked paychecks array
- `WeeklyGigGroup` - Grouped gigs by week

## Context Updates

**BillsContext** now includes:
- `gigs: GigWithPaychecks[]` - State array
- `loadGigs()` - Loads gigs with linked paychecks
- `createGig(gig)` - Create new gig
- `updateGig(id, updates)` - Update existing gig
- `deleteGig(id)` - Delete gig
- `linkPaycheckToGig(gigId, paycheckId)` - Link paycheck to gig
- `unlinkPaycheckFromGig(gigId, paycheckId)` - Unlink paycheck

## Utility Functions

**Added to `/lib/utils.ts`:**
- `groupGigsByWeek(gigs)` - Groups gigs into 6-week view
  - Gigs appear in all weeks they overlap with
  - Uses Sunday-Saturday week boundaries
  - Calculates totals for amount and hours per week

## Files Created

### 1. `/app/(tabs)/gigs.tsx` (Main Screen)
**Features:**
- Weekly grouping (same as bills/expenses screens)
- Week headers showing total amount and hours
- Expandable gig cards with accordion behavior
- Shows: name, date range, amount, hours
- Linked paychecks display
- Action buttons: Link Paychecks, Edit, Delete

**UI Components:**
- Week groups with totals
- Gig cards with expand/collapse
- Empty states for weeks without gigs
- Refresh control

### 2. `/components/modals/GigFormModal.tsx` (Add/Edit Modal)
**Form Fields:**
- Name (required)
- Description (optional textarea)
- Start Date (required, DatePicker)
- End Date (required, auto-defaults to end of week)
- Total Hours (optional, decimal)
- Total Amount (required, decimal)

**Features:**
- Auto-sets end date to end of week when start date selected
- Validation for all required fields
- Date range validation (end >= start)
- Inline alerts for feedback
- Success message before closing

### 3. `/components/modals/LinkPaychecksModal.tsx` (Link Paychecks)
**Features:**
- Summary showing: Gig Total, Linked Paychecks Total, Remaining
- Color-coded warnings if linked paychecks > gig total (red)
- Two sections:
  - Currently Linked Paychecks (with unlink buttons)
  - Available Paychecks (unlinked, with link buttons)
- Shows paycheck date, name, and amount
- Add/remove paychecks with single tap
- Real-time updates

## Navigation

**Tab Added:**
- Tab name: "Gigs"
- Icon: `briefcase` (Ionicons)
- Order: Home, Paychecks, Expenses, Gigs, Profile

## Key Behaviors

### Date Range Logic
- When adding gig, selecting start date auto-sets end date to end of that week (Saturday)
- User can change end date to any future date
- Validation ensures end >= start

### Weekly Display
- Gigs appear in **all weeks** they overlap with
- Example: Gig from Dec 1-14 appears in both Dec 1-7 and Dec 8-14 weeks
- Week totals sum all gigs in that week

### Paycheck Linking
- Multiple paychecks can be linked to one gig
- One paycheck can only be linked to one gig
- "Available Paychecks" shows only unlinked paychecks
- Summary shows if paychecks total exceeds gig amount (warning)

## Testing Checklist

1. **Run SQL Migration:**
   - Execute `/lib/migration_gigs.sql` in Supabase

2. **Test Gig Creation:**
   - Create gig with only required fields
   - Create gig with all fields including hours
   - Verify end date auto-populates to end of week

3. **Test Gig Editing:**
   - Edit gig name, amount, dates
   - Verify updates persist

4. **Test Gig Deletion:**
   - Delete gig, confirm prompt
   - Verify deletion

5. **Test Paycheck Linking:**
   - Link multiple paychecks to one gig
   - Unlink paychecks
   - Verify totals calculate correctly
   - Test linking paychecks that exceed gig amount

6. **Test Weekly Grouping:**
   - Create gig spanning multiple weeks
   - Verify it appears in all relevant weeks
   - Check week totals are accurate

7. **Test Edge Cases:**
   - Gig with end date far in future
   - Gig with zero hours
   - Very long descriptions
   - Gigs with no linked paychecks

## Usage Flow

1. **Add a Gig:**
   - Tap + button in header
   - Fill in name, dates, amount (hours optional)
   - End date auto-sets to end of week
   - Save

2. **Link Paychecks:**
   - Tap gig to expand details
   - Tap "Link Paychecks" button
   - Tap + icon next to available paychecks
   - Done when finished

3. **Edit a Gig:**
   - Expand gig details
   - Tap pencil icon
   - Modify fields
   - Update

4. **Delete a Gig:**
   - Expand gig details
   - Tap trash icon
   - Confirm deletion

## Notes

- Gigs use same week calculation as bills/expenses (Sunday-Saturday)
- Date range overlapping logic shows gigs in all applicable weeks
- Paycheck linking is many-to-one (many paychecks to one gig)
- RLS ensures users only see their own gigs and links
- All monetary values stored as NUMERIC in database
