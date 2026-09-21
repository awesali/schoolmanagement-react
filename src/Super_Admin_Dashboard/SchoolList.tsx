import React, { useState, useEffect } from 'react';
import { PageLoader } from '../components/Loader/Loader';
import { API_BASE_URL } from '../config';
import CreateSchool, { SchoolDetails } from './CreateSchool';
import { EditIcon } from '../components/Icons/Icons';
import './SchoolList.css';

interface School extends SchoolDetails {
  id: number;
  schoolName: string;
  address: string;
  email: string;
  phone: string;
  superAdminId: number;
  created_Date: string;
}

interface SchoolListProps { onSchoolsChanged?: () => void; }

const SchoolList: React.FC<SchoolListProps> = ({ onSchoolsChanged }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/School-by-superadmin`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSchools(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch schools');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading schools..." />;
  }

  return (
    <div className="school-list-container">
      <h2>School List</h2>
      {schools.length === 0 ? (
        <div className="school-list-loading" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No schools available. Please create a new school.
        </div>
      ) : (
        <div className="school-cards">
          {schools.map((school) => (
            <div key={school.id} className="school-card">
              <div className="school-card-header">
                <h3>{school.schoolName}</h3>
                <button type="button" className="school-edit-button" title="Edit School" aria-label={`Edit School: ${school.schoolName}`} onClick={() => setEditingSchool(school)}><EditIcon /></button>
              </div>
              <div className="school-card-body">
                <div className="school-info">
                  <span className="info-label">Address:</span>
                  <span className="info-value">{school.address}</span>
                </div>
                <div className="school-info">
                  <span className="info-label">Phone:</span>
                  <span className="info-value">{school.phone}</span>
                </div>
                <div className="school-info">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{school.email || 'N/A'}</span>
                </div>
                <div className="school-info">
                  <span className="info-label">Created:</span>
                  <span className="info-value">{new Date(school.created_Date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <CreateSchool
        isOpen={Boolean(editingSchool)}
        school={editingSchool}
        onClose={() => setEditingSchool(null)}
        onSuccess={() => { fetchSchools(); onSchoolsChanged?.(); }}
      />
    </div>
  );
};

export default SchoolList;
