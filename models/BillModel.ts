import { BillPayment } from '@/types';
import { PaymentModel } from './PaymentModel';

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date?: string;
  due_day?: number;
  priority: 'low' | 'medium' | 'high';
  loss_risk_flag: boolean;
  deferred_flag: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class BillModel {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date?: string;
  due_day?: number;
  priority: 'low' | 'medium' | 'high';
  loss_risk_flag: boolean;
  deferred_flag: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  payments: PaymentModel[];

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
    this.notes = bill.notes;
    this.created_at = bill.created_at;
    this.updated_at = bill.updated_at;
    this.payments = PaymentModel.fromDatabaseArray(payments);
  }

  // Calculate total amount paid on this bill
  get totalPaid(): number {
    return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  // Calculate remaining amount to be paid
  get amountRemaining(): number {
    return Math.max(0, this.amount - this.totalPaid);
  }

  // Check if bill is fully paid
  get isPaid(): boolean {
    return this.totalPaid >= this.amount;
  }

  // Get payment progress as percentage
  get paymentProgress(): number {
    if (this.amount === 0) return 100;
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
