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

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
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
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/add-staff`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          schoolId: schoolId
        }),
      });
      if (response.ok) {
        handleClear();
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to add staff');
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
      </form>
    </Modal>
  );
};

export default AddStaff;
