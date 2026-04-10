import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddSubject from './AddSubject';
import EditSubject from './EditSubject';
import Pagination from './Pagination';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      setSubjects([]);
      setCurrentPage(1);
      fetchSubjects(1, pageSize);
    } else {
      setSubjects([]);
      setLoading(false);
    }
  }, [selectedSchoolId]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchSubjects(page, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchSubjects(1, size);
  };

  const fetchSubjects = async (page: number = 1, size: number = pageSize) => {
    if (!selectedSchoolId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Subject/subjects-by-school?schoolId=${selectedSchoolId}&page=${page}&pageSize=${size}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSubjects(result.data);
          setCurrentPage(result.currentPage);
          setTotalPages(result.totalPages);
          setTotalRecords(result.totalRecords);
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[5, 10, 20, 50]}
      />

      <AddSubject
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={() => fetchSubjects(currentPage, pageSize)}
      />

      <EditSubject
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        subject={selectedSubject}
        onSuccess={() => fetchSubjects(currentPage, pageSize)}
      />
    </div>
  );
};

export default SubjectList;