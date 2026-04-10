import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface EditSubjectProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onSuccess: () => void;
}

interface Subject {
  id: number;
  subjectName: string;
  schoolId: number;
  created_Date: string;
  modified_Date: string | null;
  isActive: boolean;
  teacherId: number | null;
  teacherName: string | null;
}

interface Staff {
  id: number;
  name: string;
}

const EditSubject: React.FC<EditSubjectProps> = ({ isOpen, onClose, subject, onSuccess }) => {
  const [formData, setFormData] = useState({
    subjectName: '',
    staffId: 0,
  });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && subject) {
      setFormData({
        subjectName: subject.subjectName,
        staffId: subject.teacherId || 0,
      });
      fetchStaff();
      setError('');
    }
  }, [isOpen, subject]);

  const fetchStaff = async () => {
    if (!subject) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Common/by-school/${subject.schoolId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStaff(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;
    
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        id: subject.id,
        subjectName: formData.subjectName,
        staffId: formData.staffId
      };

      const response = await fetch(`${API_BASE_URL}/api/Subject/update-subject`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to update subject');
      }
    } catch (err) {
      console.error('Failed to update subject:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (subject) {
      setFormData({
        subjectName: subject.subjectName,
        staffId: subject.teacherId || 0,
      });
    }
    setError('');
  };

  if (!subject) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Subject"
      submitLabel={loading ? "Updating..." : "Update Subject"}
      onCancel={handleClear}
      formId="edit-subject-form"
    >
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form id="edit-subject-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Subject Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Mathematics, English, Science"
              value={formData.subjectName}
              onChange={(e) => setFormData({...formData, subjectName: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Assign Teacher *</label>
            <select
              required
              value={formData.staffId}
              onChange={(e) => setFormData({...formData, staffId: Number(e.target.value)})}
              className="form-select"
            >
              <option value="">Select Teacher</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditSubject;