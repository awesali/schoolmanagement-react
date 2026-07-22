import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import CreateExamSchedule from './CreateExamSchedule';
import './StaffList.css';
import './ManagementTabs.css';

type ExamView = 'examTypes' | 'exams' | 'subjects' | 'schedule' | 'timetable' | 'results';

interface ExamType { id: number; name: string; isActive: boolean; schoolId: number; }
interface Exam {
  id: number; name: string; examTypeId: number; schoolId: number;
  startDate: string; endDate: string; isPublished: boolean;
  resultPublished: boolean; createdDate: string; isActive: boolean;
}
interface ExamSubject {
  id: number; examId: number; subjectId: number; subjectName: string;
  classId: number; className: string; sectionId: number; sectionName: string;
  maxMarks: number; passingMarks: number;
}
interface ClassItem { id: number; name: string; }
interface SectionItem { id: number; name: string; classId: number; }
interface SessionItem { id: number; yearStart: string; yearEnd: string; }
interface SubjectItem { subjectId: number; subjectName: string; }
interface ResultItem {
  studentId: number; studentName: string; examName: string; totalMarks: number;
  obtainedMarks: number; percentage: number; grade: string; resultStatus: string; rank: number;
  subjects: { subjectId: number; subjectName: string; maxMarks: number; passingMarks: number; obtainedMarks: number; status: string; remarks: string; }[];
}

interface StudentResultDetail {
  studentId: number; studentName: string; examName: string;
  totalMarks: number; obtainedMarks: number; percentage: number;
  grade: string; resultStatus: string;
  subjects: { subjectId: number; subjectName: string; maxMarks: number; passingMarks: number; obtainedMarks: number; status: string; remarks: string; }[];
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0',
  fontSize: '14px', minWidth: '160px', background: 'white',
};

const badgeStyle = (published: boolean): React.CSSProperties => ({
  display: 'inline-block', padding: '3px 10px', borderRadius: '12px',
  fontSize: '12px', fontWeight: 600,
  background: published ? '#c6f6d5' : '#fef3c7',
  color: published ? '#22543d' : '#78350f',
});

const TAB_LABELS: Record<ExamView, string> = {
  examTypes: 'Exam Types', exams: 'Exams', subjects: 'Exam Subjects',
  schedule: 'Exam Schedule', timetable: 'Timetable', results: 'Results',
};

