import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "./SupportPage.css";

export function SupportForm() {
  const [subject, setSubject] = useState("");
  const [problem, setProblem] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const token = localStorage.getItem("token");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    if (screenshot && screenshot.size > 5 * 1024 * 1024) {
      setMessage("Screenshot must be 5 MB or smaller.");
      setSent(false);
      return;
    }
    setSending(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("subject", subject.trim());
      form.append("problem", problem.trim());
      if (screenshot) form.append("screenshot", screenshot);
      const response = await fetch(`${API_BASE_URL}/api/support-requests`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message || "Support request could not be sent. Please try again.");
      }
      setSent(true);
      setSubject("");
      setProblem("");
      setScreenshot(null);
      setFileInputKey((value) => value + 1);
      setMessage("Your support request was sent successfully.");
    } catch (error) {
      setSent(false);
      setMessage(error instanceof Error ? error.message : "Support request could not be sent.");
    } finally {
      setSending(false);
    }
  };

  return <div className="support-form-wrap">
      <div className="support-card">
        <span className="support-eyebrow">ACADEMIC RIGOR SUPPORT</span>
        <h1>How can we help?</h1>
        <p>Describe the issue you are facing. Our support team will receive your request by email.</p>
        <form onSubmit={submit}>
          <label htmlFor="support-subject">Subject</label>
          <input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={150} minLength={3} required placeholder="Briefly describe the issue" />
          <label htmlFor="support-problem">Problem</label>
          <textarea id="support-problem" value={problem} onChange={(event) => setProblem(event.target.value)} maxLength={4000} minLength={10} required rows={7} placeholder="Tell us what happened and where you saw it" />
          <label htmlFor="support-screenshot">Screenshot <span className="support-optional">(optional)</span></label>
          <input key={fileInputKey} id="support-screenshot" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setScreenshot(file);
            setMessage(file && file.size > 5 * 1024 * 1024 ? "Screenshot must be 5 MB or smaller." : "");
            setSent(false);
          }} />
          <small className="support-file-hint">PNG, JPG or WebP, up to 5 MB.</small>
          {message && <div role="status" className={sent ? "support-success" : "support-error"}>{message}</div>}
          <button type="submit" disabled={sending}>{sending ? "Sending…" : "Send support request"}</button>
        </form>
      </div>
  </div>;
}

export default function SupportPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  let role = "";
  try {
    const payload = JSON.parse(atob((token || "").split(".")[1]));
    role = String(payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.RoleName || "");
  } catch { /* The API validates the session. */ }
  const dashboard = role.toLowerCase() === "student" ? "/student" : "/dashboard";
  return <main className="support-page"><div className="support-shell">
    <button type="button" className="support-back" onClick={() => navigate(dashboard)}>← Back to dashboard</button>
    <SupportForm />
  </div></main>;
}
