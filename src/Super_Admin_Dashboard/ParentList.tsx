import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import { useToast, useToastMessageState } from '../components/Toast/Toast';
import { usePermissions } from '../security/Permissions';
import Modal from './Modal';
import Pagination from './Pagination';
import ProfileIdCard from './ProfileIdCard';
import RelationshipSelect from './RelationshipSelect';
import ProfileListAvatar from './ProfileListAvatar';
import { profilePictureUrl } from './ProfilePictureInput';
import { genderLabel } from '../utils/gender';
import './StaffList.css';

interface ParentStudent {
  id: number;
  profilePictureUrl?: string | null;
  studentName: string;
  rollNumber?: string;
  className?: string;
  sectionName?: string;
}

interface Parent {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  relationship: string;
  isActive: boolean;
  students: ParentStudent[];
}

interface StudentProfile extends ParentStudent {
  dob?: string;
  genderCode?: string | null;
  academicSession?: string;
  email?: string;
  phoneNumber?: string;
  profilePictureUrl?: string | null;
  isActive: boolean;
}

const ParentList: React.FC<{ selectedSchoolId: number | null; initialParentId?: number | null }> = ({ selectedSchoolId, initialParentId }) => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [photoPreview, setPhotoPreview] = useState<ParentStudent | null>(null);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingParent, setLoadingParent] = useState(false);
  const toast = useToast();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useToastMessageState('error');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    if (!initialParentId || !selectedSchoolId) return;
    const controller = new AbortController();
    setLoadingParent(true);
    const loadParent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Admin/parents-by-school?schoolId=${selectedSchoolId}&parentId=${initialParentId}&page=1&pageSize=1`, {
          signal: controller.signal,
          headers: { accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const result = await response.json();
        const parent = result.data?.find((item: Parent) => item.id === initialParentId);
        if (!response.ok || !result.success || !parent) throw new Error(result.message || 'Unable to find this parent.');
        if (!controller.signal.aborted) setSelectedParent({ ...parent, students: parent.students ?? [] });
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load parent details.');
      } finally {
        if (!controller.signal.aborted) setLoadingParent(false);
      }
    };
    loadParent();
    return () => controller.abort();
  }, [initialParentId, selectedSchoolId, setError]);

  useEffect(() => {
    if (studentId === null) return;
    const controller = new AbortController();
    const loadStudent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/Student/student-by-id?studentId=${studentId}`, {
          signal: controller.signal,
          headers: { accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const result = await response.json();
        if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Unable to load student profile.');
        if (!controller.signal.aborted) setStudentProfile(result.data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unable to load student profile.');
          setStudentId(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingStudent(false);
      }
    };
    loadStudent();
    return () => controller.abort();
  }, [studentId, setError]);

  const openStudentProfile = (id: number) => {
    setStudentProfile(null);
    setLoadingStudent(true);
    setStudentId(id);
  };

  useEffect(() => {
    if (selectedSchoolId) fetchParents(1, pageSize, search);
    else setParents([]);
  }, [selectedSchoolId, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchParents = async (page: number, size: number, term: string) => {
    if (!selectedSchoolId) return;
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        schoolId: String(selectedSchoolId),
        page: String(page),
        pageSize: String(size),
      });
      if (term) params.set('search', term);

      const response = await fetch(`${API_BASE_URL}/api/Admin/parents-by-school?${params}`, {
        cache: 'no-store',
        headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`The parent API returned HTML instead of JSON: ${response.url}`);
      }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load parents');

      setParents((result.data ?? []).map((parent: Parent) => ({ ...parent, students: parent.students ?? [] })));
      setCurrentPage(result.currentPage || 1);
      setTotalPages(result.totalPages || 1);
      setTotalRecords(result.totalRecords || 0);
    } catch (err) {
      setParents([]);
      setError(err instanceof Error ? err.message : 'Unable to load parents');
    } finally {
      setLoading(false);
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setCurrentPage(1);
    setSearch(searchInput.trim());
  };

  const saveParent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingParent || saving || !can('management.parents', 'update')) return;
    const { id, name, email, phoneNumber, address, relationship } = editingParent;
    if (!name.trim() || !email.trim() || !phoneNumber.trim() || !relationship.trim()) {
      toast.error('Please enter the parent name, email, phone and relationship.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Admin/update-parent`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ id, schoolId: selectedSchoolId, name: name.trim(), email: email.trim(),
          phoneNumber: phoneNumber.trim(), address: address.trim(), relationship: relationship.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to update parent. Please check the details and try again.');
      setEditingParent(null);
      toast.success('Parent details updated successfully.');
      await fetchParents(currentPage, pageSize, search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update parent. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
    fetchParents(page, pageSize, search);
  };

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchParents(1, size, search);
  };

  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  return (
    <div className="staff-list-container">
      {loadingParent && <PageLoader label="Loading parent details..." />}
      <div className="staff-list-header">
        <h2>Parent List</h2>
        <form onSubmit={submitSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder="Search name, email or phone"
            aria-label="Search parents"
            style={{ padding: '9px 12px', minWidth: '240px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading ? <PageLoader label="Loading parents..." /> : parents.length === 0 ? (
        <div className="staff-list-loading">No parents found.</div>
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr><th>Name</th><th>Relationship</th><th>Email</th><th>Phone</th><th>Students</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {parents.map(parent => (
                <tr key={parent.id}>
                  <td style={{ fontWeight: 600 }}>
                    <button type="button" style={{ border: 0, background: 'none', padding: 0, color: '#4a90e2', font: 'inherit', cursor: 'pointer' }}
                      onClick={() => can('management.parents', 'update') ? setEditingParent({ ...parent }) : setSelectedParent(parent)}>
                      {parent.name}
                    </button>
                  </td>
                  <td>{parent.relationship || '-'}</td>
                  <td>{parent.email || '-'}</td>
                  <td>{parent.phoneNumber || '-'}</td>
                  <td>{parent.students.length}</td>
                  <td><span className={`status-badge ${parent.isActive ? 'active' : 'inactive'}`}>{parent.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td><button className="btn-view-docs" onClick={() => setSelectedParent(parent)}>View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} totalRecords={totalRecords}
        pageSize={pageSize} onPageChange={changePage} onPageSizeChange={changePageSize} />

      <Modal isOpen={!!editingParent} onClose={() => { if (!saving) setEditingParent(null); }}
        title="Edit Parent" formId="edit-parent-form" submitLabel="Update Parent" showCancel={false}
        submitLoading={saving} loadingText="Updating parent...">
        {editingParent && <form id="edit-parent-form" onSubmit={saveParent}>
          <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="form-grid">
              {(['name', 'email', 'phoneNumber', 'relationship', 'address'] as const).map(field => (
                <div className="form-group" key={field}>
                  <label htmlFor={`parent-${field}`}>{({ name: 'Name', email: 'Email', phoneNumber: 'Phone', relationship: 'Relationship', address: 'Address' })[field]}</label>
                  {field === 'relationship' ? (
                    <RelationshipSelect id="parent-relationship" value={editingParent.relationship || ''}
                      onChange={event => setEditingParent({ ...editingParent, relationship: event.target.value })} />
                  ) : <input id={`parent-${field}`} type={field === 'email' ? 'email' : field === 'phoneNumber' ? 'tel' : 'text'}
                    required={field !== 'address'} value={editingParent[field] || ''}
                    maxLength={field === 'name' ? 150 : field === 'email' ? 255 : field === 'phoneNumber' ? 20 : undefined}
                    onChange={event => setEditingParent({ ...editingParent, [field]: event.target.value })} />}
                </div>
              ))}
            </div>
          </fieldset>
        </form>}
      </Modal>

      <Modal isOpen={!!selectedParent && studentId === null && !photoPreview} onClose={() => setSelectedParent(null)}
        title={`Parent Details - ${selectedParent?.name ?? ''}`} showSubmit={false} showCancel={false}>
        {selectedParent && (
          <div>
            <div className="form-grid" style={{ marginBottom: '24px' }}>
              <div className="form-group"><label>Email</label><div>{selectedParent.email || '-'}</div></div>
              <div className="form-group"><label>Phone</label><div>{selectedParent.phoneNumber || '-'}</div></div>
              <div className="form-group"><label>Relationship</label><div>{selectedParent.relationship || '-'}</div></div>
              <div className="form-group"><label>Address</label><div>{selectedParent.address || '-'}</div></div>
            </div>
            <h3 style={{ marginBottom: '12px' }}>Students</h3>
            {selectedParent.students.length === 0 ? <p>No linked students.</p> : (
              <div className="staff-table-wrapper">
                <table className="staff-table">
                  <thead><tr><th>Photo</th><th>Name</th><th>Roll No.</th><th>Class</th><th>Section</th></tr></thead>
                  <tbody>{selectedParent.students.map(student => (
                    <tr key={student.id}>
                      <td><ProfileListAvatar name={student.studentName} pictureUrl={student.profilePictureUrl}
                        onView={() => setPhotoPreview(student)} /></td><td>
                      {can('management.students', 'read') ? <button type="button"
                        style={{ border: 0, background: 'none', padding: 0, color: '#4a90e2', font: 'inherit', cursor: 'pointer' }}
                        onClick={() => openStudentProfile(student.id)}>{student.studentName}</button> : student.studentName}
                    </td><td>{student.rollNumber || '-'}</td><td>{student.className || '-'}</td><td>{student.sectionName || '-'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
      <Modal isOpen={!!photoPreview} onClose={() => setPhotoPreview(null)}
        title={`Profile Photo - ${photoPreview?.studentName || ''}`} showSubmit={false} showCancel={false}>
        {photoPreview && <div className="staff-photo-preview">
          <img src={profilePictureUrl(photoPreview.profilePictureUrl)} alt={`${photoPreview.studentName} profile`} />
        </div>}
      </Modal>
      <Modal isOpen={studentId !== null} onClose={() => setStudentId(null)}
        title="Student Profile" showSubmit={false} showCancel={false}>
        {loadingStudent ? <PageLoader label="Loading student profile..." /> : studentProfile && (
          <ProfileIdCard name={studentProfile.studentName} pictureUrl={studentProfile.profilePictureUrl}
            type="Student" identifier={`Student ID: ${studentProfile.id}`} status={studentProfile.isActive}
            subtitle={`${studentProfile.className || 'Class not assigned'} • Section ${studentProfile.sectionName || '—'}`}
            fields={[
              { label: 'Roll Number', value: studentProfile.rollNumber },
              { label: 'Gender', value: genderLabel(studentProfile.genderCode) },
              { label: 'Date of Birth', value: studentProfile.dob?.split('T')[0].split('-').reverse().join('/') },
              { label: 'Academic Session', value: studentProfile.academicSession?.split('T')[0] },
              { label: 'Email', value: studentProfile.email },
              { label: 'Phone', value: studentProfile.phoneNumber },
              { label: 'Parent Name', value: selectedParent && <button type="button" className="parent-profile-link"
                onClick={() => setStudentId(null)}>{selectedParent.name}</button> },
              { label: 'Relationship', value: selectedParent?.relationship },
            ]} />
        )}
      </Modal>
    </div>
  );
};

export default ParentList;
