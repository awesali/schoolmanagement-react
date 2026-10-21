// Login: imports and dependencies
import React, { useState } from "react";
import { useToastMessageState } from "../components/Toast/Toast";
import { LoadingButton } from "../components/Loader/Loader";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./Login.css";

// Main component and state
const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useToastMessageState("error");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          accept: "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        if (data.schoolId) {
          localStorage.setItem("schoolId", data.schoolId.toString());
        }
        navigate("/dashboard", { replace: true });
      } else {
        const staffError = await response.text();
        const studentResponse = await fetch(
          `${API_BASE_URL}/api/StudentParentAuth/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim(), password }),
          },
        );
        if (studentResponse.ok) {
          const result = await studentResponse.json();
          const token = result.data as string;
          const payload = JSON.parse(atob(token.split(".")[1]));
          const role =
            payload[
              "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
            ] || payload.RoleName;
          if (String(role).toLowerCase() !== "student")
            throw new Error("This portal is for students only.");
          localStorage.setItem("token", token);
          localStorage.removeItem("schoolId");
          navigate("/student", { replace: true });
        } else {
          const studentError = await studentResponse.json().catch(() => null);
          const blocked = "You are temporarily blocked. Please contact your school.";
          if (staffError.includes(blocked) || studentError?.message === blocked)
            setError(blocked);
          else if (studentError?.message?.includes("verify your email"))
            setError(studentError.message);
          else setError("Invalid email or password.");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-story" aria-label="School Management introduction">
          <img src="/landing/login-school.webp" alt="Students and teacher on a school campus" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/landing/school-day.webp"; }} />
          <div className="login-story-shade" />
          <Link className="login-brand login-brand-on-image" to="/" aria-label="School Management home">
            <span className="login-brand-mark" aria-hidden="true"><span /></span>
            <span>School<span>Management</span></span>
          </Link>
          <div className="login-story-content">
            <span className="login-story-kicker">ONE CONNECTED SCHOOL WORKSPACE</span>
            <h2>Make room for what matters most.</h2>
            <p>One welcoming place for your school day, from classroom moments to the bigger picture.</p>
            <div className="login-story-pills"><span>School teams</span><span>Teachers</span><span>Students</span></div>
          </div>
          <span className="login-story-corner" aria-hidden="true">✦</span>
        </aside>

        <main className="login-main">
          <div className="login-main-top">
            <Link className="login-back" to="/"><span aria-hidden="true">←</span> Back to home</Link>
            <span className="login-top-note">Your school, in one place.</span>
          </div>
          <div className="login-content">
            <span className="login-eyebrow"><span /> WELCOME BACK</span>
            <h1>Good to see you again.</h1>
            <p className="login-intro">Sign in with the credentials provided by your school.</p>
            <form className="login-form" onSubmit={handleLogin}>
              <div className="login-form-group">
                <label htmlFor="login-email">Email address</label>
                <input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.com" required />
              </div>
              <div className="login-form-group">
                <label htmlFor="login-password">Password</label>
                <div className="login-password-field">
                  <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                  <button type="button" className="login-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
                </div>
              </div>
              {error && <div className="login-error" role="alert">{error}</div>}
              <LoadingButton type="submit" className="btn btn-primary login-submit" loading={loading} loadingText="Signing in...">Sign in <span aria-hidden="true">→</span></LoadingButton>
            </form>
            <div className="login-help"><span className="login-help-symbol" aria-hidden="true">?</span><p>Need access or having trouble signing in?<br /><strong>Contact your school administrator.</strong></p></div>
          </div>
          <div className="login-main-bottom">Part of <a href="https://cognerasystems.com/" target="_blank" rel="noopener noreferrer">Cognera Systems</a></div>
        </main>
      </div>
    </div>
  );
};

export default Login;
