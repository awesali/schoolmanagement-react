export const EMPLOYMENT_TYPES = [
  'Permanent',
  'Contract',
  'Part-Time',
  'Temporary',
  'Intern',
  'Substitute',
  'Probationary',
  'Visiting / Guest',
  'Consultant',
  'Volunteer',
] as const;

export const normalizeEmploymentType = (value?: string | null): string => {
  const match = EMPLOYMENT_TYPES.find(option =>
    option.toLowerCase() === String(value || '').trim().toLowerCase()
  );
  return match || '';
};
