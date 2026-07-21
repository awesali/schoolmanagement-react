import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './StaffList.css';

interface ClassItem { id: number; name: string; }
interface SectionItem { id: number; name: string; classId: number; }
interface Exam { id: number; name: string; }
interface ScheduleRow { subjectId: number; subjectName: string; examDate: string; startTime: string; endTime: string; }

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0',
  fontSize: '14px', minWidth: '160px', background: 'white',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0',
  fontSize: '14px', background: 'white',
};

interface CreateExamScheduleProps {
  selectedSchoolId: number | null;
  exams: Exam[];
}

const CreateExamSchedule: React.FC<CreateExamScheduleProps> = ({ selectedSchoolId, exams }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);

  const [examId, setExamId] = useState('');
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const token = () => localStorage.getItem('token');
  const headers = () => ({ 'accept': '*/*', 'Authorization': `Bearer ${token()}` });
  const jsonHeaders = () => ({ ...headers(), 'Content-Type': 'application/json' });

  useEffect(() => {
    if (selectedSchoolId) fetchEnrollmentInfo();
  }, [selectedSchoolId]); // eslint-disable-line

  useEffect(() => {
    if (examId && sectionId) fetchExamSubjectsForSection();
    else setRows([]);
  }, [examId, sectionId]); // eslint-disable-line

  const fetchEnrollmentInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${selectedSchoolId}`, { headers: headers() });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setClasses(result.data.classes || []);
          setSections(result.data.sections || []);
        }
      }
    } catch { }
  };

  const fetchExamSubjectsForSection = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Exam/GetExamSubjects?examId=${examId}`, { headers: headers() });
      if (res.ok) {
        const result = await res.json();
        const filtered = (result?.data ?? []).filter((s: any) => s.sectionId === Number(sectionId));
        console.log('ExamSubjects response:', filtered);
        setRows(filtered.map((s: any) => ({
          subjectId: Number(s.subjectId || s.subject_id || s.id),
          subjectName: s.subjectName || s.subject_name || s.name,
          examDate: s.examDate ? String(s.examDate).substring(0, 10) : '',
          startTime: s.startTime ? String(s.startTime).substring(0, 5) : '09:00',
          endTime: s.endTime ? String(s.endTime).substring(0, 5) : '12:00',
        })));
      }
    } catch { }
  };

  const filteredSections = sections.filter(s => s.classId === Number(classId));

  const updateRow = (i: number, field: keyof ScheduleRow, value: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    if (!examId || !classId || !sectionId) {
      setMsg({ text: 'Please select Exam, Class and Section.', ok: false }); return;
    }
    const incomplete = rows.find(r => !r.examDate);
    if (incomplete) {
      setMsg({ text: `Please set exam date for "${incomplete.subjectName}".`, ok: false }); return;
    }

    try {
      setSaving(true); setMsg(null);
      const results = await Promise.all(rows.map(r =>
        fetch(`${API_BASE_URL}/api/Exam/CreateExamSchedule`, {
          method: 'POST', headers: jsonHeaders(),
          body: JSON.stringify({
            examId: Number(examId),
            schoolId: selectedSchoolId,
            classId: Number(classId),
            sectionId: Number(sectionId),
            subjectId: r.subjectId,
            examDate: new Date(r.examDate).toISOString(),
            startTime: r.startTime + ':00',
            endTime: r.endTime + ':00',
          }),
        }).then(res => res.json())
      ));

      const failed = results.filter(r => !r.success);
      if (failed.length === 0) {
        setMsg({ text: `${rows.length} schedule(s) created successfully!`, ok: true });
      } else {
        setMsg({ text: failed[0].message || 'Some schedules failed.', ok: false });
      }
    } catch { setMsg({ text: 'Error creating schedule.', ok: false }); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setExamId(''); setClassId(''); setSectionId(''); setRows([]); setMsg(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <select style={selectStyle} value={examId} onChange={e => { setExamId(e.target.value); setMsg(null); }}>
          <option value="">Select Exam</option>
          {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
        <select style={selectStyle} value={classId} onChange={e => { setClassId(e.target.value); setSectionId(''); setRows([]); }}>
          <option value="">Select Class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={selectStyle} value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={!classId}>
          <option value="">Select Section</option>
          {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {msg && (
        <div style={{ marginBottom: '16px', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
          background: msg.ok ? '#c6f6d5' : '#fed7d7', color: msg.ok ? '#22543d' : '#742a2a' }}>
          {msg.ok ? '✅' : '⚠️'} {msg.text}
        </div>
      )}

      {examId && classId && sectionId && rows.length === 0 && (
        <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>
          No subjects configured for this exam and section. Add subjects under "Exam Subjects" first.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="staff-table-wrapper" style={{ marginBottom: '16px' }}>
            <table className="staff-table">
              <thead>
                <tr><th>#</th><th>Subject</th><th>Exam Date</th><th>Start Time</th><th>End Time</th></tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.subjectId}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{row.subjectName}</td>
                    <td>
                      <input type="date" value={row.examDate}
                        onChange={e => updateRow(i, 'examDate', e.target.value)}
                        style={inputStyle} />
                    </td>
                    <td>
                      <input type="time" value={row.startTime}
                        onChange={e => updateRow(i, 'startTime', e.target.value)}
                        style={inputStyle} />
                    </td>
                    <td>
                      <input type="time" value={row.endTime}
                        onChange={e => updateRow(i, 'endTime', e.target.value)}
                        style={inputStyle} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
            <button className="btn" style={{ border: '1px solid #e2e8f0' }} onClick={handleReset}>Reset</button>
          </div>
        </>
      )}

      {(!examId || !classId || !sectionId) && (
        <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>
          Select Exam, Class and Section to create a schedule.
        </p>
      )}
    </div>
  );
};

export default CreateExamSchedule;
