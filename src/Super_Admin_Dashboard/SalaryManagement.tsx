import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './StaffList.css';
import './ManagementTabs.css';

type SalaryTab = 'dashboard' | 'assign' | 'generate' | 'pay' | 'history' | 'pending';

interface Staff {
  id: number;
  employeeNumber: number;
  name: string;
  email?: string;
  phone?: string;
  roleName?: string;
  isActive?: boolean;
}

interface SalaryHistory {
  id: number;
  staffId: number;
  employeeNumber: number;
  staffName: string;
  department: string;
  salaryMonth: number;
  salaryYear: number;
  basicSalary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  status: string;
  paymentDate: string;
  paymentMethod: string;
  remarks: string;
  createdDate: string;
}

interface PendingSalary {
  id: number;
  staffId: number;
  employeeNumber: number;
  staffName: string;
  department: string;
  salaryMonth: number;
  salaryYear: number;
  basicSalary: number;
  netSalary: number;
  status: string;
  createdDate: string;
}

interface AssignedSalary {
  id: number;
  staffId: number;
  basicSalary: number;
  salaryType: string;
  effectiveFrom: string;
}

interface DashboardData {
  totalStaff: number;
  paidSalary: number;
  pendingSalary: number;
  pendingEmployees: number;
}

interface SalaryManagementProps {
  selectedSchoolId: number | null;
}

const TAB_LABELS: Record<SalaryTab, string> = {
  dashboard: 'Dashboard',
  assign: 'Assign Salary',
  generate: 'Generate Salary',
  pay: 'Pay Salary',
  history: 'Salary History',
  pending: 'Pending Salaries',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '2px solid #e2e8f0',
  fontSize: '14px',
  minWidth: '160px',
  background: 'white',
  boxSizing: 'border-box',
};

const panelStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  padding: '28px',
  width: '100%',
  maxWidth: '520px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: '14px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#4a5568',
  display: 'block',
  marginBottom: '6px',
};

const statusStyle = (status: string) => ({
  display: 'inline-block',
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600 as const,
  background: status === 'Paid' ? '#c6f6d5' : '#fef3c7',
  color: status === 'Paid' ? '#22543d' : '#78350f',
});

const messageStyle = (ok: boolean): React.CSSProperties => ({
  marginBottom: '16px',
  padding: '10px 16px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '14px',
  background: ok ? '#c6f6d5' : '#fed7d7',
  color: ok ? '#22543d' : '#742a2a',
});

