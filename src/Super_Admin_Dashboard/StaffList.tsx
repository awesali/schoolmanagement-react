import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddStaff from './AddStaff';
import EditStaff from './EditStaff';
import Modal from './Modal';
import Pagination from './Pagination';
import { downloadCsv, parseCsv } from '../utils/csv';
import BulkImportPreview, { ImportPreviewRow } from './BulkImportPreview';
import './StaffList.css';

interface Document {
  documentId: number;
  documentName: string;
  documentURL: string;
}

interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string;
  dob: string;
  doj: string;
  roleId: number;
  roleName: string;
  schoolName: string;
  address: string;
  isActive: boolean;
  documents: Document[];
}

interface StaffListProps {
  selectedSchoolId: number | null;
}

const StaffList: React.FC<StaffListProps> = ({ selectedSchoolId }) => {
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
  const [transferring, setTransferring] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);

  const handleDeleteDocument = async (documentId: number) => {
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
        fetchStaff(currentPage, pageSize);
        if (selectedStaff) {
          const updatedStaff = {
            ...selectedStaff,
            documents: selectedStaff.documents.filter(doc => doc.documentId !== documentId)
          };
          setSelectedStaff(updatedStaff);
        }
      } else {
        alert('Failed to delete document');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document');
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
      downloadCsv('staff.csv', ['Name', 'DOB', 'DOJ', 'Role', 'Email', 'Phone', 'Address', 'Status'],
        (result.data || []).map((s: any) => [s.name, s.dob?.split('T')[0], s.doj?.split('T')[0], s.roleName, s.email, s.phone, s.address, s.isActive ? 'Active' : 'Inactive']));
    } catch (error: any) { alert(error.message || 'Unable to export staff.'); }
    finally { setTransferring(false); }
  };

  const downloadStaffTemplate = () => downloadCsv('staff-import-template.csv',
    ['Name', 'DOB', 'DOJ', 'Role', 'Email', 'Phone', 'Address'],
    [['Example Teacher', '1990-01-31', '2026-04-01', 'Teacher', 'teacher@example.com', '9876543210', 'Address']]);

  const prepareStaffImport = async (file: File) => {
    if (!selectedSchoolId) return;
    setTransferring(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error('The CSV has no data rows.');
      const [roleResponse, existingResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Admin/Get-roles`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/api/Admin/Staff-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=100000`, { headers: authHeaders() })
      ]);
      const roleResult = await roleResponse.json();
      const existingResult = await existingResponse.json();
      const roles = roleResult.data || [];
      const existingEmails = new Set((existingResult.data || []).map((s: any) => String(s.email).trim().toLowerCase()));
      const fileEmails = new Set<string>();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const preview = rows.map((row, index): ImportPreviewRow => {
        const errors: string[] = [], warnings: string[] = [];
        ['Name', 'DOB', 'DOJ', 'Role', 'Email', 'Phone', 'Address'].forEach(field => {
          if (!row[field]?.trim()) errors.push(`${field} is required.`);
        });
        const email = row.Email?.trim().toLowerCase();
        if (email && !emailPattern.test(email)) errors.push('Email is invalid.');
        if (row.Phone && !/^\d{10}$/.test(row.Phone)) errors.push('Phone must contain 10 digits.');
        if (row.DOB && Number.isNaN(Date.parse(row.DOB))) errors.push('DOB must be a valid date.');
        if (row.DOJ && Number.isNaN(Date.parse(row.DOJ))) errors.push('DOJ must be a valid date.');
        if (row.DOB && row.DOJ && Date.parse(row.DOJ) < Date.parse(row.DOB)) errors.push('DOJ cannot be before DOB.');
        if (email && existingEmails.has(email)) errors.push('Staff email already exists.');
        if (email && fileEmails.has(email)) errors.push('Duplicate email in this file.');
        if (email) fileEmails.add(email);
        const role = roles.find((r: any) => r.roleName.trim().toLowerCase() === row.Role?.trim().toLowerCase());
        if (!role) errors.push(`Role "${row.Role}" was not found.`);
        const values: Record<string, string> = {
          Name: row.Name, DOB: row.DOB, DOJ: row.DOJ, RoleId: String(role?.id || ''), SchoolId: String(selectedSchoolId),
          Email: row.Email, Phone: row.Phone, Address: row.Address
        };
        return { rowNumber: index + 2, values: row, errors, warnings, payload: values };
      });
      setImportPreview(preview);
    } catch (error: any) { alert(error.message || 'Unable to validate staff.'); }
    finally { setTransferring(false); }
  };

  const confirmStaffImport = async () => {
    const validRows = importPreview.filter(row => row.errors.length === 0);
    setTransferring(true);
    const errors: string[] = [];
    let imported = 0;
    try {
      for (const previewRow of validRows) {
        const body = new FormData();
        Object.entries(previewRow.payload as Record<string, string>).forEach(([key, value]) => body.append(key, value || ''));
        const response = await fetch(`${API_BASE_URL}/api/Admin/add-staff`, { method: 'POST', headers: authHeaders(), body });
        const result = await response.json();
        if (response.ok && result.success) imported++; else errors.push(`Row ${previewRow.rowNumber}: ${result.message || 'Import failed'}`);
      }
      await fetchStaff(1, pageSize);
      setImportPreview([]);
      alert(`Imported ${imported} of ${validRows.length} valid staff members.${errors.length ? `\n\n${errors.join('\n')}` : ''}`);
    } catch (error: any) { alert(error.message || 'Unable to import staff.'); }
    finally { setTransferring(false); }
  };

  if (loading) {
    return <div className="staff-list-loading">Loading...</div>;
  }

  if (!selectedSchoolId) {
    return <div className="staff-list-loading">Please select a school</div>;
  }

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Staff List</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn" disabled={transferring} onClick={downloadStaffTemplate}>Template</button>
          <label className="btn" style={{ cursor: transferring ? 'not-allowed' : 'pointer' }}>
            Import CSV<input type="file" accept=".csv,text/csv" hidden disabled={transferring} onChange={e => { const file = e.target.files?.[0]; if (file) prepareStaffImport(file); e.target.value = ''; }} />
          </label>
          <button className="btn" disabled={transferring} onClick={exportStaff}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>+ Add Staff</button>
        </div>
      </div>
      {staff.length === 0 ? (
        <div className="staff-list-loading" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No staff members available. Please add a new staff member.
        </div>
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>DOB</th>
                <th>DOJ</th>
                <th>Role</th>
                <th>Status</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>
                    <span 
                      className="staff-name-link"
                      onClick={() => {
                        setSelectedStaff(member);
                        setIsEditModalOpen(true);
                      }}
                    >
                      {member.name}
                    </span>
                  </td>
                  <td>{member.email}</td>
                  <td>{member.phone}</td>
                  <td>{new Date(member.dob).toLocaleDateString()}</td>
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
                      onClick={() => {
                        setSelectedStaff(member);
                        setShowDocuments(true);
                      }}
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
        onSuccess={() => fetchStaff(currentPage, pageSize)}
      />

      <EditStaff
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        staff={selectedStaff}
        onSuccess={() => fetchStaff(currentPage, pageSize)}
      />

      <BulkImportPreview
        title="Preview Staff Import"
        columns={['Name', 'DOB', 'DOJ', 'Role', 'Email', 'Phone', 'Address']}
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
