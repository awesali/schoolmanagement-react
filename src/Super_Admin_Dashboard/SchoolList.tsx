// School List: imports and dependencies
import React, { useState, useEffect } from "react";
import { PageLoader } from "../components/Loader/Loader";
import { API_BASE_URL } from "../config";
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
  emailVerificationRequired: boolean;
}

interface SchoolListProps {
  onSchoolsChanged?: () => void;
}

// Main component and state
const SchoolList: React.FC<SchoolListProps> = ({ onSchoolsChanged }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [savingVerificationFor, setSavingVerificationFor] = useState<number | null>(null);
  const [settingError, setSettingError] = useState("");

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/api/Admin/School-by-superadmin`,
        {
          headers: {
            accept: "*/*",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSchools(result.data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch schools");
    } finally {
      setLoading(false);
    }
  };

  const setVerification = async (school: School, required: boolean) => {
    setSavingVerificationFor(school.id);
    setSettingError("");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Admin/schools/${school.id}/email-verification`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ required }),
        },
      );
      if (!response.ok) throw new Error("Could not save the school setting.");
      setSchools((current) =>
        current.map((item) =>
          item.id === school.id
            ? { ...item, emailVerificationRequired: required }
            : item,
        ),
      );
    } catch (error) {
      setSettingError(error instanceof Error ? error.message : "Could not save the school setting.");
    } finally {
      setSavingVerificationFor(null);
    }
  };
  if (loading) {
    return <PageLoader label="Loading schools..." />;
  }

  return (
    <div className="school-list-container">
      <h2>School List</h2>
      {settingError && <p role="alert" className="school-setting-error">{settingError}</p>}
      {schools.length === 0 ? (
        <div
          className="school-list-loading"
          style={{ textAlign: "center", padding: "40px", color: "#666" }}
        >
          No schools available. Please create a new school.
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
                <div className="school-email-setting">
                  <div>
                    <strong>Email verification</strong>
                    <p>When on, new staff, students and parents must verify their inbox before signing in. Existing pending accounts keep this requirement.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={school.emailVerificationRequired !== false}
                    aria-label={`Require email verification for ${school.schoolName}`}
                    className={`school-setting-switch ${school.emailVerificationRequired !== false ? "is-on" : "is-off"}`}
                    disabled={savingVerificationFor === school.id}
                    onClick={() => setVerification(school, school.emailVerificationRequired === false)}
                  >
                    <span className="school-setting-switch-track" aria-hidden="true">
                      <span className="school-setting-switch-thumb" />
                    </span>
                    <span className="school-setting-switch-label">
                      {school.emailVerificationRequired !== false ? "On" : "Off"}
                    </span>
                  </button>
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
