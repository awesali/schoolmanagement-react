import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './StaffList.css';
import './ManagementTabs.css';

type SalaryTab = 'dashboard' | 'assign' | 'generate' | 'pay' | 'history' | 'pending';

interface Staff {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  roleName?: string;
}

interface SalaryHistory {
  id: number;
  staffId: number;
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
  const [pendingSalaries, setPendingSalaries] = useState<SalaryHistory[]>([]);
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
      const response = await fetch(`${API_BASE_URL}/api/Admin/Staff-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=100`, {
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

  const fetchSalaryHistory = async (staffId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Staff/history/${staffId}`, {
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
      const response = await fetch(`${API_BASE_URL}/api/Staff/pending`, {
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

  const assignSalary = async (staffId: number, basicSalary: number, salaryType: string) => {
    try {
      setActionMsg(null);
      const response = await fetch(`${API_BASE_URL}/api/Staff/assign`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ staffId, basicSalary, salaryType }),
      });
      setActionMsg({
        text: response.ok ? 'Salary assigned successfully.' : 'Failed to assign salary.',
        ok: response.ok,
      });
      if (response.ok) fetchDashboardData();
      return response.ok;
    } catch (error) {
      console.error('Failed to assign salary:', error);
      setActionMsg({ text: 'Error assigning salary.', ok: false });
      return false;
    }
  };

  const generateSalary = async (month: number, year: number) => {
    try {
      setActionMsg(null);
      const response = await fetch(`${API_BASE_URL}/api/Staff/generate?month=${month}&year=${year}`, {
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
    remarks: string,
  ) => {
    try {
      setActionMsg(null);
      const results = await Promise.all(
        staffIds.map(async staffId => {
          const response = await fetch(`${API_BASE_URL}/api/Staff/pay`, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ staffId, month, year, bonus, deduction, paymentMethod, remarks }),
          });

          return { staffId, ok: response.ok };
        })
      );

      const failed = results.filter(result => !result.ok);
      const paidCount = results.length - failed.length;

      setActionMsg({
        text: failed.length === 0
          ? `${paidCount} salary payment${paidCount === 1 ? '' : 's'} completed successfully.`
          : `${paidCount} paid, ${failed.length} failed. Please check pending salaries and try again.`,
        ok: failed.length === 0,
      });

      fetchDashboardData();
      fetchPendingSalaries();
      return failed.length === 0;
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
        <PaySalaryForm staffList={staffList} onPay={payMultipleSalaries} />
      )}

      {activeTab === 'history' && (
        <SalaryHistoryView
          staffList={staffList}
          salaryHistory={salaryHistory}
          onStaffSelect={fetchSalaryHistory}
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
  onAssign: (staffId: number, basicSalary: number, salaryType: string) => Promise<boolean>;
}> = ({ staffList, onAssign }) => {
  const [staffId, setStaffId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [salaryType, setSalaryType] = useState('monthly');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !basicSalary) return;

    setSaving(true);
    const ok = await onAssign(Number(staffId), Number(basicSalary), salaryType);
    setSaving(false);
    if (ok) {
      setStaffId('');
      setBasicSalary('');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={panelStyle}>
      <h3 style={{ marginBottom: '20px', color: '#1e2a3a' }}>Assign Salary</h3>
      <div style={fieldStyle}>
        <label style={labelStyle}>Staff *</label>
        <select value={staffId} onChange={e => setStaffId(e.target.value)} required style={{ ...selectStyle, width: '100%' }}>
          <option value="">Select Staff</option>
          {staffList.map(staff => (
            <option key={staff.id} value={staff.id}>{staff.name}</option>
          ))}
        </select>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Basic Salary *</label>
        <input type="number" min="0" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} required style={{ ...selectStyle, width: '100%' }} />
      </div>
      <div style={{ ...fieldStyle, marginBottom: '20px' }}>
        <label style={labelStyle}>Salary Type *</label>
        <select value={salaryType} onChange={e => setSalaryType(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
        {saving ? 'Saving...' : 'Assign Salary'}
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
  staffList: Staff[];
  onPay: (staffIds: number[], month: number, year: number, bonus: number, deduction: number, paymentMethod: string, remarks: string) => Promise<boolean>;
}> = ({ staffList, onPay }) => {
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [bonus, setBonus] = useState('0');
  const [deduction, setDeduction] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaffIds.length === 0) return;

    setSaving(true);
    const ok = await onPay(selectedStaffIds, month, year, Number(bonus), Number(deduction), paymentMethod, remarks);
    setSaving(false);
    if (ok) {
      setSelectedStaffIds([]);
      setBonus('0');
      setDeduction('0');
      setRemarks('');
    }
  };

  const toggleStaff = (staffId: number) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const toggleAllStaff = () => {
    setSelectedStaffIds(prev =>
      prev.length === staffList.length ? [] : staffList.map(staff => staff.id)
    );
  };

  const allSelected = staffList.length > 0 && selectedStaffIds.length === staffList.length;

  return (
    <form onSubmit={handleSubmit} style={{ ...panelStyle, maxWidth: '640px' }}>
      <h3 style={{ marginBottom: '20px', color: '#1e2a3a' }}>Pay Salary</h3>
      <div style={fieldStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Staff *</label>
          <button type="button" className="btn" onClick={toggleAllStaff} disabled={staffList.length === 0 || saving}>
            {allSelected ? 'Clear All' : 'Select All'}
          </button>
        </div>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '260px', overflowY: 'auto' }}>
          {staffList.length === 0 ? (
            <div style={{ padding: '14px', color: '#718096', fontSize: '14px' }}>No staff found.</div>
          ) : (
            staffList.map(staff => (
              <label
                key={staff.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr auto',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderBottom: '1px solid #edf2f7',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  background: selectedStaffIds.includes(staff.id) ? '#ebf8ff' : 'white',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedStaffIds.includes(staff.id)}
                  onChange={() => toggleStaff(staff.id)}
                  disabled={saving}
                />
                <span>
                  <strong style={{ color: '#1e2a3a' }}>{staff.name}</strong>
                  {staff.email && <span style={{ display: 'block', color: '#718096', fontSize: '12px' }}>{staff.email}</span>}
                </span>
                {staff.roleName && <span style={{ color: '#4a5568', fontSize: '12px' }}>{staff.roleName}</span>}
              </label>
            ))
          )}
        </div>
        <div style={{ marginTop: '8px', color: '#4a5568', fontSize: '13px', fontWeight: 600 }}>
          Selected: {selectedStaffIds.length}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Month *</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{monthName(i + 1)}</option>
            ))}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Year *</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...selectStyle, width: '100%' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Bonus</label>
          <input type="number" min="0" value={bonus} onChange={e => setBonus(e.target.value)} style={{ ...selectStyle, width: '100%' }} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Deduction</label>
          <input type="number" min="0" value={deduction} onChange={e => setDeduction(e.target.value)} style={{ ...selectStyle, width: '100%' }} />
        </div>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>Payment Method *</label>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>
      <div style={{ ...fieldStyle, marginBottom: '20px' }}>
        <label style={labelStyle}>Remarks</label>
        <textarea value={remarks} onChange={e => setRemarks(e.target.value)} style={{ ...selectStyle, width: '100%', minHeight: '76px', resize: 'vertical' }} />
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving || selectedStaffIds.length === 0}>
        {saving ? 'Processing...' : `Pay ${selectedStaffIds.length || ''} Salary${selectedStaffIds.length === 1 ? '' : 'ies'}`}
      </button>
    </form>
  );
};

const SalaryHistoryView: React.FC<{
  staffList: Staff[];
  salaryHistory: SalaryHistory[];
  onStaffSelect: (staffId: number) => void;
}> = ({ staffList, salaryHistory, onStaffSelect }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const handleStaffChange = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (staffId) onStaffSelect(Number(staffId));
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        <select value={selectedStaffId} onChange={e => handleStaffChange(e.target.value)} style={selectStyle}>
          <option value="">Select Staff to View History</option>
          {staffList.map(staff => (
            <option key={staff.id} value={staff.id}>{staff.name}</option>
          ))}
        </select>
      </div>

      {salaryHistory.length > 0 ? (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Month/Year</th>
                <th>Basic Salary</th>
                <th>Bonus</th>
                <th>Deduction</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {salaryHistory.map(record => (
                <tr key={record.id}>
                  <td>{monthName(record.salaryMonth)} {record.salaryYear}</td>
                  <td>{money(record.basicSalary)}</td>
                  <td>{money(record.bonus)}</td>
                  <td>{money(record.deduction)}</td>
                  <td>{money(record.netSalary)}</td>
                  <td><span style={statusStyle(record.status)}>{record.status}</span></td>
                  <td>{record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>Select a staff member to view salary history.</p>
      )}
    </>
  );
};

const PendingSalariesView: React.FC<{
  pendingSalaries: SalaryHistory[];
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
                <th>Staff ID</th>
                <th>Month/Year</th>
                <th>Basic Salary</th>
                <th>Status</th>
                <th>Created Date</th>
              </tr>
            </thead>
            <tbody>
              {pendingSalaries.map(record => (
                <tr key={record.id}>
                  <td>{record.staffId}</td>
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
