import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useToastMessageState } from '../components/Toast/Toast';
import Modal from './Modal';
import './StaffList.css';
import './ManagementTabs.css';

type TransportTab = 'dashboard' | 'vehicleTypes' | 'vehicles' | 'drivers' | 'conductors' |
  'routes' | 'routeStops' | 'assignments' | 'allocations' | 'fees' | 'payments' |
  'fuel' | 'maintenance' | 'gps' | 'reports';

interface FieldConfig { key: string; label: string; type?: 'text' | 'number' | 'date' | 'time' | 'datetime-local' | 'select'; required?: boolean; optionsKey?: string; }
interface LookupOption { value: number; label: string; monthlyFee?: number; }
interface TabConfig { label: string; endpoint?: string; postEndpoint?: string; fields?: FieldConfig[]; }

const TABS: Record<TransportTab, TabConfig> = {
  dashboard: { label: 'Dashboard' },
  vehicleTypes: { label: 'Vehicle Types', endpoint: 'vehicle-types', fields: [
    { key: 'vehicleTypeName', label: 'Type Name', required: true }, { key: 'defaultCapacity', label: 'Capacity', type: 'number', required: true }, { key: 'description', label: 'Description' }] },
  vehicles: { label: 'Vehicles', endpoint: 'vehicles', fields: [
    { key: 'vehicleTypeId', label: 'Vehicle Type', type: 'select', optionsKey: 'vehicleTypes', required: true }, { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
    { key: 'vehicleName', label: 'Vehicle Name', required: true }, { key: 'capacity', label: 'Capacity', type: 'number', required: true },
    { key: 'registrationNumber', label: 'Registration Number', required: true }, { key: 'gpsDeviceId', label: 'GPS Device ID' },
    { key: 'insuranceExpiry', label: 'Insurance Expiry', type: 'date' }, { key: 'fitnessExpiry', label: 'Fitness Expiry', type: 'date' },
    { key: 'pollutionExpiry', label: 'Pollution Expiry', type: 'date' }] },
  drivers: { label: 'Drivers', endpoint: 'drivers', fields: [
    { key: 'name', label: 'Driver Name', required: true }, { key: 'mobile', label: 'Mobile', required: true },
    { key: 'licenseNumber', label: 'License Number', required: true }, { key: 'licenseExpiry', label: 'License Expiry', type: 'date' },
    { key: 'address', label: 'Address' }, { key: 'aadhaarNumber', label: 'Aadhaar Number' }, { key: 'bloodGroup', label: 'Blood Group' }] },
  conductors: { label: 'Conductors', endpoint: 'conductors', fields: [
    { key: 'name', label: 'Conductor Name', required: true }, { key: 'mobile', label: 'Mobile', required: true },
    { key: 'address', label: 'Address' }, { key: 'aadhaarNumber', label: 'Aadhaar Number' }, { key: 'bloodGroup', label: 'Blood Group' }] },
  routes: { label: 'Routes', endpoint: 'routes', fields: [
    { key: 'routeName', label: 'Route Name', required: true }, { key: 'routeCode', label: 'Route Code', required: true },
    { key: 'startPoint', label: 'Start Point', required: true }, { key: 'endPoint', label: 'End Point', required: true },
    { key: 'distanceKm', label: 'Distance (KM)', type: 'number' }, { key: 'estimatedMinutes', label: 'Estimated Minutes', type: 'number' }] },
  routeStops: { label: 'Route Stops', endpoint: 'routes', postEndpoint: 'route-stops', fields: [
    { key: 'routeId', label: 'Route', type: 'select', optionsKey: 'routes', required: true }, { key: 'stopName', label: 'Stop Name', required: true },
    { key: 'pickupTime', label: 'Pickup Time', type: 'time', required: true }, { key: 'dropTime', label: 'Drop Time', type: 'time' },
    { key: 'stopOrder', label: 'Stop Order', type: 'number', required: true }] },
  assignments: { label: 'Vehicle Assignments', endpoint: 'assignments', fields: [
    { key: 'academicSessionId', label: 'Academic Session', type: 'select', optionsKey: 'sessions', required: true }, { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true },
    { key: 'driverId', label: 'Driver', type: 'select', optionsKey: 'drivers', required: true }, { key: 'conductorId', label: 'Conductor', type: 'select', optionsKey: 'conductors' },
    { key: 'routeId', label: 'Route', type: 'select', optionsKey: 'routes', required: true }, { key: 'startDate', label: 'Start Date', type: 'date', required: true }] },
  allocations: { label: 'Student Transport', endpoint: 'allocations', fields: [
    { key: 'academicSessionId', label: 'Academic Session', type: 'select', optionsKey: 'sessions', required: true }, { key: 'studentId', label: 'Student', type: 'select', optionsKey: 'students', required: true },
    { key: 'vehicleAssignmentId', label: 'Vehicle / Route Assignment', type: 'select', optionsKey: 'assignments', required: true }, { key: 'pickupStopId', label: 'Pickup Stop', type: 'select', optionsKey: 'stops', required: true },
    { key: 'dropStopId', label: 'Drop Stop', type: 'select', optionsKey: 'stops', required: true }, { key: 'seatNumber', label: 'Seat Number' },
    { key: 'pickupShift', label: 'Pickup Shift' }, { key: 'dropShift', label: 'Drop Shift' },
    { key: 'monthlyFee', label: 'Monthly Fee', type: 'number', required: true }, { key: 'startDate', label: 'Start Date', type: 'date', required: true },
    { key: 'endDate', label: 'End Date', type: 'date' }] },
  fees: { label: 'Fee Management', endpoint: 'fees', fields: [
    { key: 'studentTransportAllocationId', label: 'Student Transport Allocation', type: 'select', optionsKey: 'allocations', required: true },
    { key: 'feeMonth', label: 'Fee Month', type: 'select', optionsKey: 'months', required: true }, { key: 'feeYear', label: 'Fee Year', type: 'number', required: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true }, { key: 'dueDate', label: 'Due Date', type: 'date', required: true }] },
  payments: { label: 'Fee Collection', endpoint: 'payments', fields: [
    { key: 'transportFeeId', label: 'Outstanding Fee', type: 'select', optionsKey: 'fees', required: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true }, { key: 'paymentDate', label: 'Payment Date', type: 'datetime-local', required: true },
    { key: 'paymentMode', label: 'Payment Mode', required: true }, { key: 'referenceNumber', label: 'Reference Number' }, { key: 'receiptNumber', label: 'Receipt Number' }] },
  fuel: { label: 'Fuel Management', endpoint: 'fuel-logs', fields: [
    { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true }, { key: 'fuelDate', label: 'Date', type: 'date', required: true },
    { key: 'litres', label: 'Litres', type: 'number', required: true }, { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'odometerReading', label: 'Odometer', type: 'number' }] },
  maintenance: { label: 'Vehicle Maintenance', endpoint: 'maintenance', fields: [
    { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true }, { key: 'serviceDate', label: 'Service Date', type: 'date', required: true },
    { key: 'nextServiceDate', label: 'Next Service', type: 'date' }, { key: 'cost', label: 'Cost', type: 'number', required: true },
    { key: 'workshop', label: 'Workshop' }, { key: 'remarks', label: 'Remarks' }] },
  gps: { label: 'GPS Tracking', endpoint: 'gps-locations', fields: [
    { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true },
    { key: 'latitude', label: 'Latitude', type: 'number', required: true }, { key: 'longitude', label: 'Longitude', type: 'number', required: true },
    { key: 'speed', label: 'Speed', type: 'number' }, { key: 'recordedAt', label: 'Recorded At', type: 'datetime-local', required: true }] },
  reports: { label: 'Reports', endpoint: 'reports' },
};

const pretty = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const display = (value: any): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  if (Array.isArray(value)) return `${value.length} stop(s)`;
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleDateString('en-GB');
  return String(value);
};

