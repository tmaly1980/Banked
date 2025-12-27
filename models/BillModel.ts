import { BillPayment } from '@/types';
import { PaymentModel } from './PaymentModel';

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  due_date?: string;
  due_day?: number;
  priority: 'low' | 'medium' | 'high';
  loss_risk_flag: boolean;
  deferred_flag: boolean;
  alert_flag?: boolean;
  urgent_note?: string | null;
  is_variable?: boolean;
  category_id?: string | null;
  category_name?: string;
  notes?: string;
  start_month_year?: string | null;
  end_month_year?: string | null;
  created_at: string;
  updated_at: string;
  // Fields from get_upcoming_bills function
  next_due_date?: string;
  days_until_due?: number;
  is_overdue?: boolean;
  is_deferred_active?: boolean;
  deferred_months?: string[];
  last_payment_date?: string;
  total_paid?: number;
  // Current billing period payment tracking
  total_amount?: number;
  partial_payment?: number;
  remaining_amount?: number;
  // Variable bill statement fields
  statement_balance?: number;
  statement_minimum_due?: number;
  statement_date?: string;
  updated_balance?: number;
}

export class BillModel {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  due_date?: string;
  due_day?: number;
  priority: 'low' | 'medium' | 'high';
  loss_risk_flag: boolean;
  deferred_flag: boolean;
  alert_flag?: boolean;
  urgent_note?: string | null;
  is_variable?: boolean;
  category_id?: string | null;
  category_name?: string;
  notes?: string;
  start_month_year?: string | null;
  end_month_year?: string | null;
  created_at: string;
  updated_at: string;
  payments: PaymentModel[];
  // Fields from get_upcoming_bills function
  next_due_date?: string;
  days_until_due?: number;
  is_overdue?: boolean;
  is_deferred_active?: boolean;
  deferred_months?: string[];
  last_payment_date?: string;
  total_paid_from_db?: number;
  // Current billing period payment tracking
  total_amount?: number;
  partial_payment?: number;
  remaining_amount?: number;
  // Variable bill statement fields
  statement_balance?: number;
  statement_minimum_due?: number;
  statement_date?: string;
  updated_balance?: number;

  constructor(bill: Bill, payments: BillPayment[] = []) {
    this.id = bill.id;
    this.user_id = bill.user_id;
    this.name = bill.name;
    this.amount = bill.amount;
    this.due_date = bill.due_date;
    this.due_day = bill.due_day;
    this.priority = bill.priority;
    this.loss_risk_flag = bill.loss_risk_flag;
    this.deferred_flag = bill.deferred_flag;
    this.alert_flag = bill.alert_flag;
    this.urgent_note = bill.urgent_note;
    this.is_variable = bill.is_variable;
    this.category_id = bill.category_id;
    this.category_name = bill.category_name;
    this.notes = bill.notes;
    this.start_month_year = bill.start_month_year;
    this.end_month_year = bill.end_month_year;
    this.created_at = bill.created_at;
    this.updated_at = bill.updated_at;
    this.payments = PaymentModel.fromDatabaseArray(payments);
    // SQL function fields
    this.next_due_date = bill.next_due_date;
    this.days_until_due = bill.days_until_due;
    this.is_overdue = bill.is_overdue;
    this.is_deferred_active = bill.is_deferred_active;
    this.deferred_months = bill.deferred_months;
    this.last_payment_date = bill.last_payment_date;
    this.total_paid_from_db = bill.total_paid;
    // Current billing period payment tracking
    this.total_amount = bill.total_amount;
    this.partial_payment = bill.partial_payment;
    this.remaining_amount = bill.remaining_amount;
    // Variable bill statement fields
    this.statement_balance = bill.statement_balance;
    this.statement_minimum_due = bill.statement_minimum_due;
    this.statement_date = bill.statement_date;
    this.updated_balance = bill.updated_balance;
  }

