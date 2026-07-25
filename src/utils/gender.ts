export const GENDER_OPTIONS = [
  { code: 'M', label: 'Male' },
  { code: 'F', label: 'Female' },
  { code: 'O', label: 'Other' },
  { code: 'N', label: 'Prefer not to say' },
] as const;

export const genderLabel = (code?: string | null) =>
  GENDER_OPTIONS.find(option => option.code === code)?.label ?? 'Not specified';

export const parseGenderCode = (value?: string) => {
  const normalized = value?.trim().toLowerCase();
  return GENDER_OPTIONS.find(option =>
    option.code.toLowerCase() === normalized || option.label.toLowerCase() === normalized
  )?.code ?? '';
};
