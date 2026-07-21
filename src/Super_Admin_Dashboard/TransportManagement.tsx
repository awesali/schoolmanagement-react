import React, { useEffect, useMemo, useState } from 'react';
import { TRANSPORT_API_BASE_URL } from '../config';
import './StaffList.css';
import './ManagementTabs.css';

type TransportTab = 'dashboard' | 'vehicleTypes' | 'vehicles' | 'drivers' | 'conductors' |
  'routes' | 'routeStops' | 'assignments' | 'allocations' | 'fees' | 'payments' |
  'fuel' | 'maintenance' | 'gps' | 'reports';

interface FieldConfig { key: string; label: string; type?: 'text' | 'number' | 'date' | 'time' | 'select'; required?: boolean; optionsKey?: string; }
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
    { key: 'monthlyFee', label: 'Monthly Fee', type: 'number', required: true }, { key: 'startDate', label: 'Start Date', type: 'date', required: true }] },
  fees: { label: 'Fee Management', endpoint: 'fees' },
  payments: { label: 'Fee Collection', endpoint: 'payments' },
  fuel: { label: 'Fuel Management', endpoint: 'fuel-logs', fields: [
    { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true }, { key: 'fuelDate', label: 'Date', type: 'date', required: true },
    { key: 'litres', label: 'Litres', type: 'number', required: true }, { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'odometerReading', label: 'Odometer', type: 'number' }] },
  maintenance: { label: 'Vehicle Maintenance', endpoint: 'maintenance', fields: [
    { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true }, { key: 'serviceDate', label: 'Service Date', type: 'date', required: true },
    { key: 'nextServiceDate', label: 'Next Service', type: 'date' }, { key: 'cost', label: 'Cost', type: 'number', required: true },
    { key: 'workshop', label: 'Workshop' }, { key: 'remarks', label: 'Remarks' }] },
  gps: { label: 'GPS Tracking' },
  reports: { label: 'Reports' },
};

const pretty = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lookups, setLookups] = useState<Record<string, { value: number; label: string }[]>>({});

  const headers = () => ({ accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });
  const config = TABS[tab];

  useEffect(() => { if (selectedSchoolId) load(); }, [selectedSchoolId, tab]); // eslint-disable-line
  useEffect(() => {
    if (!selectedSchoolId || !config.fields) return;
    const get = (path: string) => fetch(`${TRANSPORT_API_BASE_URL}${path}`, { cache: 'no-store', headers: headers() })
      .then(async response => { const json = await response.json(); if (!response.ok) throw new Error(json.message || 'Unable to load form options.'); return json.data ?? []; });
    Promise.all([
      get(`/api/Transport/vehicle-types?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/vehicles?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/drivers?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/conductors?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/routes?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/assignments?schoolId=${selectedSchoolId}`),
      get(`/api/Admin/academic-sessions?schoolId=${selectedSchoolId}`),
      get(`/api/Student/students-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=1000`)
    ]).then(([types, vehicles, drivers, conductors, routes, assignments, sessions, students]) => {
      const active = (items: any[]) => items.filter(item => item.isActive !== false);
      setLookups({
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
      const response = await fetch(`${TRANSPORT_API_BASE_URL}/api/Transport/${endpoint}?schoolId=${selectedSchoolId}`, {
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
    const body: any = { schoolId: selectedSchoolId, isActive: true };
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
      const response = await fetch(`${TRANSPORT_API_BASE_URL}/api/Transport/${endpoint}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('json'))
        throw new Error(`Transport API returned HTML instead of JSON: ${response.url}`);
      const result = await response.json();
      if (!response.ok) throw new Error(apiError(result, 'Unable to save.'));
      setShowForm(false); setForm({}); setMessage(result.message); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save.'); }
  };

  const columns = useMemo(() => rows.length ? Object.keys(rows[0]).filter(key => !key.toLowerCase().endsWith('id') && key !== 'schoolId').slice(0, 8) : [], [rows]);
  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  return <div className="staff-list-container">
    <div className="staff-list-header"><h2>Transport Management</h2></div>
    <div className="management-tabs transport-tabs" role="tablist" aria-label="Transport sections">
      {(Object.keys(TABS) as TransportTab[]).map(key => <button key={key} type="button" role="tab" aria-selected={tab === key}
        className={`management-tab ${tab === key ? 'active' : ''}`} onClick={() => { setTab(key); setShowForm(false); setMessage(''); }}>{TABS[key].label}</button>)}
    </div>

    {message && <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', background: '#edf2f7' }}>{message}</div>}

    {tab === 'dashboard' ? <div className="stats-grid">
      {[['Vehicles', dashboard.totalVehicles], ['Active Routes', dashboard.activeRoutes], ['Allocated Students', dashboard.allocatedStudents],
        ['Available Seats', dashboard.availableSeats], ['Pending Fees', `Rs. ${Number(dashboard.pendingFees || 0).toLocaleString()}`], ['Expiring Documents', dashboard.expiringDocuments]]
        .map(([label, value]) => <div className="stat-card" key={String(label)}><div className="stat-header"><span>{label}</span></div><div className="stat-value">{value ?? 0}</div></div>)}
    </div> : tab === 'gps' ? <div className="staff-list-loading">GPS devices can post locations through the Transport GPS data table. Live map integration requires the GPS provider API.</div>
      : tab === 'reports' ? <div className="stats-grid">
        <div className="stat-card"><div className="stat-header"><span>Seat Occupancy</span></div><div className="stat-value">{dashboard.allocatedStudents || 0}</div></div>
        <div className="stat-card"><div className="stat-header"><span>Available Seats</span></div><div className="stat-value">{dashboard.availableSeats || 0}</div></div>
        <div className="stat-card"><div className="stat-header"><span>Pending Fees</span></div><div className="stat-value">Rs. {Number(dashboard.pendingFees || 0).toLocaleString()}</div></div>
      </div> : <>
        {config.fields && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button className="btn btn-primary" onClick={() => setShowForm(value => !value)}>{showForm ? 'Close' : `+ Add ${config.label.replace(/s$/, '')}`}</button>
        </div>}
        {showForm && config.fields && <form onSubmit={save} className="form-grid" style={{ padding: '20px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
          {config.fields.map(field => <div className="form-group" key={field.key}><label>{field.label}{field.required ? ' *' : ''}</label>
            {field.type === 'select' ? <select required={field.required} value={form[field.key] || ''} onChange={event => setForm({ ...form, [field.key]: event.target.value })}>
              <option value="">Select {field.label}</option>{(lookups[field.optionsKey || ''] || []).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select> : <input type={field.type || 'text'} required={field.required} value={form[field.key] || ''} onChange={event => setForm({ ...form, [field.key]: event.target.value })} />}</div>)}
          <div className="form-group"><button type="submit" className="btn btn-primary">Save</button></div>
        </form>}
        {loading ? <div className="staff-list-loading">Loading...</div> : rows.length === 0 ? <div className="staff-list-loading">No records found.</div> :
          <div className="staff-table-wrapper"><table className="staff-table"><thead><tr>{columns.map(column => <th key={column}>{pretty(column)}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id ?? index}>{columns.map(column => <td key={column}>{display(row[column])}</td>)}</tr>)}</tbody></table></div>}
      </>}
  </div>;
};

export default TransportManagement;
