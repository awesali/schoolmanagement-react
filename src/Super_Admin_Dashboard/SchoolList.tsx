// School List: imports and dependencies
import React, { useState, useEffect } from "react";
import { PageLoader } from "../components/Loader/Loader";
import { loadAdminSchools } from "./loadAdminSchools";
import CreateSchool, { SchoolDetails } from "./CreateSchool";
import { EditIcon } from "../components/Icons/Icons";
import { profilePictureUrl } from "./ProfilePictureInput";
import "./SchoolList.css";

// Data types and contracts
interface School extends SchoolDetails {
  id: number;
  schoolName: string;
  address: string;
  email: string;
  phone: string;
  superAdminId: number;
  created_Date: string;
}

interface SchoolListProps {
  onSchoolsChanged?: () => void;
}

// Main component and state
const SchoolList: React.FC<SchoolListProps> = ({ onSchoolsChanged }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    setError("");
    try {
      setSchools(await loadAdminSchools<School>());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the school service. Please retry.",
      );
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
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={fetchSchools}
          >
            Retry loading schools
          </button>
        </div>
      ) : schools.length === 0 ? (
        <div
          className="school-list-loading"
          style={{ textAlign: "center", padding: "40px", color: "#666" }}
        >
          No active schools are linked to this account. Check that you are
          signed in with the super admin account that created the school.
        </div>
      ) : (
        <div className="school-cards">
          {schools.map((school) => (
            <div key={school.id} className="school-card">
              <div className="school-card-header">
                <div className="school-card-title">
                  {school.logoUrl ? (
                    <img
                      src={profilePictureUrl(school.logoUrl)}
                      alt={`${school.schoolName} logo`}
                    />
                  ) : (
                    <span>
                      {school.schoolName.trim()[0]?.toUpperCase() || "S"}
                    </span>
                  )}
                  <h3>{school.schoolName}</h3>
                </div>
                <button
                  type="button"
                  className="school-edit-button"
                  title="Edit School"
                  aria-label={`Edit School: ${school.schoolName}`}
                  onClick={() => setEditingSchool(school)}
                >
                  <EditIcon />
                </button>
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
                  <span className="info-value">{school.email || "N/A"}</span>
                </div>
                <div className="school-info">
                  <span className="info-label">Created:</span>
                  <span className="info-value">
                    {new Date(school.created_Date).toLocaleDateString()}
                  </span>
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
        onSuccess={() => {
          fetchSchools();
          onSchoolsChanged?.();
        }}
      />
    </div>
  );
};

export default SchoolList;
