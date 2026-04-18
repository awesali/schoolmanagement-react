import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface AssignSubjectsProps {
  isOpen: boolean;
  onClose: () => void;
  classData: Class | null;
  schoolId: number | null;
  onSuccess: () => void;
}

interface Class {
  id: number;
  className: string;
  sections: Section[];
}

interface Section {
  id: number;
  sectionName: string;
  subjects: AssignedSubject[];
}

interface Subject {
  id: number;
  subjectName: string;
}

interface AssignedSubject {
  subjectId: number;
  subjectName: string;
}

const AssignSubjects: React.FC<AssignSubjectsProps> = ({ 
  isOpen, 
  onClose, 
  classData, 
  schoolId, 
  onSuccess 
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchSubjects();
      setError('');
      // Set first section as default if available
      if (classData && classData.sections.length > 0) {
        setSelectedSectionId(classData.sections[0].id);
      }
    }
  }, [isOpen, schoolId, classData]);

  useEffect(() => {
    if (selectedSectionId && classData) {
      const section = classData.sections.find(s => s.id === selectedSectionId);
      if (section) {
        setSelectedSubjects(section.subjects.map(subject => subject.subjectId));
      }
    }
  }, [selectedSectionId, classData]);

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
    
    // Filter out null/undefined values
    const validSubjectIds = selectedSubjects.filter(id => id !== null && id !== undefined);
    
    if (!selectedSectionId || !schoolId || validSubjectIds.length === 0) {
      setError('Please select a section and at least one subject');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const requestData = {
        sectionId: selectedSectionId,
        schoolId: schoolId,
        subjectIds: validSubjectIds
      };

      const response = await fetch(`${API_BASE_URL}/api/Subject/assign-subjects-to-section`, {
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
    setSelectedSectionId(null);
    setError('');
  };

  const selectedSection = classData?.sections.find(s => s.id === selectedSectionId);
  const sectionName = selectedSection ? `${classData?.className}-${selectedSection.sectionName}` : 'No Section Selected';

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
            <label>Select Section *</label>
            <select
              value={selectedSectionId || ''}
              onChange={(e) => setSelectedSectionId(Number(e.target.value))}
              className="form-control"
            >
              <option value="">Select Section</option>
              {classData?.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {classData.className}-{section.sectionName}
                </option>
              ))}
            </select>
          </div>
          
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
                    disabled={!selectedSectionId}
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