const apiError = (result: any, fallback: string) => {
  if (result?.message) return result.message;
  if (result?.title && result?.errors) {
    const details = Object.values(result.errors).flat().join(' ');
    return `${result.title}${details ? ` ${details}` : ''}`;
  }
  return result?.title || fallback;
};

const TransportManagement: React.FC<{ selectedSchoolId: number | null }> = ({ selectedSchoolId }) => {
  const [tab, setTab] = useState<TransportTab>('dashboard');
  const [rows, setRows] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [form, setForm] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useToastMessageState();
  const [lookups, setLookups] = useState<Record<string, LookupOption[]>>({});

  const headers = () => ({ accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });
  const config = TABS[tab];

  useEffect(() => { if (selectedSchoolId) load(); }, [selectedSchoolId, tab]); // eslint-disable-line
  useEffect(() => {
    if (!selectedSchoolId || !config.fields) return;
    const get = (path: string) => fetch(`${API_BASE_URL}${path}`, { cache: 'no-store', headers: headers() })
      .then(async response => { const json = await response.json(); if (!response.ok) throw new Error(json.message || 'Unable to load form options.'); return json.data ?? []; });
    Promise.all([
      get(`/api/Transport/vehicle-types?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/vehicles?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/drivers?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/conductors?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/routes?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/assignments?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/allocations?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/fees?schoolId=${selectedSchoolId}`),
      get(`/api/Admin/academic-sessions?schoolId=${selectedSchoolId}`),
      get(`/api/Student/students-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=1000`)
    ]).then(([types, vehicles, drivers, conductors, routes, assignments, allocations, fees, sessions, students]) => {
      const active = (items: any[]) => items.filter(item => item.isActive !== false);
      setLookups({
        months: MONTH_NAMES.map((label, index) => ({ value: index + 1, label })),
        allocations: active(allocations).map(item => ({
          value: item.id,
          label: `${item.studentName} - ${item.vehicleName} - ${item.routeName}`,
          monthlyFee: Number(item.monthlyFee || 0)
        })),
        fees: fees.map((item: any) => ({ value: item.id, label: `${item.studentName} - ${item.feeMonth}/${item.feeYear} - ${item.status} - Due Rs. ${Number(item.amount - item.paidAmount).toLocaleString()}` })),
        vehicleTypes: active(types).map(item => ({ value: item.id, label: `${item.vehicleTypeName} (${item.defaultCapacity} seats)` })),
        vehicles: active(vehicles).map(item => ({ value: item.id, label: `${item.vehicleName} — ${item.vehicleNumber}` })),
        drivers: active(drivers).map(item => ({ value: item.id, label: `${item.name} — ${item.mobile}` })),
        conductors: active(conductors).map(item => ({ value: item.id, label: `${item.name} — ${item.mobile}` })),
        routes: active(routes).map(item => ({ value: item.id, label: `${item.routeName} (${item.startPoint} to ${item.endPoint})` })),
        stops: routes.flatMap((route: any) => (route.stops ?? []).map((stop: any) => ({ value: stop.id, label: `${route.routeName} — ${stop.stopName}` }))),
        assignments: active(assignments).map(item => ({ value: item.id, label: `${item.vehicleName} — ${item.routeName} — ${item.driverName}` })),
        sessions: active(sessions).map(item => ({ value: item.id, label: `${new Date(item.yearStart).getFullYear()}–${new Date(item.yearEnd).getFullYear()}${item.isActive ? ' (Active)' : ''}` })),
        students: active(students).map(item => ({ value: item.id, label: `${item.studentName}${item.rollNumber ? ` — Roll ${item.rollNumber}` : ''}` }))
      });
    }).catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load form options.'));
  }, [selectedSchoolId, tab]); // eslint-disable-line

  const load = async () => {
    if (!selectedSchoolId) return;
    const endpoint = tab === 'dashboard' ? 'dashboard' : config.endpoint;
    if (!endpoint) { setRows([]); return; }
    try {
      setLoading(true); setMessage('');
      const response = await fetch(`${API_BASE_URL}/api/Transport/${endpoint}?schoolId=${selectedSchoolId}`, {
        cache: 'no-store', headers: headers()
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('json'))
        throw new Error(`Transport API returned HTML instead of JSON: ${response.url}`);
      const result = await response.json();
      if (!response.ok) throw new Error(apiError(result, 'Unable to load transport data.'));
      if (tab === 'dashboard') setDashboard(result.data ?? {});
      else if (tab === 'routeStops') setRows((result.data ?? []).flatMap((route: any) => (route.stops ?? []).map((stop: any) => ({ routeName: route.routeName, ...stop }))));
      else setRows(result.data ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load data.'); }
    finally { setLoading(false); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSchoolId || !config.fields) return;
    const body: any = { ...(editingRow ?? {}), schoolId: selectedSchoolId, isActive: editingRow?.isActive ?? true };
    config.fields.forEach(field => {
      const value = form[field.key];
      body[field.key] = field.type === 'number' || field.type === 'select'
        ? Number(value || 0)
        : field.type === 'time' && value
          ? `${value}:00`
          : (value || null);
    });
    try {
      const endpoint = config.postEndpoint || config.endpoint;
      const url = editingId === null
        ? `${API_BASE_URL}/api/Transport/${endpoint}`
        : `${API_BASE_URL}/api/Transport/${endpoint}/${editingId}`;
      const response = await fetch(url, { method: editingId === null ? 'POST' : 'PUT', headers: headers(), body: JSON.stringify(body) });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('json'))
        throw new Error(`Transport API returned HTML instead of JSON: ${response.url}`);
      const result = await response.json();
      if (!response.ok) throw new Error(apiError(result, 'Unable to save.'));
      setShowForm(false); setEditingId(null); setEditingRow(null); setForm({}); setMessage(result.message); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save.'); }
  };

  const startEdit = (row: any) => {
    if (!config.fields) return;
    const values: Record<string, string> = {};
    config.fields.forEach(field => {
      const value = row[field.key];
      if (value === null || value === undefined) values[field.key] = '';
      else if (field.type === 'date') values[field.key] = String(value).substring(0, 10);
      else if (field.type === 'time') values[field.key] = String(value).substring(0, 5);
      else if (field.type === 'datetime-local') values[field.key] = String(value).substring(0, 16);
      else values[field.key] = String(value);
    });
    setForm(values);
    setEditingId(Number(row.id));
    setEditingRow(row);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setEditingRow(null); setForm({}); };

  const displayCell = (column: string, value: any) => {
    if (tab === 'fees' && column === 'feeMonth') {
      return MONTH_NAMES[Number(value) - 1] || display(value);
    }
    return display(value);
  };

  const updateFormField = (field: FieldConfig, value: string) => {
    if (tab === 'fees' && field.key === 'studentTransportAllocationId') {
      const allocation = lookups.allocations?.find(option => option.value === Number(value));
      setForm(current => ({
        ...current,
        [field.key]: value,
        amount: allocation ? String(allocation.monthlyFee ?? '') : ''
      }));
      return;
    }
    setForm(current => ({ ...current, [field.key]: value }));
  };

  const columns = useMemo(() => rows.length ? Object.keys(rows[0]).filter(key => !key.toLowerCase().endsWith('id') && key !== 'schoolId').slice(0, 8) : [], [rows]);
  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  return <div className="staff-list-container">
    <div className="staff-list-header"><h2>Transport Management</h2></div>
    <div className="management-tabs transport-tabs" role="tablist" aria-label="Transport sections">
      {(Object.keys(TABS) as TransportTab[]).map(key => <button key={key} type="button" role="tab" aria-selected={tab === key}
        className={`management-tab ${tab === key ? 'active' : ''}`} onClick={() => { setTab(key); closeForm(); setMessage(''); }}>{TABS[key].label}</button>)}
    </div>

    {message && <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', background: '#edf2f7' }}>{message}</div>}

    {tab === 'dashboard' ? <div className="stats-grid">
      {[['Vehicles', dashboard.totalVehicles], ['Active Routes', dashboard.activeRoutes], ['Allocated Students', dashboard.allocatedStudents],
        ['Available Seats', dashboard.availableSeats], ['Pending Fees', `Rs. ${Number(dashboard.pendingFees || 0).toLocaleString()}`], ['Expiring Documents', dashboard.expiringDocuments]]
        .map(([label, value]) => <div className="stat-card" key={String(label)}><div className="stat-header"><span>{label}</span></div><div className="stat-value">{value ?? 0}</div></div>)}
    </div> : tab === 'reports' ? <div className="stats-grid">
        {rows[0] && ([['Total Fees', rows[0].totalFees], ['Fees Collected', rows[0].collectedFees], ['Pending Fees', rows[0].pendingFees],
          ['Fuel Cost', rows[0].fuelCost], ['Maintenance Cost', rows[0].maintenanceCost], ['Operating Cost', rows[0].operatingCost]] as [string, any][])
          .map(([label, value]) => <div className="stat-card" key={label}><div className="stat-header"><span>{label}</span></div><div className="stat-value">Rs. {Number(value || 0).toLocaleString()}</div></div>)}
        {rows[0] && ([['Allocated Students', rows[0].allocatedStudents], ['Available Seats', rows[0].availableSeats]] as [string, any][])
          .map(([label, value]) => <div className="stat-card" key={label}><div className="stat-header"><span>{label}</span></div><div className="stat-value">{value || 0}</div></div>)}
      </div> : <>
        {config.fields && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button className="btn btn-primary" onClick={() => showForm ? closeForm() : setShowForm(true)}>{showForm ? 'Close' : `+ Add ${config.label.replace(/s$/, '')}`}</button>
        </div>}
        {loading ? <div className="staff-list-loading">Loading...</div> : rows.length === 0 ? <div className="staff-list-loading">No records found.</div> :
          <div className="staff-table-wrapper"><table className="staff-table"><thead><tr>{columns.map(column => <th key={column}>{pretty(column)}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id ?? index}>{columns.map((column, columnIndex) => <td key={column}>
              {config.fields && columnIndex === 0
                ? <span className="staff-name-link" onClick={() => startEdit(row)}>{displayCell(column, row[column])}</span>
                : displayCell(column, row[column])}
            </td>)}</tr>)}</tbody></table></div>}
      </>}
    <Modal
      isOpen={showForm}
      onClose={closeForm}
      title={`${editingId === null ? 'Add' : 'Edit'} ${config.label.replace(/s$/, '')}`}
      submitLabel={editingId === null ? 'Save' : 'Update'}
      formId="transport-form"
      showCancel={false}
      size="large"
    >
      {config.fields && <form id="transport-form" onSubmit={save} className="form-grid">
        {config.fields.map(field => <div className="form-group" key={field.key}><label>{field.label}{field.required ? ' *' : ''}</label>
          {field.type === 'select' ? <select required={field.required} value={form[field.key] || ''} onChange={event => updateFormField(field, event.target.value)}>
            <option value="">Select {field.label}</option>{(lookups[field.optionsKey || ''] || []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select> : <input type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} required={field.required} value={form[field.key] || ''} onChange={event => updateFormField(field, event.target.value)} />}</div>)}
      </form>}
    </Modal>
  </div>;
};

export default TransportManagement;
