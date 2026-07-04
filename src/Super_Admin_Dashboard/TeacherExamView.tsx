import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getTeacherSchoolId } from '../utils/auth';
import './StaffList.css';

type TeacherExamView = 'timetable' | 'marks';

interface Exam { id: number; name: string; startDate: string; endDate: string; isPublished: boolean; }
interface SectionItem { id: number; name: string; classId: number; }
interface SubjectItem { subjectId: number; subjectName: string; }
interface MarksEntry { studentId: number; studentName: string; rollNumber?: string; obtainedMarks: number | ''; remarks: string; }

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0',
  fontSize: '14px', minWidth: '160px', background: 'white',
};

const TeacherExamView: React.FC<{ selectedSchoolId: number | null }> = ({ selectedSchoolId }) => {
  const [view, setView] = useState<TeacherExamView>('timetable');
  const [schoolId, setSchoolId] = useState<number | null>(null);

  // Shared
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  // Timetable
  const [timetableExamId, setTimetableExamId] = useState('');
  const [timetable, setTimetable] = useState<any[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // Marks Entry
  const [marksExamId, setMarksExamId] = useState('');
  const [marksClassId, setMarksClassId] = useState('');
  const [marksSectionId, setMarksSectionId] = useState('');
  const [marksSubjectId, setMarksSubjectId] = useState('');
  const [marksSheet, setMarksSheet] = useState<MarksEntry[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [lockingMarks, setLockingMarks] = useState(false);
  const [marksMsg, setMarksMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const token = () => localStorage.getItem('token');
  const headers = () => ({ 'accept': '*/*', 'Authorization': `Bearer ${token()}` });
  const jsonHeaders = () => ({ ...headers(), 'Content-Type': 'application/json' });
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  useEffect(() => {
    setSchoolId(getTeacherSchoolId() || selectedSchoolId);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (schoolId) { fetchExams(); fetchEnrollmentInfo(); }
  }, [schoolId]); // eslint-disable-line

  useEffect(() => {
    if (marksSectionId) fetchSectionSubjects(marksSectionId);
    else setSubjects([]);
  }, [marksSectionId]); // eslint-disable-line

  const fetchExams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Exam/GetExams?schoolId=${schoolId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        const all: Exam[] = data?.data ?? (Array.isArray(data) ? data : []);
        setExams(all.filter(e => e.isPublished));
      }
    } catch { }
  };

  const fetchEnrollmentInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${schoolId}`, { headers: headers() });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setClasses(result.data.classes || []);
          setSections(result.data.sections || []);
        }
      }
    } catch { }
  };

  const fetchSectionSubjects = async (sectionId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Class/section-subjects/${sectionId}`, { headers: headers() });
      if (res.ok) {
        const result = await res.json();
        setSubjects(result.success ? result.data : []);
      }
    } catch { }
  };

  const fetchTimetable = async () => {
    if (!timetableExamId) return;
    try {
      setTimetableLoading(true); setTimetable([]);
      const res = await fetch(`${API_BASE_URL}/api/Exam/GetExamSubjects?examId=${timetableExamId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setTimetable(data?.data ?? []);
      }
    } catch { } finally { setTimetableLoading(false); }
  };

  const fetchMarksSheet = async () => {
    if (!marksExamId || !marksSectionId || !marksSubjectId) return;
    try {
      setMarksLoading(true); setMarksSheet([]); setMarksMsg(null);
      const res = await fetch(
        `${API_BASE_URL}/api/Exam/GetMarksEntrySheet?schoolId=${schoolId}&examId=${marksExamId}&sectionId=${marksSectionId}&subjectId=${marksSubjectId}`,
        { headers: headers() }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setMarksSheet((data.data || []).map((s: any) => ({ ...s, obtainedMarks: s.obtainedMarks ?? '', remarks: s.remarks ?? '' })));
      } else {
        setMarksMsg({ text: data.message || 'Failed to load marks sheet.', ok: false });
      }
    } catch { } finally { setMarksLoading(false); }
  };

  const handleSaveMarks = async () => {
    try {
      setSavingMarks(true); setMarksMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/Exam/SaveMarks`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({
          schoolId, examId: Number(marksExamId),
          sectionId: Number(marksSectionId), subjectId: Number(marksSubjectId),
          marks: marksSheet.map(s => ({ studentId: s.studentId, obtainedMarks: Number(s.obtainedMarks) || 0, remarks: s.remarks })),
        }),
      });
      const result = await res.json();
      setMarksMsg({ text: result.message || (res.ok ? 'Marks saved successfully!' : 'Failed to save.'), ok: res.ok && result.success });
    } catch { setMarksMsg({ text: 'Error saving marks.', ok: false }); }
    finally { setSavingMarks(false); }
  };

  const handleLockMarks = async () => {
    if (!window.confirm('Lock marks for this exam? This cannot be undone.')) return;
    try {
      setLockingMarks(true);
      const res = await fetch(`${API_BASE_URL}/api/Exam/LockMarks?examId=${marksExamId}&schoolId=${schoolId}`, { method: 'PUT', headers: headers() });
      const result = await res.json();
      setMarksMsg({ text: result.message || (res.ok ? 'Marks locked!' : 'Failed.'), ok: res.ok && result.success });
    } catch { setMarksMsg({ text: 'Error locking marks.', ok: false }); }
    finally { setLockingMarks(false); }
  };

  const filteredSections = sections.filter(s => s.classId === Number(marksClassId));
  const selectedExam = exams.find(e => String(e.id) === timetableExamId);

  const msgBanner = (msg: { text: string; ok: boolean } | null) => msg && (
    <div style={{ marginBottom: '12px', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
      background: msg.ok ? '#c6f6d5' : '#fed7d7', color: msg.ok ? '#22543d' : '#742a2a' }}>
      {msg.ok ? '✅' : '⚠️'} {msg.text}
    </div>
  );

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Exams</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['timetable', 'marks'] as TeacherExamView[]).map(v => (
            <button key={v} className={`btn ${view === v ? 'btn-primary' : ''}`}
              style={{ border: view !== v ? '1px solid #e2e8f0' : undefined }}
              onClick={() => setView(v)}>
              {v === 'timetable' ? 'Exam Timetable' : 'Marks Entry'}
            </button>
          ))}
        </div>
      </div>

      {/* ── TIMETABLE ── */}
      {view === 'timetable' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select style={selectStyle} value={timetableExamId} onChange={e => { setTimetableExamId(e.target.value); setTimetable([]); }}>
              <option value="">Select Exam</option>
              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={fetchTimetable} disabled={!timetableExamId || timetableLoading}>
              {timetableLoading ? 'Loading...' : 'View Timetable'}
            </button>
          </div>

          {selectedExam && (
            <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', background: '#f7fafc', padding: '14px 16px', borderRadius: '10px', fontSize: '14px', color: '#4a5568' }}>
              <div><strong>Exam:</strong> {selectedExam.name}</div>
              <div><strong>Start:</strong> {fmt(selectedExam.startDate)}</div>
              <div><strong>End:</strong> {fmt(selectedExam.endDate)}</div>
            </div>
          )}

          {timetable.length > 0 ? (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr><th>Subject</th><th>Class</th><th>Section</th><th>Exam Date</th><th>Start Time</th><th>End Time</th><th>Max Marks</th><th>Pass Marks</th></tr>
                </thead>
                <tbody>
                  {timetable.map((t: any, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{t.subjectName}</td>
                      <td>{t.className}</td>
                      <td>{t.sectionName}</td>
                      <td>{t.examDate ? fmt(t.examDate) : '-'}</td>
                      <td>{t.startTime ? t.startTime.substring(0, 5) : '-'}</td>
                      <td>{t.endTime ? t.endTime.substring(0, 5) : '-'}</td>
                      <td>{t.maxMarks ?? '-'}</td>
                      <td>{t.passingMarks ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !timetableLoading && (
              <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>
                {exams.length === 0 ? 'No published exams available.' : 'Select an exam and click "View Timetable".'}
              </p>
            )
          )}
        </>
      )}

      {/* ── MARKS ENTRY ── */}
      {view === 'marks' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select style={selectStyle} value={marksExamId} onChange={e => { setMarksExamId(e.target.value); setMarksSheet([]); setMarksMsg(null); }}>
              <option value="">Select Exam</option>
              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
            <select style={selectStyle} value={marksClassId} onChange={e => { setMarksClassId(e.target.value); setMarksSectionId(''); setMarksSubjectId(''); setMarksSheet([]); }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={selectStyle} value={marksSectionId} onChange={e => { setMarksSectionId(e.target.value); setMarksSubjectId(''); setMarksSheet([]); }} disabled={!marksClassId}>
              <option value="">Select Section</option>
              {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select style={selectStyle} value={marksSubjectId} onChange={e => { setMarksSubjectId(e.target.value); setMarksSheet([]); }} disabled={!marksSectionId}>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
            </select>
            <button className="btn btn-primary" onClick={fetchMarksSheet}
              disabled={!marksExamId || !marksSectionId || !marksSubjectId || marksLoading}>
              {marksLoading ? 'Loading...' : 'Load Sheet'}
            </button>
          </div>

          {msgBanner(marksMsg)}

          {marksSheet.length > 0 && (
            <>
              <div className="staff-table-wrapper" style={{ marginBottom: '16px' }}>
                <table className="staff-table">
                  <thead>
                    <tr><th>#</th><th>Roll No.</th><th>Student Name</th><th>Marks Obtained</th><th>Remarks</th></tr>
                  </thead>
                  <tbody>
                    {marksSheet.map((s, i) => (
                      <tr key={s.studentId}>
                        <td>{i + 1}</td>
                        <td>{s.rollNumber || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{s.studentName}</td>
                        <td>
                          <input type="number" min="0" value={s.obtainedMarks}
                            onChange={e => setMarksSheet(prev => prev.map((m, idx) =>
                              idx === i ? { ...m, obtainedMarks: e.target.value === '' ? '' : Number(e.target.value) } : m
                            ))}
                            style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                        </td>
                        <td>
                          <input type="text" value={s.remarks}
                            onChange={e => setMarksSheet(prev => prev.map((m, idx) =>
                              idx === i ? { ...m, remarks: e.target.value } : m
                            ))}
                            style={{ width: '150px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                            placeholder="Optional" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={handleSaveMarks} disabled={savingMarks}>
                  {savingMarks ? 'Saving...' : 'Save Marks'}
                </button>
                <button className="btn" style={{ border: '1px solid #e2e8f0', color: '#742a2a', background: '#fff5f5' }}
                  onClick={handleLockMarks} disabled={lockingMarks}>
                  {lockingMarks ? 'Locking...' : '🔒 Lock Marks'}
                </button>
              </div>
            </>
          )}

          {!marksLoading && marksSheet.length === 0 && !marksMsg && (
            <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>
              Select exam, class, section and subject, then click "Load Sheet".
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherExamView;
