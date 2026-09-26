import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import { useToastMessageState } from '../components/Toast/Toast';
import Modal from './Modal';
import './StaffList.css';
import './ManagementTabs.css';
import { VehicleIcon, DriverIcon, ConductorIcon, RouteIcon, AssignmentIcon, PaymentIcon, FuelIcon, MaintenanceIcon, AddStudentIcon, AddCircleIcon, PreviewIcon, RemoveIcon, CloseIcon } from '../components/Icons/Icons';
import '../components/Icons/CreateIconButton.css';

type TransportTab = 'dashboard' | 'vehicleTypes' | 'vehicles' | 'drivers' | 'conductors' |
  'routes' | 'assignments' | 'allocations' | 'payments' | 'fuel' | 'maintenance';

interface FieldConfig { key: string; label: string; type?: 'text' | 'number' | 'date' | 'time' | 'datetime-local' | 'select' | 'multiselect' | 'file'; required?: boolean; optionsKey?: string; }
interface LookupOption { value: number | string; label: string; monthlyFee?: number; totalAmount?: number; dueAmount?: number; dueDate?: string; vehicleId?: number; driverId?: number; conductorId?: number; className?: string; sectionName?: string; academicSessionId?: number; }
interface TabConfig { label: string; endpoint?: string; postEndpoint?: string; fields?: FieldConfig[]; }
type AllocationRow = Record<string, string>;

