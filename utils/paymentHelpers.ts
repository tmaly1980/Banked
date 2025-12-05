import { differenceInDays, differenceInMonths, startOfDay } from 'date-fns';
import { BillPayment } from '@/types';

export interface DaysLateBadge {
  days: number;
  color: string;
}

/**
 * Calculate this month's due date based on the bill's due day
 * @param dueDay - The day of the month the bill is due (1-31)
 * @returns Date object for this month's due date
 */
export const getThisMonthDueDate = (dueDay: number): Date => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Create date for this month's due day
  const dueDate = new Date(year, month, dueDay);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate;
};

/**
 * Calculate the number of complete months since the last payment
 * @param lastPaymentDate - The date of the last payment (string or Date)
 * @returns Number of complete months since last payment
 */
export const getMonthsSinceLastPayment = (lastPaymentDate: string | Date): number => {
  const today = startOfDay(new Date());
  const paymentDate = startOfDay(new Date(lastPaymentDate));
  
  return differenceInMonths(today, paymentDate);
};

export const getDaysLateBadge = (payment: BillPayment, dueDay?: number): DaysLateBadge | null => {
  const appliedDateStr = payment.applied_date || payment.payment_date;
  const appliedDateObj = new Date(appliedDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  appliedDateObj.setHours(0, 0, 0, 0);
  
  const monthsSinceLastPayment = getMonthsSinceLastPayment(appliedDateStr);
  
  // Determine if we should show the late badge
  let showBadge = false;
  
  if (monthsSinceLastPayment > 1) {
    // More than 1 month since last payment
    showBadge = true;
  } else if (dueDay) {
    // Check if this month's due date has passed
    const thisMonthDueDate = getThisMonthDueDate(dueDay);
    if (thisMonthDueDate < today) {
      showBadge = true;
    }
  }
  
  if (!showBadge) return null;
  
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
