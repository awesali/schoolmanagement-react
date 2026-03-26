import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './SchoolList.css';

interface School {
  id: number;
  schoolName: string;
  address: string;
  email: string;
  phone: string;
  superAdminId: number;
  created_Date: string;
}

const SchoolList: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
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
    return <div className="school-list-loading">Loading...</div>;
  }

  return (
    <div className="school-list-container">
      <h2>School List</h2>
      <div className="school-cards">
        {schools.map((school) => (
          <div key={school.id} className="school-card">
            <div className="school-card-header">
              <h3>{school.schoolName}</h3>
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
    </div>
  );
};

export default SchoolList;
