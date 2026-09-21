import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { sortStudentsByClass } from '../utils/studentOrder';
import { PageLoader } from '../components/Loader/Loader';
import AddStudent from './AddStudent';
import EditStudent from './EditStudent';
import Modal from './Modal';
import Pagination from './Pagination';
import { downloadCsv, parseCsv } from '../utils/csv';
import { formatImportDate, toApiDate, importDateError } from '../utils/importDate';
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
import './StudentList.css';
import { TemplateIcon, ImportIcon, ExportIcon, AddStudentIcon, PreviewIcon } from '../components/Icons/Icons';
import '../components/Icons/CreateIconButton.css';

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
  genderCode?: string | null;
  email: string;
  phoneNumber: string;
  parentId: number;
  parentName?: string;
  parentRelationship?: string;
  schoolId: number;
  className: string;
  sectionName: string;
  academicSession: string;
  isActive: boolean;
  profilePictureUrl?: string | null;
  documents: Document[];
}

interface StudentListProps {
  selectedSchoolId: number | null;
  onViewParent?: (parentId: number) => void;
}

const StudentList: React.FC<StudentListProps> = ({ selectedSchoolId, onViewParent }) => {
  const importInputRef = React.useRef<HTMLInputElement>(null);
  const toast = useToast();
  const { can } = usePermissions();
  const [students, setStudents] = useState<Student[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const studentRequest = React.useRef(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<Student | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      setCurrentPage(1);
      fetchStudents(1, pageSize);
    }
  }, [selectedSchoolId]);

  useEffect(() => () => { studentRequest.current++; }, [selectedSchoolId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setStudents(allStudents.slice((page - 1) * pageSize, page * pageSize));
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setTotalPages(Math.max(1, Math.ceil(allStudents.length / size)));
    setStudents(allStudents.slice(0, size));
  };

  const fetchStudents = async (page: number = 1, size: number = pageSize) => {
    const request = ++studentRequest.current;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const records: Student[] = [];
      let apiPage = 1;
      let apiPages = 1;
      do {
      const response = await fetch(`${API_BASE_URL}/api/Student/students-by-school?schoolId=${selectedSchoolId}&page=${apiPage}&pageSize=500`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (request !== studentRequest.current) return;
      if (!response.ok || !result.success || !Array.isArray(result.data)) throw new Error('Unable to load students.');
      records.push(...result.data.map((s: Student) => ({ ...s, documents: s.documents ?? [] })));
      apiPages = result.totalPages || 1;
      apiPage++;
      } while (apiPage <= apiPages);
      const ordered = sortStudentsByClass(records);
      const pages = Math.max(1, Math.ceil(ordered.length / size));
      const nextPage = Math.min(page, pages);
      setAllStudents(ordered);
      setStudents(ordered.slice((nextPage - 1) * size, nextPage * size));
      setCurrentPage(nextPage);
      setTotalPages(pages);
      setTotalRecords(ordered.length);
    } catch (err) {
      if (request === studentRequest.current) toast.error('Unable to load students. Please try again.');
    } finally {
      if (request === studentRequest.current) setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!can('management.students','delete')) return;
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Student/delete-student-document?id=${documentId}`, {
        method: 'DELETE',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success(TOAST_MESSAGES.document.deleted);
        fetchStudents(currentPage, pageSize);
        if (selectedStudent) {
          setSelectedStudent({
            ...selectedStudent,
            documents: selectedStudent.documents.filter(doc => doc.documentId !== documentId),
          });
        }
      } else {
        toast.error(TOAST_MESSAGES.document.deleteFailed);
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      toast.error(TOAST_MESSAGES.document.deleteFailed);
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
        ['StudentName', 'RollNumber', 'DOB', 'Gender', 'Email', 'PhoneNumber', 'Class', 'Section', 'Session', 'Status'],
        (result.data || []).map((s: any) => [s.studentName, s.rollNumber, formatImportDate(s.dob), genderLabel(s.genderCode), s.email, s.phoneNumber, s.className, s.sectionName, s.academicSession?.split('T')[0], s.isActive ? 'Active' : 'Inactive']));
    } catch (error: any) { toast.error(error.message || 'Unable to export students.'); }
    finally { setTransferring(false); }
  };

  const downloadStudentTemplate = () => downloadCsv('student-import-template.csv',
    ['StudentName', 'RollNumber', 'DOB', 'Gender', 'Email', 'PhoneNumber', 'Class', 'Section', 'ParentName', 'ParentEmail', 'ParentPhone', 'ParentAddress', 'ParentRelationship'],
    [['Example Student', '1', '01-31-2015', 'Female', 'student@example.com', '9876543210', '1', 'A', 'Parent Name', 'parent@example.com', '9876543211', 'Address', 'Father']]);

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
      if (!infoResponse.ok || !infoResult.success || !existingResponse.ok || !existingResult.success) throw new Error('Unable to validate existing student records. Please try again.');
      const info = infoResult.data;
      const activeSessions = (info?.sessions || []).filter((s: any) => s.isActive);
      if (activeSessions.length !== 1) throw new Error('Exactly one active academic session is required.');
      const existingEmails = new Set((existingResult.data || []).map((s: any) => String(s.email).trim().toLowerCase()));
      const fileEmails = new Set<string>();
      const fileRolls = new Set<string>();
      const filePhones = new Set<string>();
      const existingPhones = new Set((existingResult.data || []).map((s: any) => String(s.phoneNumber || '').trim()));
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const preview = rows.map((row, index): ImportPreviewRow => {
        const errors: string[] = [], warnings: string[] = [];
        const required = ['StudentName', 'RollNumber', 'DOB', 'Gender', 'Email', 'PhoneNumber', 'Class', 'Section', 'ParentName', 'ParentEmail', 'ParentPhone', 'ParentAddress', 'ParentRelationship'];
        required.forEach(field => { if (field !== 'DOB' && !row[field]?.trim()) errors.push(`${field} is required.`); });
        const studentEmail = row.Email?.trim().toLowerCase();
        const parentEmail = row.ParentEmail?.trim().toLowerCase();
        const genderCode = parseGenderCode(row.Gender);
        if (row.Gender && !genderCode) errors.push('Gender must be Male, Female, Other, or Prefer not to say.');
        if (studentEmail && !emailPattern.test(studentEmail)) errors.push('Student email is invalid.');
        if (parentEmail && !emailPattern.test(parentEmail)) errors.push('Parent email is invalid.');
        if (studentEmail === parentEmail && studentEmail) errors.push('Student and parent emails must differ.');
        if (row.PhoneNumber && !/^\d{10}$/.test(row.PhoneNumber.trim())) errors.push('Student phone must contain 10 digits.');
        if (row.ParentPhone && !/^\d{10}$/.test(row.ParentPhone.trim())) errors.push('Parent phone must contain 10 digits.');
        const dobError = importDateError('DOB', row.DOB);
        if (dobError) errors.push(dobError);
        if (studentEmail && existingEmails.has(studentEmail)) errors.push('Student email already exists.');
        if (studentEmail && fileEmails.has(studentEmail)) errors.push('Duplicate student email in this file.');
        if (studentEmail) fileEmails.add(studentEmail);
        const classItem = (info.classes || []).find((c: any) => c.name.trim().toLowerCase() === row.Class?.trim().toLowerCase());
        const sectionItem = (info.sections || []).find((s: any) => s.classId === classItem?.id && s.name.trim().toLowerCase() === row.Section?.trim().toLowerCase());
        if (!classItem) errors.push('Class was not found.');
        else if (!sectionItem) errors.push('Section was not found in the selected class.');
        const roll = row.RollNumber?.trim();
        if (classItem && roll) {
          const rollKey = String(classItem.id) + ':' + roll;
          const assigned = (existingResult.data || []).find((s: any) =>
            String(s.className || '').trim().toLowerCase() === classItem.name.trim().toLowerCase() && String(s.rollNumber || '').trim() === roll);
          if (assigned) errors.push('Roll number already assigned to ' + assigned.studentName + ' in this class.');
          if (fileRolls.has(rollKey)) errors.push('Duplicate roll number for this class in the file.');
          fileRolls.add(rollKey);
        }
        const phone = row.PhoneNumber?.trim();
        if (phone && /^\d{10}$/.test(phone)) {
          if (existingPhones.has(phone)) warnings.push('Phone number is already used by another student.');
          else if (filePhones.has(phone)) warnings.push('Phone number is repeated in this file.');
          filePhones.add(phone);
        }
        if (parentEmail) warnings.push('If this parent login already exists in the school, it will be reused.');
        const values: Record<string, string> = {
          StudentName: row.StudentName, RollNumber: row.RollNumber, DOB: toApiDate(row.DOB), GenderCode: genderCode, Email: row.Email,
          PhoneNumber: row.PhoneNumber, SchoolId: String(selectedSchoolId), ClassId: String(classItem?.id || ''),
          SectionId: String(sectionItem?.id || ''), SessionId: String(activeSessions[0].id), 'Parent.Name': row.ParentName,
          'Parent.Email': row.ParentEmail, 'Parent.PhoneNumber': row.ParentPhone, 'Parent.Address': row.ParentAddress,
          'Parent.Relationship': row.ParentRelationship
        };
        return { rowNumber: index + 2, values: row, errors, warnings, payload: values };
      });
      setImportPreview(preview);
    } catch (error: any) { toast.error(error.message || 'Unable to validate students.'); }
    finally { setTransferring(false); }
  };

  const confirmStudentImport = async () => {
    const validRows = importPreview.filter(row => row.errors.length === 0);
    setTransferring(true);
    const errors: ImportFailure[] = [];
    setImportResult(null);
    let imported = 0;
    try {
      const concurrency = 5;
      for (let offset = 0; offset < validRows.length; offset += concurrency) {
        const batch = validRows.slice(offset, offset + concurrency);
        const results = await Promise.all(batch.map(async previewRow => {
          const body = new FormData();
          Object.entries(previewRow.payload as Record<string, string>).forEach(([key, value]) => body.append(key, value || ''));
          try {
            const response = await fetch(`${API_BASE_URL}/api/Student/add-student`, { method: 'POST', headers: authHeaders(), body });
            const result = await response.json();
            return { previewRow, ok: response.ok && result.success, message: result.message };
          } catch (error: any) {
            return { previewRow, ok: false, message: error.message || 'Import failed' };
          }
        }));
        imported += results.filter(result => result.ok).length;
        errors.push(...results
          .filter(result => !result.ok)
          .map(result => ({ rowNumber: result.previewRow.rowNumber, name: result.previewRow.values.StudentName || '', email: result.previewRow.values.Email || '', message: result.message || 'Import failed. Please try again.' })));
      }
      await fetchStudents(1, pageSize);
      setImportPreview([]);
      const importMessage = `${imported} students imported${errors.length ? `, ${errors.length} failed` : ' successfully'}.`;
      if (errors.length) {
        setImportResult({ imported, errors });
        if (imported > 0) toast.warning(importMessage, 10000);
        else toast.error(importMessage, 10000);
      } else {
        toast.success(importMessage);
      }
    } catch (error: any) { toast.error(error.message || 'Unable to import students.'); }
    finally { setTransferring(false); }
  };

  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;
  if (loading) return <PageLoader label="Loading students..." />;

  return (
    <div className="staff-list-container student-list-container">
      <div className="staff-list-header student-list-header">
        <h2>Student List</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {can('management.students','create')&&<><button type="button" className="create-icon-button" title="Download Template" aria-label="Download Template" disabled={transferring} onClick={downloadStudentTemplate}><TemplateIcon size={26} /></button>
          <button type="button" className="create-icon-button" title="Import CSV" aria-label="Import CSV" disabled={transferring} onClick={() => importInputRef.current?.click()}><ImportIcon size={26} /></button>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" hidden disabled={transferring} onChange={e => { const file = e.target.files?.[0]; if (file) prepareStudentImport(file); e.target.value = ''; }} /></>}
          <button type="button" className="create-icon-button" title="Export CSV" aria-label="Export CSV" disabled={transferring} onClick={exportStudents}><ExportIcon size={26} /></button>
          {can('management.students','create')&&<button type="button" className="create-icon-button" title="Add Student" aria-label="Add Student" onClick={() => setIsAddModalOpen(true)}><AddStudentIcon size={26} /></button>}
        </div>
      </div>
      <CsvImportHint />
      {students.length === 0 ? (
        <div className="staff-list-loading" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No students available. Please add a new student.
        </div>
      ) : (
        <div className="staff-table-wrapper student-table-wrapper">
          <table className="staff-table student-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>DOB</th>
                <th>Gender</th>
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
                  <td><ProfileListAvatar name={student.studentName} pictureUrl={student.profilePictureUrl} onView={() => setPhotoPreview(student)} /></td>
                  <td>
                    <Link className="staff-name-link" to={`/dashboard/schools/${selectedSchoolId}/students/${student.id}`}>{student.studentName}</Link>
                  </td>
                  <td>{student.email}</td>
                  <td>{student.phoneNumber}</td>
                  <td>{student.dob.split('T')[0].split('-').reverse().join('/')}</td>
                  <td>{genderLabel(student.genderCode)}</td>
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
                      type="button"
                      className="create-icon-button document-view-icon"
                      title={student.documents.length ? `View Documents (${student.documents.length})` : 'No documents available'}
                      aria-label={`View documents for ${student.studentName} (${student.documents.length})`}
                      onClick={() => { setSelectedStudent(student); setShowDocuments(true); }}
                      disabled={student.documents.length === 0}
                    >
                      <PreviewIcon size={26} />
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
        onSuccess={() => { toast.success('Student added successfully.'); fetchStudents(currentPage, pageSize); }}
      />

      <EditStudent
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={selectedStudent}
        schoolId={selectedSchoolId}
        onSuccess={() => fetchStudents(currentPage, pageSize)}
      />

      <Modal
        isOpen={showIdCard}
        onClose={() => setShowIdCard(false)}
        title="Student Profile"
        showSubmit={false}
        showCancel={false}
      >
        {selectedStudent && (
          <ProfileIdCard
            onEdit={() => {
              setShowIdCard(false);
              setIsEditModalOpen(true);
            }}
            pictureUrl={selectedStudent.profilePictureUrl}
            name={selectedStudent.studentName}
            type="Student"
            identifier={`Student ID: ${selectedStudent.id}`}
            subtitle={`${selectedStudent.className || 'Class not assigned'} • Section ${selectedStudent.sectionName || '—'}`}
            status={selectedStudent.isActive}
            fields={[
              { label: 'Roll Number', value: selectedStudent.rollNumber },
              { label: 'Gender', value: genderLabel(selectedStudent.genderCode) },
              { label: 'Date of Birth', value: selectedStudent.dob?.split('T')[0].split('-').reverse().join('/') },
              { label: 'Academic Session', value: selectedStudent.academicSession?.split('T')[0] },
              { label: 'Email', value: selectedStudent.email },
              { label: 'Phone', value: selectedStudent.phoneNumber },
              { label: 'Parent Name', value: selectedStudent.parentName && onViewParent && can('management.parents', 'read') ? (
                <button type="button" className="parent-profile-link" onClick={() => onViewParent(selectedStudent.parentId)}>{selectedStudent.parentName}</button>
              ) : selectedStudent.parentName },
              { label: 'Relationship', value: selectedStudent.parentRelationship },
            ]}
          />
        )}
      </Modal>

      <Modal
        isOpen={photoPreview !== null}
        onClose={() => setPhotoPreview(null)}
        title={`Profile Photo - ${photoPreview?.studentName || ''}`}
        showSubmit={false}
        showCancel={false}
      >
        {photoPreview && <div className="staff-photo-preview">
          <img src={profilePictureUrl(photoPreview.profilePictureUrl)} alt={`${photoPreview.studentName} profile`} />
        </div>}
      </Modal>

      <ImportResults type="Student" result={importResult} onClose={() => setImportResult(null)} />

      <BulkImportPreview
        title="Preview Student Import"
        columns={['StudentName', 'RollNumber', 'DOB', 'Gender', 'Email', 'PhoneNumber', 'Class', 'Section', 'ParentName', 'ParentEmail']}
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