const money = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString()}`;

const monthName = (month: number) =>
  new Date(0, month - 1).toLocaleString('default', { month: 'long' });

const SalaryManagement: React.FC<SalaryManagementProps> = ({ selectedSchoolId }) => {
  const [activeTab, setActiveTab] = useState<SalaryTab>('dashboard');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalStaff: 0,
    paidSalary: 0,
    pendingSalary: 0,
    pendingEmployees: 0,
  });
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [pendingSalaries, setPendingSalaries] = useState<PendingSalary[]>([]);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const token = () => localStorage.getItem('token');
  const headers = () => ({ Authorization: `Bearer ${token()}` });
  const jsonHeaders = () => ({ ...headers(), 'Content-Type': 'application/json' });

  useEffect(() => {
    if (selectedSchoolId) {
      fetchStaffList();
      fetchDashboardData();
    }
  }, [selectedSchoolId]); // eslint-disable-line

  const fetchStaffList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Admin/Staff-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=1000`, {
        headers: headers(),
      });
      if (response.ok) {
        const result = await response.json();
        setStaffList(result.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch staff list:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Staff/dashboard?schoolId=${selectedSchoolId}`, {
        headers: headers(),
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchSalaryHistory = async (month: number, year: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Staff/history?schoolId=${selectedSchoolId}&month=${month}&year=${year}`, {
        headers: headers(),
      });
      if (response.ok) {
        const data = await response.json();
        setSalaryHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch salary history:', error);
    }
  };

  const fetchPendingSalaries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Staff/pending?schoolId=${selectedSchoolId}`, {
        headers: headers(),
      });
      if (response.ok) {
        const data = await response.json();
        setPendingSalaries(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch pending salaries:', error);
    }
  };

  const assignSalary = async (staffId: number, basicSalary: number, salaryType: string, isUpdate: boolean) => {
    try {
      setActionMsg(null);
      const response = await fetch(`${API_BASE_URL}/api/Staff/assign`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ staffId, basicSalary, salaryType, isUpdate }),
      });
      const result = await response.json();
      const succeeded = response.ok && result.success !== false;
      setActionMsg({
        text: result.message || (succeeded ? 'Salary saved successfully.' : 'Failed to save salary.'),
        ok: succeeded,
      });
      if (succeeded) fetchDashboardData();
      return succeeded;
    } catch (error) {
      console.error('Failed to assign salary:', error);
      setActionMsg({ text: 'Error assigning salary.', ok: false });
      return false;
    }
  };

  const generateSalary = async (month: number, year: number) => {
    try {
      setActionMsg(null);
      const response = await fetch(`${API_BASE_URL}/api/Staff/generate?month=${month}&year=${year}&schoolId=${selectedSchoolId}`, {
        method: 'POST',
        headers: headers(),
      });
      setActionMsg({
        text: response.ok ? 'Salary generated successfully.' : 'Failed to generate salary.',
        ok: response.ok,
      });
      if (response.ok) {
        fetchDashboardData();
        fetchPendingSalaries();
      }
      return response.ok;
    } catch (error) {
      console.error('Failed to generate salary:', error);
      setActionMsg({ text: 'Error generating salary.', ok: false });
      return false;
    }
  };

  const payMultipleSalaries = async (
    staffIds: number[],
    month: number,
    year: number,
    bonus: number,
    deduction: number,
    paymentMethod: string,
    paymentReference: string,
    remarks: string,
  ) => {
    try {
      setActionMsg(null);
      const response = await fetch(`${API_BASE_URL}/api/Staff/pay`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          salaries: staffIds.map(staffId => ({
            staffId, month, year, bonus, deduction, paymentMethod, paymentReference, remarks,
          })),
        }),
      });
      const result = await response.json();
      const failedCount = Number(result.failedCount || 0);
      const paidCount = Number(result.paidCount || 0);
      const succeeded = response.ok && result.success !== false && failedCount === 0;

      setActionMsg({
        text: succeeded
          ? `${paidCount} salary payment${paidCount === 1 ? '' : 's'} completed successfully.`
          : `${paidCount} paid, ${failedCount} failed. Please check pending salaries and try again.`,
        ok: succeeded,
      });

      fetchDashboardData();
      fetchPendingSalaries();
      return succeeded;
    } catch (error) {
      console.error('Failed to pay multiple salaries:', error);
      setActionMsg({ text: 'Error paying selected salaries.', ok: false });
      return false;
    }
  };

  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Salary Management</h2>
      </div>

      <div className="management-tabs" role="tablist" aria-label="Salary management sections">
        {(Object.keys(TAB_LABELS) as SalaryTab[]).map(tab => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`management-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab);
              setActionMsg(null);
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div style={messageStyle(actionMsg.ok)}>
          {actionMsg.ok ? 'Success:' : 'Warning:'} {actionMsg.text}
        </div>
      )}

      {activeTab === 'dashboard' && <DashboardCards dashboardData={dashboardData} />}

      {activeTab === 'assign' && (
        <AssignSalaryForm staffList={staffList} onAssign={assignSalary} />
      )}

      {activeTab === 'generate' && (
        <GenerateSalaryForm onGenerate={generateSalary} />
      )}

      {activeTab === 'pay' && (
        <PaySalaryForm pendingSalaries={pendingSalaries} onRefresh={fetchPendingSalaries} onPay={payMultipleSalaries} />
      )}

      {activeTab === 'history' && (
        <SalaryHistoryView
          salaryHistory={salaryHistory}
          onLoad={fetchSalaryHistory}
        />
      )}

      {activeTab === 'pending' && (
        <PendingSalariesView
          pendingSalaries={pendingSalaries}
          onRefresh={fetchPendingSalaries}
        />
      )}
    </div>
  );
};

