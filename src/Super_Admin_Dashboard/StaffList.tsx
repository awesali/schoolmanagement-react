import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AddStaff from './AddStaff';
import EditStaff from './EditStaff';
import Modal from './Modal';
import './StaffList.css';

interface Document {
  documentId: number;
  documentName: string;
  documentURL: string;
}

interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string;
  dob: string;
  doj: string;
  roleId: number;
  roleName: string;
  schoolName: string;
  address: string;
  isActive: boolean;
  documents: Document[];
}

interface StaffListProps {
  selectedSchoolId: number | null;
}

const StaffList: React.FC<StaffListProps> = ({ selectedSchoolId }) => {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);

  const handleDeleteDocument = async (documentId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/delete-document?id=${documentId}`, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        // Refresh the staff list to update document counts
        fetchStaff();
        // Update the selected staff documents in the modal
        if (selectedStaff) {
          const updatedStaff = {
            ...selectedStaff,
            documents: selectedStaff.documents.filter(doc => doc.documentId !== documentId)
          };
          setSelectedStaff(updatedStaff);
        }
      } else {
        alert('Failed to delete document');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document');
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      fetchStaff();
    }
  }, [selectedSchoolId]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/Staff-by-school?schoolId=${selectedSchoolId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStaff(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch staff');
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
        <h2>Staff List</h2>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Staff
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
              <th>DOJ</th>
              <th>Role</th>
              <th>Status</th>
              <th>Documents</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id}>
                <td>
                  <span 
                    className="staff-name-link"
                    onClick={() => {
                      setSelectedStaff(member);
                      setIsEditModalOpen(true);
                    }}
                  >
                    {member.name}
                  </span>
                </td>
                <td>{member.email}</td>
                <td>{member.phone}</td>
                <td>{new Date(member.dob).toLocaleDateString()}</td>
                <td>{new Date(member.doj).toLocaleDateString()}</td>
                <td>
                  <span className={`role-badge ${member.roleName.toLowerCase()}`}>
                    {member.roleName}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${member.isActive ? 'active' : 'inactive'}`}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn-view-docs"
                    onClick={() => {
                      setSelectedStaff(member);
                      setShowDocuments(true);
                    }}
                    disabled={member.documents.length === 0}
                  >
                    View ({member.documents.length})
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddStaff
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        schoolId={selectedSchoolId}
        onSuccess={fetchStaff}
      />

      <EditStaff
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        staff={selectedStaff}
        onSuccess={fetchStaff}
      />

      <Modal
        isOpen={showDocuments}
        onClose={() => setShowDocuments(false)}
        title={`Documents - ${selectedStaff?.name || ''}`}
        showSubmit={false}
        showCancel={false}
      >
        {selectedStaff && (
          selectedStaff.documents.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No documents available</p>
          ) : (
            <div className="documents-list">
              {selectedStaff.documents.map((doc) => (
                <div key={doc.documentId} className="document-item">
                  <span>{doc.documentName}</span>
                  <div className="document-actions">
                    <a 
                      href={`${API_BASE_URL}${doc.documentURL}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-download"
                    >
                      View
                    </a>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDeleteDocument(doc.documentId)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default StaffList;
