import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface AssignSubjectsProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: number | null;
  schoolId: number | null;
  sectionName: string;
  assignedSubjects?: Subject[];
  onSuccess: () => void;
}

interface Subject {
  id: number;
  subjectName: string;
}

const AssignSubjects: React.FC<AssignSubjectsProps> = ({ 
  isOpen, 
  onClose, 
  sectionId, 
  schoolId, 
  sectionName, 
  assignedSubjects = [],
  onSuccess 
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchSubjects();
      setError('');
      setSelectedSubjects(assignedSubjects.map(subject => subject.id));
    }
  }, [isOpen, schoolId, assignedSubjects]);

  const fetchSubjects = async () => {
    if (!schoolId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Common/subjects/${schoolId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSubjects(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subjects');
    }
  };

  const handleSubjectToggle = (subjectId: number) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionId || !schoolId || selectedSubjects.length === 0) {
      setError('Please select at least one subject');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        sectionId: sectionId,
        schoolId: schoolId,
        subjectIds: selectedSubjects
      };

      const response = await fetch(`${API_BASE_URL}/api/Admin/assign-subjects-to-section`, {
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
        setError(result.message || 'Failed to assign subjects');
      }
    } catch (err) {
      console.error('Failed to assign subjects:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedSubjects([]);
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Subjects to ${sectionName}`}
      submitLabel={loading ? "Assigning..." : "Assign Subjects"}
      onCancel={handleClear}
      formId="assign-subjects-form"
    >
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form id="assign-subjects-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Select Subjects *</label>
            <div className="subjects-checkbox-list">
              {subjects.map((subject) => (
                <div key={subject.id} className="checkbox-item">
                  <input
                    type="checkbox"
                    id={`subject-${subject.id}`}
                    checked={selectedSubjects.includes(subject.id)}
                    onChange={() => handleSubjectToggle(subject.id)}
                  />
                  <label htmlFor={`subject-${subject.id}`}>
                    {subject.subjectName}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default AssignSubjects;