const DashboardCards: React.FC<{ dashboardData: DashboardData }> = ({ dashboardData }) => {
  const cards = [
    { label: 'Total Staff', value: dashboardData.totalStaff, color: '#3b82f6' },
    { label: 'Paid Salary', value: money(dashboardData.paidSalary), color: '#10b981' },
    { label: 'Pending Salary', value: money(dashboardData.pendingSalary), color: '#f59e0b' },
    { label: 'Pending Employees', value: dashboardData.pendingEmployees, color: '#ef4444' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
      {cards.map(card => (
        <div key={card.label} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 10px', color: '#1e2a3a', fontSize: '16px' }}>{card.label}</h3>
          <p style={{ fontSize: '24px', fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};

const AssignSalaryForm: React.FC<{
  staffList: Staff[];
  onAssign: (staffId: number, basicSalary: number, salaryType: string, isUpdate: boolean) => Promise<boolean>;
}> = ({ staffList, onAssign }) => {
  const [department, setDepartment] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [staffId, setStaffId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [salaryType, setSalaryType] = useState('monthly');
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [assignedSalary, setAssignedSalary] = useState<AssignedSalary | null>(null);
  const [checkingSalary, setCheckingSalary] = useState(false);
  const [editingSalary, setEditingSalary] = useState(false);

  const departments = Array.from(new Set(
    staffList
      .filter(staff => staff.isActive !== false && staff.roleName)
      .map(staff => staff.roleName as string)
  )).sort((a, b) => a.localeCompare(b));

  const departmentStaff = staffList.filter(staff =>
    staff.isActive !== false && staff.roleName === department);
  const normalizedSearch = employeeSearch.trim().toLowerCase();
  const matchingStaff = normalizedSearch
    ? departmentStaff.filter(staff =>
        staff.name.toLowerCase().includes(normalizedSearch) ||
        String(staff.employeeNumber).includes(normalizedSearch))
    : [];
  const selectedStaff = staffList.find(staff => staff.id === Number(staffId));

  const selectDepartment = (value: string) => {
    setDepartment(value);
    setEmployeeSearch('');
    setStaffId('');
    setAssignedSalary(null);
    setEditingSalary(false);
    setFormMsg('');
  };

  const selectEmployee = async (staff: Staff) => {
    setStaffId(String(staff.id));
    setEmployeeSearch(`${staff.name} (${staff.employeeNumber || 'ID unavailable'})`);
    setFormMsg('');
    setAssignedSalary(null);
    setEditingSalary(false);
    setCheckingSalary(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Staff/assigned-salary/${staff.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.isAssigned && result.data) {
          setAssignedSalary(result.data);
          setBasicSalary(String(result.data.basicSalary));
          setSalaryType(result.data.salaryType || 'monthly');
        } else {
          setBasicSalary('');
          setSalaryType('monthly');
        }
      }
    } catch {
      setFormMsg('Unable to check the employee’s current salary.');
    } finally {
      setCheckingSalary(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) {
      setFormMsg('Please select a department.');
      return;
    }
    if (!staffId) {
      setFormMsg('Please search for and select an employee.');
      return;
    }
    if (assignedSalary && !editingSalary) {
      setFormMsg('Salary is already assigned. Select Edit Salary before making changes.');
      return;
    }
    if (!basicSalary || Number(basicSalary) <= 0) {
      setFormMsg('Please enter a basic salary greater than zero.');
      return;
    }

    setSaving(true);
    setFormMsg('');
    const ok = await onAssign(Number(staffId), Number(basicSalary), salaryType, editingSalary);
    setSaving(false);
    if (ok) {
      setDepartment('');
      setEmployeeSearch('');
      setStaffId('');
      setBasicSalary('');
      setAssignedSalary(null);
      setEditingSalary(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={panelStyle}>
      <h3 style={{ marginBottom: '20px', color: '#1e2a3a' }}>Assign Salary</h3>
      <div style={fieldStyle}>
        <label style={labelStyle}>Department *</label>
        <select value={department} onChange={e => selectDepartment(e.target.value)} required style={{ ...selectStyle, width: '100%' }}>
          <option value="">Select Department</option>
          {departments.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <div style={{ ...fieldStyle, position: 'relative' }}>
        <label style={labelStyle}>Search Employee (Name or Employee ID) *</label>
        <input
          type="search"
          value={employeeSearch}
          onChange={e => {
            setEmployeeSearch(e.target.value);
            setStaffId('');
            setAssignedSalary(null);
            setEditingSalary(false);
            setFormMsg('');
          }}
          placeholder={department ? 'Enter employee name or ID' : 'Select a department first'}
          disabled={!department}
          autoComplete="off"
          style={{ ...selectStyle, width: '100%' }}
        />
        {department && normalizedSearch && !selectedStaff && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '6px', maxHeight: '180px', overflowY: 'auto' }}>
            {matchingStaff.length > 0 ? matchingStaff.map(staff => (
              <button
                key={staff.id}
                type="button"
                onClick={() => selectEmployee(staff)}
                style={{ width: '100%', padding: '10px 12px', border: 0, borderBottom: '1px solid #edf2f7', background: 'white', textAlign: 'left', cursor: 'pointer' }}
              >
                <strong>{staff.name}</strong>
                <span style={{ color: '#718096', marginLeft: '8px' }}>Employee ID: {staff.employeeNumber || 'Unavailable'}</span>
              </button>
            )) : (
              <div style={{ padding: '12px', color: '#718096', fontSize: '13px' }}>No employee found in this department.</div>
            )}
          </div>
        )}
      </div>
      {selectedStaff && (
        <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: '#4a5568' }}>
          <div style={{ fontWeight: 700, color: '#1e2a3a', marginBottom: '8px' }}>Employee Details</div>
          <div><strong>Name:</strong> {selectedStaff.name}</div>
          <div><strong>Employee ID:</strong> {selectedStaff.employeeNumber || 'Unavailable'}</div>
          <div><strong>Department:</strong> {selectedStaff.roleName}</div>
          {selectedStaff.email && <div><strong>Email:</strong> {selectedStaff.email}</div>}
          {selectedStaff.phone && <div><strong>Phone:</strong> {selectedStaff.phone}</div>}
        </div>
      )}
      {checkingSalary && (
        <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: '#f7fafc', color: '#4a5568' }}>
          Checking assigned salary...
        </div>
      )}
      {assignedSalary && (
        <div style={{ padding: '14px', marginBottom: '16px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fcd34d', color: '#78350f' }}>
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>Salary Already Assigned</div>
          <div>Current salary: <strong>{money(assignedSalary.basicSalary)}</strong> ({assignedSalary.salaryType})</div>
          <button
            type="button"
            className="btn"
            onClick={() => { setEditingSalary(true); setFormMsg(''); }}
            disabled={editingSalary || saving}
            style={{ marginTop: '10px', background: editingSalary ? '#e2e8f0' : 'white', border: '1px solid #d97706' }}
          >
            {editingSalary ? 'Editing Enabled' : 'Edit Salary'}
          </button>
        </div>
      )}
      <div style={fieldStyle}>
        <label style={labelStyle}>Basic Salary *</label>
        <input type="number" min="0.01" step="0.01" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} required disabled={!selectedStaff || checkingSalary || (!!assignedSalary && !editingSalary)} style={{ ...selectStyle, width: '100%' }} />
      </div>
      <div style={{ ...fieldStyle, marginBottom: '20px' }}>
        <label style={labelStyle}>Salary Type *</label>
        <select value={salaryType} onChange={e => setSalaryType(e.target.value)} disabled={!selectedStaff || checkingSalary || (!!assignedSalary && !editingSalary)} style={{ ...selectStyle, width: '100%' }}>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      {formMsg && <div style={messageStyle(false)}>{formMsg}</div>}
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving || checkingSalary || !selectedStaff || (!!assignedSalary && !editingSalary)}>
        {saving ? 'Saving...' : editingSalary ? 'Update Salary' : 'Assign Salary'}
      </button>
    </form>
  );
};

const GenerateSalaryForm: React.FC<{
  onGenerate: (month: number, year: number) => Promise<boolean>;
}> = ({ onGenerate }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onGenerate(month, year);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} style={panelStyle}>
      <h3 style={{ marginBottom: '20px', color: '#1e2a3a' }}>Generate Salary</h3>
      <div style={fieldStyle}>
        <label style={labelStyle}>Month *</label>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
          ))}
        </select>
      </div>
      <div style={{ ...fieldStyle, marginBottom: '20px' }}>
        <label style={labelStyle}>Year *</label>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }} />
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
        {saving ? 'Generating...' : 'Generate Salary'}
      </button>
    </form>
  );
};

