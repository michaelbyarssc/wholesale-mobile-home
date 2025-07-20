/**
 * Comprehensive timezone utilities for delivery management
 * All dates stored as "YYYY-MM-DD HH:MM:SS TZ" format based on delivery location
 */

export type TimezoneAbbreviation = 'EST' | 'CST' | 'MST' | 'PST' | 'EDT' | 'CDT' | 'MDT' | 'PDT';

// State to timezone mappings (including DST handling)
const STATE_TIMEZONE_MAP: Record<string, { standard: TimezoneAbbreviation; daylight: TimezoneAbbreviation; tzName: string }> = {
  // Eastern Time
  'AL': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'CT': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'DE': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'FL': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'GA': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'IN': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'KY': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'ME': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'MD': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'MA': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'MI': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'NH': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'NJ': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'NY': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'NC': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'OH': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'PA': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'RI': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'SC': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'TN': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'VT': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'VA': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  'WV': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' },
  
  // Central Time
  'AR': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'IL': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'IA': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'KS': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'LA': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'MN': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'MS': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'MO': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'NE': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'ND': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'OK': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'SD': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'TX': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  'WI': { standard: 'CST', daylight: 'CDT', tzName: 'America/Chicago' },
  
  // Mountain Time
  'AZ': { standard: 'MST', daylight: 'MST', tzName: 'America/Phoenix' }, // Arizona doesn't observe DST
  'CO': { standard: 'MST', daylight: 'MDT', tzName: 'America/Denver' },
  'ID': { standard: 'MST', daylight: 'MDT', tzName: 'America/Denver' },
  'MT': { standard: 'MST', daylight: 'MDT', tzName: 'America/Denver' },
  'NV': { standard: 'MST', daylight: 'MDT', tzName: 'America/Denver' },
  'NM': { standard: 'MST', daylight: 'MDT', tzName: 'America/Denver' },
  'UT': { standard: 'MST', daylight: 'MDT', tzName: 'America/Denver' },
  'WY': { standard: 'MST', daylight: 'MDT', tzName: 'America/Denver' },
  
  // Pacific Time
  'CA': { standard: 'PST', daylight: 'PDT', tzName: 'America/Los_Angeles' },
  'OR': { standard: 'PST', daylight: 'PDT', tzName: 'America/Los_Angeles' },
  'WA': { standard: 'PST', daylight: 'PDT', tzName: 'America/Los_Angeles' },
  
  // Alaska and Hawaii (treated as special cases)
  'AK': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' }, // Default to Eastern
  'HI': { standard: 'EST', daylight: 'EDT', tzName: 'America/New_York' }, // Default to Eastern
};

/**
 * Extract state from delivery address and determine timezone
 */
export function getTimezoneFromAddress(address: string): { abbrev: TimezoneAbbreviation; tzName: string } {
  if (!address) {
    return { abbrev: 'EST', tzName: 'America/New_York' }; // Default to Eastern
  }
  
  // Look for state abbreviation in address (last 2 letters before zip or at end)
  const stateMatch = address.match(/\b([A-Z]{2})\b(?:\s+\d{5})?$/i);
  const state = stateMatch?.[1]?.toUpperCase();
  
  if (state && STATE_TIMEZONE_MAP[state]) {
    const tzInfo = STATE_TIMEZONE_MAP[state];
    const isDST = isDaylightSavingTime();
    return {
      abbrev: isDST ? tzInfo.daylight : tzInfo.standard,
      tzName: tzInfo.tzName
    };
  }
  
  // Default to Eastern Time
  return { abbrev: 'EST', tzName: 'America/New_York' };
}

/**
 * Check if it's currently daylight saving time
 */
function isDaylightSavingTime(): boolean {
  const now = new Date();
  const year = now.getFullYear();
  
  // DST starts on second Sunday in March
  const dstStart = new Date(year, 2, 8); // March 8th
  dstStart.setDate(dstStart.getDate() + (7 - dstStart.getDay()) % 7); // Next Sunday
  
  // DST ends on first Sunday in November
  const dstEnd = new Date(year, 10, 1); // November 1st
  dstEnd.setDate(dstEnd.getDate() + (7 - dstEnd.getDay()) % 7); // Next Sunday
  
  return now >= dstStart && now < dstEnd;
}

