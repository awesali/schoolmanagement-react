import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

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
  schoolId: number;
  className: string;
  sectionName: string;
  academicSession: string;
  isActive: boolean;
  documents: Document[];
}

interface EnrollmentInfo {
  classId: number;
  className: string;
  sectionId: number;
  sectionName: string;
  sessionId: number;
  yearStart: string;
  yearEnd: string;
}

interface EditStudentProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess: () => void;
}

const EditStudent: React.FC<EditStudentProps> = ({ isOpen, onClose, student, onSuccess }) => {
  const [formData, setFormData] = useState({
    studentName: '',
    dob: '',
    email: '',
    phoneNumber: '',
    classId: '',
    sectionId: '',
    sessionId: '',
    isActive: true,
  });
  const [enrollmentInfo, setEnrollmentInfo] = useState<EnrollmentInfo[]>([]);
  const [newDocuments, setNewDocuments] = useState<Array<{ name: string; file: File }>>([]);
  const [existingDocuments, setExistingDocuments] = useState<Array<{ id: number; name: string; url: string; originalName: string; newFile?: File }>>([]);

  useEffect(() => {
    if (isOpen && student) {
      setFormData({
        studentName: student.studentName,
        dob: student.dob.split('T')[0],
        email: student.email,
        phoneNumber: student.phoneNumber,
        classId: '',
        sectionId: '',
        sessionId: '',
        isActive: student.isActive,
      });
      setExistingDocuments(student.documents.map(doc => ({
        id: doc.documentId,
        name: doc.documentName,
        url: doc.documentURL,
        originalName: doc.documentName,
      })));
      setNewDocuments([]);
      fetchEnrollmentInfo(student.schoolId);
    }
  }, [isOpen, student]);

  const fetchEnrollmentInfo = async (schoolId: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/enrollment-info?schoolId=${schoolId}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) setEnrollmentInfo(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch enrollment info');
    }
  };

  const uniqueClasses = enrollmentInfo.filter(
    (item, idx, self) => self.findIndex(i => i.classId === item.classId) === idx
  );

  const filteredSections = enrollmentInfo.filter(item => item.classId === Number(formData.classId));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    const sessionId = enrollmentInfo.find(i => i.classId === Number(classId))?.sessionId.toString() ?? '';
    setFormData({ ...formData, classId, sectionId: '', sessionId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      formDataToSend.append('Id', student.id.toString());
      formDataToSend.append('StudentName', formData.studentName);
      formDataToSend.append('Email', formData.email);
      formDataToSend.append('PhoneNumber', formData.phoneNumber);
      formDataToSend.append('DOB', new Date(formData.dob).toISOString());
      formDataToSend.append('IsActive', formData.isActive.toString());
      if (formData.classId) formDataToSend.append('ClassId', formData.classId);
      if (formData.sectionId) formDataToSend.append('SectionId', formData.sectionId);
      if (formData.sessionId) formDataToSend.append('SessionId', formData.sessionId);

      const documentIds: string[] = [];
      const documentNames: string[] = [];
      const files: File[] = [];

      existingDocuments.forEach(doc => {
        const hasNameChanged = doc.name !== doc.originalName;
        const hasFileChanged = doc.newFile !== undefined;
        if (hasNameChanged || hasFileChanged) {
          documentIds.push(doc.id.toString());
          documentNames.push(doc.name);
          files.push(doc.newFile ?? new File([], '', { type: 'application/octet-stream' }));
        }
      });

      newDocuments.forEach(doc => {
        if (doc.file && doc.name.trim()) {
          documentNames.push(doc.name);
          files.push(doc.file);
        }
      });

      documentIds.forEach(id => formDataToSend.append('DocumentIds', id));
      documentNames.forEach(name => formDataToSend.append('DocumentNames', name));
      files.forEach(file => formDataToSend.append('Files', file));

      const response = await fetch(`${API_BASE_URL}/api/Admin/update-student`, {
        method: 'PUT',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
        body: formDataToSend,
      });
      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to update student');
    }
  };

  // Document handlers
  const handleAddDocument = () => setNewDocuments([...newDocuments, { name: '', file: null as any }]);
  const handleRemoveNewDocument = (index: number) => setNewDocuments(newDocuments.filter((_, i) => i !== index));
  const handleDocumentNameChange = (index: number, name: string) => {
    const updated = [...newDocuments];
    updated[index].name = name;
    setNewDocuments(updated);
  };
  const handleDocumentFileChange = (index: number, file: File | null) => {
    if (file) {
      const updated = [...newDocuments];
      updated[index].file = file;
      setNewDocuments(updated);
    }
  };
  const handleExistingDocNameChange = (index: number, name: string) => {
    const updated = [...existingDocuments];
    updated[index].name = name;
    setExistingDocuments(updated);
  };
  const handleExistingDocFileChange = (index: number, file: File | null) => {
    if (file) {
      const updated = [...existingDocuments];
      updated[index].newFile = file;
      setExistingDocuments(updated);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Student"
      submitLabel="Update Student"
      onCancel={() => {}}
      showCancel={false}
      formId="edit-student-form"
    >
      <form id="edit-student-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>— Student Details —</label>
          </div>

          <div className="form-group">
            <label>Student Name *</label>
            <input type="text" name="studentName" required value={formData.studentName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" required value={formData.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              name="phoneNumber"
              required
              maxLength={10}
              pattern="[0-9]{10}"
              value={formData.phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length <= 10) setFormData({ ...formData, phoneNumber: value });
              }}
            />
          </div>
          <div className="form-group">
            <label>Date of Birth *</label>
            <input type="date" name="dob" required value={formData.dob} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Class</label>
            <select name="classId" value={formData.classId} onChange={handleClassChange}>
              <option value="">Select Class</option>
              {uniqueClasses.map(c => (
                <option key={c.classId} value={c.classId}>{c.className}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Section</label>
            <select name="sectionId" value={formData.sectionId} onChange={handleChange} disabled={!formData.classId}>
              <option value="">Select Section</option>
              {filteredSections.map(s => (
                <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Session</label>
            <select name="sessionId" value={formData.sessionId} onChange={handleChange} disabled>
              <option value="">Select Class First</option>
              {formData.sessionId && (
                <option value={formData.sessionId}>
                  {enrollmentInfo.find(i => i.sessionId === Number(formData.sessionId))?.yearStart.split('-')[0]}
                </option>
              )}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <div className="toggle-container">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className={`toggle-label ${formData.isActive ? 'active' : 'inactive'}`}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="documents-section">
          <div className="documents-header">
            <label>Existing Documents ({existingDocuments.length})</label>
          </div>
          {existingDocuments.length === 0 ? (
            <p style={{ padding: '12px', color: '#718096', fontSize: '14px' }}>No existing documents</p>
          ) : (
            existingDocuments.map((doc, index) => (
              <div key={doc.id} className="existing-doc-row-edit">
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => handleExistingDocNameChange(index, e.target.value)}
                  placeholder="Document Name"
                />
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id={`existing-file-${index}`}
                    onChange={(e) => handleExistingDocFileChange(index, e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor={`existing-file-${index}`} className="file-input-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {doc.newFile ? doc.newFile.name : 'Upload'}
                  </label>
                </div>
                <a
                  href={`${API_BASE_URL}${doc.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-view-existing"
                >
                  View
                </a>
              </div>
            ))
          )}
        </div>

        <div className="documents-section">
          <div className="documents-header">
            <label>Add New Documents</label>
            <button type="button" className="btn-add-doc" onClick={handleAddDocument}>
              + Add Document
            </button>
          </div>
          {newDocuments.map((doc, index) => (
            <div key={index} className="new-document-row">
              <input
                type="text"
                placeholder="Document Name"
                value={doc.name}
                onChange={(e) => handleDocumentNameChange(index, e.target.value)}
              />
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id={`new-file-${index}`}
                  onChange={(e) => handleDocumentFileChange(index, e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label htmlFor={`new-file-${index}`} className="file-input-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {doc.file ? doc.file.name : 'Upload'}
                </label>
              </div>
              <button type="button" className="btn-remove" onClick={() => handleRemoveNewDocument(index)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
};

export default EditStudent;
