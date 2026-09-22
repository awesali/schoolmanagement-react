import React from 'react';

export const ADMISSION_TYPES = ['New Admission', 'Previous School Transfer', 'Re-admission'] as const;

export const studentDetailValues = (record: Record<string, any> = {}) => ({
  address: record.address || '',
  addressLine2: record.addressLine2 || '',
  landmark: record.landmark || '',
  city: record.city || '',
  district: record.district || '',
  state: record.state || '',
  country: record.country || '',
  pinCode: record.pinCode || '',
  admissionType: record.admissionType || 'New Admission',
  previousSchoolName: record.previousSchoolName || '',
  previousSchoolAddress: record.previousSchoolAddress || '',
  previousClass: record.previousClass || '',
  previousBoard: record.previousBoard || '',
  transferCertificateNumber: record.transferCertificateNumber || '',
  transferCertificateDate: record.transferCertificateDate ? String(record.transferCertificateDate).slice(0, 10) : '',
  reasonForLeaving: record.reasonForLeaving || '',
});

export const appendStudentDetails = (body: FormData, values: ReturnType<typeof studentDetailValues>) => {
  Object.entries(values).forEach(([key, value]) => body.append(key[0].toUpperCase() + key.slice(1), value));
};

const StudentDetailSections: React.FC<{
  values: ReturnType<typeof studentDetailValues>;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}> = ({ values, onChange, disabled }) => {
  const transferred = values.admissionType === 'Previous School Transfer';
  const field = (name: keyof typeof values, label: string, options?: { required?: boolean; type?: string; maxLength?: number }) =>
    <div className="form-group">
      <label htmlFor={'student-' + name}>{label}{options?.required ? ' *' : ''}</label>
      <input id={'student-' + name} type={options?.type || 'text'} required={options?.required}
        maxLength={options?.maxLength} disabled={disabled} value={values[name]}
        onChange={e => onChange(name, name === 'pinCode' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)} />
    </div>;

  return <div className="staff-detail-sections">
    <fieldset className="staff-detail-section" disabled={disabled}>
      <legend>Student Address Details</legend>
      <div className="form-grid">
        {field('address', 'House / Flat / Street', { required: true, maxLength: 500 })}
        {field('addressLine2', 'Area / Locality', { maxLength: 200 })}
        {field('landmark', 'Landmark', { maxLength: 200 })}
        {field('city', 'City / Town', { required: true, maxLength: 100 })}
        {field('district', 'District', { maxLength: 100 })}
        {field('state', 'State', { required: true, maxLength: 100 })}
        {field('country', 'Country', { required: true, maxLength: 100 })}
        {field('pinCode', 'PIN Code', { required: true, maxLength: 6 })}
      </div>
    </fieldset>
    <fieldset className="staff-detail-section" disabled={disabled}>
      <legend>Admission Details</legend>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="student-admissionType">Admission Type *</label>
          <select id="student-admissionType" required value={values.admissionType}
            onChange={e => onChange('admissionType', e.target.value)}>
            {ADMISSION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {transferred && <>
          {field('previousSchoolName', 'Previous School Name', { required: true, maxLength: 200 })}
          {field('previousSchoolAddress', 'Previous School Address', { maxLength: 500 })}
          {field('previousClass', 'Last Class Attended', { required: true, maxLength: 50 })}
          {field('previousBoard', 'Board / University', { maxLength: 100 })}
          {field('transferCertificateNumber', 'Transfer Certificate Number', { maxLength: 100 })}
          {field('transferCertificateDate', 'Transfer Certificate Date', { type: 'date' })}
          {field('reasonForLeaving', 'Reason for Leaving', { maxLength: 500 })}
        </>}
      </div>
    </fieldset>
  </div>;
};

export default StudentDetailSections;