const TABS: Record<TransportTab, TabConfig> = {
  dashboard: { label: 'Dashboard' },
  vehicleTypes: { label: 'Vehicle Types', endpoint: 'vehicle-types', fields: [
    { key: 'vehicleTypeName', label: 'Type Name', required: true }, { key: 'defaultCapacity', label: 'Capacity', type: 'number', required: true }, { key: 'description', label: 'Description' }] },
  vehicles: { label: 'Vehicle', endpoint: 'vehicle-setup', fields: [
    { key: 'vehicleTypeName', label: 'Vehicle Type', required: true }, { key: 'defaultCapacity', label: 'Default Capacity', type: 'number', required: true }, { key: 'description', label: 'Type Description' },
    { key: 'vehicleNumber', label: 'Vehicle Number', required: true },
    { key: 'vehicleName', label: 'Vehicle Name', required: true },
    { key: 'registrationNumber', label: 'Registration Number', required: true },
    { key: 'insuranceExpiry', label: 'Insurance Expiry', type: 'date' }, { key: 'fitnessExpiry', label: 'Fitness Expiry', type: 'date' },
    { key: 'pollutionExpiry', label: 'Pollution Expiry', type: 'date' }] },
  drivers: { label: 'Drivers', endpoint: 'drivers', fields: [
    { key: 'name', label: 'Driver Name', required: true }, { key: 'mobile', label: 'Mobile', required: true },
    { key: 'licenseNumber', label: 'License Number', required: true }, { key: 'licenseExpiry', label: 'License Expiry', type: 'date', required: true },
    { key: 'address', label: 'Address' }, { key: 'aadhaarNumber', label: 'Aadhaar Number', required: true }, { key: 'bloodGroup', label: 'Blood Group', type: 'select', optionsKey: 'bloodGroups' }] },
  conductors: { label: 'Conductors', endpoint: 'conductors', fields: [
    { key: 'name', label: 'Conductor Name', required: true }, { key: 'mobile', label: 'Mobile', required: true },
    { key: 'address', label: 'Address' }, { key: 'aadhaarNumber', label: 'Aadhaar Number', required: true }, { key: 'bloodGroup', label: 'Blood Group', type: 'select', optionsKey: 'bloodGroups' }] },
  routes: { label: 'Routes', endpoint: 'routes', fields: [
    { key: 'routeName', label: 'Route Name', required: true }, { key: 'routeCode', label: 'Route Code', required: true },
    { key: 'startPoint', label: 'Start Point', required: true }, { key: 'endPoint', label: 'End Point', required: true },
    { key: 'distanceKm', label: 'Distance (KM)', type: 'number' }, { key: 'estimatedMinutes', label: 'Estimated Minutes', type: 'number' }] },
  assignments: { label: 'Vehicle Assignments', endpoint: 'assignments', fields: [
    { key: 'academicSessionId', label: 'Academic Session', type: 'select', optionsKey: 'sessions', required: true }, { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true },
    { key: 'driverId', label: 'Driver', type: 'select', optionsKey: 'drivers', required: true }, { key: 'conductorId', label: 'Conductor', type: 'select', optionsKey: 'conductors' },
    { key: 'routeId', label: 'Route', type: 'select', optionsKey: 'routes', required: true }, { key: 'startDate', label: 'Start Date', type: 'date', required: true }] },
  allocations: { label: 'Student Transport', endpoint: 'allocations', fields: [
    { key: 'academicSessionId', label: 'Academic Session', type: 'select', optionsKey: 'sessions', required: true }, { key: 'studentId', label: 'Student', type: 'select', optionsKey: 'students', required: true },
    { key: 'vehicleAssignmentId', label: 'Vehicle / Route Assignment', type: 'select', optionsKey: 'assignments', required: true }, { key: 'pickupStop', label: 'Pickup Stop / Start Stop', required: true },
    { key: 'dropStop', label: 'Drop Stop', required: true }, { key: 'seatNumber', label: 'Seat Number' },
    { key: 'pickupShift', label: 'Pickup Shift', type: 'time', required: true }, { key: 'dropShift', label: 'Drop Shift', type: 'time', required: true },
    { key: 'monthlyFee', label: 'Fees', type: 'number', required: true }, { key: 'startDate', label: 'Start Date', type: 'date', required: true },
    { key: 'feeType', label: 'Fee Type / Billing Period', type: 'select', optionsKey: 'feeTypes', required: true }] },
  payments: { label: 'Fee Collection', endpoint: 'payments', fields: [
    { key: 'transportFeeId', label: 'Student', type: 'select', optionsKey: 'fees', required: true },
    { key: 'totalAmount', label: 'Total Amount', type: 'number', required: true }, { key: 'amount', label: 'Paid Amount', type: 'number', required: true },
    { key: 'dueAmount', label: 'Due Amount', type: 'number' }, { key: 'dueDate', label: 'Due Date', type: 'date', required: true },
    { key: 'paymentDate', label: 'Payment Date', type: 'datetime-local', required: true },
    { key: 'paymentMode', label: 'Payment Mode', type: 'select', optionsKey: 'paymentModes', required: true }, { key: 'referenceNumber', label: 'Reference Number' }, { key: 'receiptNumber', label: 'Receipt Number' }] },
  fuel: { label: 'Fuel Management', endpoint: 'fuel-logs', fields: [
    { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true }, { key: 'fuelDate', label: 'Date', type: 'date', required: true },
    { key: 'litres', label: 'Litres', type: 'number', required: true }, { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'paymentMode', label: 'Payment Mode', type: 'select', optionsKey: 'paymentModes', required: true }, { key: 'paidTo', label: 'Paid To', required: true }] },
  maintenance: { label: 'Vehicle Maintenance', endpoint: 'maintenance', fields: [
    { key: 'vehicleId', label: 'Vehicle', type: 'select', optionsKey: 'vehicles', required: true }, { key: 'serviceDate', label: 'Service Date', type: 'date', required: true },
    { key: 'nextServiceDate', label: 'Next Service', type: 'date' }, { key: 'cost', label: 'Cost', type: 'number', required: true },
    { key: 'workshop', label: 'Workshop' }, { key: 'remarks', label: 'Remarks' }, { key: 'bill', label: 'Upload Bill (JPG/JPEG/PDF)', type: 'file', required: true }] },
};

