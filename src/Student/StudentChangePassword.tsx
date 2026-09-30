// Student Change Password: imports and dependencies
import StudentIcon from "./StudentIcon";
import React, { useState } from "react";
import { API_BASE_URL } from "../config";

// Main component and state
export default function StudentChangePassword() {
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Constants and helper functions
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (
      passwords.newPassword.length < 8 ||
      passwords.newPassword.length > 128
    ) {
      setError("New password must contain 8 to 128 characters.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (passwords.currentPassword === passwords.newPassword) {
      setError("New password must be different from the current password.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/StudentPortal/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(passwords),
        },
      );
      const result = await response.json();
      if (!response.ok || result.success === false)
        throw new Error(result.message || "Unable to change password.");
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess("Password changed successfully.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to change password.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sp-password-page">
      <div className="sp-section-intro">
        <h2>Change Password</h2>
        <p>Update the password you use to sign in to your student account.</p>
      </div>
      <section className="sp-panel sp-password-card">
        <form onSubmit={submit}>
          <label htmlFor="student-current-password">Current password</label>
          <input
            id="student-current-password"
            type="password"
            autoComplete="current-password"
            required
            value={passwords.currentPassword}
            onChange={(event) =>
              setPasswords((value) => ({
                ...value,
                currentPassword: event.target.value,
              }))
            }
          />
          <label htmlFor="student-new-password">New password</label>
          <input
            id="student-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={passwords.newPassword}
            onChange={(event) =>
              setPasswords((value) => ({
                ...value,
                newPassword: event.target.value,
              }))
            }
          />
          <small>Use 8 to 128 characters.</small>
          <label htmlFor="student-confirm-password">Confirm new password</label>
          <input
            id="student-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={passwords.confirmPassword}
            onChange={(event) =>
              setPasswords((value) => ({
                ...value,
                confirmPassword: event.target.value,
              }))
            }
          />
          {error && (
            <p className="sp-password-error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="sp-password-success" role="status">
              {success}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            <StudentIcon name="check" />
            {busy ? "Changing password..." : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
