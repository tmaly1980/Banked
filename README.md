# Banked - Bill Tracking App

A React Native Expo app for tracking bills and paychecks with Supabase backend integration.

## Features

- **User Authentication**: Sign up and login with Supabase
- **Bill Management**: Add, edit, and delete bills with priorities and due dates
- **Payment Tracking**: Track paychecks and see progress against bills
- **Weekly View**: Bills grouped by week for the next 6 weeks
- **Progress Indicators**: Visual progress bars showing paycheck vs bill totals
- **Deferred Bills**: Collapsible accordion for deferred bills
- **Responsive Design**: Native mobile UI with modal forms

## Database Schema

### Bills Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `name` (Text)
- `amount` (Decimal)
- `due_date` (Date, for one-time bills)
- `due_day` (Integer 1-31, for recurring monthly bills)
- `priority` ('low', 'medium', 'high')
- `loss_risk_flag` (Boolean)
- `deferred_flag` (Boolean)

### Bill Payments Table
- `id` (UUID, Primary Key)
- `bill_id` (UUID, Foreign Key to bills)
- `user_id` (UUID, Foreign Key to auth.users)
- `amount` (Decimal)
- `applied_date` (Date)

### Paychecks Table
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key to auth.users)
- `amount` (Decimal)
- `date` (Date)

## Setup Instructions

### Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Supabase:
   - Create a new Supabase project
   - Copy the project URL and anon key
   - Update `.env` file with your credentials:
     ```
     SUPABASE_URL=https://your-project-url.supabase.co
     SUPABASE_ANON_KEY=your-anon-key
     ```

4. Create the database tables:
   - Open your Supabase project's SQL Editor
   - Copy the entire contents of `supabase-schema.sql`
   - Paste and run it in the SQL Editor
   - This will create all tables, policies, and indexes

### Running the App

```bash
npm start
```

Then choose your preferred platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web browser
- Scan QR code with Expo Go app on your device

## Tech Stack

- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **TypeScript**: Type safety and developer experience
- **Supabase**: Backend-as-a-Service with PostgreSQL and authentication
- **date-fns**: Date manipulation and formatting

## Project Structure

```
├── app/                   # Expo Router app directory
│   ├── index.tsx         # Main app entry point
│   └── _layout.tsx       # App layout configuration
├── components/           # Reusable UI components
│   ├── Auth.tsx         # Authentication form
│   ├── HomeScreen.tsx   # Main home screen
│   ├── AddItemModal.tsx # Modal for adding/editing items
│   ├── WeeklyBillGroup.tsx    # Weekly bill display
│   └── DeferredBillsAccordion.tsx # Deferred bills accordion
├── lib/                  # Utility libraries
│   ├── supabase.ts      # Supabase configuration and SQL
│   └── utils.ts         # Date and grouping utilities
├── types/               # TypeScript type definitions
│   └── index.ts         # Core data types
└── assets/              # Static assets (icons, images)
```

## Key Features

### Weekly Bill Grouping
Bills are automatically grouped into 6-week periods starting from the current week. Each week shows:
- Date range (e.g., "Nov 30 - Dec 6")
- Progress bar comparing total paychecks to total bills
- List of bills due that week with priorities and risk indicators

### Flexible Bill Scheduling
- **One-time bills**: Set a specific due date
- **Recurring bills**: Set a day of the month (1-31) for monthly recurrence

### Priority and Risk Management
- Three priority levels: Low, Medium, High
- Loss risk flag for bills that could result in service loss
- Deferred flag to move bills to a separate accordion section

### User-Centric Design
- All data is tied to authenticated users with Row Level Security (RLS)
- Intuitive modal forms for adding/editing
- Long-press to delete items
- Pull-to-refresh data loading

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.