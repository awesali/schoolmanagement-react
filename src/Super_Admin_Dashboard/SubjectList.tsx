import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddSubject from './AddSubject';
import EditSubject from './EditSubject';
import './StaffList.css';

interface Subject {
  id: number;
  subjectName: string;
  schoolId: number;
  created_Date: string;
  modified_Date: string | null;
  isActive: boolean;
  teacherId: number | null;
  teacherName: string | null;
}

interface SubjectListProps {
  selectedSchoolId: number | null;
}

const SubjectList: React.FC<SubjectListProps> = ({ selectedSchoolId }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      setSubjects([]); // Clear previous subjects
      fetchSubjects();
    } else {
      setSubjects([]);
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const fetchSubjects = async () => {
    if (!selectedSchoolId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/subjects-by-school?schoolId=${selectedSchoolId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSubjects(result.data);
        } else {
          setSubjects([]);
        }
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="staff-list-loading">Loading...</div>;
  }

  if (!selectedSchoolId) {
    return <div className="staff-list-loading">Please select a school</div>;
  }

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Subject List</h2>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Subject
        </button>
      </div>
      <div className="staff-table-wrapper">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Subject Name</th>
              <th>Teacher Name</th>
              <th>Created Date</th>
              <th>Modified Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={`${subject.id}-${subject.teacherId}`}>
                <td>
                  <span 
                    className="staff-name-link"
                    onClick={() => {
                      setSelectedSubject(subject);
                      setIsEditModalOpen(true);
                    }}
                  >
                    {subject.subjectName}
                  </span>
                </td>
                <td>{subject.teacherName || 'Not Assigned'}</td>
                <td>{new Date(subject.created_Date).toLocaleDateString()}</td>
                <td>
                  {subject.modified_Date 
                    ? new Date(subject.modified_Date).toLocaleDateString() 
                    : '-'
                  }
                </td>
                <td>
                  <span className={`status-badge ${subject.isActive ? 'active' : 'inactive'}`}>
                    {subject.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddSubject
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={fetchSubjects}
      />

      <EditSubject
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        subject={selectedSubject}
        onSuccess={fetchSubjects}
      />
    </div>
  );
};

export default SubjectList;