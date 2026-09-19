import React from 'react';

export const RELATIONSHIP_OPTIONS = [
  'Father', 'Mother', 'Guardian', 'Legal Guardian', 'Local Guardian',
  'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Uncle', 'Aunt',
  'Stepfather', 'Stepmother', 'Foster Father', 'Foster Mother', 'Other',
];

const RelationshipSelect: React.FC<{
  value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  required?: boolean;
  id?: string;
}> = ({ value, onChange, required = true, id }) => (
  <select id={id} name="parentRelationship" aria-label="Relationship" required={required} value={value} onChange={onChange}>
    <option value="">Select Relationship</option>
    {value && !RELATIONSHIP_OPTIONS.includes(value) && <option value={value}>{value}</option>}
    {RELATIONSHIP_OPTIONS.map(relationship => <option key={relationship} value={relationship}>{relationship}</option>)}
  </select>
);

export default RelationshipSelect;
