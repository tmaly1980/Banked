# Weekly Income Goals & Earnings Tracking - Implementation Summary

## Overview
This update adds comprehensive weekly income goal setting, daily earnings tracking, session time tracking, and detailed earnings analytics to the Banked app.

## Database Schema

### 1. weekly_income_goals
Stores income goals per day of the week with version control.

**Location:** `lib/schema/weekly_income_goals.sql`

**Columns:**
- `id` - UUID primary key
- `user_id` - References auth.users
- `starting_year_week` - TEXT (format: "2025-W50")
- `ending_year_week` - TEXT (NULL = current/ongoing)
- `total_income` - NUMERIC(12,2)
- `sunday_income` through `saturday_income` - NUMERIC(12,2) for each day
- `created_at`, `updated_at` - Timestamps

**Features:**
- Versioning support: when goals change mid-week, previous record is closed and new one starts
- Apply to "just this week" or "every week" options
- RLS enabled for user isolation

### 2. income_source_daily_earnings
Tracks actual earnings per income source per day.

**Location:** `lib/schema/income_source_daily_earnings.sql`

**Columns:**
- `id` - UUID primary key
- `user_id` - References auth.users
- `income_source_id` - References income_sources
- `date` - DATE (specific date for earnings)
- `earnings_amount` - NUMERIC(12,2)
- `notes` - TEXT
- `created_at`, `updated_at` - Timestamps
- UNIQUE constraint on (user_id, income_source_id, date)

### 3. income_source_earning_sessions
Tracks time-based earning sessions with start/end times.

**Location:** `lib/schema/income_source_earning_sessions.sql`

**Columns:**
- `id` - UUID primary key
- `user_id` - References auth.users
- `income_source_id` - References income_sources
- `start_datetime` - TIMESTAMP WITH TIME ZONE
- `end_datetime` - TIMESTAMP WITH TIME ZONE (NULL = active session)
- `notes` - TEXT
- `created_at`, `updated_at` - Timestamps

**Features:**
- Supports active sessions (end_datetime = NULL)
- Can calculate total session time per day
- Used for timer functionality

## New Components

### 1. WeeklyGoalsModal
**Location:** `components/modals/WeeklyGoalsModal.tsx`

**Features:**
- Radio buttons: "Just this week" or "Every week"
- Total weekly income goal input
- Individual day goals (Sunday through Saturday)
- Smart versioning: closes previous goal when editing historical weeks
- Auto-loads existing goals for current week

**Usage:**
```tsx
<WeeklyGoalsModal
  visible={showWeeklyGoalsModal}
  onClose={() => setShowWeeklyGoalsModal(false)}
  onSuccess={() => {
    loadAccountBalance();
    setShowWeeklyGoalsModal(false);
  }}
/>
```

### 2. SessionTimer
**Location:** `components/SessionTimer.tsx`

**Features:**
- Displays HH:MM counter next to income source amounts
- Play button to start new session
- Stop button to end active session
- Shows real-time elapsed time during active session
- Shows total session time for completed sessions today
- Updates every second for accurate tracking

**Usage:**
```tsx
<SessionTimer
  incomeSourceId={item.id}
  incomeSourceName={item.name}
/>
```

### 3. IncomeSourceDetailsModal
**Location:** `components/modals/IncomeSourceDetailsModal.tsx`

**Features:**
- Bar chart showing last 7 days earnings (Sun-Sat)
- Weekly average reference line across chart
- Week navigation (previous/next arrows)
- Date range display
- Edit link in header
- Uses react-native-chart-kit for graphs

**Chart Features:**
- Y-axis shows dollar amounts
- X-axis labeled with day abbreviations
- Reference line showing weekly average
- Responsive sizing based on screen width

**Usage:**
```tsx
<IncomeSourceDetailsModal
  visible={showIncomeSourceDetailsModal}
  onClose={() => setShowIncomeSourceDetailsModal(false)}
  incomeSource={selectedIncomeSource}
  onUpdate={() => loadAccountBalance()}
/>
```

## Updated Components

### PendingEarningsModal
**Location:** `components/modals/PendingEarningsModal.tsx`

**New Features:**
- Income source name is now tappable to open details modal
- SessionTimer component integrated next to each income source
- Supports `onOpenDetails` callback prop

