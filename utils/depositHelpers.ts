import {
  addDays,
  addWeeks,
  addMonths,
  startOfMonth,
  endOfMonth,
  format,
  parseISO,
  isBefore,
  isAfter,
  isWeekend,
  subDays,
  getDay,
} from 'date-fns';
import { RecurringDeposit, DayOfWeek } from '@/types';

/**
 * Maps day of week string to date-fns day number
 */
const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Gets the last business day of a given month
 */
function getLastBusinessDayOfMonth(date: Date): Date {
  let lastDay = endOfMonth(date);
  
  // Move backwards from last day until we find a weekday
  while (isWeekend(lastDay)) {
    lastDay = subDays(lastDay, 1);
  }
  
  return lastDay;
}

/**
 * Gets the date for a specific day of week in a given week
 */
function getDateForDayOfWeek(startDate: Date, dayOfWeek: DayOfWeek): Date {
  const targetDay = DAY_OF_WEEK_MAP[dayOfWeek];
  const currentDay = getDay(startDate);
  const diff = targetDay - currentDay;
  
  return addDays(startDate, diff);
}

/**
 * Generates a single monthly deposit date based on the recurring rules
 */
function generateMonthlyDate(
  baseDate: Date,
  dayOfMonth?: number,
  lastDayOfMonth?: boolean,
  lastBusinessDayOfMonth?: boolean
): Date {
  if (lastBusinessDayOfMonth) {
    return getLastBusinessDayOfMonth(baseDate);
  }
  
  if (lastDayOfMonth) {
    return endOfMonth(baseDate);
  }
  
  if (dayOfMonth) {
    const monthStart = startOfMonth(baseDate);
    const monthEnd = endOfMonth(baseDate);
    const targetDate = new Date(monthStart);
    targetDate.setDate(dayOfMonth);
    
    // If the day doesn't exist in this month (e.g., Feb 31), use last day
    if (isAfter(targetDate, monthEnd)) {
      return monthEnd;
    }
    
    return targetDate;
  }
  
  // Default to first of month if no rule specified
  return startOfMonth(baseDate);
}

/**
 * Generates deposit instance dates from a recurring deposit within a date range
 */
export function generateRecurringDepositInstances(
  recurringDeposit: RecurringDeposit,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const instances: Date[] = [];
  const startDate = parseISO(recurringDeposit.start_date);
  const endDate = recurringDeposit.end_date ? parseISO(recurringDeposit.end_date) : null;
  
  // Determine the actual start date for generation (latest of recurring start or range start)
  let currentDate = isBefore(startDate, rangeStart) ? rangeStart : startDate;
  
  // For weekly recurrence, align to the correct day of week
  if (recurringDeposit.recurrence_unit === 'week' && recurringDeposit.day_of_week) {
    currentDate = getDateForDayOfWeek(currentDate, recurringDeposit.day_of_week);
    
    // If we're before the recurring start date, move forward
    while (isBefore(currentDate, startDate)) {
      currentDate = addWeeks(currentDate, recurringDeposit.interval);
    }
  }
  
  // For monthly recurrence, align to the correct day
  if (recurringDeposit.recurrence_unit === 'month') {
    currentDate = generateMonthlyDate(
      currentDate,
      recurringDeposit.day_of_month,
      recurringDeposit.last_day_of_month,
      recurringDeposit.last_business_day_of_month
    );
    
    // If we're before the recurring start date, move forward
    while (isBefore(currentDate, startDate)) {
      currentDate = addMonths(currentDate, recurringDeposit.interval);
      currentDate = generateMonthlyDate(
        currentDate,
        recurringDeposit.day_of_month,
        recurringDeposit.last_day_of_month,
        recurringDeposit.last_business_day_of_month
      );
    }
  }
  
  // Generate instances within the range
  while (
    !isAfter(currentDate, rangeEnd) &&
    (!endDate || !isAfter(currentDate, endDate))
  ) {
    // Only include if within range and after recurring start
    if (!isBefore(currentDate, rangeStart) && !isBefore(currentDate, startDate)) {
      instances.push(new Date(currentDate));
    }
    
    // Move to next occurrence
    if (recurringDeposit.recurrence_unit === 'week') {
      currentDate = addWeeks(currentDate, recurringDeposit.interval);
    } else {
      currentDate = addMonths(currentDate, recurringDeposit.interval);
      currentDate = generateMonthlyDate(
        currentDate,
        recurringDeposit.day_of_month,
        recurringDeposit.last_day_of_month,
        recurringDeposit.last_business_day_of_month
      );
    }
  }
  
  return instances;
}

/**
 * Formats a date as YYYY-MM-DD for database storage
 */
export function formatDateForDB(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Gets a human-readable description of the recurring pattern
 */
export function getRecurrenceDescription(recurringDeposit: RecurringDeposit): string {
  const { recurrence_unit, interval, day_of_week, day_of_month, last_day_of_month, last_business_day_of_month } = recurringDeposit;
  
  const intervalText = interval === 1 ? '' : `every ${interval} `;
  const unitText = interval === 1 ? recurrence_unit : `${recurrence_unit}s`;
  
  if (recurrence_unit === 'week' && day_of_week) {
    const dayName = day_of_week.charAt(0).toUpperCase() + day_of_week.slice(1);
    return `${intervalText}${unitText} on ${dayName}`;
  }
  
  if (recurrence_unit === 'month') {
    if (last_business_day_of_month) {
      return `${intervalText}${unitText} on last business day`;
    }
    if (last_day_of_month) {
      return `${intervalText}${unitText} on last day`;
    }
    if (day_of_month) {
      const suffix = day_of_month === 1 ? 'st' : day_of_month === 2 ? 'nd' : day_of_month === 3 ? 'rd' : 'th';
      return `${intervalText}${unitText} on ${day_of_month}${suffix}`;
    }
  }
  
  return `${intervalText}${unitText}`;
}
