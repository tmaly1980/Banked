import { Bill, BillPayment } from '@/types';

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
  created_at: string;
  updated_at: string;
  payments: BillPayment[];

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
    this.created_at = bill.created_at;
    this.updated_at = bill.updated_at;
    this.payments = payments;
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

  // Get the next due date for this bill
  get nextDueDate(): Date | null {
    if (this.due_date) {
      // One-time bill
      return new Date(this.due_date);
    } else if (this.due_day) {
      // Recurring bill - calculate next occurrence
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      
      // Try current month first
      let dueDate = new Date(year, month, this.due_day);
      
      // If the due date has passed, use next month
      if (dueDate < today) {
        dueDate = new Date(year, month + 1, this.due_day);
      }
      
      return dueDate;
    }
    return null;
  }

  // Check if bill is overdue
  get isOverdue(): boolean {
    const nextDue = this.nextDueDate;
    if (!nextDue) return false;
    return nextDue < new Date() && !this.isPaid;
  }

  // Get days until due (negative if overdue)
  get daysUntilDue(): number | null {
    const nextDue = this.nextDueDate;
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

  // Convert back to plain Bill object
  toBill(): Bill {
    return {
      id: this.id,
      user_id: this.user_id,
      name: this.name,
      amount: this.amount,
      due_date: this.due_date,
      due_day: this.due_day,
      priority: this.priority,
      loss_risk_flag: this.loss_risk_flag,
      deferred_flag: this.deferred_flag,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }

  // Add a payment to this bill
  addPayment(payment: BillPayment): void {
    this.payments.push(payment);
  }

  // Static method to create from database result with payments
  static fromDatabase(bill: Bill, payments: BillPayment[] = []): BillModel {
    return new BillModel(bill, payments);
  }
}
