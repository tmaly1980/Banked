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
import { RecurringPaycheck, DayOfWeek } from '@/types';

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
 * Generates a single monthly paycheck date based on the recurring rules
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
 * Generates paycheck instance dates from a recurring paycheck within a date range
 */
export function generateRecurringPaycheckInstances(
  recurringPaycheck: RecurringPaycheck,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const instances: Date[] = [];
  const startDate = parseISO(recurringPaycheck.start_date);
  const endDate = recurringPaycheck.end_date ? parseISO(recurringPaycheck.end_date) : null;
  
  // Determine the actual start date for generation (latest of recurring start or range start)
  let currentDate = isBefore(startDate, rangeStart) ? rangeStart : startDate;
  
  // For weekly recurrence, align to the correct day of week
  if (recurringPaycheck.recurrence_unit === 'week' && recurringPaycheck.day_of_week) {
    currentDate = getDateForDayOfWeek(currentDate, recurringPaycheck.day_of_week);
    
    // If we're before the recurring start date, move forward
    while (isBefore(currentDate, startDate)) {
      currentDate = addWeeks(currentDate, recurringPaycheck.interval);
    }
  }
  
  // For monthly recurrence, align to the correct day
  if (recurringPaycheck.recurrence_unit === 'month') {
    currentDate = generateMonthlyDate(
      currentDate,
      recurringPaycheck.day_of_month,
      recurringPaycheck.last_day_of_month,
      recurringPaycheck.last_business_day_of_month
    );
    
    // If we're before the recurring start date, move forward
    while (isBefore(currentDate, startDate)) {
      currentDate = addMonths(currentDate, recurringPaycheck.interval);
      currentDate = generateMonthlyDate(
        currentDate,
        recurringPaycheck.day_of_month,
        recurringPaycheck.last_day_of_month,
        recurringPaycheck.last_business_day_of_month
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
    if (recurringPaycheck.recurrence_unit === 'week') {
      currentDate = addWeeks(currentDate, recurringPaycheck.interval);
    } else {
      currentDate = addMonths(currentDate, recurringPaycheck.interval);
      currentDate = generateMonthlyDate(
        currentDate,
        recurringPaycheck.day_of_month,
        recurringPaycheck.last_day_of_month,
        recurringPaycheck.last_business_day_of_month
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
export function getRecurrenceDescription(recurringPaycheck: RecurringPaycheck): string {
  const { recurrence_unit, interval, day_of_week, day_of_month, last_day_of_month, last_business_day_of_month } = recurringPaycheck;
  
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
