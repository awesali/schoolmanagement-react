import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface AddSubjectProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number | null;
  onSuccess: () => void;
}

interface Staff {
  id: number;
  name: string;
}

const AddSubject: React.FC<AddSubjectProps> = ({ isOpen, onClose, schoolId, onSuccess }) => {
  const [formData, setFormData] = useState({
    subjectName: '',
    staffId: 0,
  });
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchStaff();
      setError('');
    }
  }, [isOpen, schoolId]);

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Common/by-school/${schoolId}`, {
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
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        subjectName: formData.subjectName,
        schoolId: schoolId,
        staffId: formData.staffId
      };

      const response = await fetch(`${API_BASE_URL}/api/Subject/add-subject`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        handleClear();
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to add subject');
      }
    } catch (err) {
      console.error('Failed to add subject:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({ subjectName: '', staffId: 0 });
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Subject"
      submitLabel={loading ? "Adding..." : "Add Subject"}
      onCancel={handleClear}
      formId="add-subject-form"
    >
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form id="add-subject-form" onSubmit={handleSubmit}>
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

export default AddSubject;