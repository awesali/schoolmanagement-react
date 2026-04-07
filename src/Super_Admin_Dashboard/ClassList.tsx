import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddClass from './AddClass';
import EditClass from './EditClass';
import AssignSubjects from './AssignSubjects';
import TimeTable from './TimeTable';
import './StaffList.css'; // Using same CSS as StaffList

interface Subject {
  id: number;
  subjectName: string;
}

interface Section {
  id: number;
  sectionName: string;
  staffId: number;
  monitorStudentId: number;
  subjects: Subject[];
}

interface Class {
  id: number;
  className: string;
  schoolId: number;
  createdDate: string;
  isActive: boolean;
  sectionCount: number;
  sections: Section[];
}

interface ClassListProps {
  selectedSchoolId: number | null;
}

const ClassList: React.FC<ClassListProps> = ({ selectedSchoolId }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignSubjectsOpen, setIsAssignSubjectsOpen] = useState(false);
  const [isTimeTableOpen, setIsTimeTableOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSection, setSelectedSection] = useState<{id: number, name: string, subjects: Subject[]} | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchClasses();
    }
  }, [selectedSchoolId]);

  const fetchClasses = async () => {
    if (!selectedSchoolId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/calss-list?schoolId=${selectedSchoolId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setClasses(result.data);
        } else {
          setError(result.message || 'Failed to fetch classes');
        }
      } else {
        setError('Failed to fetch classes');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="staff-list-loading">Loading classes...</div>;
  }

  if (error) {
    return <div className="staff-list-loading">Error: {error}</div>;
  }

  if (!selectedSchoolId) {
    return <div className="staff-list-loading">Please select a school</div>;
  }

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Class List</h2>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Class
        </button>
      </div>
      
      <div className="staff-table-wrapper">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Sections</th>
              <th>Subjects</th>
              <th>Time Table</th>
              <th>Status</th>
              <th>Created Date</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((classItem) => (
              <tr key={classItem.id}>
                <td className="class-name">
                  <span 
                    className="staff-name-link"
                    onClick={() => {
                      setSelectedClass(classItem);
                      setIsEditModalOpen(true);
                    }}
                  >
                    {classItem.className}
                  </span>
                </td>
                <td>
                  <div className="sections-list">
                    {classItem.sections.map((section) => (
                      <span key={section.id} className="role-badge teacher">
                        {section.sectionName}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="subjects-actions">
                    {classItem.sections.map((section) => (
                      <button
                        key={section.id}
                        className="btn-view-docs"
                        onClick={() => {
                          setSelectedSection({
                            id: section.id, 
                            name: `${classItem.className}-${section.sectionName}`,
                            subjects: section.subjects
                          });
                          setIsAssignSubjectsOpen(true);
                        }}
                      >
                        {section.sectionName} Subjects
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="subjects-actions">
                    {classItem.sections.map((section) => (
                      <button
                        key={section.id}
                        className="btn-view-docs timetable-btn"
                        onClick={() => {
                          setSelectedSection({
                            id: section.id, 
                            name: `${classItem.className}-${section.sectionName}`,
                            subjects: section.subjects
                          });
                          setIsTimeTableOpen(true);
                        }}
                      >
                        {section.sectionName} TimeTable
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${classItem.isActive ? 'active' : 'inactive'}`}>
                    {classItem.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="created-date">
                  {new Date(classItem.createdDate).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddClass
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={fetchClasses}
      />

      <EditClass
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        classData={selectedClass}
        onSuccess={fetchClasses}
      />

      <AssignSubjects
        isOpen={isAssignSubjectsOpen}
        onClose={() => setIsAssignSubjectsOpen(false)}
        sectionId={selectedSection?.id || null}
        schoolId={selectedSchoolId}
        sectionName={selectedSection?.name || ''}
        assignedSubjects={selectedSection?.subjects || []}
        onSuccess={() => {
          fetchClasses();
          console.log('Subjects assigned successfully');
        }}
      />

      <TimeTable
        isOpen={isTimeTableOpen}
        onClose={() => setIsTimeTableOpen(false)}
        sectionId={selectedSection?.id || null}
        schoolId={selectedSchoolId}
        sectionName={selectedSection?.name || ''}
        onSuccess={() => {
          console.log('TimeTable created successfully');
        }}
      />
    </div>
  );
};

export default ClassList;