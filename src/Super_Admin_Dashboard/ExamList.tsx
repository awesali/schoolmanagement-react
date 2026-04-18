import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Pagination from './Pagination';
import AddExam from './AddExam';
import ExamDetailModal from './ExamDetailModal';
import './StaffList.css';

interface Exam {
  examId: number;
  examName: string;
  examTitle: string;
  startDate: string;
  endDate: string;
  classCount: number;
}

interface ExamListProps {
  selectedSchoolId: number | null;
}

const ExamList: React.FC<ExamListProps> = ({ selectedSchoolId }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<{examId: number, examName: string, examTitle: string} | null>(null);

  useEffect(() => {
    if (selectedSchoolId) {
      setCurrentPage(1);
      fetchExams(1);
    }
  }, [selectedSchoolId]);

  useEffect(() => {
    if (selectedSchoolId && currentPage > 1) {
      fetchExams(currentPage);
    }
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchExams(page, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchExams(1, size);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const fetchExams = async (page: number = 1, size: number = pageSize) => {
    if (!selectedSchoolId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Exam/scheduled-exams?schoolId=${selectedSchoolId}&page=${page}&pageSize=${size}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setExams(result.data);
          setCurrentPage(result.currentPage);
          setTotalPages(result.totalPages);
          setTotalRecords(result.totalRecords);
        } else {
          setError(result.message || 'Failed to fetch scheduled exams');
        }
      } else {
        setError('Failed to fetch scheduled exams');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="staff-list-loading">Loading scheduled exams...</div>;
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
        <h2>Exam Schedules</h2>
        <div className="header-buttons">
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            + Add Exam
          </button>
        </div>
      </div>
      
      <div className="staff-table-wrapper">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Exam Name</th>
              <th>Exam Title</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Classes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.examId}>
                <td>
                  <span className="staff-name-link">
                    {exam.examName}
                  </span>
                </td>
                <td>
                  <span className="section-badge">
                    {exam.examTitle}
                  </span>
                </td>
                <td>{formatDate(exam.startDate)}</td>
                <td>{formatDate(exam.endDate)}</td>
                <td>
                  <span className="count-badge">
                    {exam.classCount}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn-view-docs"
                    onClick={() => {
                      setSelectedExam({
                        examId: exam.examId,
                        examName: exam.examName,
                        examTitle: exam.examTitle
                      });
                      setIsDetailModalOpen(true);
                    }}
                  >
                    View Schedule
                  </button>
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

      <AddExam
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={() => {
          fetchExams(currentPage);
          console.log('Exam created successfully');
        }}
      />

      <ExamDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedExam(null);
        }}
        schoolId={selectedSchoolId}
        examId={selectedExam?.examId || null}
        examName={`${selectedExam?.examName || ''} - ${selectedExam?.examTitle || ''}`}
      />
    </div>
  );
};

export default ExamList;