import { differenceInDays } from 'date-fns';
import { BillPayment } from '@/types';

export interface DaysLateBadge {
  days: number;
  color: string;
}

export const getDaysLateBadge = (payment: BillPayment): DaysLateBadge | null => {
  const appliedDateStr = payment.applied_date || payment.payment_date;
  const appliedDateObj = new Date(appliedDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  appliedDateObj.setHours(0, 0, 0, 0);
  
  const daysLate = differenceInDays(today, appliedDateObj);
  
  if (daysLate <= 0) return null;
  
  let backgroundColor = '#ffc107'; // yellow
  if (daysLate >= 60) {
    backgroundColor = '#dc3545'; // red
  } else if (daysLate >= 30) {
    backgroundColor = '#fd7e14'; // orange-red
  } else if (daysLate >= 15) {
    backgroundColor = '#ff9800'; // yellow-orange
  }
  
  return { days: daysLate, color: backgroundColor };
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high': return '#e74c3c';
    case 'medium': return '#f39c12';
    case 'low': return '#27ae60';
    default: return '#95a5a6';
  }
};

export const getPriorityIcon = (priority: string): 'signal-cellular-1' | 'signal-cellular-2' | 'signal-cellular-3' => {
  switch (priority) {
    case 'high': return 'signal-cellular-3';
    case 'medium': return 'signal-cellular-2';
    case 'low': return 'signal-cellular-1';
    default: return 'signal-cellular-1';
  }
};

export const formatAmount = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const separatePaymentsBySchedule = (payments: BillPayment[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const scheduledPayments = payments.filter(payment => {
    const paymentDate = new Date(payment.payment_date);
    paymentDate.setHours(0, 0, 0, 0);
    return paymentDate > today;
  });

  const paymentHistory = payments.filter(payment => {
    const paymentDate = new Date(payment.payment_date);
    paymentDate.setHours(0, 0, 0, 0);
    return paymentDate <= today;
  });

  return { scheduledPayments, paymentHistory };
};
