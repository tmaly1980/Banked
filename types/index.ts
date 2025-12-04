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

export interface Paycheck {
  id: string;
  user_id: string;
  name?: string;
  amount: number;
  date: string | null;
  notes?: string;
  created_at: string;
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
  start_date: string;
  end_date?: string;
  amount: number;
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
  title?: string;
  estimated_amount?: number;
  purchase_amount?: number;
  purchase_date?: string;
  checklist: ChecklistItem[];
  photos: string[];
  notes?: string;
  created_at: string;
}

import { BillModel } from '@/models/BillModel';

export interface WeeklyGroup {
  startDate: Date;
  endDate: Date;
  bills: BillModel[];
  totalBills: number;
  totalPaychecks: number;
  carryoverBalance: number;
}

export interface WeeklyPaycheckGroup {
  startDate: Date;
  endDate: Date;
  paychecks: Paycheck[];
  total: number;
}

export interface ExpenseBudgetGroup {
  startDate: Date;
  endDate: Date;
  expenses: ExpenseBudgetWithType[];
  totalSpent: number;
  totalAllocated: number;
}

export interface Gig {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  total_hours?: number;
  total_amount: number;
  checklist: ChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface GigPaycheck {
  id: string;
  gig_id: string;
  paycheck_id: string;
  created_at: string;
}

export interface GigWithPaychecks extends Gig {
  paychecks: Paycheck[];
}

export interface WeeklyGigGroup {
  startDate: Date;
  endDate: Date;
  gigs: GigWithPaychecks[];
  totalAmount: number;
  totalHours: number;
}
