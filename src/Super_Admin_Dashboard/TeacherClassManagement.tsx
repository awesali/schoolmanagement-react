import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import './ClassList.css';

type Subject = { subjectId: number; subjectName: string };
type Section = { id: number; sectionName: string; subjects: Subject[] };
type AssignedClass = { id: number; className: string; sections: Section[] };

interface Props {
  onNavigate: (page: string, attendanceType?: 'student' | 'staff') => void;
}

const TeacherClassManagement: React.FC<Props> = ({ onNavigate }) => {
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/Class/my-classes`, {
          headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load assigned classes');
        setClasses(result.data || []);
      } catch (err: any) {
        setError(err.message || 'Unable to load assigned classes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="staff-list-loading">Loading your classes...</div>;
  if (error) return <div className="staff-list-loading">{error}</div>;

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <div>
          <h2>My Classes</h2>
          <p style={{ color: '#718096', margin: '6px 0 0' }}>Only classes and sections assigned to you are shown here.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => onNavigate('Attendance', 'student')}>Mark Attendance</button>
          <button className="btn" onClick={() => onNavigate('Marks Entry')}>Enter Marks</button>
        </div>
      </div>

      {!classes.length ? (
        <div className="staff-list-loading">No class or section is assigned to you. Please contact the admin.</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {classes.map(item => (
            <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
              <h3 style={{ margin: '0 0 14px' }}>{item.className}</h3>
              {item.sections.map(section => (
                <div key={section.id} style={{ borderTop: '1px solid #edf2f7', padding: '12px 0' }}>
                  <strong>Section {section.sectionName}</strong>
                  <div style={{ color: '#718096', marginTop: 6 }}>
                    Subjects: {section.subjects?.length ? section.subjects.map(s => s.subjectName).join(', ') : 'No subjects assigned'}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherClassManagement;
