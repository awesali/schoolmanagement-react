import { staffDetailGroups, staffDetailValues, appendStaffDetails, validateStaffDetails } from './StaffDetailSections';
import { isValidImportDate, toApiDate } from '../utils/importDate';

const columnName = (key: string) => key[0].toUpperCase() + key.slice(1);
export const staffTemplateHeaders = ['Name', 'DOB', 'Gender', 'DOJ', 'Role', 'Email', 'Phone',
  ...staffDetailGroups.flatMap(group => group.fields.map(([key]) => columnName(key))),
  ...staffDetailGroups.slice(1).flatMap(group => group.fields.map(([key]) => columnName(key) + '2'))];
const example: Record<string, string> = { Name: 'Example Teacher', DOB: '01-31-1990', Gender: 'Male', DOJ: '04-01-2026', Role: 'Teacher', Email: 'teacher@example.com', Phone: '9876543210', Address: '12 School Road', City: 'Amravati', State: 'Maharashtra', Country: 'India', PinCode: '444601', Qualification: 'B.Ed', PassingYear: '2012', Qualification2: 'M.Ed', PassingYear2: '2014', PreviousEmployer: 'Example School', ExperienceFrom: '04-01-2015', ExperienceTo: '03-31-2026', CertificationName: 'Teacher Training', CertificationDate: '06-01-2020' };
export const staffTemplateExample = staffTemplateHeaders.map(header => example[header] || '');

export const parseStaffDetailColumns = (row: Record<string, string>) => {
  const values = staffDetailValues();
  const errors: string[] = [];
  const additional: Record<string, Record<string, string>[]> = {};
  staffDetailGroups.forEach((group, groupIndex) => {
    const indexes = new Set<number>([1]);
    if (groupIndex) Object.keys(row).forEach(header => {
      group.fields.forEach(([key]) => {
        const base = columnName(key);
        if (header.startsWith(base) && /^[2-9]\d*$|^1\d+$/.test(header.slice(base.length))) indexes.add(Number(header.slice(base.length)));
      });
    });
    [...indexes].sort((a, b) => a - b).forEach(index => {
      const record: Record<string, string> = {};
      group.fields.forEach(([key, , type, limit]) => {
        const column = columnName(key) + (index === 1 ? '' : index);
        const raw = (row[column] || '').trim();
        if (type === 'date' && raw && !isValidImportDate(raw)) errors.push(`${column}: use MM-DD-YYYY or MM/DD/YYYY.`);
        if ((type === 'text' || type === 'textarea') && raw.length > limit) errors.push(`${column}: maximum ${limit} characters.`);
        record[key] = type === 'date' ? toApiDate(raw) : raw;
        if (index === 1) values[key] = record[key];
      });
      if (index > 1 && Object.values(record).some(Boolean)) {
        const error = validateStaffDetails(staffDetailValues(record));
        if (error) errors.push(`${group.title} ${index}: ${error}`);
        (additional[group.title] ||= []).push(record);
      }
    });
  });
  const error = validateStaffDetails(values);
  if (error) errors.push(error);
  values.additionalDetails = JSON.stringify(additional);
  const body = new FormData();
  appendStaffDetails(body, values);
  const payload: Record<string, string> = {};
  body.forEach((value, key) => { payload[key] = String(value); });
  return { payload, errors: Array.from(new Set(errors)) };
};
