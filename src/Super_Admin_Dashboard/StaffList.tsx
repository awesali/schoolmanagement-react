import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddStaff from './AddStaff';
import { PageLoader } from '../components/Loader/Loader';
import EditStaff from './EditStaff';
import Modal from './Modal';
import Pagination from './Pagination';
import { downloadCsv, parseCsv } from '../utils/csv';
import { formatImportDate, toApiDate, importDatesError, isValidImportDate } from '../utils/importDate';
import { genderLabel, parseGenderCode } from '../utils/gender';
import BulkImportPreview, { ImportPreviewRow } from './BulkImportPreview';
import ProfileIdCard from './ProfileIdCard';
import CsvImportHint from './CsvImportHint';
import ImportResults, { ImportFailure, ImportResult } from './ImportResults';
import ProfileListAvatar from './ProfileListAvatar';
import { profilePictureUrl } from './ProfilePictureInput';
import { useToast } from '../components/Toast/Toast';
import { TOAST_MESSAGES } from '../constants/toastMessages';
import { usePermissions } from '../security/Permissions';
import './StaffList.css';

interface Document {
  documentId: number;
  documentName: string;
  documentURL: string;
}

interface Staff {
  id: number;
  employeeNumber: number;
  name: string;
  email: string;
  phone: string;
  dob: string;
  genderCode?: string | null;
  doj: string;
  roleId: number;
  roleName: string;
  schoolName: string;
  address: string;
  isActive: boolean;
  profilePictureUrl?: string | null;
  documents: Document[];
}

interface StaffListProps {
  selectedSchoolId: number | null;
}

