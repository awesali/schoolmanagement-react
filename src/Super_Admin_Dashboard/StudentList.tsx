import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddStudent from './AddStudent';
import './StudentList.css';

interface Student {
  id: number;
  studentName: string;
  dob: string;
  email: string;
  phoneNumber: string;
  parentId: number;
  schoolId: number;
  className: string;
  sectionName: string;
  academicSession: string;
}

interface StudentListProps {
  selectedSchoolId: number | null;
}

const StudentList: React.FC<StudentListProps> = ({ selectedSchoolId }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (selectedSchoolId) {
      fetchStudents();
    }
  }, [selectedSchoolId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/students-by-school?schoolId=${selectedSchoolId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStudents(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="staff-list-loading">Loading...</div>;
  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  return (
    <div className="staff-list-container">
      <div className="staff-list-header">
        <h2>Student List</h2>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Student
        </button>
      </div>
      <div className="staff-table-wrapper">
        <table className="staff-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>DOB</th>
              <th>Class</th>
              <th>Section</th>
              <th>Session</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.studentName}</td>
                <td>{student.email}</td>
                <td>{student.phoneNumber}</td>
                <td>{new Date(student.dob).toLocaleDateString()}</td>
                <td>
                  <span className="role-badge teacher">{student.className}</span>
                </td>
                <td>
                  <span className="role-badge principal">{student.sectionName}</span>
                </td>
                <td>{student.academicSession.split('-')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AddStudent
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={fetchStudents}
      />
    </div>
  );
};

export default StudentList;
