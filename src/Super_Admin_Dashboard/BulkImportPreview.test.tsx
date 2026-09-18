import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import BulkImportPreview from './BulkImportPreview';
import { importDateError, importDatesError } from '../utils/importDate';

test('shows valid and invalid records with row-specific date corrections', () => {
  render(<BulkImportPreview title="Preview Student Import" columns={['StudentName', 'DOB']} importing={false} onClose={jest.fn()} onConfirm={jest.fn()} rows={[
    { rowNumber: 2, values: { StudentName: 'Valid Student', DOB: '01-31-2010' }, errors: [], warnings: [] },
    { rowNumber: 3, values: { StudentName: 'Check Student', DOB: '31/01/2010' }, errors: [importDateError('DOB', '31/01/2010')!], warnings: [] },
  ]} />);
  expect(screen.getByText('1 valid')).toBeInTheDocument();
  expect(screen.getByText('1 with errors')).toBeInTheDocument();
  expect(within(screen.getByRole('table')).getByText('Ready')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Import 1 valid row' })).toBeEnabled();
  const invalidRow = screen.getByText('Check Student').closest('tr')!;
  const validationCell = within(invalidRow).getAllByRole('cell')[3];
  expect(validationCell).toHaveTextContent('MM-DD-YYYY');
  expect(validationCell).toHaveTextContent('31/01/2010');
  expect(screen.getAllByText(/Error: DOB:/)).toHaveLength(1);
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Download error report' })).not.toBeInTheDocument();
});

test('shows errors first without changing source or save order, and groups date guidance', () => {
  const dateError = importDatesError({ DOB: '31/08/2000', DOJ: '24/07/2026' })!;
  const rows = [
    { rowNumber: 2, values: { Name: 'First' }, errors: [], warnings: [] },
    { rowNumber: 3, values: { Name: 'Second' }, errors: [dateError, dateError], warnings: [] },
    { rowNumber: 4, values: { Name: 'Third' }, errors: [], warnings: [] },
    { rowNumber: 5, values: { Name: 'Fourth' }, errors: ['Email is invalid.'], warnings: [] },
  ];
  const onConfirm = jest.fn(() => rows.filter(row => !row.errors.length).map(row => row.rowNumber));
  render(<BulkImportPreview title="Preview Staff Import" columns={['Name']} rows={rows} importing={false} onClose={jest.fn()} onConfirm={onConfirm} />);
  expect(within(screen.getByRole('table')).getAllByRole('row').slice(1).map(row => within(row).getAllByRole('cell')[0].textContent)).toEqual(['3', '5', '2', '4']);
  const errorRow = screen.getByText('Second').closest('tr')!;
  expect(within(errorRow).getAllByText(/MM-DD-YYYY/)).toHaveLength(1);
  expect(errorRow).toHaveTextContent('DOB: "31/08/2000"; DOJ: "24/07/2026"');
  expect(rows.map(row => row.rowNumber)).toEqual([2, 3, 4, 5]);
  fireEvent.click(screen.getByRole('button', { name: 'Import 2 valid rows' }));
  expect(onConfirm).toHaveReturnedWith([2, 4]);
});
