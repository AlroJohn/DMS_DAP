/**
 * Utility functions for calculating and formatting durations
 */

export interface DurationResult {
  days: number;
  hours: number;
  minutes: number;
  totalHours: number;
  totalMinutes: number;
  humanReadable: string;
  shortFormat: string;
}

/**
 * Calculate duration between two dates
 */
export function calculateDuration(startDate: Date | string, endDate: Date | string): DurationResult {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const diffMs = end.getTime() - start.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    days: diffDays,
    hours,
    minutes,
    totalHours: diffHours,
    totalMinutes: diffMinutes,
    humanReadable: formatDurationLong(diffDays, hours, minutes),
    shortFormat: formatDurationShort(diffDays, hours, minutes)
  };
}

/**
 * Format duration in long format (e.g., "2 days, 3 hours, 15 minutes")
 */
function formatDurationLong(days: number, hours: number, minutes: number): string {
  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  
  return parts.join(', ');
}

/**
 * Format duration in short format (e.g., "2d 3h 15m")
 */
function formatDurationShort(days: number, hours: number, minutes: number): string {
  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }
  
  return parts.join(' ');
}

/**
 * Calculate total duration from document creation to now
 */
export function calculateTotalDocumentDuration(createdAt: string | Date): DurationResult {
  return calculateDuration(createdAt, new Date());
}

/**
 * Calculate expected duration based on process type
 */
export function getExpectedDuration(durationValue: number | null, durationUnit: string | null): string {
  if (!durationValue || !durationUnit) {
    return 'Not specified';
  }
  
  const unit = durationUnit.toLowerCase();
  const value = durationValue;
  
  return `${value} ${value === 1 ? unit.replace(/s$/, '') : unit}`;
}

/**
 * Compare actual duration with expected duration
 */
export function compareDurations(
  actualDays: number,
  expectedValue: number | null,
  expectedUnit: string | null
): { status: 'on-time' | 'overdue' | 'warning' | 'unknown'; percentage: number; message: string } {
  if (!expectedValue || !expectedUnit) {
    return {
      status: 'unknown',
      percentage: 0,
      message: 'No expected duration set'
    };
  }
  
  // Convert expected duration to days
  const unit = expectedUnit.toLowerCase();
  let expectedDays = expectedValue;
  
  if (unit.includes('hour')) {
    expectedDays = expectedValue / 24;
  } else if (unit.includes('minute')) {
    expectedDays = expectedValue / (24 * 60);
  } else if (unit.includes('week')) {
    expectedDays = expectedValue * 7;
  } else if (unit.includes('month')) {
    expectedDays = expectedValue * 30;
  }
  
  const percentage = (actualDays / expectedDays) * 100;
  
  if (percentage <= 75) {
    return {
      status: 'on-time',
      percentage,
      message: 'On track'
    };
  } else if (percentage <= 100) {
    return {
      status: 'warning',
      percentage,
      message: 'Nearing deadline'
    };
  } else {
    return {
      status: 'overdue',
      percentage,
      message: `${Math.floor(percentage - 100)}% overdue`
    };
  }
}

/**
 * Format a date for display
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
