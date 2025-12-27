# Time Off Feature

## Overview
The Time Off feature allows users to track vacation, holidays, and other planned absences that affect their income schedule. Users can specify the reduction in income capacity (0-100%) during time off periods.

## Database Schema

### Table: `time_off`
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key to auth.users)
- name: TEXT (required) - e.g., "Summer Vacation", "Holiday Break"
- description: TEXT (optional) - Additional notes
- capacity: INTEGER (0-100, default 100) - % of income reduction
- start_date: DATE (required)
- end_date: DATE (required)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Constraints:**
- `capacity` must be between 0 and 100
- `end_date` must be >= `start_date`
- RLS policies ensure users can only access their own time off entries

## Components

### TimeOffFormModal
Location: `/components/modals/TimeOffFormModal.tsx`

**Props:**
- `visible`: boolean - Modal visibility
- `onClose`: () => void - Close handler
- `onSuccess`: () => void - Success callback after save/delete
- `editingTimeOff`: any - Time off object for editing (optional)

**Features:**
- Add new time off entries
- Edit existing entries
- Delete entries with confirmation
- Form validation for dates and capacity
- Date range validation (end date must be after start date)

## UI Components

### Income Screen Integration
Location: `/app/(tabs)/income/index.tsx`

**New Elements:**
1. **Upcoming Time Off Section**
   - Displays all future time off entries
   - Shows name, date range, description, and capacity
   - Tap to edit
   - Orange accent color for visibility

2. **FAB Menu Addition**
   - New "Add Time Off" option added to floating action button
   - Calendar icon for easy identification

## User Flow

### Adding Time Off
1. Tap FAB button on Income screen
2. Select "Add Time Off"
3. Fill in form:
   - Name (required)
   - Description (optional)
   - Capacity (0-100%, default 100%)
   - Start date (required)
   - End date (required)
4. Tap "Save"

### Editing/Deleting Time Off
1. Tap on any time off card in "Upcoming Time Off" section
2. Modal opens with pre-filled data
3. Edit fields as needed
4. Tap "Save" to update or "Delete" to remove

## Capacity Explanation
The capacity field represents the **percentage reduction** in income:
- **100%**: Full time off (no income)
- **50%**: Half time off (50% income reduction)
- **0%**: No reduction (maintains full income)

This allows for flexible scenarios like:
- Full vacation days (100%)
- Half-days or partial work schedules (50%)
- Holidays where some income still applies (variable %)

## Future Enhancements
Potential improvements to consider:
1. Integration with income calculations to automatically adjust projected income during time off periods
2. Color coding for different time off types (vacation, sick, holiday)
3. Recurring time off (e.g., every Friday off)
4. Time off history view (past entries)
5. Export/report capabilities
6. Calendar view for visualizing time off

## Migration
Run the migration file to create the table:
```sql
-- Location: /lib/schema/migrations/add_time_off_table.sql
```

Make sure to run this in Supabase SQL editor before using the feature.
