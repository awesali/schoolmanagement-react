import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddStudent from './AddStudent';
import EditStudent from './EditStudent';
import Modal from './Modal';
import './StudentList.css';

interface Document {
  documentId: number;
  documentName: string;
  documentURL: string;
}

interface Student {
  id: number;
  studentName: string;
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);

  useEffect(() => {
    if (selectedSchoolId) fetchStudents();
  }, [selectedSchoolId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/students-by-school?schoolId=${selectedSchoolId}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) setStudents(result.data.map((s: Student) => ({ ...s, documents: s.documents ?? [] })));
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
      const response = await fetch(`${API_BASE_URL}/api/Admin/delete-student-document?id=${documentId}`, {
        method: 'DELETE',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchStudents();
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

  if (loading) return <div className="staff-list-loading">Loading...</div>;
  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Student List</h2>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Student
        </button>
      </div>
      <div className="staff-table-wrapper">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Name</th>
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

      <AddStudent
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={fetchStudents}
      />

      <EditStudent
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={selectedStudent}
        schoolId={selectedSchoolId}
        onSuccess={fetchStudents}
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
