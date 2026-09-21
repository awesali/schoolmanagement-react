import React from 'react';

export const staffDetailGroups = [
  { title: 'Address Details', fields: [
    ['address', 'House / Flat / Street', 'text', 500], ['addressLine2', 'Area / Locality', 'text', 200],
    ['landmark', 'Landmark', 'text', 200], ['city', 'City / Town', 'text', 100], ['district', 'District', 'text', 100],
    ['state', 'State', 'text', 100], ['country', 'Country', 'text', 100], ['pinCode', 'PIN Code', 'text', 6],
  ] },
  { title: 'Educational Details', fields: [
    ['qualification', 'Qualification', 'text', 150], ['specialization', 'Specialization / Subject', 'text', 150],
    ['institute', 'College / Institute', 'text', 200], ['university', 'University / Board', 'text', 200],
    ['passingYear', 'Year of Passing', 'number', 4], ['grade', 'Grade / Percentage', 'text', 50],
  ] },
  { title: 'Experience Details', fields: [
    ['previousEmployer', 'Previous School / Organization', 'text', 200], ['previousDesignation', 'Previous Designation', 'text', 150],
    ['experienceYears', 'Total Experience (Years)', 'number', 3], ['experienceFrom', 'Employment From', 'date', 0],
    ['experienceTo', 'Employment To', 'date', 0], ['experienceDetails', 'Responsibilities / Experience Summary', 'textarea', 2000],
  ] },
  { title: 'Certification Details', fields: [
    ['certificationName', 'Certification Name', 'text', 200], ['certificationIssuer', 'Issued By', 'text', 200],
    ['certificationNumber', 'Certificate / Registration Number', 'text', 100], ['certificationDate', 'Issue Date', 'date', 0],
    ['certificationExpiry', 'Expiry Date (if applicable)', 'date', 0],
  ] },
] as const;

type FieldKey = typeof staffDetailGroups[number]['fields'][number][0];
export type StaffDetailValues = Record<FieldKey, string> & { additionalDetails: string };
export type StaffDetailRecord = Partial<Record<FieldKey, string | number | null>> & { additionalDetails?: string | null };
export const staffDetailValues = (record: StaffDetailRecord = {}): StaffDetailValues => ({ additionalDetails: record.additionalDetails || "{}", ...Object.fromEntries(
  staffDetailGroups.flatMap(group => group.fields.map(([key, , type]) => [key, record[key] == null ? '' : type === 'date' ? String(record[key]).slice(0, 10) : String(record[key])]))
) }) as StaffDetailValues;

export const appendStaffDetails = (body: FormData, values: StaffDetailValues) => {
  body.append("AdditionalDetails", values.additionalDetails);
  staffDetailGroups.forEach(group => group.fields.forEach(([key]) => {
    if (key !== 'address') body.append(key[0].toUpperCase() + key.slice(1), values[key].trim());
  }));
};

const validateSingle = (values: StaffDetailValues): string | null => {
  if (values.pinCode && !/^[1-9]\d{5}$/.test(values.pinCode)) return 'Enter a valid 6-digit PIN code.';
  if (values.passingYear && (!/^\d{4}$/.test(values.passingYear) || Number(values.passingYear) < 1900 || Number(values.passingYear) > new Date().getFullYear())) return 'Enter a valid passing year up to the current year.';
  if (values.experienceYears && (!Number.isFinite(Number(values.experienceYears)) || Number(values.experienceYears) < 0 || Number(values.experienceYears) > 80)) return 'Experience must be between 0 and 80 years.';
  if (values.experienceTo && !values.experienceFrom) return 'Enter the employment start date.';
  if (values.experienceTo && values.experienceFrom > values.experienceTo) return 'Employment end date must be on or after the start date.';
  if (values.certificationExpiry && !values.certificationDate) return 'Enter the certification issue date.';
  if (values.certificationExpiry && values.certificationDate > values.certificationExpiry) return 'Certification expiry must be on or after the issue date.';
  return null;
};


