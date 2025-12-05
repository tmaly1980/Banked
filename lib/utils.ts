import { startOfWeek, endOfWeek, addWeeks, format, isSameWeek, parseISO } from 'date-fns';
import { WeeklyGroup, ExpenseBudgetGroup, ExpenseBudget, ExpenseType, ExpenseBudgetWithType, WeeklyGigGroup, GigWithPaychecks } from '../types';
import { BillModel } from '@/models/BillModel';

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
      carryoverBalance: 0,
    });
  }
  
  return weeks;
};

export const formatWeekLabel = (startDate: Date, endDate: Date): string => {
  return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
};

export const formatAmount = (amount: number): string => {
  const absAmount = Math.abs(amount);
  const formattedAmount = absAmount.toFixed(0);
  return amount < 0 ? `-$${formattedAmount}` : `$${formattedAmount}`;
};

export const groupExpensesByWeek = (
  expenseBudgets: ExpenseBudget[],
  expenseTypes: ExpenseType[]
): ExpenseBudgetGroup[] => {
  const groups: ExpenseBudgetGroup[] = [];
  const today = new Date();

  // Get next 6 weeks starting from today (Sunday-Saturday)
  for (let i = 0; i < 6; i++) {
    const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 0 }), i);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');

    // Get expense budgets for this week with their type names
    const weekExpensesList = expenseBudgets
      .filter(exp => exp.start_date === weekKey)
      .map(exp => {
        const expenseType = expenseTypes.find(t => t.id === exp.expense_type_id);
        return {
          ...exp,
          expense_type_name: expenseType?.name || 'Unknown',
        } as ExpenseBudgetWithType;
      });

    const totalSpent = weekExpensesList.reduce((sum, exp) => sum + exp.spent_amount, 0);
    const totalAllocated = weekExpensesList.reduce((sum, exp) => sum + exp.allocated_amount, 0);

    groups.push({
      startDate: weekStart,
      endDate: weekEnd,
      expenses: weekExpensesList,
      totalSpent,
      totalAllocated,
    });
  }

  return groups;
};

export const groupGigsByWeek = (gigs: GigWithPaychecks[]): WeeklyGigGroup[] => {
  const groups: WeeklyGigGroup[] = [];
  const today = new Date();

  // Get next 6 weeks starting from today (Sunday-Saturday)
  for (let i = 0; i < 6; i++) {
    const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 0 }), i);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

    // Find gigs that overlap with this week
    const weekGigs = gigs.filter(gig => {
      const gigStart = parseISO(gig.start_date);
      const gigEnd = parseISO(gig.end_date);
      
      // Check if gig date range overlaps with week range
      return gigStart <= weekEnd && gigEnd >= weekStart;
    });

    const totalAmount = weekGigs.reduce((sum, gig) => sum + gig.total_amount, 0);
    const totalHours = weekGigs.reduce((sum, gig) => sum + (gig.total_hours || 0), 0);

    groups.push({
      startDate: weekStart,
      endDate: weekEnd,
      gigs: weekGigs,
      totalAmount,
      totalHours,
    });
  }

  return groups;
};

export const getBillDueDate = (bill: BillModel, startingDate?: Date): Date | null => {
  // Use the bill's method with the provided reference date
  return bill.getNextDueDate(startingDate || new Date());
};

export const groupBillsByWeek = (bills: BillModel[]): WeeklyGroup[] => {
  const weeks = getNext6Weeks();
  
  bills.forEach(bill => {
    if (bill.deferred_flag) return; // Skip deferred bills
    
    // Use next_date which considers deferred payments
    const nextDate = bill.next_date;
    if (!nextDate) return;
    
    // Handle bills with specific due_date (one-time bills)
    if (bill.due_date) {
      const dueDate = parseISO(bill.due_date);
      const weekIndex = weeks.findIndex(week => 
        dueDate >= week.startDate && dueDate <= week.endDate
      );
      
      if (weekIndex >= 0) {
        weeks[weekIndex].bills.push(bill);
        weeks[weekIndex].totalBills += bill.amount;
      }
    }
    // Handle recurring bills with due_day
    else if (bill.due_day) {
      // Add this bill to each week where the due_day falls within the week range
      weeks.forEach(week => {
        const weekStartDay = week.startDate.getDate();
        const weekEndDay = week.endDate.getDate();
        const weekStartMonth = week.startDate.getMonth();
        const weekEndMonth = week.endDate.getMonth();
        const weekStartYear = week.startDate.getFullYear();
        const weekEndYear = week.endDate.getFullYear();
        
        // Check if the due_day falls within this week
        // Handle case where week spans across months
        if (weekStartMonth === weekEndMonth) {
          // Week is within same month
          const dueDay = bill.due_day!; // Already checked due_day exists above
          if (dueDay >= weekStartDay && dueDay <= weekEndDay) {
            const dueDate = new Date(weekStartYear, weekStartMonth, dueDay);
            // Only add if the due date is actually within the week range (edge case for month boundaries)
            if (dueDate >= week.startDate && dueDate <= week.endDate) {
              week.bills.push(bill);
              week.totalBills += bill.amount;
            }
          }
        } else {
          // Week spans two months
          const dueDay = bill.due_day!; // Already checked due_day exists above
          const startMonthDueDate = new Date(weekStartYear, weekStartMonth, dueDay);
          const endMonthDueDate = new Date(weekEndYear, weekEndMonth, dueDay);
          
          // Check if due date falls in either month within the week range
          if ((startMonthDueDate >= week.startDate && startMonthDueDate <= week.endDate) ||
              (endMonthDueDate >= week.startDate && endMonthDueDate <= week.endDate)) {
            week.bills.push(bill);
            week.totalBills += bill.amount;
          }
        }
      });
    }
  });
  
  return weeks;
};