import React from 'react';

export const parentAddressValues = (record: Record<string, any> = {}) => ({
  parentAddress: record.parentAddress ?? record.address ?? '',
  parentAddressLine2: record.parentAddressLine2 ?? record.addressLine2 ?? '',
  parentLandmark: record.parentLandmark ?? record.landmark ?? '',
  parentCity: record.parentCity ?? record.city ?? '',
  parentDistrict: record.parentDistrict ?? record.district ?? '',
  parentState: record.parentState ?? record.state ?? '',
  parentCountry: record.parentCountry ?? record.country ?? '',
  parentPinCode: record.parentPinCode ?? record.pinCode ?? '',
});

const ParentAddressFields: React.FC<{
  values: ReturnType<typeof parentAddressValues>;
  onChange: (name: string, value: string) => void;
  disabled?: boolean;
}> = ({ values, onChange, disabled }) => {
  const fields = [
    ['parentAddress', 'House / Flat / Street', 500, true],
    ['parentAddressLine2', 'Area / Locality', 200, false],
    ['parentLandmark', 'Landmark', 200, false],
    ['parentCity', 'City / Town', 100, true],
    ['parentDistrict', 'District', 100, false],
    ['parentState', 'State', 100, true],
    ['parentCountry', 'Country', 100, true],
    ['parentPinCode', 'PIN Code', 6, true],
  ] as const;
  return <fieldset className="staff-detail-section" disabled={disabled}>
    <legend>Parent Address Details</legend>
    <div className="form-grid">
      {fields.map(([name, label, maxLength, required]) => <div className="form-group" key={name}>
        <label htmlFor={name}>{label}{required ? ' *' : ''}</label>
        <input id={name} name={name} required={required} maxLength={maxLength}
          inputMode={name === 'parentPinCode' ? 'numeric' : undefined}
          pattern={name === 'parentPinCode' ? '[1-9][0-9]{5}' : undefined}
          value={values[name]} onChange={event => onChange(name,
            name === 'parentPinCode' ? event.target.value.replace(/\D/g, '').slice(0, 6) : event.target.value)} />
      </div>)}
    </div>
  </fieldset>;
};
export default ParentAddressFields;