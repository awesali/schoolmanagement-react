export const DATE_FORMAT_HELP = 'Use month-day-year with dashes or slashes: MM-DD-YYYY or MM/DD/YYYY, e.g. 01-31-2010 or 1/31/2010. Single-digit months and days are accepted.';

export const isValidImportDate = (value: string): boolean => {
  if (!/^\d{1,2}([/-])\d{1,2}\1\d{4}$/.test(value)) return false;
  const [month, day, year] = value.split(/[/-]/).map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
};

export const importDateError = (field: string, value: string = ''): string | null => {
  if (isValidImportDate(value)) return null;
  return `${field}: ${value ? `"${value}" is not a valid month-first date.` : 'Date is required.'} Enter a real calendar date as MM-DD-YYYY or MM/DD/YYYY, for example 01-31-2010 or 1/31/2010 (31 January 2010).`;
};

export const importDatesError = (dates: Record<string, string>): string | null => {
  const invalid = Object.entries(dates).filter(([, value]) => !isValidImportDate(value || ''));
  if (!invalid.length) return null;
  return `${invalid.map(([field, value]) => `${field}: ${value ? `"${value}"` : 'missing'}`).join('; ')} — enter valid dates in MM-DD-YYYY or MM/DD/YYYY format, e.g. 01-31-2010 or 1/31/2010 (31 January 2010).`;
};

export const toApiDate = (value: string): string => {
  if (!isValidImportDate(value)) return '';
  const [month, day, year] = value.split(/[/-]/);
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const formatImportDate = (value?: string): string => {
  if (!value) return '';
  const [year, month, day] = value.split('T')[0].split('-');
  return year && month && day ? `${month}-${day}-${year}` : '';
};