const StaffList: React.FC<StaffListProps> = ({ selectedSchoolId }) => {
  const toast = useToast();
  const { can } = usePermissions();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<Staff | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const readApiResponse = async (response: Response, operation: string) => {
    const responseText = await response.text();
    let result: any = {};
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = { message: `${operation} failed because the server returned an invalid response (HTTP ${response.status}).` };
    }
    if (!response.ok) throw new Error(result.message || `${operation} failed (HTTP ${response.status}).`);
    return result;
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!can('management.staff','delete')) return;
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/delete-document?id=${documentId}`, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        toast.success(TOAST_MESSAGES.document.deleted);
        fetchStaff(currentPage, pageSize);
        if (selectedStaff) {
          const updatedStaff = {
            ...selectedStaff,
            documents: selectedStaff.documents.filter(doc => doc.documentId !== documentId)
          };
          setSelectedStaff(updatedStaff);
        }
      } else {
        toast.error(TOAST_MESSAGES.document.deleteFailed);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error(TOAST_MESSAGES.document.deleteFailed);
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      setCurrentPage(1);
      fetchStaff(1, pageSize);
    }
  }, [selectedSchoolId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchStaff(page, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchStaff(1, size);
  };

  const fetchStaff = async (page: number = 1, size: number = pageSize) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/Staff-by-school?schoolId=${selectedSchoolId}&page=${page}&pageSize=${size}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStaff(result.data);
          setCurrentPage(result.currentPage);
          setTotalPages(result.totalPages);
          setTotalRecords(result.totalRecords);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff');
    } finally {
      setLoading(false);
    }
  };

  const authHeaders = () => ({ 'accept': '*/*', 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const exportStaff = async () => {
    if (!selectedSchoolId) return;
    setTransferring(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Admin/Staff-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=100000`, { headers: authHeaders() });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Export failed');
      downloadCsv('staff.csv', ['EmployeeNumber', 'Name', 'DOB', 'Gender', 'DOJ', 'Role', 'Email', 'Phone', 'Address', 'Status'],
        (result.data || []).map((s: any) => [s.employeeNumber, s.name, formatImportDate(s.dob), genderLabel(s.genderCode), formatImportDate(s.doj), s.roleName, s.email, s.phone, s.address, s.isActive ? 'Active' : 'Inactive']));
    } catch (error: any) { toast.error(error.message || 'Unable to export staff.'); }
    finally { setTransferring(false); }
  };

  const downloadStaffTemplate = () => downloadCsv('staff-import-template.csv',
    ['Name', 'DOB', 'Gender', 'DOJ', 'Role', 'Email', 'Phone', 'Address'],
    [['Example Teacher', '01-31-1990', 'Male', '04-01-2026', 'Teacher', 'teacher@example.com', '9876543210', 'Address']]);

  const prepareStaffImport = async (file: File) => {
    if (!selectedSchoolId) return;
    setTransferring(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error('The CSV has no data rows.');
      const [roleResponse, existingResponse, staffResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Admin/Get-roles`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/api/Admin/staff-emails?schoolId=${selectedSchoolId}`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/api/Admin/Staff-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=100000`, { headers: authHeaders() })
      ]);
      const [roleResult, existingResult] = await Promise.all([
        readApiResponse(roleResponse, 'Loading roles'),
        readApiResponse(existingResponse, 'Loading existing staff')
      ]);
      const staffResult = await readApiResponse(staffResponse, 'Loading staff phone numbers');
      if (roleResult.success === false || existingResult.success === false || staffResult.success === false) throw new Error('Unable to validate existing staff records. Please try again.');
      const existingPhones = new Set((staffResult.data || []).map((s: any) => String(s.phone || '').trim()));
      const filePhones = new Set<string>();
      const roles = roleResult.data || [];
      const existingEmails = new Set((existingResult.data || []).map((email: string) => String(email).trim().toLowerCase()));
      const fileEmails = new Set<string>();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const preview = rows.map((row, index): ImportPreviewRow => {
        const errors: string[] = [], warnings: string[] = [];
        ['Name', 'DOB', 'Gender', 'DOJ', 'Role', 'Email', 'Phone', 'Address'].forEach(field => {
          if (!['DOB', 'DOJ'].includes(field) && !row[field]?.trim()) errors.push(`${field} is required.`);
        });
        const email = row.Email?.trim().toLowerCase();
        const genderCode = parseGenderCode(row.Gender);
        if (row.Gender && !genderCode) errors.push('Gender must be Male, Female, Other, or Prefer not to say.');
        if (email && !emailPattern.test(email)) errors.push('Email is invalid.');
        if (row.Phone && !/^\d{10}$/.test(row.Phone.trim())) errors.push('Phone must contain 10 digits.');
        const phone = row.Phone?.trim();
        if (phone && /^\d{10}$/.test(phone)) {
          if (existingPhones.has(phone)) warnings.push('Phone number is already used by another staff member.');
          else if (filePhones.has(phone)) warnings.push('Phone number is repeated in this file.');
          filePhones.add(phone);
        }
        const dateError = importDatesError({ DOB: row.DOB, DOJ: row.DOJ });
        if (dateError) errors.push(dateError);
        if (isValidImportDate(row.DOB || '') && isValidImportDate(row.DOJ || '') && toApiDate(row.DOJ) < toApiDate(row.DOB)) errors.push('DOJ cannot be before DOB.');
        if (email && existingEmails.has(email)) errors.push('Staff email already exists.');
        if (email && fileEmails.has(email)) errors.push('Duplicate email in this file.');
        if (email) fileEmails.add(email);
        const role = roles.find((r: any) => r.roleName.trim().toLowerCase() === row.Role?.trim().toLowerCase());
        if (!role) errors.push(`Role "${row.Role}" was not found.`);
        const values: Record<string, string> = {
          Name: row.Name, DOB: toApiDate(row.DOB), GenderCode: genderCode, DOJ: toApiDate(row.DOJ), RoleId: String(role?.id || ''), SchoolId: String(selectedSchoolId),
          Email: row.Email, Phone: row.Phone, Address: row.Address
        };
        return { rowNumber: index + 2, values: row, errors, warnings, payload: values };
      });
      setImportPreview(preview);
    } catch (error: any) { toast.error(error.message || 'Unable to validate staff.'); }
    finally { setTransferring(false); }
  };

  const confirmStaffImport = async () => {
    const validRows = importPreview.filter(row => row.errors.length === 0);
    setTransferring(true);
    const errors: ImportFailure[] = [];
    setImportResult(null);
    let imported = 0;
    try {
      // Staff creation opens a transaction and sends credentials, so keep a
      // small concurrency limit to avoid exhausting database/SMTP resources.
      const concurrency = 2;
      for (let offset = 0; offset < validRows.length; offset += concurrency) {
        const batch = validRows.slice(offset, offset + concurrency);
        const results = await Promise.all(batch.map(async previewRow => {
          const body = new FormData();
          Object.entries(previewRow.payload as Record<string, string>).forEach(([key, value]) => body.append(key, value || ''));
          try {
            const response = await fetch(`${API_BASE_URL}/api/Admin/add-staff`, { method: 'POST', headers: authHeaders(), body });
            const responseText = await response.text();
            let result: any;
            try { result = responseText ? JSON.parse(responseText) : {}; }
            catch { result = { message: `Server returned an invalid response (HTTP ${response.status}).` }; }
            return { previewRow, ok: response.ok && result.success, message: result.message };
          } catch (error: any) {
            return { previewRow, ok: false, message: error.message || 'Import failed' };
          }
        }));
        imported += results.filter(result => result.ok).length;
        errors.push(...results
          .filter(result => !result.ok)
          .map(result => ({ rowNumber: result.previewRow.rowNumber, name: result.previewRow.values.Name || '', email: result.previewRow.values.Email || '', message: result.message || 'Import failed. Please try again.' })));
      }
      await fetchStaff(1, pageSize);
      setImportPreview([]);
      const importMessage = `${imported} staff members imported${errors.length ? `, ${errors.length} failed` : ' successfully'}.`;
      if (errors.length) {
        setImportResult({ imported, errors });
        if (imported > 0) toast.warning(importMessage, 10000);
        else toast.error(importMessage, 10000);
      } else {
        toast.success(importMessage);
      }
    } catch (error: any) { toast.error(error.message || 'Unable to import staff.'); }
    finally { setTransferring(false); }
  };

  if (loading) {
    return <PageLoader label="Loading staff..." />;
  }

  if (!selectedSchoolId) {
    return <div className="staff-list-loading">Please select a school</div>;
  }

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Staff List</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {can('management.staff','create')&&<><button className="btn" disabled={transferring} onClick={downloadStaffTemplate}>Template</button>
          <label className="btn" style={{ cursor: transferring ? 'not-allowed' : 'pointer' }}>
            Import CSV<input type="file" accept=".csv,text/csv" hidden disabled={transferring} onChange={e => { const file = e.target.files?.[0]; if (file) prepareStaffImport(file); e.target.value = ''; }} />
          </label></>}
          <button className="btn" disabled={transferring} onClick={exportStaff}>Export CSV</button>
          {can('management.staff','create')&&<button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>+ Add Staff</button>}
        </div>
      </div>
      <CsvImportHint />
      {staff.length === 0 ? (
        <div className="staff-list-loading" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No staff members available. Please add a new staff member.
        </div>
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>DOJ</th>
                <th>Role</th>
                <th>Status</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td><ProfileListAvatar name={member.name} pictureUrl={member.profilePictureUrl} onView={() => setPhotoPreview(member)} /></td>
                  <td>
                    <span 
                      className="staff-name-link"
                      onClick={() => {
                        setSelectedStaff(member);
                        setShowIdCard(true);
                      }}
                    >
                      {member.name}
                    </span>
                  </td>
                  <td>{member.email}</td>
                  <td>{member.phone}</td>
                  <td>{new Date(member.dob).toLocaleDateString()}</td>
                  <td>{genderLabel(member.genderCode)}</td>
                  <td>{new Date(member.doj).toLocaleDateString()}</td>
                  <td>
                    <span className={`role-badge ${member.roleName.toLowerCase()}`}>
                      {member.roleName}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-view-docs"
                      onClick={() => { setSelectedStaff(member); setShowDocuments(true); }}
                      disabled={member.documents.length === 0}
                    >
                      View ({member.documents.length})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {staff.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      )}

      <AddStaff
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={() => { toast.success('Staff added successfully.'); fetchStaff(currentPage, pageSize); }}
      />

      <EditStaff
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        staff={selectedStaff}
        onSuccess={() => fetchStaff(currentPage, pageSize)}
      />

      <Modal
        isOpen={showIdCard}
        onClose={() => setShowIdCard(false)}
        title="Employee Profile"
        showSubmit={false}
        showCancel={false}
      >
        {selectedStaff && (
          <ProfileIdCard
            onEdit={() => {
              setShowIdCard(false);
              setIsEditModalOpen(true);
            }}
            pictureUrl={selectedStaff.profilePictureUrl}
            name={selectedStaff.name}
            type="Employee"
            identifier={`Employee No: ${selectedStaff.employeeNumber}`}
            subtitle={selectedStaff.roleName}
            organization={selectedStaff.schoolName}
            status={selectedStaff.isActive}
            fields={[
              { label: 'Role', value: selectedStaff.roleName },
              { label: 'Employee No.', value: selectedStaff.employeeNumber },
              { label: 'Gender', value: genderLabel(selectedStaff.genderCode) },
              { label: 'Date of Birth', value: new Date(selectedStaff.dob).toLocaleDateString() },
              { label: 'Date of Joining', value: new Date(selectedStaff.doj).toLocaleDateString() },
              { label: 'Email', value: selectedStaff.email },
              { label: 'Phone', value: selectedStaff.phone },
              { label: 'Address', value: selectedStaff.address },
            ]}
          />
        )}
      </Modal>

      <Modal
        isOpen={photoPreview !== null}
        onClose={() => setPhotoPreview(null)}
        title={`Profile Photo - ${photoPreview?.name || ''}`}
        showSubmit={false}
        showCancel={false}
      >
        {photoPreview && <div className="staff-photo-preview">
          <img src={profilePictureUrl(photoPreview.profilePictureUrl)} alt={`${photoPreview.name} profile`} />
        </div>}
      </Modal>

      <ImportResults type="Staff" result={importResult} onClose={() => setImportResult(null)} />

      <BulkImportPreview
        title="Preview Staff Import"
        columns={['Name', 'DOB', 'Gender', 'DOJ', 'Role', 'Email', 'Phone', 'Address']}
        rows={importPreview}
        importing={transferring}
        onClose={() => setImportPreview([])}
        onConfirm={confirmStaffImport}
      />

      <Modal
        isOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
        title={`Documents - ${selectedStaff?.name || ''}`}
        showSubmit={false}
        showCancel={false}
      >
        {selectedStaff && (
          selectedStaff.documents.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No documents available</p>
          ) : (
            <div className="documents-list">
              {selectedStaff.documents.map((doc) => (
                <div key={doc.documentId} className="document-item">
                  <span>{doc.documentName}</span>
                  <div className="document-actions">
                    <a 
                      href={`${API_BASE_URL}${doc.documentURL}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-download"
                    >
                      View
                    </a>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDeleteDocument(doc.documentId)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default StaffList;
