import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface ExamType {
  id: number;
  name: string;
}

interface Subject {
  subjectId: number;
  subjectName: string;
}

interface Section {
  id: number;
  sectionName: string;
  subjects: Subject[];
}

interface Class {
  id: number;
  className: string;
  sections: Section[];
}

interface ExamSubject {
  subjectId: number;
  examDate: string;
  startTime: string;
  endTime: string;
  selected: boolean;
}

interface SelectedSection {
  sectionId: number;
  subjects: ExamSubject[];
}

interface SelectedClass {
  classId: number;
  sections: SelectedSection[];
}

interface CreateExamScheduleProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number | null;
  onSuccess: () => void;
}

const CreateExamSchedule: React.FC<CreateExamScheduleProps> = ({ 
  isOpen, 
  onClose, 
  schoolId, 
  onSuccess 
}) => {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [examName, setExamName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedExamTypeId, setSelectedExamTypeId] = useState<number | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());
  const [examSchedule, setExamSchedule] = useState<Map<string, ExamSubject>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchExamTypes();
      fetchClasses();
      setError('');
    }
  }, [isOpen, schoolId]);

  const fetchExamTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Exam/exam-type-picklist?schoolId=${schoolId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setExamTypes(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch exam types');
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Class/calss-list?schoolId=${schoolId}&page=1&pageSize=100`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setClasses(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch classes');
    }
  };

  const handleClassToggle = (classId: number) => {
    const newSelectedClasses = new Set(selectedClasses);
    const newSelectedSections = new Set(selectedSections);
    
    if (newSelectedClasses.has(classId)) {
      newSelectedClasses.delete(classId);
      // Remove all sections of this class
      const classData = classes.find(c => c.id === classId);
      classData?.sections.forEach(section => {
        newSelectedSections.delete(section.id);
        // Remove exam schedule for this section's subjects
        section.subjects.forEach(subject => {
          examSchedule.delete(`${section.id}-${subject.subjectId}`);
        });
      });
    } else {
      newSelectedClasses.add(classId);
    }
    
    setSelectedClasses(newSelectedClasses);
    setSelectedSections(newSelectedSections);
    setExamSchedule(new Map(examSchedule));
  };

  const handleSectionToggle = (sectionId: number) => {
    const newSelectedSections = new Set(selectedSections);
    
    if (newSelectedSections.has(sectionId)) {
      newSelectedSections.delete(sectionId);
      // Remove exam schedule for this section's subjects
      const section = classes.flatMap(c => c.sections).find(s => s.id === sectionId);
      section?.subjects.forEach(subject => {
        examSchedule.delete(`${sectionId}-${subject.subjectId}`);
      });
    } else {
      newSelectedSections.add(sectionId);
    }
    
    setSelectedSections(newSelectedSections);
    setExamSchedule(new Map(examSchedule));
  };

  const handleSubjectSchedule = (sectionId: number, subjectId: number, field: keyof ExamSubject, value: string | boolean) => {
    const key = `${sectionId}-${subjectId}`;
    const currentSchedule = examSchedule.get(key) || {
      subjectId,
      examDate: '',
      startTime: '09:00:00',
      endTime: '12:00:00',
      selected: false
    };
    
    const updatedSchedule = { ...currentSchedule, [field]: value };
    examSchedule.set(key, updatedSchedule);
    setExamSchedule(new Map(examSchedule));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!examName.trim()) {
      setError('Please enter exam name');
      return;
    }
    
    if (!startDate) {
      setError('Please select start date');
      return;
    }
    
    if (!endDate) {
      setError('Please select end date');
      return;
    }
    
    if (!selectedExamTypeId) {
      setError('Please select an exam type');
      return;
    }
    
    if (selectedClasses.size === 0) {
      setError('Please select at least one class');
      return;
    }
    
    if (selectedSections.size === 0) {
      setError('Please select at least one section');
      return;
    }

    // Build the payload according to your API structure
    const classesData: SelectedClass[] = [];
    
    selectedClasses.forEach(classId => {
      const classData = classes.find(c => c.id === classId);
      if (classData) {
        const sectionsData: SelectedSection[] = [];
        
        classData.sections.forEach(section => {
          if (selectedSections.has(section.id)) {
            const subjects: ExamSubject[] = [];
            
            section.subjects.forEach(subject => {
              const scheduleKey = `${section.id}-${subject.subjectId}`;
              const schedule = examSchedule.get(scheduleKey);
              
              if (schedule && schedule.selected && schedule.examDate) {
                subjects.push({
                  subjectId: schedule.subjectId,
                  examDate: new Date(schedule.examDate).toISOString(),
                  startTime: schedule.startTime,
                  endTime: schedule.endTime
                });
              }
            });
            
            if (subjects.length > 0) {
              sectionsData.push({
                sectionId: section.id,
                subjects
              });
            }
          }
        });
        
        if (sectionsData.length > 0) {
          classesData.push({
            classId,
            sections: sectionsData
          });
        }
      }
    });

    if (classesData.length === 0) {
      setError('Please schedule at least one subject');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: examName,
        examTypeId: selectedExamTypeId,
        schoolId: schoolId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        classes: classesData
      };

      const response = await fetch(`${API_BASE_URL}/api/Exam/create-schedule`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        handleClear();
        onSuccess();
        onClose();
      } else {
        setError(result.message || 'Failed to create exam schedule');
      }
    } catch (err) {
      console.error('Failed to create exam schedule:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setExamName('');
    setStartDate('');
    setEndDate('');
    setSelectedExamTypeId(null);
    setSelectedClasses(new Set());
    setSelectedSections(new Set());
    setExamSchedule(new Map());
    setError('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Exam Schedule"
      submitLabel={loading ? "Creating..." : "Create Schedule"}
      onCancel={handleClear}
      formId="create-exam-schedule-form"
      size="large"
    >
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form id="create-exam-schedule-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Exam Name *</label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="Enter exam name (e.g., First Term)"
              required
            />
          </div>
          <div className="form-group">
            <label>Exam Type *</label>
            <select 
              value={selectedExamTypeId || ''} 
              onChange={(e) => setSelectedExamTypeId(Number(e.target.value))}
              required
            >
              <option value="">Select Exam Type</option>
              {examTypes.map(examType => (
                <option key={examType.id} value={examType.id}>
                  {examType.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>End Date *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              required
            />
          </div>
        </div>

        {selectedExamTypeId && (
          <div className="exam-schedule-content">
            <h3>Select Classes and Sections</h3>
            
            {classes.map(classItem => (
              <div key={classItem.id} className="class-section-group" style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <div className="class-header" style={{ marginBottom: '12px' }}>
                  <label className="checkbox-item" style={{ fontSize: '16px', fontWeight: '600' }}>
                    <input
                      type="checkbox"
                      checked={selectedClasses.has(classItem.id)}
                      onChange={() => handleClassToggle(classItem.id)}
                      style={{ marginRight: '8px' }}
                    />
                    {classItem.className}
                  </label>
                </div>
                
                {selectedClasses.has(classItem.id) && classItem.sections.length > 0 && (
                  <div className="sections-list" style={{ marginLeft: '24px' }}>
                    <h4 style={{ marginBottom: '8px', color: '#6b7280' }}>Sections:</h4>
                    {classItem.sections.map(section => (
                      <div key={section.id} className="section-group" style={{ marginBottom: '16px' }}>
                        <label className="checkbox-item">
                          <input
                            type="checkbox"
                            checked={selectedSections.has(section.id)}
                            onChange={() => handleSectionToggle(section.id)}
                            style={{ marginRight: '8px' }}
                          />
                          {section.sectionName}
                        </label>
                        
                        {selectedSections.has(section.id) && section.subjects.length > 0 && (
                          <div className="subjects-schedule" style={{ marginLeft: '24px', marginTop: '12px' }}>
                            <h5 style={{ marginBottom: '8px', color: '#6b7280' }}>Schedule Subjects:</h5>
                            <div className="subjects-table">
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f9fafb' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb', width: '50px' }}>Select</th>
                                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Subject</th>
                                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Exam Date</th>
                                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Start Time</th>
                                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #e5e7eb' }}>End Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {section.subjects.map(subject => {
                                    const scheduleKey = `${section.id}-${subject.subjectId}`;
                                    const schedule = examSchedule.get(scheduleKey);
                                    
                                    return (
                                      <tr key={subject.subjectId}>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                          <input
                                            type="checkbox"
                                            checked={schedule?.selected || false}
                                            onChange={(e) => handleSubjectSchedule(section.id, subject.subjectId, 'selected', e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                          />
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                                          {subject.subjectName}
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                                          <input
                                            type="date"
                                            value={schedule?.examDate || ''}
                                            onChange={(e) => handleSubjectSchedule(section.id, subject.subjectId, 'examDate', e.target.value)}
                                            min={startDate}
                                            max={endDate}
                                            disabled={!schedule?.selected}
                                            style={{ 
                                              width: '100%', 
                                              padding: '4px', 
                                              border: '1px solid #d1d5db', 
                                              borderRadius: '4px',
                                              backgroundColor: schedule?.selected ? 'white' : '#f3f4f6',
                                              cursor: schedule?.selected ? 'text' : 'not-allowed'
                                            }}
                                          />
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                                          <input
                                            type="time"
                                            value={schedule?.startTime || '09:00:00'}
                                            onChange={(e) => handleSubjectSchedule(section.id, subject.subjectId, 'startTime', e.target.value + ':00')}
                                            disabled={!schedule?.selected}
                                            style={{ 
                                              width: '100%', 
                                              padding: '4px', 
                                              border: '1px solid #d1d5db', 
                                              borderRadius: '4px',
                                              backgroundColor: schedule?.selected ? 'white' : '#f3f4f6',
                                              cursor: schedule?.selected ? 'text' : 'not-allowed'
                                            }}
                                          />
                                        </td>
                                        <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                                          <input
                                            type="time"
                                            value={schedule?.endTime || '12:00:00'}
                                            onChange={(e) => handleSubjectSchedule(section.id, subject.subjectId, 'endTime', e.target.value + ':00')}
                                            disabled={!schedule?.selected}
                                            style={{ 
                                              width: '100%', 
                                              padding: '4px', 
                                              border: '1px solid #d1d5db', 
                                              borderRadius: '4px',
                                              backgroundColor: schedule?.selected ? 'white' : '#f3f4f6',
                                              cursor: schedule?.selected ? 'text' : 'not-allowed'
                                            }}
                                          />
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CreateExamSchedule;