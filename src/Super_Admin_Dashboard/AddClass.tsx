import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface AddClassProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number | null;
  onSuccess: () => void;
}

interface Staff {
  id: number;
  name: string;
}

interface Section {
  sectionName: string;
  staffId: number;
}

const AddClass: React.FC<AddClassProps> = ({ isOpen, onClose, schoolId, onSuccess }) => {
  const [formData, setFormData] = useState({
    className: '',
  });
  const [sections, setSections] = useState<Section[]>([{ sectionName: '', staffId: 0 }]);
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
      const validSections = sections.filter(section => 
        section.sectionName.trim() && section.staffId > 0
      );

      if (validSections.length === 0) {
        setError('Please add at least one section with a staff member');
        setLoading(false);
        return;
      }

      const requestData = {
        className: formData.className,
        schoolId: schoolId,
        sections: validSections
      };

      const response = await fetch(`${API_BASE_URL}/api/Admin/create-class-with-sections`, {
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
        setError(result.message || 'Failed to create class');
      }
    } catch (err) {
      console.error('Failed to create class:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({ className: '' });
    setSections([{ sectionName: '', staffId: 0 }]);
    setError('');
  };

  const handleAddSection = () => {
    setSections([...sections, { sectionName: '', staffId: 0 }]);
  };

  const handleRemoveSection = (index: number) => {
    if (sections.length > 1) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const handleSectionChange = (index: number, field: keyof Section, value: string | number) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Class"
      submitLabel={loading ? "Creating..." : "Create Class"}
      onCancel={handleClear}
      formId="add-class-form"
    >
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form id="add-class-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Class Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., 1st, 2nd, Nursery"
              value={formData.className}
              onChange={(e) => setFormData({...formData, className: e.target.value})}
            />
          </div>
        </div>

        <div className="documents-section">
          <div className="documents-header">
            <label>Sections</label>
            <button type="button" className="btn-add-doc" onClick={handleAddSection}>
              + Add Section
            </button>
          </div>
          {sections.map((section, index) => (
            <div key={index} className="new-document-row">
              <input
                type="text"
                placeholder="Section Name (e.g., A, B, C)"
                value={section.sectionName}
                onChange={(e) => handleSectionChange(index, 'sectionName', e.target.value)}
                required
              />
              <select
                value={section.staffId}
                onChange={(e) => handleSectionChange(index, 'staffId', Number(e.target.value))}
                required
                className="form-select"
              >
                <option value="">Select Class Teacher</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              {sections.length > 1 && (
                <button 
                  type="button" 
                  className="btn-remove" 
                  onClick={() => handleRemoveSection(index)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
};

export default AddClass;