/**
 * Format date and time into timezone-aware string for database storage
 * Format: "YYYY-MM-DD HH:MM:SS TZ"
 */
export function formatDateTimeForStorage(date: Date, time: string, deliveryAddress?: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const { abbrev } = getTimezoneFromAddress(deliveryAddress || '');
  
  return `${year}-${month}-${day} ${time}:00 ${abbrev}`;
}

/**
 * Parse timezone-aware date string from database
 * Returns a Date object representing the local time in the specified timezone
 */
export function parseDateTimeFromStorage(dateTimeString: string): { date: Date; timezone: TimezoneAbbreviation } | null {
  if (!dateTimeString) return null;
  
  // Match format: "YYYY-MM-DD HH:MM:SS TZ"
  const match = dateTimeString.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([A-Z]{3})$/);
  
  if (!match) {
    // Fallback for ISO dates (for migration)
    try {
      const date = new Date(dateTimeString);
      return { date, timezone: 'EST' };
    } catch {
      return null;
    }
  }
  
  const [, year, month, day, hour, minute, second, timezone] = match;
  
  // Create date object in local time (this represents the actual time in the delivery timezone)
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
  
  return { date, timezone: timezone as TimezoneAbbreviation };
}

/**
 * Format a stored datetime string for display
 * Returns: "M/D/YYYY at H:MM AM/PM TZ"
 */
export function formatDateTimeForDisplay(dateTimeString: string | null): string {
  if (!dateTimeString) return 'Not scheduled';
  
  const parsed = parseDateTimeFromStorage(dateTimeString);
  if (!parsed) return 'Invalid date';
  
  const { date, timezone } = parsed;
  
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return `${formattedDate} at ${formattedTime} ${timezone}`;
}

/**
 * Convert a date/time selection to timezone-aware format immediately for UI display
 */
export function formatDateTimeForUIDisplay(date: Date, time: string, deliveryAddress?: string): string {
  const { abbrev } = getTimezoneFromAddress(deliveryAddress || '');
  
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  // Parse and format time
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${formattedDate} at ${displayHour}:${minutes} ${ampm} ${abbrev}`;
}

/**
 * Validate that a datetime string has timezone information
 */
export function validateTimezoneAwareDate(dateTimeString: string): boolean {
  if (!dateTimeString) return false;
  
  // Check if it matches our expected format
  const timezonePattern = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([A-Z]{3})$/;
  return timezonePattern.test(dateTimeString);
}

/**
 * Convert UTC date (from existing data) to timezone-aware format
 */
export function convertUTCToTimezoneAware(utcDateString: string, deliveryAddress?: string): string {
  if (!utcDateString) return '';
  
  try {
    const utcDate = new Date(utcDateString);
    const { abbrev, tzName } = getTimezoneFromAddress(deliveryAddress || '');
    
    // Convert to local time in the delivery timezone
    const localTime = new Date(utcDate.toLocaleString('en-US', { timeZone: tzName }));
    
    const year = localTime.getFullYear();
    const month = String(localTime.getMonth() + 1).padStart(2, '0');
    const day = String(localTime.getDate()).padStart(2, '0');
    const hour = String(localTime.getHours()).padStart(2, '0');
    const minute = String(localTime.getMinutes()).padStart(2, '0');
    const second = String(localTime.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second} ${abbrev}`;
  } catch (error) {
    console.error('Error converting UTC to timezone-aware:', error);
    return '';
  }
}

/**
 * Get current date/time in timezone-aware format for a delivery address
 */
export function getCurrentTimezoneAwareDateTime(deliveryAddress?: string): string {
  const now = new Date();
  const { abbrev } = getTimezoneFromAddress(deliveryAddress || '');
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second} ${abbrev}`;
}