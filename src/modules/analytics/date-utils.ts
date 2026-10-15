import { DateRangePreset, ResolvedDateRange } from './types';

/**
 * Resolves a date range preset or explicit custom dates into bounded Date objects
 * along with the exact previous equivalent comparison period.
 */
export function resolveDateRange(
  preset: DateRangePreset = '30d',
  customStart?: string,
  customEnd?: string
): ResolvedDateRange {
  const now = new Date();
  let endDate = new Date(now);
  let days = 30;

  if (preset === '7d') {
    days = 7;
  } else if (preset === '30d') {
    days = 30;
  } else if (preset === '90d') {
    days = 90;
  } else if (preset === '1y') {
    days = 365;
  } else if (preset === 'custom' && customStart && customEnd) {
    const parsedStart = new Date(customStart);
    const parsedEnd = new Date(customEnd);

    if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd) {
      const diffMs = parsedEnd.getTime() - parsedStart.getTime();
      days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      endDate = parsedEnd;
      const startDate = parsedStart;
      const previousEndDate = new Date(startDate.getTime() - 1);
      const previousStartDate = new Date(previousEndDate.getTime() - days * 24 * 60 * 60 * 1000);

      return {
        startDate,
        endDate,
        previousStartDate,
        previousEndDate,
        daysDiff: days,
      };
    }
  }

  // Default preset calculation
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    startDate,
    endDate,
    previousStartDate,
    previousEndDate,
    daysDiff: days,
  };
}

/**
 * Formats a Date to YYYY-MM-DD
 */
export function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * Generates an array of all consecutive daily date keys between start and end
 */
export function generateDailySeries(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
