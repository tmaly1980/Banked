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
  created_at: string;
}

export interface Paycheck {
  id: string;
  user_id: string;
  name?: string;
  amount: number;
  date: string;
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