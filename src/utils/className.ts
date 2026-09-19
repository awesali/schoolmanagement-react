export const CLASS_NAME_GUIDANCE = 'Use a number with the correct suffix: 1st, 2nd, 3rd, 4th, 6th, 11th or 12th. A space is allowed (6 th). Nursery, LKG, UKG and Kindergarten are also accepted.';

export const classNameKey = (value: string) => value.trim().toLowerCase()
  .replace(/^(class|grade|std\.?|standard)\s*[-:]?\s*/, '').replace(/\s+/g, '')
  .replace(/^(\d+)(st|nd|rd|th)$/, '$1');

export function isValidClassName(value: string): boolean {
  const name = value.trim().replace(/^(class|grade|std\.?|standard)\s*[-:]?\s*/i, '').trim();
  if (/^(pre[- ]nursery|nursery|lkg|ukg|kg|lower kg|upper kg|lower kindergarten|upper kindergarten|kindergarten)$/i.test(name)) return true;
  const match = /^([1-9]\d*)\s*(st|nd|rd|th)$/i.exec(name);
  if (!match) return false;
  const number = Number(match[1]);
  const suffix = number % 100 >= 11 && number % 100 <= 13 ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[number % 10] || 'th';
  return match[2].toLowerCase() === suffix;
}
