import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

interface AddStaffProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: number | null;
  onSuccess: () => void;
}

interface Role {
  id: number;
  roleName: string;
}

const AddStaff: React.FC<AddStaffProps> = ({ isOpen, onClose, schoolId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    doj: '',
    roleId: 0,
    email: '',
    phone: '',
    address: ''
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [documents, setDocuments] = useState<Array<{ name: string; file: File }>>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      setError(''); // Clear any previous errors when modal opens
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/Get-roles`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setRoles(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch roles');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      formDataToSend.append('Name', formData.name);
      formDataToSend.append('Email', formData.email);
      formDataToSend.append('Phone', formData.phone);
      formDataToSend.append('Address', formData.address);
      formDataToSend.append('DOB', formData.dob);
      formDataToSend.append('DOJ', formData.doj);
      formDataToSend.append('RoleId', formData.roleId.toString());
      formDataToSend.append('SchoolId', schoolId?.toString() || '0');
      
      // Only append documents if they exist and are valid
      const validDocuments = documents.filter(doc => doc.file && doc.name.trim());
      validDocuments.forEach(doc => {
        formDataToSend.append('DocumentNames', doc.name);
        formDataToSend.append('Files', doc.file);
      });
      
      console.log('Adding staff with:', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        documentsCount: validDocuments.length
      });

      const response = await fetch(`${API_BASE_URL}/api/Admin/add-staff`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (response.ok && result.success) {
        handleClear();
        onSuccess();
        onClose();
      } else {
        // Show error message from API
        console.error('API Error:', result);
        setError(result.message || `Failed to add staff (${response.status})`);
      }
    } catch (err) {
      console.error('Failed to add staff:', err);
      setError('Network error. Please try again.');
    }
  };

  const handleClear = () => {
    setFormData({
      name: '',
      dob: '',
      doj: '',
      roleId: roles.length > 0 ? roles[0].id : 2,
      email: '',
      phone: '',
      address: ''
    });
    setDocuments([]);
    setError(''); // Clear errors when clearing form
  };

  const handleAddDocument = () => {
    setDocuments([...documents, { name: '', file: null as any }]);
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleDocumentNameChange = (index: number, name: string) => {
    const updated = [...documents];
    updated[index].name = name;
    setDocuments(updated);
  };

  const handleDocumentFileChange = (index: number, file: File | null) => {
    if (file) {
      const updated = [...documents];
      updated[index].file = file;
      setDocuments(updated);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Staff"
      submitLabel="Add Staff"
      onCancel={handleClear}
      formId="add-staff-form"
    >
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <form id="add-staff-form" onSubmit={handleSubmit}>
        <div className="form-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Phone *</label>
              <input
                type="tel"
                required
                maxLength={10}
                pattern="[0-9]{10}"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 10) {
                    setFormData({...formData, phone: value});
                  }
                }}
              />
            </div>
            <div className="form-group">
              <label>Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Date of Joining *</label>
              <input
                type="date"
                required
                value={formData.doj}
                onChange={(e) => setFormData({...formData, doj: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Role *</label>
              <select
                required
                value={formData.roleId}
                onChange={(e) => setFormData({...formData, roleId: Number(e.target.value)})}
              >
                <option value="">Select Role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.roleName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label>Address *</label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>

          <div className="documents-section">
            <div className="documents-header">
              <label>Documents</label>
              <button type="button" className="btn-add-doc" onClick={handleAddDocument}>
                + Add Document
              </button>
            </div>
            {documents.map((doc, index) => (
              <div key={index} className="new-document-row">
                <input
                  type="text"
                  placeholder="Document Name"
                  value={doc.name}
                  onChange={(e) => handleDocumentNameChange(index, e.target.value)}
                />
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id={`file-${index}`}
                    onChange={(e) => handleDocumentFileChange(index, e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor={`file-${index}`} className="file-input-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {doc.file ? doc.file.name : 'Upload'}
                  </label>
                </div>
                <button type="button" className="btn-remove" onClick={() => handleRemoveDocument(index)}>
                  ✕
                </button>
              </div>
            ))}
          </div>
      </form>
    </Modal>
  );
};

export default AddStaff;
