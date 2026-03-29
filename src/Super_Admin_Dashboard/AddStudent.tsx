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

interface EnrollmentInfo {
  classId: number;
  className: string;
  sectionId: number;
  sectionName: string;
  sessionId: number;
  yearStart: string;
  yearEnd: string;
}

const initialForm = {
  studentName: '',
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
  const [enrollmentInfo, setEnrollmentInfo] = useState<EnrollmentInfo[]>([]);

  useEffect(() => {
    if (isOpen && schoolId) fetchEnrollmentInfo();
  }, [isOpen]);

  const fetchEnrollmentInfo = async () => {
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
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/add-student`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentName: formData.studentName,
          dob: formData.dob,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          schoolId: schoolId,
          classId: Number(formData.classId),
          sectionId: Number(formData.sectionId),
          sessionId: Number(formData.sessionId),
          parent: {
            name: formData.parentName,
            phoneNumber: formData.parentPhone,
            address: formData.parentAddress,
            email: formData.parentEmail,
            relationship: formData.parentRelationship,
          },
        }),
      });
      if (response.ok) {
        setFormData(initialForm);
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to add student');
    }
  };

  const handleClear = () => {
    setFormData(initialForm);
    setEnrollmentInfo([]);
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
              {uniqueClasses.map(c => (
                <option key={c.classId} value={c.classId}>{c.className}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Section *</label>
            <select name="sectionId" required value={formData.sectionId} onChange={handleChange} disabled={!formData.classId}>
              <option value="">Select Section</option>
              {filteredSections.map(s => (
                <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Session *</label>
            <select name="sessionId" required value={formData.sessionId} onChange={handleChange} disabled>
              <option value="">Select Class First</option>
              {formData.sessionId && (
                <option value={formData.sessionId}>
                  {enrollmentInfo.find(i => i.sessionId === Number(formData.sessionId))?.yearStart.split('-')[0]}
                </option>
              )}
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
      </form>
    </Modal>
  );
};

export default AddStudent;
