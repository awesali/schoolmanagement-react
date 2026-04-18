import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddClass from './AddClass';
import EditClass from './EditClass';
import AssignSubjects from './AssignSubjects';
import TimeTable from './TimeTable';
import Pagination from './Pagination';
import './ClassList.css';

interface Subject {
  subjectId: number;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignSubjectsOpen, setIsAssignSubjectsOpen] = useState(false);
  const [isTimeTableOpen, setIsTimeTableOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSection, setSelectedSection] = useState<{id: number, name: string, subjects: Subject[]} | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      setCurrentPage(1);
      fetchClasses(1);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (selectedSchoolId && currentPage > 1) {
      fetchClasses(currentPage);
    }
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchClasses(page, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchClasses(1, size);
  };

  const fetchClasses = async (page: number = 1, size: number = pageSize) => {
    if (!selectedSchoolId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Class/calss-list?schoolId=${selectedSchoolId}&page=${page}&pageSize=${size}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setClasses(result.data);
          setCurrentPage(result.currentPage);
          setTotalPages(result.totalPages);
          setTotalRecords(result.totalRecords);
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
    return <div className="loading">Loading classes...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!selectedSchoolId) {
    return <div className="loading">Please select a school</div>;
  }

  return (
    <div className="class-list-container">
      <div className="class-list-header">
        <h2>Class List</h2>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Class
        </button>
      </div>
      
      <div className="class-table-container">
        <table className="class-table">
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
                    className="class-name"
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
                      <span key={section.id} className="section-badge">
                        {section.sectionName}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <button
                    className="btn-view-docs"
                    onClick={() => {
                      setSelectedClass(classItem);
                      setIsAssignSubjectsOpen(true);
                    }}
                  >
                    Subjects
                  </button>
                </td>
                <td>
                  <button
                    className="btn-view-docs timetable-btn"
                    onClick={() => {
                      setSelectedClass(classItem);
                      setIsTimeTableOpen(true);
                    }}
                  >
                    TimeTable
                  </button>
                </td>
                <td>
                  <span className={`status ${classItem.isActive ? 'active' : 'inactive'}`}>
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[5, 10, 20, 50]}
      />

      <AddClass
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={() => fetchClasses(currentPage)}
      />

      <EditClass
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        classData={selectedClass}
        onSuccess={() => fetchClasses(currentPage)}
      />

      <AssignSubjects
        isOpen={isAssignSubjectsOpen}
        onClose={() => setIsAssignSubjectsOpen(false)}
        classData={selectedClass}
        schoolId={selectedSchoolId}
        onSuccess={() => {
          fetchClasses(currentPage);
          console.log('Subjects assigned successfully');
        }}
      />

      <TimeTable
        isOpen={isTimeTableOpen}
        onClose={() => setIsTimeTableOpen(false)}
        classData={selectedClass}
        schoolId={selectedSchoolId}
        onSuccess={() => {
          console.log('TimeTable created successfully');
        }}
      />
    </div>
  );
};

export default ClassList;