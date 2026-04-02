import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface EditClassProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class | null;
  onSuccess: () => void;
}

interface Staff {
  id: number;
  name: string;
}

interface Section {
  id?: number;
  sectionName: string;
  staffId: number;
  monitorStudentId?: number;
}

interface Class {
  id: number;
  className: string;
  schoolId: number;
  createdDate: string;
  isActive: boolean;
  sectionCount: number;
  sections: Section[];
}

const EditClass: React.FC<EditClassProps> = ({ isOpen, onClose, classData, onSuccess }) => {
  const [formData, setFormData] = useState({
    className: '',
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && classData) {
      setFormData({
        className: classData.className,
      });
      fetchStaff();
      // Use sections data directly from classData instead of separate API call
      if (classData.sections && classData.sections.length > 0) {
        setSections(classData.sections);
      } else {
        setSections([{ sectionName: '', staffId: 0 }]);
      }
      setError('');
    }
  }, [isOpen, classData]);

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Common/by-school/${classData?.schoolId}`, {
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
        classId: classData?.id,
        className: formData.className,
        sections: validSections
      };

      const response = await fetch(`${API_BASE_URL}/api/Admin/update-class-with-sections`, {
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
        setError(result.message || 'Failed to update class');
      }
    } catch (err) {
      console.error('Failed to update class:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
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
      title="Edit Class"
      submitLabel={loading ? "Updating..." : "Update Class"}
      onCancel={() => {}}
      showCancel={false}
      formId="edit-class-form"
    >
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form id="edit-class-form" onSubmit={handleSubmit}>
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

export default EditClass;