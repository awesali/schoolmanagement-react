import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StaffDetailSections, { appendStaffDetails, staffDetailValues, validateStaffDetails } from './StaffDetailSections';

test('legacy staff loads with empty optional fields and saves structured details', () => {
  const values = staffDetailValues({ address: 'Old address', pinCode: '444601', passingYear: 2014, experienceYears: 0, certificationDate: '2020-02-01T00:00:00' });
  expect(values.address).toBe('Old address');
  expect(values.city).toBe('');
  expect(values.experienceYears).toBe('0');
  expect(values.certificationDate).toBe('2020-02-01');
  const body = new FormData(); appendStaffDetails(body, values);
  expect(body.get('PinCode')).toBe('444601');
  expect(body.get('PassingYear')).toBe('2014');
  expect(body.get('CertificationDate')).toBe('2020-02-01');
  expect(body.get('ExperienceTo')).toBe('');
});

test('validates PIN, passing year, experience and date order without requiring optional sections', () => {
  const values = staffDetailValues();
  expect(validateStaffDetails(values)).toBeNull();
  expect(validateStaffDetails({ ...values, pinCode: '123' })).toMatch(/PIN/);
  expect(validateStaffDetails({ ...values, passingYear: String(new Date().getFullYear()+1) })).toMatch(/year/);
  expect(validateStaffDetails({ ...values, experienceYears: '-1' })).toMatch(/Experience/);
  expect(validateStaffDetails({ ...values, experienceFrom: '2025-01-01', experienceTo: '2024-01-01' })).toMatch(/Employment/);
  expect(validateStaffDetails({ ...values, certificationExpiry: '2028-01-01' })).toMatch(/issue/);
});

test('renders accessible sections and limits PIN input to digits', () => {
  const onChange = jest.fn(); render(<StaffDetailSections values={staffDetailValues()} onChange={onChange} />);
  expect(screen.getAllByRole('group')).toHaveLength(4);
  expect(screen.getByLabelText('House / Flat / Street *')).toBeRequired();
  expect(screen.getByLabelText('Qualification')).not.toBeRequired();
  fireEvent.change(screen.getByLabelText('PIN Code'), { target: { value: 'abc44460199' } });
  expect(onChange).toHaveBeenCalledWith('pinCode', '444601');
});

test('adds, removes and serializes additional records and validates their dates', () => {
  const onChange = jest.fn();
  const values = staffDetailValues({ additionalDetails: JSON.stringify({ 'Certification Details': [{ certificationName: 'Training', certificationExpiry: '2030-01-01' }] }) });
  const { rerender } = render(<StaffDetailSections values={values} onChange={onChange} />);
  expect(screen.getByDisplayValue('Training')).toBeInTheDocument();
  expect(validateStaffDetails(values)).toMatch(/Certification Details 2/);
  const body = new FormData(); appendStaffDetails(body, values);
  expect(body.get('AdditionalDetails')).toBe(values.additionalDetails);
  fireEvent.click(screen.getByText('Remove'));
  expect(JSON.parse(onChange.mock.calls[0][1])['Certification Details']).toEqual([]);
  rerender(<StaffDetailSections values={staffDetailValues()} onChange={onChange} />);
  fireEvent.click(screen.getAllByText('+ Add More')[0]);
  expect(JSON.parse(onChange.mock.calls[1][1])['Educational Details']).toEqual([{}]);
});
