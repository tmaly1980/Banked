import { startOfWeek, endOfWeek, addWeeks, format, isSameWeek, parseISO } from 'date-fns';
import { Bill, WeeklyGroup } from '../types';

export const getWeekRange = (date: Date) => ({
  start: startOfWeek(date, { weekStartsOn: 0 }), // Sunday
  end: endOfWeek(date, { weekStartsOn: 0 }), // Saturday
});

export const getNext6Weeks = (): WeeklyGroup[] => {
  const weeks: WeeklyGroup[] = [];
  const today = new Date();
  
  for (let i = 0; i < 6; i++) {
    const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 0 }), i);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    
    weeks.push({
      startDate: weekStart,
      endDate: weekEnd,
      bills: [],
      totalBills: 0,
      totalPaychecks: 0,
    });
  }
  
  return weeks;
};

export const formatWeekLabel = (startDate: Date, endDate: Date): string => {
  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
};

export const getBillDueDate = (bill: Bill): Date | null => {
  if (bill.due_date) {
    return parseISO(bill.due_date);
  }
  
  if (bill.due_day) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Try current month first
    const thisMonth = new Date(currentYear, currentMonth, bill.due_day);
    if (thisMonth >= today) {
      return thisMonth;
    }
    
    // If past due this month, try next month
    const nextMonth = new Date(currentYear, currentMonth + 1, bill.due_day);
    return nextMonth;
  }
  
  return null;
};

export const groupBillsByWeek = (bills: Bill[]): WeeklyGroup[] => {
  const weeks = getNext6Weeks();
  
  bills.forEach(bill => {
    if (bill.deferred_flag) return; // Skip deferred bills
    
    const dueDate = getBillDueDate(bill);
    if (!dueDate) return;
    
    const weekIndex = weeks.findIndex(week => 
      dueDate >= week.startDate && dueDate <= week.endDate
    );
    
    if (weekIndex >= 0) {
      weeks[weekIndex].bills.push(bill);
      weeks[weekIndex].totalBills += bill.amount;
    }
  });
  
  return weeks;
};