import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface Subject {
  subjectId: number;
  subjectName: string;
}

interface Class {
  id: number;
  className: string;
  sections: Section[];
}

interface Section {
  id: number;
  sectionName: string;
}

interface ExamSubject {
  subjectId: number;
  examDate: string;
  startTime: string;
  endTime: string;
  selected: boolean;
}

interface ExamScheduleProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number | null;
  examId: number | null;
  examName: string;
  onSuccess: () => void;
}

const ExamSchedule: React.FC<ExamScheduleProps> = ({ isOpen, onClose, schoolId, examId, examName, onSuccess }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchClasses();
      setError('');
    }
  }, [isOpen, schoolId]);

  useEffect(() => {
    if (selectedClassId && selectedSectionId) {
      fetchSubjects();
    }
  }, [selectedClassId, selectedSectionId]);

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

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Class/section-subjects/${selectedSectionId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSubjects(result.data);
          const initialSubjects = result.data.map((subject: Subject) => ({
            subjectId: subject.subjectId,
            examDate: '',
            startTime: '09:00',
            endTime: '10:00',
            selected: false
          }));
          setExamSubjects(initialSubjects);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subjects');
    }
  };

  const handleSubjectChange = (index: number, field: keyof ExamSubject, value: string | boolean) => {
    const updated = [...examSubjects];
    updated[index] = { ...updated[index], [field]: value };
    setExamSubjects(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!examId || !selectedClassId || !selectedSectionId) {
      setError('Please select class and section');
      return;
    }

    const selectedSubjects = examSubjects.filter(subject => subject.selected && subject.examDate);
    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject and set its exam date');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        examId: examId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        schoolId: schoolId,
        subjects: selectedSubjects.map(subject => ({
          subjectId: subject.subjectId,
          examDate: new Date(subject.examDate).toISOString(),
          startTime: subject.startTime + ':00',
          endTime: subject.endTime + ':00'
        }))
      };

      const response = await fetch(`${API_BASE_URL}/api/Exam/schedule`, {
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
        console.error('API Error:', result);
        setError(result.message || `Failed to schedule exam (${response.status})`);
      }
    } catch (err) {
      console.error('Failed to schedule exam:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedClassId(null);
    setSelectedSectionId(null);
    setExamSubjects([]);
    setError('');
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Schedule Exam: ${examName}`}
      submitLabel="Schedule Exam"
      onCancel={handleClear}
      formId="schedule-exam-form"
      size="large"
    >
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form id="schedule-exam-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Class *</label>
            <select 
              value={selectedClassId || ''} 
              onChange={(e) => {
                setSelectedClassId(Number(e.target.value));
                setSelectedSectionId(null);
              }}
              required
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.className}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Section *</label>
            <select 
              value={selectedSectionId || ''} 
              onChange={(e) => setSelectedSectionId(Number(e.target.value))}
              required
              disabled={!selectedClassId}
            >
              <option value="">Select Section</option>
              {selectedClass?.sections.map(section => (
                <option key={section.id} value={section.id}>{section.sectionName}</option>
              ))}
            </select>
          </div>
        </div>

        {subjects.length > 0 && (
          <div className="subjects-schedule" style={{ padding: '0 28px 28px' }}>
            <h3 style={{ marginBottom: '16px', color: '#374151', fontSize: '18px' }}>Subject Schedule</h3>
            
            <div className="subjects-table">
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151', width: '50px' }}>Select</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Subject</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Exam Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Start Time</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject, index) => (
                    <tr key={subject.subjectId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={examSubjects[index]?.selected || false}
                          onChange={(e) => handleSubjectChange(index, 'selected', e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>{subject.subjectName}</td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="date"
                          value={examSubjects[index]?.examDate || ''}
                          onChange={(e) => handleSubjectChange(index, 'examDate', e.target.value)}
                          disabled={!examSubjects[index]?.selected}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '4px', 
                            fontSize: '13px',
                            backgroundColor: examSubjects[index]?.selected ? 'white' : '#f3f4f6',
                            cursor: examSubjects[index]?.selected ? 'text' : 'not-allowed'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="time"
                          value={examSubjects[index]?.startTime || '09:00'}
                          onChange={(e) => handleSubjectChange(index, 'startTime', e.target.value)}
                          disabled={!examSubjects[index]?.selected}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '4px', 
                            fontSize: '13px',
                            backgroundColor: examSubjects[index]?.selected ? 'white' : '#f3f4f6',
                            cursor: examSubjects[index]?.selected ? 'text' : 'not-allowed'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="time"
                          value={examSubjects[index]?.endTime || '10:00'}
                          onChange={(e) => handleSubjectChange(index, 'endTime', e.target.value)}
                          disabled={!examSubjects[index]?.selected}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '4px', 
                            fontSize: '13px',
                            backgroundColor: examSubjects[index]?.selected ? 'white' : '#f3f4f6',
                            cursor: examSubjects[index]?.selected ? 'text' : 'not-allowed'
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default ExamSchedule;