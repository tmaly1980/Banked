import { BillPayment } from '@/types';

export class PaymentModel {
  id: string;
  bill_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  applied_date?: string;
  is_paid: boolean;
  created_at: string;

  constructor(payment: BillPayment) {
    this.id = payment.id;
    this.bill_id = payment.bill_id;
    this.user_id = payment.user_id;
    this.amount = payment.amount;
    this.payment_date = payment.payment_date;
    this.applied_date = payment.applied_date;
    this.is_paid = payment.is_paid;
    this.created_at = payment.created_at;
  }

  // Get the last payment date - prioritizes applied_date, falls back to payment_date
  get lastPaymentDate(): string {
    return this.applied_date || this.payment_date;
  }

  // Static method to create from database result
  static fromDatabase(payment: BillPayment): PaymentModel {
    return new PaymentModel(payment);
  }

  // Convert array of BillPayments to PaymentModels
  static fromDatabaseArray(payments: BillPayment[]): PaymentModel[] {
    return payments.map(p => new PaymentModel(p));
  }
}
