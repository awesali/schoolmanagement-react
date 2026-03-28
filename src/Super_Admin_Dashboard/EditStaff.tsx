import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './AddStaff.css';

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

interface EditStaffProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  onSuccess: () => void;
}

interface Role {
  id: number;
  roleName: string;
}

const EditStaff: React.FC<EditStaffProps> = ({ isOpen, onClose, staff, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    doj: '',
    roleId: 0,
    email: '',
    phone: '',
    address: '',
    isActive: true
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [newDocuments, setNewDocuments] = useState<Array<{ name: string; file: File }>>([]);
  const [existingDocuments, setExistingDocuments] = useState<Array<{ id: number; name: string; url: string; originalName: string; newFile?: File }>>([]);

  useEffect(() => {
    if (isOpen && staff) {
      console.log('Staff data:', staff);
      console.log('Documents:', staff.documents);
      setFormData({
        name: staff.name,
        dob: staff.dob.split('T')[0],
        doj: staff.doj.split('T')[0],
        roleId: staff.roleId,
        email: staff.email,
        phone: staff.phone,
        address: staff.address || '',
        isActive: staff.isActive
      });
      setExistingDocuments(staff.documents.map(doc => ({
        id: doc.documentId,
        name: doc.documentName,
        url: doc.documentURL,
        originalName: doc.documentName // Store original name to track changes
      })));
      setNewDocuments([]);
      fetchRoles();
    }
  }, [isOpen, staff]);

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
    if (!staff) return;

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      formDataToSend.append('Id', staff.id.toString());
      formDataToSend.append('Name', formData.name);
      formDataToSend.append('Email', formData.email);
      formDataToSend.append('Phone', formData.phone);
      formDataToSend.append('Address', formData.address);
      formDataToSend.append('DOB', new Date(formData.dob).toISOString());
      formDataToSend.append('DOJ', new Date(formData.doj).toISOString());
      formDataToSend.append('RoleId', formData.roleId.toString());
      formDataToSend.append('IsActive', formData.isActive.toString());
      
      // Prepare arrays for proper alignment
      const documentIds: string[] = [];
      const documentNames: string[] = [];
      const files: File[] = [];
      
      // Add only changed existing documents
      existingDocuments.forEach(doc => {
        const hasNameChanged = doc.name !== doc.originalName;
        const hasFileChanged = doc.newFile !== undefined;
        
        // Only include if name or file has changed
        if (hasNameChanged || hasFileChanged) {
          documentIds.push(doc.id.toString());
          documentNames.push(doc.name);
          if (doc.newFile) {
            files.push(doc.newFile);
          } else {
            // If only name changed, send empty file
            const emptyFile = new File([], '', { type: 'application/octet-stream' });
            files.push(emptyFile);
          }
        }
      });
      
      // Add new documents (they don't have IDs, so no DocumentIds for these)
      newDocuments.forEach(doc => {
        if (doc.file && doc.name.trim()) {
          // For new documents, we don't append DocumentIds (they don't exist yet)
          documentNames.push(doc.name);
          files.push(doc.file);
        }
      });
      
      // Append to FormData in correct order
      documentIds.forEach(id => formDataToSend.append('DocumentIds', id));
      documentNames.forEach(name => formDataToSend.append('DocumentNames', name));
      files.forEach(file => formDataToSend.append('Files', file));
      
      // Debug logging
      const changedExistingDocs = existingDocuments.filter(doc => 
        doc.name !== doc.originalName || doc.newFile !== undefined
      );
      const validNewDocs = newDocuments.filter(doc => doc.file && doc.name.trim());
      
      console.log('=== UPDATE STAFF DOCUMENTS ===');
      console.log('Changed existing documents:', changedExistingDocs.length);
      console.log('New documents being added:', validNewDocs.length);
      console.log('Total DocumentIds sent:', documentIds.length);
      console.log('Total DocumentNames sent:', documentNames.length);
      console.log('Total Files sent:', files.length);
      console.log('DocumentIds:', documentIds);
      console.log('DocumentNames:', documentNames);
      console.log('Files:', files.map(f => f.name || 'empty'));
      console.log('===============================');

      const response = await fetch(`${API_BASE_URL}/api/Admin/update-staff`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });
      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to update staff');
    }
  };

  const handleAddDocument = () => {
    setNewDocuments([...newDocuments, { name: '', file: null as any }]);
  };

  const handleRemoveNewDocument = (index: number) => {
    setNewDocuments(newDocuments.filter((_, i) => i !== index));
  };

  const handleExistingDocNameChange = (index: number, name: string) => {
    const updated = [...existingDocuments];
    updated[index].name = name;
    setExistingDocuments(updated);
  };

  const handleExistingDocFileChange = (index: number, file: File | null) => {
    if (file) {
      const updated = [...existingDocuments];
      updated[index].newFile = file;
      setExistingDocuments(updated);
    }
  };

  const handleDocumentNameChange = (index: number, name: string) => {
    const updated = [...newDocuments];
    updated[index].name = name;
    setNewDocuments(updated);
  };

  const handleDocumentFileChange = (index: number, file: File | null) => {
    if (file) {
      const updated = [...newDocuments];
      updated[index].file = file;
      setNewDocuments(updated);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Staff"
      submitLabel="Update Staff"
      onCancel={() => {}}
      showCancel={false}
      formId="edit-staff-form"
    >
      <form id="edit-staff-form" onSubmit={handleSubmit}>
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
          <div className="form-group">
            <label>Status</label>
            <div className="toggle-container">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className={`toggle-label ${formData.isActive ? 'active' : 'inactive'}`}>
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="documents-section">
          <div className="documents-header">
            <label>Existing Documents ({existingDocuments.length})</label>
          </div>
          {existingDocuments.length === 0 ? (
            <p style={{ padding: '12px', color: '#718096', fontSize: '14px' }}>No existing documents</p>
          ) : (
            existingDocuments.map((doc, index) => (
              <div key={doc.id} className="existing-doc-row-edit">
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => handleExistingDocNameChange(index, e.target.value)}
                  placeholder="Document Name"
                />
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id={`existing-file-${index}`}
                    onChange={(e) => handleExistingDocFileChange(index, e.target.files?.[0] || null)}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor={`existing-file-${index}`} className="file-input-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {doc.newFile ? doc.newFile.name : 'Upload'}
                  </label>
                </div>
                <a 
                  href={`${API_BASE_URL}${doc.url}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-view-existing"
                  onClick={(e) => {
                    console.log('View clicked:', `${API_BASE_URL}${doc.url}`);
                  }}
                >
                  View
                </a>
              </div>
            ))
          )}
        </div>

        <div className="documents-section">
          <div className="documents-header">
            <label>Add New Documents</label>
            <button type="button" className="btn-add-doc" onClick={handleAddDocument}>
              + Add Document
            </button>
          </div>
          {newDocuments.map((doc, index) => (
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
                  id={`new-file-${index}`}
                  onChange={(e) => handleDocumentFileChange(index, e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label htmlFor={`new-file-${index}`} className="file-input-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {doc.file ? doc.file.name : 'Upload'}
                </label>
              </div>
              <button type="button" className="btn-remove" onClick={() => handleRemoveNewDocument(index)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
};

export default EditStaff;
