import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface ExamType { id: number; name: string; }
interface Subject { subjectId: number; subjectName: string; }
interface Section { id: number; sectionName: string; subjects: Subject[]; }
interface Class { id: number; className: string; sections: Section[]; }
interface ExamSubject { subjectId: number; examDate: string; startTime: string; endTime: string; selected: boolean; }
interface SelectedSection { sectionId: number; subjects: ExamSubject[]; }
interface SelectedClass { classId: number; sections: SelectedSection[]; }

interface AddExamProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number | null;
  onSuccess: () => void;
}

const AddExam: React.FC<AddExamProps> = ({ isOpen, onClose, schoolId, onSuccess }) => {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [examName, setExamName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedExamTypeId, setSelectedExamTypeId] = useState<number | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Set<number>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());
  const [examSchedule, setExamSchedule] = useState<Map<string, ExamSubject>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateErrors, setDateErrors] = useState<Map<string, string>>(new Map());

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
      const res = await fetch(`${API_BASE_URL}/api/Exam/exam-type-picklist?schoolId=${schoolId}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && result.data) setExamTypes(result.data);
    } catch { console.error('Failed to fetch exam types'); }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/Class/calss-list?schoolId=${schoolId}&page=1&pageSize=100`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && result.data) setClasses(result.data);
    } catch { console.error('Failed to fetch classes'); }
  };

  const handleClassToggle = (classId: number) => {
    const newClasses = new Set(selectedClasses);
    const newSections = new Set(selectedSections);
    if (newClasses.has(classId)) {
      newClasses.delete(classId);
      const cls = classes.find(c => c.id === classId);
      cls?.sections.forEach(s => {
        newSections.delete(s.id);
        s.subjects.forEach(sub => examSchedule.delete(`${s.id}-${sub.subjectId}`));
      });
    } else {
      newClasses.add(classId);
    }
    setSelectedClasses(newClasses);
    setSelectedSections(newSections);
    setExamSchedule(new Map(examSchedule));
  };

  const handleSectionToggle = (sectionId: number) => {
    const newSections = new Set(selectedSections);
    if (newSections.has(sectionId)) {
      newSections.delete(sectionId);
      const section = classes.flatMap(c => c.sections).find(s => s.id === sectionId);
      section?.subjects.forEach(sub => examSchedule.delete(`${sectionId}-${sub.subjectId}`));
    } else {
      newSections.add(sectionId);
    }
    setSelectedSections(newSections);
    setExamSchedule(new Map(examSchedule));
  };

  const getUsedDates = (sectionId: number, excludeSubjectId: number): Set<string> => {
    const used = new Set<string>();
    examSchedule.forEach((schedule, key) => {
      if (key.startsWith(`${sectionId}-`) && schedule.subjectId !== excludeSubjectId && schedule.selected && schedule.examDate) {
        used.add(schedule.examDate);
      }
    });
    return used;
  };

  const handleSubjectSchedule = (sectionId: number, subjectId: number, field: keyof ExamSubject, value: string | boolean) => {
    const key = `${sectionId}-${subjectId}`;
    const current = examSchedule.get(key) || { subjectId, examDate: '', startTime: '09:00:00', endTime: '12:00:00', selected: false };
    examSchedule.set(key, { ...current, [field]: value });
    setExamSchedule(new Map(examSchedule));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim()) return setError('Please enter exam name');
    if (!startDate) return setError('Please select start date');
    if (!endDate) return setError('Please select end date');
    if (!selectedExamTypeId) return setError('Please select an exam type');
    if (selectedClasses.size === 0) return setError('Please select at least one class');
    if (selectedSections.size === 0) return setError('Please select at least one section');

    const classesData: SelectedClass[] = [];
    try {
    selectedClasses.forEach(classId => {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;
      const sectionsData: SelectedSection[] = [];
      cls.sections.forEach(section => {
        if (!selectedSections.has(section.id)) return;
        const subjects: ExamSubject[] = [];
        const usedDatesInSection = new Set<string>();
        section.subjects.forEach(sub => {
          const schedule = examSchedule.get(`${section.id}-${sub.subjectId}`);
          if (schedule?.selected && schedule.examDate) {
            if (schedule.examDate < startDate || schedule.examDate > endDate) {
              setError(`Subject "${sub.subjectName}" exam date must be between exam start and end date`);
              throw new Error('invalid_date');
            }
            if (usedDatesInSection.has(schedule.examDate)) {
              throw new Error('invalid_date');
            }
            usedDatesInSection.add(schedule.examDate);
            subjects.push({ subjectId: schedule.subjectId, examDate: new Date(schedule.examDate).toISOString(), startTime: schedule.startTime, endTime: schedule.endTime });
          }
        });
        if (subjects.length > 0) sectionsData.push({ sectionId: section.id, subjects });
      });
      if (sectionsData.length > 0) classesData.push({ classId, sections: sectionsData });
    });
    } catch (validationErr: any) {
      if (validationErr.message === 'invalid_date') return;
      throw validationErr;
    }

    if (classesData.length === 0) return setError('Please schedule at least one subject');

    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { name: examName, examTypeId: selectedExamTypeId, schoolId, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), classes: classesData };
      const res = await fetch(`${API_BASE_URL}/api/Exam/create-schedule`, {
        method: 'POST',
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (res.ok && result.success) { handleClear(); onSuccess(); onClose(); }
      else setError(result.message || 'Failed to create exam schedule');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleClear = () => {
    setExamName(''); setStartDate(''); setEndDate('');
    setSelectedExamTypeId(null);
    setSelectedClasses(new Set()); setSelectedSections(new Set());
    setExamSchedule(new Map()); setError('');
    setDateErrors(new Map());
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Exam" submitLabel={loading ? 'Creating...' : 'Create Schedule'} onCancel={handleClear} formId="add-exam-form" size="large">
      {error && <div className="error-message">{error}</div>}
      <form id="add-exam-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Exam Name *</label>
            <input type="text" value={examName} onChange={e => setExamName(e.target.value)} placeholder="Enter exam name" required />
          </div>
          <div className="form-group">
            <label>Exam Type *</label>
            <select value={selectedExamTypeId || ''} onChange={e => setSelectedExamTypeId(Number(e.target.value))} required>
              <option value="">Select Exam Type</option>
              {examTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>End Date *</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} required />
          </div>
        </div>

        {selectedExamTypeId && (
          <div className="exam-schedule-content">
            <h3>Select Classes and Sections</h3>
            {classes.map(cls => (
              <div key={cls.id} style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                <label className="checkbox-item" style={{ fontSize: '16px', fontWeight: '600' }}>
                  <input type="checkbox" checked={selectedClasses.has(cls.id)} onChange={() => handleClassToggle(cls.id)} style={{ marginRight: '8px' }} />
                  {cls.className}
                </label>

                {selectedClasses.has(cls.id) && cls.sections.length > 0 && (
                  <div style={{ marginLeft: '24px', marginTop: '12px' }}>
                    <h4 style={{ marginBottom: '8px', color: '#6b7280' }}>Sections:</h4>
                    {cls.sections.map(section => (
                      <div key={section.id} style={{ marginBottom: '16px' }}>
                        <label className="checkbox-item">
                          <input type="checkbox" checked={selectedSections.has(section.id)} onChange={() => handleSectionToggle(section.id)} style={{ marginRight: '8px' }} />
                          {section.sectionName}
                        </label>

                        {selectedSections.has(section.id) && section.subjects.length > 0 && (
                          <div style={{ marginLeft: '24px', marginTop: '12px' }}>
                            <h5 style={{ marginBottom: '8px', color: '#6b7280' }}>Schedule Subjects:</h5>
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
                                {section.subjects.map(sub => {
                                  const schedule = examSchedule.get(`${section.id}-${sub.subjectId}`);
                                  return (
                                    <tr key={sub.subjectId}>
                                      <td style={{ padding: '8px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                                        <input type="checkbox" checked={schedule?.selected || false} onChange={e => handleSubjectSchedule(section.id, sub.subjectId, 'selected', e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                      </td>
                                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>{sub.subjectName}</td>
                                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                                        {(() => {
                                          const key = `${section.id}-${sub.subjectId}`;
                                          const usedDates = getUsedDates(section.id, sub.subjectId);
                                          const dateError = dateErrors.get(key);
                                          return (
                                            <>
                                              <input type="date" value={schedule?.examDate || ''}
                                                onChange={e => {
                                                  const newErrors = new Map(dateErrors);
                                                  if (usedDates.has(e.target.value)) {
                                                    newErrors.set(key, 'Date already used by another subject');
                                                    setDateErrors(newErrors);
                                                    return;
                                                  }
                                                  newErrors.delete(key);
                                                  setDateErrors(newErrors);
                                                  handleSubjectSchedule(section.id, sub.subjectId, 'examDate', e.target.value);
                                                }}
                                                min={startDate} max={endDate} disabled={!schedule?.selected}
                                                style={{ width: '100%', padding: '4px', border: `1px solid ${dateError ? '#ef4444' : '#d1d5db'}`, borderRadius: '4px', backgroundColor: schedule?.selected ? 'white' : '#f3f4f6', cursor: schedule?.selected ? 'text' : 'not-allowed' }} />
                                              {dateError && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '2px' }}>{dateError}</div>}
                                            </>
                                          );
                                        })()}
                                      </td>
                                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                                        <input type="time" value={(schedule?.startTime || '09:00:00').substring(0, 5)} onChange={e => handleSubjectSchedule(section.id, sub.subjectId, 'startTime', e.target.value + ':00')} disabled={!schedule?.selected}
                                          style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: schedule?.selected ? 'white' : '#f3f4f6', cursor: schedule?.selected ? 'text' : 'not-allowed' }} />
                                      </td>
                                      <td style={{ padding: '8px', border: '1px solid #e5e7eb' }}>
                                        <input type="time" value={(schedule?.endTime || '12:00:00').substring(0, 5)} onChange={e => handleSubjectSchedule(section.id, sub.subjectId, 'endTime', e.target.value + ':00')} disabled={!schedule?.selected}
                                          style={{ width: '100%', padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: schedule?.selected ? 'white' : '#f3f4f6', cursor: schedule?.selected ? 'text' : 'not-allowed' }} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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

export default AddExam;