const ExamManagement: React.FC<{ selectedSchoolId: number | null }> = ({ selectedSchoolId }) => {
  const [view, setView] = useState<ExamView>('examTypes');

  // Exam Types
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [examTypesLoading, setExamTypesLoading] = useState(false);
  const [showAddExamType, setShowAddExamType] = useState(false);
  const [newExamTypeName, setNewExamTypeName] = useState('');
  const [savingExamType, setSavingExamType] = useState(false);
  const [examTypeMsg, setExamTypeMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Exams
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [examForm, setExamForm] = useState({ name: '', examTypeId: '', academicSessionId: '', startDate: '', endDate: '' });
  const [savingExam, setSavingExam] = useState(false);
  const [examMsg, setExamMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Exam Subjects
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [subjectForm, setSubjectForm] = useState({ classId: '', sectionId: '', subjectId: '', maxMarks: '', passingMarks: '' });
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectMsg, setSubjectMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Timetable
  const [timetableExamId, setTimetableExamId] = useState('');
  const [timetable, setTimetable] = useState<any[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // Results
  const [resultsExamId, setResultsExamId] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [generatingResults, setGeneratingResults] = useState(false);
  const [publishingResults, setPublishingResults] = useState(false);
  const [resultsMsg, setResultsMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentResultDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = () => localStorage.getItem('token');
  const headers = () => ({ 'accept': '*/*', 'Authorization': `Bearer ${token()}` });
  const jsonHeaders = () => ({ ...headers(), 'Content-Type': 'application/json' });
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  useEffect(() => {
    if (selectedSchoolId) {
      fetchExamTypes();
      fetchExams();
      fetchEnrollmentInfo();
    }
  }, [selectedSchoolId]); // eslint-disable-line

  // ── Exam Types ──
  const fetchExamTypes = async () => {
    try {
      setExamTypesLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/Exam/GetExamTypes?schoolId=${selectedSchoolId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setExamTypes(data?.data ?? (Array.isArray(data) ? data : []));
      }
    } catch { } finally { setExamTypesLoading(false); }
  };

  const handleAddExamType = async () => {
    if (!newExamTypeName.trim()) { setExamTypeMsg({ text: 'Name is required.', ok: false }); return; }
    try {
      setSavingExamType(true); setExamTypeMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/Exam/CreateExamType`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ name: newExamTypeName.trim(), schoolId: selectedSchoolId }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setExamTypeMsg({ text: result.message || 'Exam type created!', ok: true });
        setNewExamTypeName(''); setShowAddExamType(false); fetchExamTypes();
      } else { setExamTypeMsg({ text: result.message || 'Failed.', ok: false }); }
    } catch { setExamTypeMsg({ text: 'Error creating exam type.', ok: false }); }
    finally { setSavingExamType(false); }
  };

  // ── Exams ──
  const fetchExams = async () => {
    try {
      setExamsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/Exam/GetExams?schoolId=${selectedSchoolId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setExams(data?.data ?? (Array.isArray(data) ? data : []));
      }
    } catch { } finally { setExamsLoading(false); }
  };

  const handleAddExam = async () => {
    const { name, examTypeId, academicSessionId, startDate, endDate } = examForm;
    if (!name.trim() || !examTypeId || !academicSessionId || !startDate || !endDate) {
      setExamMsg({ text: 'All fields, including academic session, are required.', ok: false }); return;
    }
    try {
      setSavingExam(true); setExamMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/Exam/CreateExam`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ name: name.trim(), examTypeId: Number(examTypeId), academicSessionId: Number(academicSessionId), schoolId: selectedSchoolId, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString() }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setExamMsg({ text: result.message || 'Exam created!', ok: true });
        setExamForm({ name: '', examTypeId: '', academicSessionId: '', startDate: '', endDate: '' });
        setShowAddExam(false); fetchExams();
      } else { setExamMsg({ text: result.message || 'Failed.', ok: false }); }
    } catch { setExamMsg({ text: 'Error creating exam.', ok: false }); }
    finally { setSavingExam(false); }
  };

  const handlePublishExam = async (examId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Exam/PublishExam?examId=${examId}`, { method: 'PUT', headers: headers() });
      if (res.ok) fetchExams();
    } catch { }
  };

  // ── Exam Subjects ──
  const fetchEnrollmentInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${selectedSchoolId}`, { headers: headers() });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setClasses(result.data.classes || []);
          setSections(result.data.sections || []);
          setSessions(result.data.sessions || []);
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

  const fetchExamSubjects = async (examId: string) => {
    if (!examId) return;
    try {
      setSubjectsLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/Exam/GetExamSubjects?examId=${examId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setExamSubjects(data?.data ?? (Array.isArray(data) ? data : []));
      }
    } catch { } finally { setSubjectsLoading(false); }
  };

  const handleAddExamSubject = async () => {
    const { classId, sectionId, subjectId, maxMarks, passingMarks } = subjectForm;
    if (!selectedExamId || !classId || !sectionId || !subjectId || !maxMarks || !passingMarks) {
      setSubjectMsg({ text: 'All fields are required.', ok: false }); return;
    }
    try {
      setSavingSubject(true); setSubjectMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/Exam/AddExamSubject`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ schoolId: selectedSchoolId, examId: Number(selectedExamId), classId: Number(classId), sectionId: Number(sectionId), subjectId: Number(subjectId), maxMarks: Number(maxMarks), passingMarks: Number(passingMarks) }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSubjectMsg({ text: result.message || 'Subject added!', ok: true });
        setSubjectForm({ classId: '', sectionId: '', subjectId: '', maxMarks: '', passingMarks: '' });
        setShowAddSubject(false); fetchExamSubjects(selectedExamId);
      } else { setSubjectMsg({ text: result.message || 'Failed.', ok: false }); }
    } catch { setSubjectMsg({ text: 'Error adding subject.', ok: false }); }
    finally { setSavingSubject(false); }
  };

  const fetchTimetable = async (eid: string) => {
    if (!eid) return;
    try {
      setTimetableLoading(true); setTimetable([]);
      const res = await fetch(`${API_BASE_URL}/api/Exam/GetExamSubjects?examId=${eid}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setTimetable(data?.data ?? []);
      }
    } catch { } finally { setTimetableLoading(false); }
  };

  // ── Results ──
  const fetchResults = async () => {
    if (!resultsExamId) return;
    try {
      setResultsLoading(true); setResults([]);
      const res = await fetch(`${API_BASE_URL}/api/Exam/GetResults?examId=${resultsExamId}&schoolId=${selectedSchoolId}`, { headers: headers() });
      const data = await res.json();
      if (res.ok) {
        setResults(data?.data ?? []);
      }
    } catch { } finally { setResultsLoading(false); }
  };

  const handleGenerateResults = async () => {
    try {
      setGeneratingResults(true); setResultsMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/Exam/GenerateResults`, {
        method: 'POST', headers: jsonHeaders(),
        body: JSON.stringify({ schoolId: selectedSchoolId, examId: Number(resultsExamId) }),
      });
      const result = await res.json();
      setResultsMsg({ text: result.message || (res.ok ? 'Results generated!' : 'Failed.'), ok: res.ok && result.success });
      if (res.ok) fetchResults();
    } catch { setResultsMsg({ text: 'Error generating results.', ok: false }); }
    finally { setGeneratingResults(false); }
  };

  const handlePublishResults = async () => {
    try {
      setPublishingResults(true); setResultsMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/Exam/publish?examId=${resultsExamId}&schoolId=${selectedSchoolId}`, { method: 'PUT', headers: headers() });
      const result = await res.json();
      setResultsMsg({ text: result.message || (res.ok ? 'Results published!' : 'Failed.'), ok: res.ok && result.success });
    } catch { setResultsMsg({ text: 'Error publishing results.', ok: false }); }
    finally { setPublishingResults(false); }
  };

  const fetchStudentDetail = async (studentId: number) => {
    if (!studentId) return;
    try {
      setDetailLoading(true); setStudentDetail(null);
      const res = await fetch(`${API_BASE_URL}/api/Exam/student-result-detail?studentId=${studentId}&examId=${resultsExamId}&schoolId=${selectedSchoolId}`, { headers: headers() });
      const data = await res.json();
      if (res.ok && data.success) setStudentDetail(data.data);
    } catch { } finally { setDetailLoading(false); }
  };

  const filteredSections = sections.filter(s => s.classId === Number(subjectForm.classId));
  const examTypeName = (id: number) => examTypes.find(t => t.id === id)?.name || '-';

  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  const msgBanner = (msg: { text: string; ok: boolean } | null) => msg && (
    <div style={{ marginBottom: '12px', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
      background: msg.ok ? '#c6f6d5' : '#fed7d7', color: msg.ok ? '#22543d' : '#742a2a' }}>
      {msg.ok ? '✅' : '⚠️'} {msg.text}
    </div>
  );

  return (
    <div className="staff-list-container">
      {/* Header + Tabs */}
      <div className="staff-list-header">
        <h2>Exam Management</h2>
      </div>

      <div className="management-tabs" role="tablist" aria-label="Exam management sections">
        {(Object.keys(TAB_LABELS) as ExamView[]).map(v => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={`management-tab ${view === v ? 'active' : ''}`}
            onClick={() => setView(v)}
          >
            {TAB_LABELS[v]}
          </button>
        ))}
      </div>

      {/* ── EXAM TYPES ── */}
      {view === 'examTypes' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={() => { setShowAddExamType(true); setExamTypeMsg(null); }}>+ Add Exam Type</button>
          </div>
          {msgBanner(examTypeMsg)}
          {examTypesLoading ? <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Loading...</div>
            : examTypes.length === 0 ? <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>No exam types yet. Add one to get started.</p>
            : (
              <div className="staff-table-wrapper">
                <table className="staff-table">
                  <thead><tr><th>#</th><th>Name</th><th>Status</th></tr></thead>
                  <tbody>
                    {examTypes.map((et, i) => (
                      <tr key={et.id}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{et.name}</td>
                        <td><span style={badgeStyle(et.isActive)}>{et.isActive ? 'Active' : 'Inactive'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {showAddExamType && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                <h3 style={{ marginBottom: '20px', color: '#1e2a3a' }}>Add Exam Type</h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Name *</label>
                  <input value={newExamTypeName} onChange={e => setNewExamTypeName(e.target.value)}
                    placeholder="e.g. Quarterly" style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>
                {examTypeMsg && !examTypeMsg.ok && (
                  <div style={{ marginBottom: '12px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', background: '#fed7d7', color: '#742a2a', fontWeight: 600 }}>⚠️ {examTypeMsg.text}</div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddExamType} disabled={savingExamType}>{savingExamType ? 'Saving...' : 'Save'}</button>
                  <button className="btn" style={{ flex: 1, border: '1px solid #e2e8f0' }} onClick={() => { setShowAddExamType(false); setNewExamTypeName(''); setExamTypeMsg(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── EXAMS ── */}
      {view === 'exams' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={() => { setShowAddExam(true); setExamMsg(null); }}>+ Create Exam</button>
          </div>
          {msgBanner(examMsg)}
          {examsLoading ? <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Loading...</div>
            : exams.length === 0 ? <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>No exams yet.</p>
            : (
              <div className="staff-table-wrapper">
                <table className="staff-table">
                  <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Start</th><th>End</th><th>Published</th><th>Result</th><th>Action</th></tr></thead>
                  <tbody>
                    {exams.map((ex, i) => (
                      <tr key={ex.id}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{ex.name}</td>
                        <td>{examTypeName(ex.examTypeId)}</td>
                        <td>{fmt(ex.startDate)}</td>
                        <td>{fmt(ex.endDate)}</td>
                        <td><span style={badgeStyle(ex.isPublished)}>{ex.isPublished ? 'Published' : 'Draft'}</span></td>
                        <td><span style={badgeStyle(ex.resultPublished)}>{ex.resultPublished ? 'Published' : 'Pending'}</span></td>
                        <td>
                          {!ex.isPublished && (
                            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handlePublishExam(ex.id)}>Publish</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {showAddExam && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                <h3 style={{ marginBottom: '20px', color: '#1e2a3a' }}>Create Exam</h3>
                {[
                  { label: 'Exam Name *', key: 'name', type: 'text', placeholder: 'e.g. Quarterly Exam 2026' },
                  { label: 'Start Date *', key: 'startDate', type: 'date' },
                  { label: 'End Date *', key: 'endDate', type: 'date' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>{label}</label>
                    <input type={type} value={(examForm as any)[key]} placeholder={placeholder}
                      onChange={e => setExamForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Exam Type *</label>
                  <select value={examForm.examTypeId} onChange={e => setExamForm(f => ({ ...f, examTypeId: e.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                    <option value="">Select Exam Type</option>
                    {examTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Academic Session *</label>
                  <select value={examForm.academicSessionId} onChange={e => setExamForm(f => ({ ...f, academicSessionId: e.target.value }))} style={{ ...selectStyle, width: '100%' }}>
                    <option value="">Select Academic Session</option>
                    {sessions.map(s => <option key={s.id} value={s.id}>{new Date(s.yearStart).getFullYear()}-{new Date(s.yearEnd).getFullYear()}</option>)}
                  </select>
                </div>
                {examMsg && !examMsg.ok && (
                  <div style={{ marginBottom: '12px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', background: '#fed7d7', color: '#742a2a', fontWeight: 600 }}>⚠️ {examMsg.text}</div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddExam} disabled={savingExam}>{savingExam ? 'Creating...' : 'Create'}</button>
                  <button className="btn" style={{ flex: 1, border: '1px solid #e2e8f0' }} onClick={() => { setShowAddExam(false); setExamForm({ name: '', examTypeId: '', academicSessionId: '', startDate: '', endDate: '' }); setExamMsg(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── EXAM SUBJECTS ── */}
      {view === 'subjects' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select style={selectStyle} value={selectedExamId} onChange={e => { setSelectedExamId(e.target.value); fetchExamSubjects(e.target.value); setSubjectMsg(null); }}>
              <option value="">Select Exam</option>
              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
            {selectedExamId && (
              <button className="btn btn-primary" onClick={() => { setShowAddSubject(true); setSubjectMsg(null); }}>+ Add Subject</button>
            )}
          </div>
          {msgBanner(subjectMsg)}
          {subjectsLoading ? <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Loading...</div>
            : examSubjects.length === 0 ? <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>{selectedExamId ? 'No subjects configured for this exam.' : 'Select an exam to view subjects.'}</p>
            : (
              <div className="staff-table-wrapper">
                <table className="staff-table">
                  <thead><tr><th>#</th><th>Subject</th><th>Class</th><th>Section</th><th>Max Marks</th><th>Pass Marks</th></tr></thead>
                  <tbody>
                    {examSubjects.map((s, i) => (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{s.subjectName}</td>
                        <td>{s.className}</td>
                        <td>{s.sectionName}</td>
                        <td>{s.maxMarks}</td>
                        <td>{s.passingMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          {showAddSubject && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                <h3 style={{ marginBottom: '20px', color: '#1e2a3a' }}>Add Exam Subject</h3>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Class *</label>
                  <select value={subjectForm.classId} onChange={e => { setSubjectForm(f => ({ ...f, classId: e.target.value, sectionId: '', subjectId: '' })); setSubjects([]); }} style={{ ...selectStyle, width: '100%' }}>
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Section *</label>
                  <select value={subjectForm.sectionId} onChange={e => { setSubjectForm(f => ({ ...f, sectionId: e.target.value, subjectId: '' })); fetchSectionSubjects(e.target.value); }} style={{ ...selectStyle, width: '100%' }} disabled={!subjectForm.classId}>
                    <option value="">Select Section</option>
                    {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Subject *</label>
                  <select value={subjectForm.subjectId} onChange={e => setSubjectForm(f => ({ ...f, subjectId: e.target.value }))} style={{ ...selectStyle, width: '100%' }} disabled={!subjectForm.sectionId}>
                    <option value="">Select Subject</option>
                    {subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Max Marks *</label>
                    <input type="number" value={subjectForm.maxMarks} onChange={e => setSubjectForm(f => ({ ...f, maxMarks: e.target.value }))} style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} placeholder="100" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Pass Marks *</label>
                    <input type="number" value={subjectForm.passingMarks} onChange={e => setSubjectForm(f => ({ ...f, passingMarks: e.target.value }))} style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} placeholder="35" />
                  </div>
                </div>
                {subjectMsg && !subjectMsg.ok && (
                  <div style={{ marginBottom: '12px', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', background: '#fed7d7', color: '#742a2a', fontWeight: 600 }}>⚠️ {subjectMsg.text}</div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddExamSubject} disabled={savingSubject}>{savingSubject ? 'Saving...' : 'Add Subject'}</button>
                  <button className="btn" style={{ flex: 1, border: '1px solid #e2e8f0' }} onClick={() => { setShowAddSubject(false); setSubjectForm({ classId: '', sectionId: '', subjectId: '', maxMarks: '', passingMarks: '' }); setSubjectMsg(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── EXAM SCHEDULE ── */}
      {view === 'schedule' && (
        <CreateExamSchedule selectedSchoolId={selectedSchoolId} exams={exams} />
      )}

      {/* ── TIMETABLE ── */}
      {view === 'timetable' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select style={selectStyle} value={timetableExamId} onChange={e => { setTimetableExamId(e.target.value); fetchTimetable(e.target.value); }}>
              <option value="">Select Exam</option>
              {exams.filter(ex => ex.isPublished).map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
          </div>

          {timetableLoading && <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Loading...</div>}

          {!timetableLoading && timetableExamId && timetable.length === 0 && (
            <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>No schedule found for this exam.</p>
          )}

          {timetable.length > 0 && (() => {
            const selectedExam = exams.find(e => String(e.id) === timetableExamId);
            // Group by className + sectionName
            const groups: Record<string, any[]> = {};
            timetable.forEach(t => {
              const key = `${t.className} - Section ${t.sectionName}`;
              if (!groups[key]) groups[key] = [];
              groups[key].push(t);
            });
            return (
              <>
                {selectedExam && (
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', background: '#f7fafc', padding: '14px 16px', borderRadius: '10px', fontSize: '14px', color: '#4a5568' }}>
                    <div><strong>Exam:</strong> {selectedExam.name}</div>
                    <div><strong>Start:</strong> {fmt(selectedExam.startDate)}</div>
                    <div><strong>End:</strong> {fmt(selectedExam.endDate)}</div>
                    <div><span style={badgeStyle(selectedExam.isPublished)}>{selectedExam.isPublished ? 'Published' : 'Draft'}</span></div>
                  </div>
                )}
                {Object.entries(groups).map(([groupKey, items]) => (
                  <div key={groupKey} style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e2a3a', marginBottom: '10px' }}>{groupKey}</h3>
                    <div className="staff-table-wrapper">
                      <table className="staff-table">
                        <thead>
                          <tr><th>#</th><th>Subject</th><th>Exam Date</th><th>Start Time</th><th>End Time</th><th>Max Marks</th><th>Pass Marks</th></tr>
                        </thead>
                        <tbody>
                          {items.map((t, i) => (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td style={{ fontWeight: 600 }}>{t.subjectName}</td>
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
                  </div>
                ))}
              </>
            );
          })()}

          {!timetableExamId && (
            <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>Select a published exam to view its timetable.</p>
          )}
        </>
      )}

      {/* ── RESULTS ── */}
      {view === 'results' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select style={selectStyle} value={resultsExamId} onChange={e => { setResultsExamId(e.target.value); setResults([]); setResultsMsg(null); }}>
              <option value="">Select Exam</option>
              {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={fetchResults} disabled={!resultsExamId || resultsLoading}>{resultsLoading ? 'Loading...' : 'View Results'}</button>
            <button className="btn" style={{ border: '1px solid #e2e8f0' }} onClick={handleGenerateResults} disabled={!resultsExamId || generatingResults}>{generatingResults ? 'Generating...' : '⚙️ Generate Results'}</button>
            <button className="btn" style={{ border: '1px solid #22543d', color: '#22543d' }} onClick={handlePublishResults} disabled={!resultsExamId || publishingResults}>{publishingResults ? 'Publishing...' : '📢 Publish Results'}</button>
          </div>
          {msgBanner(resultsMsg)}

          {results.length > 0 ? (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead><tr><th>Rank</th><th>Student</th><th>Total</th><th>Obtained</th><th>%</th><th>Grade</th><th>Status</th></tr></thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>#{r.rank}</td>
                      <td>
                        <span className="staff-name-link" onClick={() => fetchStudentDetail(r.studentId)}>
                          {r.studentName}
                        </span>
                      </td>
                      <td>{r.totalMarks}</td>
                      <td>{r.obtainedMarks}</td>
                      <td>{r.percentage?.toFixed(1)}%</td>
                      <td><span style={{ fontWeight: 700, color: '#553c9a' }}>{r.grade}</span></td>
                      <td><span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: r.resultStatus === 'PASS' ? '#c6f6d5' : '#fed7d7', color: r.resultStatus === 'PASS' ? '#22543d' : '#742a2a' }}>{r.resultStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !resultsLoading && <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>Select an exam and click "View Results" or "Generate Results".</p>
          )}
        </>
      )}

      {/* ── STUDENT RESULT DETAIL MODAL ── */}
      {(detailLoading || studentDetail) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '560px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Loading...</div>
            ) : studentDetail && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ color: '#1e2a3a', margin: 0 }}>Result Detail</h3>
                  <button onClick={() => setStudentDetail(null)}
                    style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#718096' }}>✕</button>
                </div>
                <div style={{ background: '#f7fafc', borderRadius: '10px', padding: '16px', marginBottom: '20px', fontSize: '14px', color: '#4a5568' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><strong>Student:</strong> {studentDetail.studentName}</div>
                    <div><strong>Exam:</strong> {studentDetail.examName}</div>
                    <div><strong>Total Marks:</strong> {studentDetail.totalMarks}</div>
                    <div><strong>Obtained:</strong> {studentDetail.obtainedMarks}</div>
                    <div><strong>Percentage:</strong> {studentDetail.percentage}%</div>
                    <div><strong>Grade:</strong> <span style={{ fontWeight: 700, color: '#553c9a' }}>{studentDetail.grade}</span></div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                      background: studentDetail.resultStatus === 'PASS' ? '#c6f6d5' : '#fed7d7',
                      color: studentDetail.resultStatus === 'PASS' ? '#22543d' : '#742a2a' }}>
                      {studentDetail.resultStatus}
                    </span>
                  </div>
                </div>
                <h4 style={{ color: '#1e2a3a', marginBottom: '12px', fontSize: '14px' }}>Subject-wise Breakdown</h4>
                {(studentDetail.subjects ?? []).length === 0 ? (
                  <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>No subject details available.</p>
                ) : (
                <div className="staff-table-wrapper">
                  <table className="staff-table">
                    <thead>
                      <tr><th>Subject</th><th>Max</th><th>Pass</th><th>Obtained</th><th>Status</th><th>Remarks</th></tr>
                    </thead>
                    <tbody>
                      {(studentDetail.subjects ?? []).map(s => (
                        <tr key={s.subjectId}>
                          <td style={{ fontWeight: 600 }}>{s.subjectName}</td>
                          <td>{s.maxMarks}</td>
                          <td>{s.passingMarks}</td>
                          <td style={{ fontWeight: 600 }}>{s.obtainedMarks}</td>
                          <td><span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                            background: s.status === 'PASS' ? '#c6f6d5' : '#fed7d7',
                            color: s.status === 'PASS' ? '#22543d' : '#742a2a' }}>{s.status}</span></td>
                          <td style={{ color: '#718096', fontSize: '13px' }}>{s.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setStudentDetail(null)}>Close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamManagement;