  // Calculate total amount paid on this bill
  get totalPaid(): number {
    return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  // Calculate remaining amount to be paid
  get amountRemaining(): number {
    if (this.amount === null) return 0;
    return Math.max(0, this.amount - this.totalPaid);
  }

  // Check if bill is fully paid
  get isPaid(): boolean {
    if (this.amount === null) return false;
    return this.totalPaid >= this.amount;
  }

  // Get payment progress as percentage
  get paymentProgress(): number {
    if (this.amount === null || this.amount === 0) return 0;
    return Math.min(100, (this.totalPaid / this.amount) * 100);
  }

  // Check if this is a recurring bill
  get isRecurring(): boolean {
    return this.due_day !== undefined && this.due_day !== null;
  }

  // Get the next due date for this bill (from a reference date)
  // For week-based views, use getBillDueDate() from utils instead
  getNextDueDate(fromDate: Date = new Date()): Date | null {
    if (this.due_date) {
      // One-time bill
      return new Date(this.due_date);
    } else if (this.due_day) {
      // Recurring bill - calculate next occurrence from reference date
      const refDate = new Date(fromDate);
      refDate.setHours(0, 0, 0, 0);
      const year = refDate.getFullYear();
      const month = refDate.getMonth();
      
      // Try current month first
      let dueDate = new Date(year, month, this.due_day);
      
      // If the due date has passed the reference date, use next month
      if (dueDate < refDate) {
        dueDate = new Date(year, month + 1, this.due_day);
      }
      
      return dueDate;
    }
    return null;
  }

  // Get the next date (scheduled payment date or due date)
  get next_date(): Date | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check for scheduled payment (payment_date > today)
    const scheduledPayment = this.payments.find(payment => {
      const paymentDate = new Date(payment.payment_date);
      paymentDate.setHours(0, 0, 0, 0);
      return paymentDate > today;
    });
    
    if (scheduledPayment?.payment_date) {
      return new Date(scheduledPayment.payment_date);
    }
    
    // For recurring bills, find the most recent due date that hasn't been paid
    if (this.due_day) {
      // Get the most recent payment date
      const sortedPayments = [...this.payments]
        .sort((a, b) => new Date(b.lastPaymentDate).getTime() - new Date(a.lastPaymentDate).getTime());
      
      const lastPayment = sortedPayments[0];

      console.log('Last payment for bill', this.id, ':', lastPayment);
      
      if (lastPayment) {
        const lastPaymentDate = new Date(lastPayment.lastPaymentDate);
        console.log('Last payment date:', lastPayment.lastPaymentDate);
        lastPaymentDate.setHours(0, 0, 0, 0);
        
        // Calculate the due date for the month after the last payment
        const year = lastPaymentDate.getFullYear();
        const month = lastPaymentDate.getMonth();
        
        // Try the same month first
        let nextDue = new Date(year, month, this.due_day);
        
        // If that's before the payment date, use next month
        if (nextDue <= lastPaymentDate) {
          nextDue = new Date(year, month + 1, this.due_day);
        }
        
        return nextDue;
      }
    }
    
    // Fall back to regular due date calculation
    return this.getNextDueDate();
  }

  // Check if bill is overdue
  get isOverdue(): boolean {
    const nextDue = this.next_date;
    if (!nextDue) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(nextDue);
    dueDate.setHours(0, 0, 0, 0);
    
    // Bill is overdue if the next_date is in the past
    return dueDate < today;
  }

  // Get days until due (negative if overdue)
  get daysUntilDue(): number | null {
    const nextDue = this.getNextDueDate();
    if (!nextDue) return null;
    
    const today = new Date();
    const diffTime = nextDue.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Get priority color
  get priorityColor(): string {
    switch (this.priority) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f59e0b'; // orange
      case 'low':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  }

  // Add a payment to this bill
  addPayment(payment: BillPayment): void {
    this.payments.push(new PaymentModel(payment));
  }

  // Static method to create from database result with payments
  static fromDatabase(bill: Bill, payments: BillPayment[] = []): BillModel {
    return new BillModel(bill, payments);
  }
}
