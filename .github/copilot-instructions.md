# Banked - React Native Expo App with Supabase Integration

This is a React Native Expo app called "Banked" that helps users track bills and payments with Supabase backend integration.

## Project Features
- User authentication (sign up/login) with Supabase
- Bill tracking with due dates and priorities
- Payment tracking tied to bills
- Weekly grouped view of upcoming bills
- Progress bars showing paycheck vs bill totals
- Deferred bills in collapsible accordion
- Modal forms for adding/editing bills and paychecks

## Database Tables
- bills: name, amount, due_date/due_day, priority, loss_risk_flag, deferred_flag
- bill_payments: amount, applied_date
- paychecks: amount, date
- All records tied to authenticated users with RLS

## Tech Stack
- React Native with Expo
- TypeScript
- Supabase for backend and authentication
- Native UI components for forms and navigation
- date-fns for date manipulation

## Development Commands
- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web

## Important Setup Notes
1. Update `lib/supabase.ts` with your Supabase credentials
2. Run the SQL in `lib/supabase.ts` to create database tables
3. Use `npm start` and scan QR code with Expo Go app for testing