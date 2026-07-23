import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddStudent from './AddStudent';
import EditStudent from './EditStudent';
import Modal from './Modal';
import Pagination from './Pagination';
import { downloadCsv, parseCsv } from '../utils/csv';
import BulkImportPreview, { ImportPreviewRow } from './BulkImportPreview';
import './StudentList.css';

interface Document {
  documentId: number;
  documentName: string;
  documentURL: string;
}

interface Student {
  id: number;
  studentName: string;
  rollNumber?: string;
  dob: string;
  email: string;
  phoneNumber: string;
  parentId: number;
  schoolId: number;
  className: string;
  sectionName: string;
  academicSession: string;
  isActive: boolean;
  documents: Document[];
}

interface StudentListProps {
  selectedSchoolId: number | null;
}

const StudentList: React.FC<StudentListProps> = ({ selectedSchoolId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);

  useEffect(() => {
    if (selectedSchoolId) {
      setCurrentPage(1);
      fetchStudents(1, pageSize);
    }
  }, [selectedSchoolId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchStudents(page, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchStudents(1, size);
  };

  const fetchStudents = async (page: number = 1, size: number = pageSize) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Student/students-by-school?schoolId=${selectedSchoolId}&page=${page}&pageSize=${size}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStudents(result.data.map((s: Student) => ({ ...s, documents: s.documents ?? [] })));
          setCurrentPage(result.currentPage);
          setTotalPages(result.totalPages);
          setTotalRecords(result.totalRecords);
        }
      }
    } catch (err) {
      console.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Student/delete-student-document?id=${documentId}`, {
        method: 'DELETE',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchStudents(currentPage, pageSize);
        if (selectedStudent) {
          setSelectedStudent({
            ...selectedStudent,
            documents: selectedStudent.documents.filter(doc => doc.documentId !== documentId),
          });
        }
      } else {
        alert('Failed to delete document');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document');
    }
  };

  const authHeaders = () => ({ 'accept': '*/*', 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const exportStudents = async () => {
    if (!selectedSchoolId) return;
    setTransferring(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Student/students-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=100000`, { headers: authHeaders() });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Export failed');
      downloadCsv('students.csv',
        ['StudentName', 'RollNumber', 'DOB', 'Email', 'PhoneNumber', 'Class', 'Section', 'Session', 'Status'],
        (result.data || []).map((s: any) => [s.studentName, s.rollNumber, s.dob?.split('T')[0], s.email, s.phoneNumber, s.className, s.sectionName, s.academicSession?.split('T')[0], s.isActive ? 'Active' : 'Inactive']));
    } catch (error: any) { alert(error.message || 'Unable to export students.'); }
    finally { setTransferring(false); }
  };

  const downloadStudentTemplate = () => downloadCsv('student-import-template.csv',
    ['StudentName', 'RollNumber', 'DOB', 'Email', 'PhoneNumber', 'Class', 'Section', 'ParentName', 'ParentEmail', 'ParentPhone', 'ParentAddress', 'ParentRelationship'],
    [['Example Student', '1', '2015-01-31', 'student@example.com', '9876543210', '1', 'A', 'Parent Name', 'parent@example.com', '9876543211', 'Address', 'Father']]);

  const prepareStudentImport = async (file: File) => {
    if (!selectedSchoolId) return;
    setTransferring(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) throw new Error('The CSV has no data rows.');
      const [infoResponse, existingResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${selectedSchoolId}`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/api/Student/students-by-school?schoolId=${selectedSchoolId}&page=1&pageSize=100000`, { headers: authHeaders() })
      ]);
      const infoResult = await infoResponse.json();
      const existingResult = await existingResponse.json();
      const info = infoResult.data;
      const activeSessions = (info?.sessions || []).filter((s: any) => s.isActive);
      if (activeSessions.length !== 1) throw new Error('Exactly one active academic session is required.');
      const existingEmails = new Set((existingResult.data || []).map((s: any) => String(s.email).trim().toLowerCase()));
      const fileEmails = new Set<string>();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const preview = rows.map((row, index): ImportPreviewRow => {
        const errors: string[] = [], warnings: string[] = [];
        const required = ['StudentName', 'RollNumber', 'DOB', 'Email', 'PhoneNumber', 'Class', 'Section', 'ParentName', 'ParentEmail', 'ParentPhone', 'ParentAddress', 'ParentRelationship'];
        required.forEach(field => { if (!row[field]?.trim()) errors.push(`${field} is required.`); });
        const studentEmail = row.Email?.trim().toLowerCase();
        const parentEmail = row.ParentEmail?.trim().toLowerCase();
        if (studentEmail && !emailPattern.test(studentEmail)) errors.push('Student email is invalid.');
        if (parentEmail && !emailPattern.test(parentEmail)) errors.push('Parent email is invalid.');
        if (studentEmail === parentEmail && studentEmail) errors.push('Student and parent emails must differ.');
        if (row.PhoneNumber && !/^\d{10}$/.test(row.PhoneNumber)) errors.push('Student phone must contain 10 digits.');
        if (row.ParentPhone && !/^\d{10}$/.test(row.ParentPhone)) errors.push('Parent phone must contain 10 digits.');
        if (row.DOB && Number.isNaN(Date.parse(row.DOB))) errors.push('DOB must be a valid date.');
        if (studentEmail && existingEmails.has(studentEmail)) errors.push('Student email already exists.');
        if (studentEmail && fileEmails.has(studentEmail)) errors.push('Duplicate student email in this file.');
        if (studentEmail) fileEmails.add(studentEmail);
        const classItem = (info.classes || []).find((c: any) => c.name.trim().toLowerCase() === row.Class?.trim().toLowerCase());
        const sectionItem = (info.sections || []).find((s: any) => s.classId === classItem?.id && s.name.trim().toLowerCase() === row.Section?.trim().toLowerCase());
        if (!classItem) errors.push('Class was not found.');
        else if (!sectionItem) errors.push('Section was not found in the selected class.');
        if (parentEmail) warnings.push('If this parent login already exists in the school, it will be reused.');
        const values: Record<string, string> = {
          StudentName: row.StudentName, RollNumber: row.RollNumber, DOB: row.DOB, Email: row.Email,
          PhoneNumber: row.PhoneNumber, SchoolId: String(selectedSchoolId), ClassId: String(classItem?.id || ''),
          SectionId: String(sectionItem?.id || ''), SessionId: String(activeSessions[0].id), 'Parent.Name': row.ParentName,
          'Parent.Email': row.ParentEmail, 'Parent.PhoneNumber': row.ParentPhone, 'Parent.Address': row.ParentAddress,
          'Parent.Relationship': row.ParentRelationship
        };
        return { rowNumber: index + 2, values: row, errors, warnings, payload: values };
      });
      setImportPreview(preview);
    } catch (error: any) { alert(error.message || 'Unable to validate students.'); }
    finally { setTransferring(false); }
  };

  const confirmStudentImport = async () => {
    const validRows = importPreview.filter(row => row.errors.length === 0);
    setTransferring(true);
    const errors: string[] = [];
    let imported = 0;
    try {
      for (const previewRow of validRows) {
        const body = new FormData();
        Object.entries(previewRow.payload as Record<string, string>).forEach(([key, value]) => body.append(key, value || ''));
        const response = await fetch(`${API_BASE_URL}/api/Student/add-student`, { method: 'POST', headers: authHeaders(), body });
        const result = await response.json();
        if (response.ok && result.success) imported++; else errors.push(`Row ${previewRow.rowNumber}: ${result.message || 'Import failed'}`);
      }
      await fetchStudents(1, pageSize);
      setImportPreview([]);
      alert(`Imported ${imported} of ${validRows.length} valid students.${errors.length ? `\n\n${errors.join('\n')}` : ''}`);
    } catch (error: any) { alert(error.message || 'Unable to import students.'); }
    finally { setTransferring(false); }
  };

  if (loading) return <div className="staff-list-loading">Loading...</div>;
  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Student List</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn" disabled={transferring} onClick={downloadStudentTemplate}>Template</button>
          <label className="btn" style={{ cursor: transferring ? 'not-allowed' : 'pointer' }}>
            Import CSV<input type="file" accept=".csv,text/csv" hidden disabled={transferring} onChange={e => { const file = e.target.files?.[0]; if (file) prepareStudentImport(file); e.target.value = ''; }} />
          </label>
          <button className="btn" disabled={transferring} onClick={exportStudents}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>+ Add Student</button>
        </div>
      </div>
      {students.length === 0 ? (
        <div className="staff-list-loading" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No students available. Please add a new student.
        </div>
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Roll No.</th>
                <th>Email</th>
                <th>Phone</th>
                <th>DOB</th>
                <th>Class</th>
                <th>Section</th>
                <th>Session</th>
                <th>Status</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <span
                      className="staff-name-link"
                      onClick={() => { setSelectedStudent(student); setIsEditModalOpen(true); }}
                    >
                      {student.studentName}
                    </span>
                  </td>
                  <td>{student.rollNumber || '-'}</td>
                  <td>{student.email}</td>
                  <td>{student.phoneNumber}</td>
                  <td>{student.dob.split('T')[0].split('-').reverse().join('/')}</td>
                  <td><span className="role-badge teacher">{student.className}</span></td>
                  <td><span className="role-badge principal">{student.sectionName}</span></td>
                  <td>{student.academicSession.split('-')[0]}</td>
                  <td>
                    <span className={`status-badge ${student.isActive ? 'active' : 'inactive'}`}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-view-docs"
                      onClick={() => { setSelectedStudent(student); setShowDocuments(true); }}
                      disabled={student.documents.length === 0}
                    >
                      View ({student.documents.length})
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {students.length > 0 && (
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

      <AddStudent
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={() => fetchStudents(currentPage, pageSize)}
      />

      <EditStudent
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={selectedStudent}
        schoolId={selectedSchoolId}
        onSuccess={() => fetchStudents(currentPage, pageSize)}
      />

      <BulkImportPreview
        title="Preview Student Import"
        columns={['StudentName', 'RollNumber', 'DOB', 'Email', 'PhoneNumber', 'Class', 'Section', 'ParentName', 'ParentEmail']}
        rows={importPreview}
        importing={transferring}
        onClose={() => setImportPreview([])}
        onConfirm={confirmStudentImport}
      />

      <Modal
        isOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
        title={`Documents - ${selectedStudent?.studentName || ''}`}
        showSubmit={false}
        showCancel={false}
      >
        {selectedStudent && (
          selectedStudent.documents.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No documents available</p>
          ) : (
            <div className="documents-list">
              {selectedStudent.documents.map((doc) => (
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

export default StudentList;