const PaySalaryForm: React.FC<{
  pendingSalaries: PendingSalary[];
  onRefresh: () => void;
  onPay: (staffIds: number[], month: number, year: number, bonus: number, deduction: number, paymentMethod: string, paymentReference: string, remarks: string) => Promise<boolean>;
}> = ({ pendingSalaries, onRefresh, onPay }) => {
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [bonus, setBonus] = useState('0');
  const [deduction, setDeduction] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  useEffect(() => {
    onRefresh();
  }, []); // eslint-disable-line

  useEffect(() => {
    setSelectedStaffIds([]);
    setFormMsg('');
  }, [month, year]);

  const periodRecords = pendingSalaries.filter(record =>
    record.salaryMonth === month && record.salaryYear === year);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleRecords = periodRecords.filter(record =>
    !normalizedSearch ||
    record.staffName.toLowerCase().includes(normalizedSearch) ||
    String(record.employeeNumber).includes(normalizedSearch) ||
    record.department.toLowerCase().includes(normalizedSearch));
  const selectedRecords = periodRecords.filter(record => selectedStaffIds.includes(record.staffId));
  const adjustmentPerEmployee = Number(bonus || 0) - Number(deduction || 0);
  const totalAmount = selectedRecords.reduce(
    (total, record) => total + Number(record.netSalary || record.basicSalary) + adjustmentPerEmployee,
    0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaffIds.length === 0) {
      setFormMsg('Select at least one employee salary to pay.');
      return;
    }
    if (Number(bonus) < 0 || Number(deduction) < 0) {
      setFormMsg('Bonus and deduction cannot be negative.');
      return;
    }
    if (selectedRecords.some(record =>
      Number(record.netSalary || record.basicSalary) + adjustmentPerEmployee < 0)) {
      setFormMsg('Deduction cannot be greater than an employee’s payable amount.');
      return;
    }
    if (paymentMethod !== 'cash' && !paymentReference.trim()) {
      setFormMsg(paymentMethod === 'cheque'
        ? 'Please enter the cheque number.'
        : 'Please enter the transaction or acknowledgement number.');
      return;
    }

    setSaving(true);
    setFormMsg('');
    const ok = await onPay(selectedStaffIds, month, year, Number(bonus), Number(deduction), paymentMethod, paymentReference.trim(), remarks);
    setSaving(false);
    if (ok) {
      setSelectedStaffIds([]);
      setBonus('0');
      setDeduction('0');
      setPaymentReference('');
      setRemarks('');
      onRefresh();
    }
  };

  const toggleStaff = (staffId: number) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const toggleAllStaff = () => {
    const visibleIds = visibleRecords.map(record => record.staffId);
    const allVisibleSelected = visibleIds.length > 0 &&
      visibleIds.every(id => selectedStaffIds.includes(id));
    setSelectedStaffIds(prev => allVisibleSelected
      ? prev.filter(id => !visibleIds.includes(id))
      : Array.from(new Set([...prev, ...visibleIds])));
  };

  const allSelected = visibleRecords.length > 0 &&
    visibleRecords.every(record => selectedStaffIds.includes(record.staffId));

  return (
    <form onSubmit={handleSubmit} style={{ ...panelStyle, maxWidth: '1100px', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '24px 28px', color: 'white', background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '22px' }}>Pay Salary</h3>
        <p style={{ margin: 0, color: '#dbeafe', fontSize: '14px' }}>Review generated salaries, select employees, and confirm the payment total.</p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>Salary Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Salary Year</label>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Search Employee</label>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, employee ID, or department" style={{ ...selectStyle, width: '100%' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: '#eff6ff', color: '#1e40af' }}>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>PENDING EMPLOYEES</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{periodRecords.length}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: '#f5f3ff', color: '#5b21b6' }}>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>SELECTED</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{selectedStaffIds.length}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: '#ecfdf5', color: '#047857' }}>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>TOTAL PAYMENT</div>
            <div style={{ fontSize: '22px', fontWeight: 800 }}>{money(totalAmount)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ fontWeight: 700, color: '#1e2a3a' }}>Employee Payment List</div>
          <button type="button" className="btn" onClick={toggleAllStaff} disabled={visibleRecords.length === 0 || saving}>
            {allSelected ? 'Clear All' : 'Select All'}
          </button>
        </div>
        <div className="staff-table-wrapper" style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '20px' }}>
          {visibleRecords.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#718096' }}>
              No generated pending salaries found for {monthName(month)} {year}.
            </div>
          ) : (
            <table className="staff-table">
              <thead>
                <tr><th>Select</th><th>Employee ID</th><th>Employee Name</th><th>Department</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
              </thead>
              <tbody>
                {visibleRecords.map(record => (
                  <tr key={record.id} style={{ background: selectedStaffIds.includes(record.staffId) ? '#eff6ff' : 'white' }}>
                    <td><input type="checkbox" checked={selectedStaffIds.includes(record.staffId)} onChange={() => toggleStaff(record.staffId)} disabled={saving} aria-label={`Select ${record.staffName}`} /></td>
                    <td style={{ fontWeight: 600 }}>{record.employeeNumber || 'Unavailable'}</td>
                    <td style={{ fontWeight: 600, color: '#1e2a3a' }}>{record.staffName}</td>
                    <td>{record.department}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(record.netSalary || record.basicSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div><label style={labelStyle}>Bonus (per employee)</label><input type="number" min="0" step="0.01" value={bonus} onChange={e => setBonus(e.target.value)} style={{ ...selectStyle, width: '100%' }} /></div>
            <div><label style={labelStyle}>Deduction (per employee)</label><input type="number" min="0" step="0.01" value={deduction} onChange={e => setDeduction(e.target.value)} style={{ ...selectStyle, width: '100%' }} /></div>
            <div><label style={labelStyle}>Payment Method *</label><select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setPaymentReference(''); setFormMsg(''); }} style={{ ...selectStyle, width: '100%' }}><option value="bank_transfer">Bank Transfer</option><option value="online">Online / UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option></select></div>
          </div>
          {paymentMethod !== 'cash' && (
            <div style={{ marginTop: '14px' }}>
              <label style={labelStyle}>{paymentMethod === 'cheque' ? 'Cheque Number *' : 'Transaction / Acknowledgement Number *'}</label>
              <input
                type="text"
                value={paymentReference}
                onChange={e => { setPaymentReference(e.target.value); setFormMsg(''); }}
                placeholder={paymentMethod === 'cheque' ? 'Enter cheque number' : 'Enter transaction ID or acknowledgement number'}
                maxLength={100}
                required
                style={{ ...selectStyle, width: '100%' }}
              />
            </div>
          )}
          <div style={{ marginTop: '14px' }}><label style={labelStyle}>Remarks</label><textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional payment note" style={{ ...selectStyle, width: '100%', minHeight: '72px', resize: 'vertical' }} /></div>
        </div>

        {formMsg && <div style={{ ...messageStyle(false), marginTop: '16px', marginBottom: 0 }}>{formMsg}</div>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginTop: '20px', flexWrap: 'wrap' }}>
          <div><span style={{ color: '#64748b', fontSize: '13px' }}>Total amount to be paid</span><div style={{ fontSize: '26px', fontWeight: 800, color: '#047857' }}>{money(totalAmount)}</div></div>
          <button type="submit" className="btn btn-primary" style={{ minWidth: '220px', padding: '12px 20px' }} disabled={saving || selectedStaffIds.length === 0}>
            {saving ? 'Processing Payment...' : `Pay ${selectedStaffIds.length} Employee${selectedStaffIds.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </form>
  );
};

const SalaryHistoryView: React.FC<{
  salaryHistory: SalaryHistory[];
  onLoad: (month: number, year: number) => Promise<void>;
}> = ({ salaryHistory, onLoad }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    await onLoad(month, year);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [month, year]); // eslint-disable-line

  const normalizedSearch = search.trim().toLowerCase();
  const filteredHistory = salaryHistory.filter(record =>
    !normalizedSearch ||
    record.staffName.toLowerCase().includes(normalizedSearch) ||
    String(record.employeeNumber).includes(normalizedSearch) ||
    record.department.toLowerCase().includes(normalizedSearch));
  const totalPaid = filteredHistory.reduce((total, record) => total + Number(record.netSalary || 0), 0);

  return (
    <>
      <div style={{ background: 'white', padding: '22px', borderRadius: '14px', boxShadow: '0 4px 18px rgba(15,23,42,0.08)', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 18px', color: '#1e2a3a' }}>Salary Payment History</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
          <div><label style={labelStyle}>Month</label><select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>)}</select></div>
          <div><label style={labelStyle}>Year</label><input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }} /></div>
          <div><label style={labelStyle}>Search Employee</label><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, employee ID, or department" style={{ ...selectStyle, width: '100%' }} /></div>
          <div style={{ display: 'flex', alignItems: 'end' }}><button type="button" className="btn btn-primary" onClick={loadHistory} disabled={loading} style={{ width: '100%' }}>{loading ? 'Loading...' : 'Refresh History'}</button></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ background: '#eff6ff', color: '#1e40af', padding: '12px 18px', borderRadius: '10px', fontWeight: 700 }}>Employees: {filteredHistory.length}</div>
        <div style={{ background: '#ecfdf5', color: '#047857', padding: '12px 18px', borderRadius: '10px', fontWeight: 700 }}>Total Paid: {money(totalPaid)}</div>
      </div>

      {filteredHistory.length > 0 ? (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Basic Salary</th>
                <th>Bonus</th>
                <th>Deduction</th>
                <th>Net Salary</th>
                <th>Method</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(record => (
                <tr key={record.id}>
                  <td style={{ fontWeight: 600 }}>{record.employeeNumber || 'Unavailable'}</td>
                  <td style={{ fontWeight: 600 }}>{record.staffName}</td>
                  <td>{record.department}</td>
                  <td>{money(record.basicSalary)}</td>
                  <td>{money(record.bonus)}</td>
                  <td>{money(record.deduction)}</td>
                  <td>{money(record.netSalary)}</td>
                  <td>{record.paymentMethod?.replace('_', ' ') || '-'}</td>
                  <td>{record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>
          {loading ? 'Loading salary history...' : salaryHistory.length ? 'No employees match your search.' : `No paid salaries found for ${monthName(month)} ${year}.`}
        </p>
      )}
    </>
  );
};

const PendingSalariesView: React.FC<{
  pendingSalaries: PendingSalary[];
  onRefresh: () => void;
}> = ({ pendingSalaries, onRefresh }) => {
  useEffect(() => {
    onRefresh();
  }, []); // eslint-disable-line

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, color: '#1e2a3a' }}>Pending Salaries</h3>
        <button onClick={onRefresh} className="btn btn-primary">Refresh</button>
      </div>

      {pendingSalaries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
          No pending salaries found.
        </div>
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Month/Year</th>
                <th>Basic Salary</th>
                <th>Status</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {pendingSalaries.map(record => (
                <tr key={record.id}>
                  <td style={{ fontWeight: 600 }}>{record.employeeNumber || 'Unavailable'}</td>
                  <td style={{ fontWeight: 600 }}>{record.staffName}</td>
                  <td>{record.department}</td>
                  <td>{monthName(record.salaryMonth)} {record.salaryYear}</td>
                  <td>{money(record.basicSalary)}</td>
                  <td><span style={statusStyle(record.status)}>{record.status}</span></td>
                  <td>{record.createdDate ? new Date(record.createdDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default SalaryManagement;