**Changes:**
```tsx
// Income source row now includes:
- Tappable name to open details
- SessionTimer component showing time tracking
- Amount field opens calculator (unchanged)
```

### Home Screen (index.tsx)
**Location:** `app/(tabs)/index.tsx`

**New Features:**
1. **FAB Menu Addition:**
   - "Set Weekly Income Goals" option with calendar icon
   - Opens WeeklyGoalsModal

2. **Daily Goals from Weekly Schedule:**
   - `loadDailyGoalFromWeekly()` function loads current day's goal
   - Automatically extracts goal based on day name (e.g., "monday_income")
   - Falls back to 0 if no weekly goals set

3. **Income Source Details Integration:**
   - New state for selected income source
   - IncomeSourceDetailsModal integration
   - Opens from PendingEarningsModal when tapping income source name

**Key Functions:**
```typescript
const loadDailyGoalFromWeekly = async () => {
  // Gets current year-week (e.g., "2025-W50")
  // Loads weekly_income_goals record
  // Extracts today's goal (e.g., monday_income)
  // Sets dailyEarningsGoal state
}
```

## App Layout Changes

### Blue Background
**Location:** `app/_layout.tsx`

**Change:**
```tsx
<GestureHandlerRootView style={{ flex: 1, backgroundColor: '#3498db' }}>
```

This adds a blue (#3498db) background to the entire app core layout.

## User Workflows

### Setting Weekly Income Goals

1. Tap FAB (+) button on home screen
2. Select "Set Weekly Income Goals"
3. Choose "Just this week" or "Every week"
4. Enter total weekly income goal
5. Enter individual daily goals
6. Save

**Behavior:**
- First time: Creates new record with starting_year_week = current week
- Editing same week: Updates existing record
- Editing from previous week: Closes old record (sets ending_year_week), creates new one

### Tracking Earning Sessions

1. View income source in Pending Earnings modal
2. Click play button next to timer
3. Timer starts counting (00:00, 00:01, etc.)
4. Click stop button when done
5. Session saved with start/end times
6. Timer resets and shows total session time for today

### Viewing Earnings Details

1. Open Pending Earnings modal
2. Tap on income source name
3. View bar chart of last 7 days
4. See weekly average reference line
5. Navigate weeks with arrows
6. Tap "Edit" to modify income source settings

### Daily Earnings Goal Display

- Home screen Pending Earnings widget shows: "$43 / $170"
- $43 = total pending earnings
- $170 = goal for today (from weekly goals, e.g., Monday's goal)
- Below shows: "$127 To Go"

## Dependencies Added

```json
{
  "react-native-chart-kit": "^6.12.0",
  "react-native-svg": "^15.8.0"
}
```

## Helper Functions

### Year-Week Calculation
```typescript
const getYearWeek = (date: Date): string => {
  // Returns format: "2025-W50"
  // Sunday-based week calculation
}

const getPreviousYearWeek = (yearWeek: string): string => {
  // Returns previous week, handles year rollover
}
```

## Database Setup Instructions

Run these SQL files in order:
1. `lib/schema/weekly_income_goals.sql`
2. `lib/schema/income_source_daily_earnings.sql`
3. `lib/schema/income_source_earning_sessions.sql`

All tables include:
- RLS policies for user isolation
- Proper indexes for query performance
- Updated_at triggers for automatic timestamp management

## Technical Notes

### Timer Implementation
- Uses setInterval with 1-second updates for real-time display
- Calculates elapsed time from start_datetime to current time
- Cleans up interval on component unmount
- Loads total session time from completed sessions

### Chart Implementation
- Uses react-native-chart-kit BarChart
- Data normalized to 7-day array (Sun-Sat)
- Fills missing days with 0
- Weekly average calculated as sum/7
- Reference line positioned at average value

### Weekly Goals Versioning
- Allows changing goals mid-week without losing history
- Previous week goals remain accessible
- New goals start from current week forward
- Query uses OR condition: `ending_year_week.is.null OR ending_year_week.eq.current_week`

## Future Enhancements

Potential additions:
- Notes field in daily earnings (already in schema, UI not implemented)
- Session notes (schema ready, UI not implemented)
- Export earnings data
- Monthly/yearly analytics
- Goal achievement tracking
- Notifications for goal progress
