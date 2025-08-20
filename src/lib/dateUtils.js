import { parse, isValid } from 'date-fns';

/**
 * Parses and validates a date string.
 * @param {string} dateString - The date string to parse.
 * @returns {{ startDate: Date, endDate: Date } | null} - The start and end dates, or null if invalid.
 */
export function parseDateFilter(dateString) {
  const now = new Date();
  let startDate, endDate;

  // Validation for the dateString input
  if (!dateString || typeof dateString !== 'string') {
    console.error('Invalid date string:', dateString);
    return null;
  }

  const parseDate = (dateString) => {
    const formats = [
      'dd MMMM yyyy', // e.g., 15 August 2025
      'dd-MM-yyyy',   // e.g., 15-08-2025
      'dd/MM/yyyy',   // e.g., 25/09/2024
      'yyyy-MM-dd',   // ISO format
    ];

    for (const format of formats) {
      const parsedDate = parse(dateString, format, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
    return null;
  };

  if (dateString.toLowerCase() === 'today') {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  } else if (dateString.toLowerCase() === 'yesterday') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (dateString.toLowerCase() === 'last week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
  } else if (dateString.toLowerCase() === 'last month') {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Handle specific date formats
    const parsedDate = parseDate(dateString);
    if (parsedDate) {
      startDate = new Date(parsedDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(parsedDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      return null; // Invalid date format
    }
  }

  return { startDate, endDate };
}
