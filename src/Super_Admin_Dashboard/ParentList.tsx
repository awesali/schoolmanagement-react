import React, { useEffect, useState } from 'react';
import { PARENT_API_BASE_URL } from '../config';
import Modal from './Modal';
import Pagination from './Pagination';
import './StaffList.css';

interface ParentStudent {
  id: number;
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

const ParentList: React.FC<{ selectedSchoolId: number | null }> = ({ selectedSchoolId }) => {
  const [parents, setParents] = useState<Parent[]>([]);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

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

      const response = await fetch(`${PARENT_API_BASE_URL}/api/Admin/parents-by-school?${params}`, {
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
      {loading ? <div className="staff-list-loading">Loading parents...</div> : parents.length === 0 ? (
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
                  <td style={{ fontWeight: 600 }}>{parent.name}</td>
                  <td>{parent.relationship || '-'}</td>
                  <td>{parent.email || '-'}</td>
                  <td>{parent.phoneNumber || '-'}</td>
                  <td>
                    {parent.students.length === 0 ? '-' : parent.students.map(student => (
                      <div key={student.id}>
                        <span style={{ fontWeight: 600 }}>{student.studentName}</span>
                        <span style={{ color: '#718096', fontSize: '12px' }}>
                          {' '}({student.className || '-'} - {student.sectionName || '-'})
                        </span>
                      </div>
                    ))}
                  </td>
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

      <Modal isOpen={!!selectedParent} onClose={() => setSelectedParent(null)}
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
                  <thead><tr><th>Name</th><th>Roll No.</th><th>Class</th><th>Section</th></tr></thead>
                  <tbody>{selectedParent.students.map(student => (
                    <tr key={student.id}><td>{student.studentName}</td><td>{student.rollNumber || '-'}</td><td>{student.className || '-'}</td><td>{student.sectionName || '-'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ParentList;