const pretty = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const EMPTY_MESSAGES: Record<TransportTab, string> = {
  dashboard: 'No vehicles added yet. Start by adding a vehicle and its details in the Vehicle tab, then add drivers and routes to set up school transport.',
  vehicleTypes: 'No vehicle types added yet. Add a vehicle type and its seating capacity to get started.',
  vehicles: 'No vehicles added yet. Click + Add Vehicle to enter the vehicle and registration details.',
  drivers: 'No drivers added yet. Click + Add Driver to enter driver contact and licence details.',
  conductors: 'No conductors added yet. Click + Add Conductor to enter conductor details.',
  routes: 'No routes added yet. Click + Add Route to enter the route and stop details.',
  assignments: 'No vehicle assignments added yet. Add a vehicle, driver and route first, then click + Add Vehicle Assignment.',
  allocations: 'No students assigned to transport yet. Set up a vehicle assignment first, then click + Add Student Transport.',
  payments: 'No transport payments recorded yet. Assign students to transport with fee details, then use + Add Fee Collection to record a payment.',
  fuel: 'No fuel records added yet. Add a vehicle first, then click + Add Fuel Management to record fuel details.',
  maintenance: 'No maintenance records added yet. Add a vehicle first, then click + Add Vehicle Maintenance to record service details.',
};
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
  const [loadedTab, setLoadedTab] = useState<TransportTab | null>(null);
  const [message, setMessage] = useToastMessageState();
  const [lookups, setLookups] = useState<Record<string, LookupOption[]>>({});
  const [billFile, setBillFile] = useState<File | null>(null);
  const emptyAllocation = (): AllocationRow => ({ academicSessionId:'', studentId:'', vehicleAssignmentId:'', pickupStop:'', dropStop:'', seatNumber:'', pickupShift:'', dropShift:'', monthlyFee:'', startDate:'', feeType:'Monthly' });
  const [allocationRows, setAllocationRows] = useState<AllocationRow[]>([emptyAllocation()]);
  const [lookupRefresh, setLookupRefresh] = useState(0);
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const paymentSaving = React.useRef(false);
  useEffect(() => { setConfirmPayment(false); }, [selectedSchoolId, tab]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<number>>(new Set());

  const headers = () => ({ accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });
  const config = TABS[tab];
  const ActionIcon = { dashboard: VehicleIcon, vehicleTypes: AddCircleIcon, vehicles: VehicleIcon, drivers: DriverIcon,
    conductors: ConductorIcon, routes: RouteIcon, assignments: AssignmentIcon, allocations: AddStudentIcon,
    payments: PaymentIcon, fuel: FuelIcon, maintenance: MaintenanceIcon }[tab];

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
      get(`/api/Transport/fee-students?schoolId=${selectedSchoolId}`),
      get(`/api/Admin/academic-sessions?schoolId=${selectedSchoolId}`),
      get(`/api/Transport/eligible-students?schoolId=${selectedSchoolId}`)
    ]).then(([types, vehicles, drivers, conductors, routes, assignments, allocations, fees, feeStudents, sessions, students]) => {
      const active = (items: any[]) => items.filter(item => item.isActive !== false);
      setAssignedStudentIds(new Set(active(allocations).map(item => Number(item.studentId))));
      setLookups({
        bloodGroups: ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown / Not Provided'].map(label => ({ value: label, label })),
        paymentModes: ['Cash','UPI','Card','Bank Transfer','Cheque','Other'].map(label => ({ value: label, label })),
        feeTypes: ['Monthly','Quarterly','Half-Yearly','Yearly'].map(label => ({ value: label, label })),
        months: MONTH_NAMES.map((label, index) => ({ value: index + 1, label })),
        allocations: active(allocations).map(item => ({
          value: item.id,
          label: `${item.studentName} - ${item.vehicleName} - ${item.routeName}`,
          monthlyFee: Number(item.monthlyFee || 0)
        })),
        fees: feeStudents.map((item:any) => ({ value:item.value, label:item.studentName, totalAmount:Number(item.totalAmount), dueAmount:Number(item.dueAmount), dueDate:String(item.dueDate).slice(0,10) })),
        vehicleTypes: active(types).map(item => ({ value: item.id, label: `${item.vehicleTypeName} (${item.defaultCapacity} seats)` })),
        vehicles: active(vehicles).map(item => ({ value: item.id, label: `${item.vehicleName} - ${item.vehicleNumber}` })),
        drivers: active(drivers).map(item => ({ value: item.id, label: `${item.name} - ${item.mobile}` })),
        conductors: active(conductors).map(item => ({ value: item.id, label: `${item.name} - ${item.mobile}` })),
        routes: active(routes).map(item => ({ value: item.id, label: `${item.routeName} (${item.startPoint} to ${item.endPoint})` })),
        assignments: active(assignments).map(item => ({ value: item.id, label: `${item.vehicleName} - ${item.routeName} - ${item.driverName}`, vehicleId:item.vehicleId, driverId:item.driverId, conductorId:item.conductorId })),
        sessions: active(sessions).map(item => ({ value: item.id, label: `${new Date(item.yearStart).getFullYear()}-${new Date(item.yearEnd).getFullYear()}${item.isActive ? ' (Active)' : ''}` })),
        students: active(students).map(item => ({ value: item.id, label: `${item.studentName} - ${item.className} - ${item.sectionName}`, className:item.className, sectionName:item.sectionName, academicSessionId:item.academicSessionId }))
      });
    }).catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load form options.'));
  }, [selectedSchoolId, tab, lookupRefresh]); // eslint-disable-line

  const load = async () => {
    if (!selectedSchoolId) return;
    const endpoint = tab === 'dashboard' ? 'dashboard' : config.endpoint;
    if (!endpoint) { setRows([]); return; }
    try {
      setLoading(true); setLoadedTab(null); setMessage('');
      const response = await fetch(`${API_BASE_URL}/api/Transport/${endpoint}?schoolId=${selectedSchoolId}`, {
        cache: 'no-store', headers: headers()
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('json'))
        throw new Error(`Transport API returned HTML instead of JSON: ${response.url}`);
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(apiError(result, 'Unable to load transport data.'));
      if (tab === 'dashboard') setDashboard(result.data ?? {});
      else setRows(result.data ?? []);
      setLoadedTab(tab);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load data.'); }
    finally { setLoading(false); }
  };

  const save = async (event?: React.FormEvent, confirmed = false) => {
    event?.preventDefault();
    if (paymentSaving.current) return;
    if (!selectedSchoolId || !config.fields) return;
    if (tab === 'payments' && Number(form.amount || 0) > Number(form.availableAmount || form.dueAmount || 0)) {
      setMessage(`Paid Amount cannot exceed the available fee balance of Rs. ${Number(form.availableAmount || form.dueAmount || 0).toLocaleString()}.`);
      return;
    }
    if (tab === 'payments') {
      if (Number(form.amount || 0) <= 0) { setMessage('Enter a payment amount greater than zero.'); return; }
      if (!confirmed) { setConfirmPayment(true); return; }
      paymentSaving.current = true;
      setSavingPayment(true);
    }
    const body: any = tab === 'allocations' && editingId === null
      ? { schoolId:selectedSchoolId, items:allocationRows.map(row => ({...row, studentId:Number(row.studentId), academicSessionId:Number(row.academicSessionId), vehicleAssignmentId:Number(row.vehicleAssignmentId), monthlyFee:Number(row.monthlyFee), pickupShift:row.pickupShift ? `${row.pickupShift}:00` : null, dropShift:row.dropShift ? `${row.dropShift}:00` : null})) }
      : { ...(editingRow ?? {}), schoolId: selectedSchoolId, isActive: editingRow?.isActive ?? true };
    if (!(tab === 'allocations' && editingId === null)) config.fields.forEach(field => {
      const value = form[field.key];
      body[field.key] = field.type === 'number' || (field.type === 'select' && !['bloodGroup','paymentMode','feeType'].includes(field.key))
        ? Number(value || 0)
        : field.type === 'time' && value
          ? `${value}:00`
          : (value || null);
    });
    try {
      const endpoint = tab==='allocations'&&editingId===null ? 'allocations/bulk' : (config.postEndpoint || config.endpoint);
      const url = editingId === null
        ? `${API_BASE_URL}/api/Transport/${endpoint}`
        : `${API_BASE_URL}/api/Transport/${endpoint}/${editingId}`;
      let requestHeaders:Record<string,string>=headers(), requestBody:BodyInit=JSON.stringify(body);
      if(tab==='maintenance'){
        const data=new FormData(); Object.entries(body).forEach(([key,value])=>{if(value!==null&&value!==undefined&&key!=='billAttachmentUrl')data.append(key,String(value));}); if(billFile)data.append('bill',billFile);
        requestBody=data; requestHeaders={accept:'application/json',Authorization:`Bearer ${localStorage.getItem('token')}`};
      }
      const response = await fetch(url, { method: editingId === null ? 'POST' : 'PUT', headers: requestHeaders, body: requestBody });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('json'))
        throw new Error(`Transport API returned HTML instead of JSON: ${response.url}`);
      const result = await response.json();
      if (!response.ok) throw new Error(apiError(result, 'Unable to save.'));
      setShowForm(false); setEditingId(null); setEditingRow(null); setForm({}); setAllocationRows([emptyAllocation()]); setMessage(result.message); setLookupRefresh(value=>value+1); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save.'); }
    finally { setConfirmPayment(false); paymentSaving.current = false; setSavingPayment(false); }
  };

  const startEdit = (row: any) => {
    if (!config.fields || tab === 'payments') return;
    if (tab === 'allocations' && row.studentId) {
      setLookups(current => {
        const students=current.students || [];
        if (students.some(option=>Number(option.value)===Number(row.studentId))) return current;
        return {...current, students:[...students, { value:Number(row.studentId), label:`${row.studentName} - ${row.className || 'Class'} - ${row.sectionName || 'Section'}`, className:row.className, sectionName:row.sectionName, academicSessionId:Number(row.academicSessionId) }]};
      });
    }
    if (tab === 'payments' && row.transportFeeId) {
      setLookups(current => {
        const fees=current.fees || [];
        if (fees.some(option=>Number(option.value)===Number(row.transportFeeId))) return current;
        return {...current, fees:[...fees, { value:Number(row.transportFeeId), label:row.studentName,
          totalAmount:Number(row.totalAmount || 0), dueAmount:Number(row.dueAmount || 0), dueDate:String(row.dueDate || '').slice(0,10) }]};
      });
    }
    const values: Record<string, string> = {};
    config.fields.forEach(field => {
      const value = row[field.key];
      if (value === null || value === undefined) values[field.key] = '';
      else if (field.type === 'date') values[field.key] = String(value).substring(0, 10);
      else if (field.type === 'time') values[field.key] = String(value).substring(0, 5);
      else if (field.type === 'datetime-local') values[field.key] = String(value).substring(0, 16);
      else values[field.key] = String(value);
    });
    if (tab === 'payments') values.availableAmount=String(Number(row.dueAmount || 0)+Number(row.amount || 0));
    setForm(values);
    setEditingId(tab === 'vehicles'
      ? (row.vehicleId ? Number(row.vehicleId) : null)
      : Number(row.id));
    setEditingRow(row);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setEditingRow(null); setForm({}); setBillFile(null); };

  const displayCell = (column: string, value: any) => {
    if (column === 'billAttachmentUrl') {
      if (!value) return 'No bill uploaded';
      const url = new URL(String(value), `${API_BASE_URL.replace(/\/$/, '')}/`);
      if (!['http:', 'https:'].includes(url.protocol)) return 'Bill unavailable';
      return <a className="create-icon-button" title="View Bill" aria-label="View Bill" href={url.href} target="_blank" rel="noopener noreferrer"><PreviewIcon size={26} /></a>;
    }
    return display(value);
  };

  const updateFormField = (field: FieldConfig, value: string) => {
    if (tab === 'drivers' && field.key === 'licenseNumber') {
      setForm(current => ({ ...current, licenseNumber: value.toUpperCase() }));
      return;
    }
    if (tab === 'drivers' && field.key === 'mobile') {
      setForm(current => ({ ...current, mobile: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }
    if (tab === 'payments' && field.key === 'transportFeeId') {
      const fee = lookups.fees?.find(option => option.value === Number(value));
      setForm(current => ({
        ...current,
        [field.key]: value,
        totalAmount: fee ? String(fee.totalAmount ?? '') : '',
        amount: '', dueAmount: fee ? String(fee.dueAmount ?? '') : '', availableAmount:fee ? String(fee.dueAmount ?? '') : '', dueDate: fee?.dueDate ?? ''
      }));
      return;
    }
    if (tab === 'payments' && field.key === 'amount') {
      setForm(current => ({ ...current, amount: value, dueAmount: String(Math.max(0, Number(current.availableAmount || 0) - Number(value || 0))) })); return;
    }
    if (tab === 'allocations' && (field.key === 'startDate' || field.key === 'feeType')) {
      setForm(current => { const next={...current,[field.key]:value}; if(next.startDate&&next.feeType){const date=new Date(`${next.startDate}T00:00:00`);const months=next.feeType==='Quarterly'?3:next.feeType==='Half-Yearly'?6:next.feeType==='Yearly'?12:1;date.setMonth(date.getMonth()+months);date.setDate(date.getDate()-1);next.endDate=date.toISOString().slice(0,10);} return next; }); return;
    }
    setForm(current => ({ ...current, [field.key]: value }));
  };

  const fieldOptions = (field: FieldConfig) => {
    const options = lookups[field.optionsKey || ''] || [];
    if (tab === 'allocations' && field.key === 'studentId') {
      return options.filter(option => !assignedStudentIds.has(Number(option.value))
        || Number(option.value) === Number(editingRow?.studentId));
    }
    if (tab !== 'assignments' || !['vehicleId','driverId','conductorId'].includes(field.key)) return options;
    const used = new Set((lookups.assignments || []).filter(x => Number(x.value) !== editingId).map(x => field.key === 'vehicleId' ? x.vehicleId : field.key === 'driverId' ? x.driverId : x.conductorId));
    return options.filter(option => !used.has(Number(option.value)));
  };

  const updateAllocationRow = (index:number, key:string, value:string) => setAllocationRows(current => current.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    if (key === 'studentId') {
      const student=lookups.students?.find(option=>Number(option.value)===Number(value));
      return {...row, studentId:value, academicSessionId:student?.academicSessionId ? String(student.academicSessionId) : ''};
    }
    return {...row,[key]:value};
  }));

  const allocationStudentOptions = (rowIndex:number) => {
    const selected = new Set(allocationRows.filter((_,index)=>index!==rowIndex).map(row=>Number(row.studentId)).filter(Boolean));
    return (lookups.students || []).filter(option=>!selected.has(Number(option.value)) && !assignedStudentIds.has(Number(option.value)));
  };

  const columns = useMemo(() => {
    if (!rows.length) return [];
    if (tab === 'allocations') return ['studentName', 'vehicleName', 'vehicleNumber', 'routeName', 'driverName', 'seatNumber', 'pickupStop', 'dropStop', 'monthlyFee'];
    if (tab === 'maintenance') return ['serviceDate', 'nextServiceDate', 'cost', 'workshop', 'remarks', 'billAttachmentUrl'];
    if (tab === 'vehicles') return ['vehicleTypeName','defaultCapacity','description','vehicleName','vehicleNumber','registrationNumber','insuranceExpiry','fitnessExpiry','pollutionExpiry','isActive'];
    return Object.keys(rows[0]).filter(key => !key.toLowerCase().endsWith('id') && key !== 'schoolId'
      && !(tab === 'assignments' && key.toLowerCase() === 'enddate')).slice(0, 8);
  }, [rows, tab]);
  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  return <div className="staff-list-container">
    <div className="staff-list-header"><h2>Transport Management</h2></div>
    <div className="management-tabs transport-tabs" role="tablist" aria-label="Transport sections">
      {(Object.keys(TABS) as TransportTab[]).filter(key => key !== 'vehicleTypes').map(key => <button key={key} type="button" role="tab" aria-selected={tab === key}
        className={`management-tab ${tab === key ? 'active' : ''}`} onClick={() => { setTab(key); closeForm(); setMessage(''); }}>{TABS[key].label}</button>)}
    </div>

    {message && <div style={{ padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', background: '#edf2f7' }}>{message}</div>}

    {loading ? <PageLoader label={`Loading ${config.label.toLowerCase()}...`} /> : tab === 'dashboard' ? <>
      {loadedTab === tab && dashboard.totalVehicles === 0 && <div className="staff-list-loading">
        <p>{EMPTY_MESSAGES.dashboard}</p>
        <button type="button" className="create-icon-button" title="Go to Vehicle" aria-label="Go to Vehicle" onClick={() => { setTab('vehicles'); closeForm(); }}><VehicleIcon size={26} /></button>
      </div>}
      <div className="stats-grid">
      {[['Vehicles', dashboard.totalVehicles], ['Active Routes', dashboard.activeRoutes], ['Allocated Students', dashboard.allocatedStudents],
        ['Available Seats', dashboard.availableSeats], ['Pending Fees', `Rs. ${Number(dashboard.pendingFees || 0).toLocaleString()}`], ['Expiring Documents', dashboard.expiringDocuments]]
        .map(([label, value]) => <div className="stat-card" key={String(label)}><div className="stat-header"><span>{label}</span></div><div className="stat-value">{value ?? 0}</div></div>)}
    </div></> : <>
        {config.fields && <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button type="button" className="create-icon-button" title={showForm ? 'Close' : `Add ${config.label.replace(/s$/, '')}`} aria-label={showForm ? 'Close' : `Add ${config.label.replace(/s$/, '')}`} onClick={() => showForm ? closeForm() : (setAllocationRows([emptyAllocation()]), setShowForm(true))}>{showForm ? <CloseIcon size={26} /> : <ActionIcon size={26} />}</button>
        </div>}
        {rows.length === 0 ? loadedTab === tab && <div className="staff-list-loading">{EMPTY_MESSAGES[tab]}</div> :
          <div className="staff-table-wrapper"><table className="staff-table"><thead><tr>{columns.map(column => <th key={column}>{column === 'billAttachmentUrl' ? 'Bill' : pretty(column)}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={row.id ?? index}>{columns.map((column, columnIndex) => <td key={column}>
              {config.fields && tab !== 'payments' && columnIndex === 0
                ? <span className="staff-name-link" onClick={() => startEdit(row)}>{displayCell(column, row[column])}</span>
                : displayCell(column, row[column])}
            </td>)}</tr>)}</tbody></table></div>}
      </>}
    <Modal
      isOpen={showForm && !confirmPayment}
      onClose={closeForm}
      title={`${editingId === null ? 'Add' : 'Edit'} ${config.label.replace(/s$/, '')}`}
      submitLabel={editingId === null ? 'Save' : 'Update'}
      formId="transport-form"
      showCancel={false}
      size="large"
    >
      {tab === 'allocations' && editingId === null ? <form id="transport-form" onSubmit={save} className="allocation-batch-form">
        {allocationRows.map((row,index) => { const student=lookups.students?.find(option=>Number(option.value)===Number(row.studentId)); return <fieldset className="allocation-row" key={index}>
          <legend>Student {index+1}</legend>{index>0 && <button type="button" className="create-icon-button allocation-remove" title="Remove Student" aria-label={`Remove student row ${index+1}`} onClick={()=>setAllocationRows(current=>current.filter((_,i)=>i!==index))}><RemoveIcon size={26} /></button>}
          <div className="form-grid">
            <div className="form-group"><label>Student *</label><select required value={row.studentId} onChange={e=>updateAllocationRow(index,'studentId',e.target.value)}><option value="">Select Student</option>{allocationStudentOptions(index).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <div className="form-group"><label>Class</label><input readOnly value={student?.className || ''}/></div><div className="form-group"><label>Section</label><input readOnly value={student?.sectionName || ''}/></div>
            {TABS.allocations.fields!.filter(field=>!['studentId','academicSessionId'].includes(field.key)).map(field=><div className="form-group" key={field.key}><label>{field.label}{field.required?' *':''}</label>{field.type==='select'?<select required={field.required} value={row[field.key]||''} onChange={e=>updateAllocationRow(index,field.key,e.target.value)}><option value="">Select {field.label}</option>{fieldOptions(field).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:<input type={field.type||'text'} step={field.type==='number'?'any':undefined} required={field.required} value={row[field.key]||''} onChange={e=>updateAllocationRow(index,field.key,e.target.value)}/>}</div>)}
          </div></fieldset>})}
        <button type="button" className="create-icon-button allocation-add" title="Add More Students" aria-label="Add More Students" onClick={()=>setAllocationRows(current=>[...current,emptyAllocation()])}><AddStudentIcon size={26} /></button>
      </form> : config.fields && <form id="transport-form" onSubmit={save} className="form-grid">
        {config.fields.map(field => <div className="form-group" key={field.key}><label>{field.label}{field.required ? ' *' : ''}</label>
          {field.type === 'select' || field.type==='multiselect' ? <select multiple={field.type==='multiselect'} required={field.required} value={field.type==='multiselect'?(form[field.key]||'').split(',').filter(Boolean):form[field.key] || ''} onChange={event => updateFormField(field,field.type==='multiselect'?Array.from(event.target.selectedOptions).map(option=>option.value).join(','):event.target.value)}>
            <option value="">Select {field.label}</option>{fieldOptions(field).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select> : field.type==='file' ? <input type="file" accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf" required={field.required&&editingId===null} onChange={event=>setBillFile(event.target.files?.[0]||null)} /> : <input maxLength={tab === 'drivers' && field.key === 'mobile' ? 10 : undefined} inputMode={tab === 'drivers' && field.key === 'mobile' ? 'numeric' : undefined} pattern={tab === 'drivers' && field.key === 'mobile' ? '[0-9]{10}' : undefined} title={tab === 'drivers' && field.key === 'mobile' ? 'Enter a 10-digit mobile number' : undefined} type={field.type || 'text'} step={field.type === 'number' ? 'any' : undefined} min={field.key==='amount'?0:undefined} max={field.key==='amount'&&tab==='payments'?Number(form.availableAmount||0):undefined} readOnly={['endDate','dueAmount','totalAmount'].includes(field.key)} required={field.required} value={form[field.key] || ''} onChange={event => updateFormField(field, event.target.value)} />}</div>)}
      </form>}
    </Modal>
    <Modal isOpen={confirmPayment && showForm && tab === 'payments'} title="Confirm Fee Collection"
      onClose={() => { if (!paymentSaving.current) setConfirmPayment(false); }}
      onSubmit={() => save(undefined, true)} submitLabel="Confirm Payment" showCancel={false}
      submitLoading={savingPayment} loadingText="Saving payment...">
      <div style={{ padding: 24, lineHeight: 1.6 }}>
        <p>Please confirm these payment details before saving.</p>
        <p><strong>Student:</strong> {lookups.fees?.find(option => Number(option.value) === Number(form.transportFeeId))?.label}</p>
        <p><strong>Amount:</strong> Rs. {Number(form.amount || 0).toLocaleString('en-IN')}</p>
        <p><strong>Payment Mode:</strong> {form.paymentMode}</p>
        <p>This transaction cannot be edited after saving.</p>
      </div>
    </Modal>
  </div>;
};

export default TransportManagement;