type AdditionalRecords = Record<string, Partial<Record<FieldKey, string>>[]>;
const readAdditional = (value?: string | null): AdditionalRecords => {
  try { const parsed = JSON.parse(value || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
};
export const validateStaffDetails = (values: StaffDetailValues): string | null => {
  const first = validateSingle(values);
  if (first) return first;
  const additional = readAdditional(values.additionalDetails);
  for (const group of staffDetailGroups.slice(1)) {
    for (const [index, row] of (additional[group.title] || []).entries()) {
      const error = validateSingle(staffDetailValues(row));
      if (error) return group.title + ' ' + (index + 2) + ': ' + error;
    }
  }
  return null;
};
const StaffDetailSections: React.FC<{ values: StaffDetailValues; onChange: (key: FieldKey | 'additionalDetails', value: string) => void; disabled?: boolean }> = ({ values, onChange, disabled }) => {
  const additional = readAdditional(values.additionalDetails);
  const update = (title: string, rows: AdditionalRecords[string]) => onChange('additionalDetails', JSON.stringify({ ...additional, [title]: rows }));
  return <div className="staff-detail-sections">
    {staffDetailGroups.map((group, groupIndex) => <fieldset className="staff-detail-section" key={group.title} disabled={disabled}>
      <legend>{group.title}</legend>
      {[values, ...(groupIndex ? additional[group.title] || [] : [])].map((row, index) => <div className="staff-detail-entry" key={index}>
        {groupIndex > 0 && <div className="staff-detail-entry-heading"><strong>Record {index + 1}</strong>{index > 0 && <button type="button" className="btn btn-secondary" onClick={() => update(group.title, additional[group.title].filter((_, i) => i !== index - 1))}>Remove</button>}</div>}
        <div className="form-grid">{group.fields.map(([key, label, type, maxLength]) => {
          const id = 'staff-detail-' + key + (index ? '-' + index : '');
          const change = (value: string) => {
            if (!index) onChange(key, value);
            else update(group.title, additional[group.title].map((item, i) => i === index - 1 ? { ...item, [key]: value } : item));
          };
          return <div className={'form-group' + (type === 'textarea' ? ' full-width' : '')} key={key}>
            <label htmlFor={id}>{label}{key === 'address' ? ' *' : ''}</label>
            {type === 'textarea' ? <textarea id={id} maxLength={maxLength} value={row[key] || ''} onChange={e => change(e.target.value)} /> :
              <input id={id} type={type} required={key === 'address'} value={row[key] || ''}
                maxLength={type === 'text' ? maxLength : undefined} inputMode={key === 'pinCode' ? 'numeric' : undefined}
                pattern={key === 'pinCode' ? '[1-9][0-9]{5}' : undefined}
                min={key === 'passingYear' ? 1900 : key === 'experienceYears' ? 0 : undefined}
                max={key === 'passingYear' ? new Date().getFullYear() : key === 'experienceYears' ? 80 : undefined}
                step={key === 'experienceYears' ? '0.1' : undefined}
                onChange={e => change(key === 'pinCode' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)} />}
          </div>;
        })}</div>
      </div>)}
      {groupIndex > 0 && <div className="staff-detail-add"><button type="button" className="btn btn-secondary" onClick={() => update(group.title, [...(additional[group.title] || []), {}])}>+ Add More</button></div>}
    </fieldset>)}
  </div>;
};

export default StaffDetailSections;

export const StaffDetailSummary: React.FC<{ record: StaffDetailRecord }> = ({ record }) => {
  const values = staffDetailValues(record);
  const additional = readAdditional(record.additionalDetails);
  return <div className="staff-detail-sections">{staffDetailGroups.map(group => {
    const rows = [values, ...(additional[group.title] || [])].filter(row => group.fields.some(([key]) => row[key]));
    return rows.length ? <section className="staff-detail-section" key={group.title}>
      <h4>{group.title}</h4>
      {rows.map((row, index) => <div className="staff-detail-entry" key={index}>
        {rows.length > 1 && <strong>Record {index + 1}</strong>}
        <dl className="staff-detail-summary">{group.fields.map(([key, label]) => row[key] ? <div key={key}><dt>{label}</dt><dd>{row[key]}</dd></div> : null)}</dl>
      </div>)}
    </section> : null;
  })}</div>;
};
