import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface AddStudentProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number | null;
  onSuccess: () => void;
}

interface ClassItem { id: number; name: string; }
interface SectionItem { id: number; name: string; classId: number; }
interface SessionItem { id: number; yearStart: string; yearEnd: string; }

interface EnrollmentData {
  classes: ClassItem[];
  sections: SectionItem[];
  sessions: SessionItem[];
}

const initialForm = {
  studentName: '',
  rollNumber: '',
  dob: '',
  email: '',
  phoneNumber: '',
  classId: '',
  sectionId: '',
  sessionId: '',
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  parentAddress: '',
  parentRelationship: '',
};

const AddStudent: React.FC<AddStudentProps> = ({ isOpen, onClose, schoolId, onSuccess }) => {
  const [formData, setFormData] = useState(initialForm);
  const [enrollment, setEnrollment] = useState<EnrollmentData>({ classes: [], sections: [], sessions: [] });
  const [documents, setDocuments] = useState<Array<{ name: string; file: File }>>([]);

  useEffect(() => {
    if (isOpen && schoolId) fetchEnrollmentInfo();
  }, [isOpen]);

  const fetchEnrollmentInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${schoolId}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setEnrollment(result.data);
          if (result.data.sessions?.length === 1) {
            setFormData(prev => ({ ...prev, sessionId: result.data.sessions[0].id.toString() }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch enrollment info');
    }
  };

  const filteredSections = enrollment.sections.filter(s => s.classId === Number(formData.classId));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setFormData({ ...formData, classId, sectionId: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      formDataToSend.append('StudentName', formData.studentName);
      formDataToSend.append('RollNumber', formData.rollNumber);
      formDataToSend.append('DOB', formData.dob);
      formDataToSend.append('Email', formData.email);
      formDataToSend.append('PhoneNumber', formData.phoneNumber);
      formDataToSend.append('SchoolId', schoolId?.toString() || '0');
      formDataToSend.append('ClassId', formData.classId);
      formDataToSend.append('SectionId', formData.sectionId);
      formDataToSend.append('SessionId', formData.sessionId);
      formDataToSend.append('Parent.Name', formData.parentName);
      formDataToSend.append('Parent.PhoneNumber', formData.parentPhone);
      formDataToSend.append('Parent.Address', formData.parentAddress);
      formDataToSend.append('Parent.Email', formData.parentEmail);
      formDataToSend.append('Parent.Relationship', formData.parentRelationship);

      const validDocuments = documents.filter(doc => doc.file && doc.name.trim());
      validDocuments.forEach(doc => {
        formDataToSend.append('DocumentNames', doc.name);
        formDataToSend.append('Files', doc.file);
      });

      const response = await fetch(`${API_BASE_URL}/api/Student/add-student`, {
        method: 'POST',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
        body: formDataToSend,
      });
      if (response.ok) {
        setFormData(initialForm);
        setDocuments([]);
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to add student');
    }
  };

  const handleClear = () => {
    setFormData(initialForm);
    setDocuments([]);
    setEnrollment({ classes: [], sections: [], sessions: [] });
  };

  const handleAddDocument = () => setDocuments([...documents, { name: '', file: null as any }]);
  const handleRemoveDocument = (index: number) => setDocuments(documents.filter((_, i) => i !== index));
  const handleDocumentNameChange = (index: number, name: string) => {
    const updated = [...documents];
    updated[index].name = name;
    setDocuments(updated);
  };
  const handleDocumentFileChange = (index: number, file: File | null) => {
    if (file) {
      const updated = [...documents];
      updated[index].file = file;
      setDocuments(updated);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Student"
      submitLabel="Add Student"
      onCancel={handleClear}
      formId="add-student-form"
    >
      <form id="add-student-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>— Student Details —</label>
          </div>

          <div className="form-group">
            <label>Student Name *</label>
            <input type="text" name="studentName" required value={formData.studentName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Roll Number *</label>
            <input type="text" name="rollNumber" required value={formData.rollNumber} onChange={handleChange} />
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
            <label>Class *</label>
            <select name="classId" required value={formData.classId} onChange={handleClassChange}>
              <option value="">Select Class</option>
              {enrollment.classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Section *</label>
            <select name="sectionId" required value={formData.sectionId} onChange={handleChange} disabled={!formData.classId}>
              <option value="">Select Section</option>
              {filteredSections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Session *</label>
            <select name="sessionId" required value={formData.sessionId} onChange={handleChange} disabled>
              <option value="">Auto Selected</option>
              {enrollment.sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.yearStart.split('-')[0]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group full-width">
            <label>— Parent Details —</label>
          </div>

          <div className="form-group">
            <label>Parent Name *</label>
            <input type="text" name="parentName" required value={formData.parentName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Parent Email *</label>
            <input type="email" name="parentEmail" required value={formData.parentEmail} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Parent Phone *</label>
            <input
              type="tel"
              name="parentPhone"
              required
              maxLength={10}
              pattern="[0-9]{10}"
              value={formData.parentPhone}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length <= 10) setFormData({ ...formData, parentPhone: value });
              }}
            />
          </div>
          <div className="form-group">
            <label>Relationship *</label>
            <input type="text" name="parentRelationship" required value={formData.parentRelationship} onChange={handleChange} />
          </div>
          <div className="form-group full-width">
            <label>Parent Address *</label>
            <textarea name="parentAddress" required value={formData.parentAddress} onChange={handleChange} />
          </div>
        </div>

        <div className="documents-section">
          <div className="documents-header">
            <label>Documents</label>
            <button type="button" className="btn-add-doc" onClick={handleAddDocument}>
              + Add Document
            </button>
          </div>
          {documents.map((doc, index) => (
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
                  id={`file-${index}`}
                  onChange={(e) => handleDocumentFileChange(index, e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label htmlFor={`file-${index}`} className="file-input-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {doc.file ? doc.file.name : 'Upload'}
                </label>
              </div>
              <button type="button" className="btn-remove" onClick={() => handleRemoveDocument(index)}>✕</button>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
};

export default AddStudent;
