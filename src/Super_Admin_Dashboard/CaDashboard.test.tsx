import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CaDashboard, { csvCell } from './CaDashboard';
jest.mock('./FinanceManagement', () => () => <div>Fee workflow</div>);
jest.mock('./SalaryManagement', () => () => <div>Salary workflow</div>);
const data = { schoolId: 7, schoolName: 'School Seven', academicYear: '2026-27', generatedAt: '2026-09-01T00:00:00Z', payroll: null, fees: {
  today: 100, month: 100, assessed: 300, collected: 100, outstanding: 200,
  payments: [{ id: 1, studentName: 'Student One', amount: 100, date: '2026-09-01', mode: 'Cash', receipt: 'R001' }],
  balances: [{ id: 1, studentName: 'Student One', feeType: 'Tuition', amount: 300, paid: 100, balance: 200 }],
  modes: [{ name: 'Cash', amount: 100 }], trend: [{ date: '2026-09-01', amount: 100 }]
} };
beforeEach(() => { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => data }); });
const show = () => render(<CaDashboard userName="Accountant" onLogout={jest.fn()} onProfile={jest.fn()} />);
test('opens collection records and filters students', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Collection register' }));
  expect(screen.getByText('R001')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search collections'), { target: { value: 'missing' } });
  expect(screen.getByText('No payments match this view.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Payroll' })).not.toBeInTheDocument();
});
test('outstanding drilldown opens existing fee workflow', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Outstanding fees' }));
  expect(screen.getByText('Tuition')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Open fee collection/ }));
  expect(screen.getByText('Fee workflow')).toBeInTheDocument();
});
test('refresh failure clears financial records and retry recovers', async () => {
  show(); await screen.findByRole('button', { name: 'Collection register' });
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('does not have access');
  expect(screen.queryByRole('button', { name: 'Collection register' })).not.toBeInTheDocument();
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => data });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('button', { name: 'Collection register' })).toBeInTheDocument();
});
test('CSV quotes fields and neutralizes spreadsheet formulas', () => {
  expect(csvCell('=1+1')).toBe('"\'=1+1"');
  expect(csvCell('A,"B"')).toBe('"A,""B"""');
});

