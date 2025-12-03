import moment from 'moment-timezone';
import * as Localization from 'expo-localization';

/**
 * Convert a database timestamp (ISO string) to YYYY-MM-DD format in device timezone
 * @param timestamp - ISO timestamp string from database
 * @returns Date string in YYYY-MM-DD format
 */
export function timestampToDate(timestamp: string): string {
  const timezone = Localization.getCalendars()[0]?.timeZone || 'America/New_York';
  const result = moment(timestamp).tz(timezone).format('YYYY-MM-DD');
  console.log('[timestampToDate]', {
    input: timestamp,
    timezone,
    output: result,
  });
  return result;
}

/**
 * Convert a YYYY-MM-DD date string to ISO timestamp with device timezone
 * @param dateString - Date in YYYY-MM-DD format
 * @returns ISO timestamp string with timezone
 */
export function dateToTimestamp(dateString: string): string {
  const timezone = Localization.getCalendars()[0]?.timeZone || 'America/New_York';
  // Set time to noon to avoid day boundary issues
  const result = moment.tz(dateString + ' 12:00:00', 'YYYY-MM-DD HH:mm:ss', timezone).toISOString();
  console.log('[dateToTimestamp]', {
    input: dateString,
    timezone,
    output: result,
  });
  return result;
}

/**
 * Convert a Date object to YYYY-MM-DD format in device timezone
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function localDate(date: Date): string {
    const timezone = Localization.getCalendars()[0]?.timeZone || 'America/New_York';
    return moment(date).tz(timezone).format('YYYY-MM-DD');
}
