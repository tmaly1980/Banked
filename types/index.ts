export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date?: string; // For one-time bills
  due_day?: number; // For recurring monthly bills (1-31)
  priority: 'low' | 'medium' | 'high';
  loss_risk_flag: boolean;
  deferred_flag: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BillPayment {
  id: string;
  bill_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  applied_date?: string;
  is_paid: boolean;
  created_at: string;
}

export interface Deposit {
  id: string;
  user_id: string;
  name?: string;
  amount: number;
  date: string | null;
  notes?: string;
  recurring_deposit_id?: string;
  created_at: string;
}

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type RecurrenceUnit = 'week' | 'month';

export interface RecurringDeposit {
  id: string;
  user_id: string;
  amount: number;
  start_date: string;
  end_date?: string;
  recurrence_unit: RecurrenceUnit;
  interval: number;
  day_of_week?: DayOfWeek;
  day_of_month?: number;
  last_day_of_month: boolean;
  last_business_day_of_month: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  order: number;
  created_at: string;
}

export interface ExpenseBudget {
  id: string;
  user_id: string;
  expense_type_id: string;
  effective_from: string;
  effective_to?: string;
  start_mmdd?: string;
  end_mmdd?: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
  amount: number;
  notes?: string;
  created_at: string;
}

export interface ExpenseBudgetWithType extends ExpenseBudget {
  expense_type_name: string;
}

export interface ChecklistItem {
  id: string;
  name: string;
  checked: boolean;
  price?: number;
}

export interface ExpensePurchase {
  id: string;
  user_id: string;
  expense_type_id: string;
  description?: string;
  estimated_amount?: number;
  purchase_amount?: number;
  purchase_date?: string;
  checklist: ChecklistItem[];
  photos: string[];
  created_at: string;
}

import { BillModel } from '@/models/BillModel';

export interface WeeklyGroup {
  startDate: Date;
  endDate: Date;
  bills: BillModel[];
  totalBills: number;
  totalDeposits: number;
  carryoverBalance?: number;
}

export interface WeeklyDepositGroup {
  startDate: Date;
  endDate: Date;
  deposits: Deposit[];
  total: number;
}

export interface ExpenseBudgetGroup {
  startDate: Date;
  endDate: Date;
  expenses: ExpenseBudgetWithType[];
  totalAllocated: number;
}

export interface Gig {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  due_date: string;
  est_hours_total: number;
  hours_logged: number;
  hours_remaining: number;
  is_completed: boolean;
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface GigDeposit {
  id: string;
  gig_id: string;
  deposit_id: string;
  created_at: string;
}

export interface GigWithDeposits extends Gig {
  deposits: Deposit[];
}

export interface WeeklyGigGroup {
  startDate: Date;
  endDate: Date;
  gigs: GigWithDeposits[];
  totalAmount: number;
  totalHours: number;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  target_amount: number;
  remaining_amount?: number;
  due_date?: string;
  due_month?: string; // Format: YYYY-MM
  due_week?: string; // Format: YYYY-Www
  bill_id?: string;
  status: 'pending' | 'paid' | 'active' | 'completed' | 'cancelled';
  paid_at?: string;
  paid_amount?: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BillSuggestion {
  bill: Bill;
  relevance: 'name_match' | 'amount_match';
  score: number;
}

export interface IncomeSource {
  id: string;
  user_id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  pending_earnings: number;
  created_at: string;
  updated_at: string;
}
