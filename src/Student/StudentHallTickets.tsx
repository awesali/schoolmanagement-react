// Student Hall Tickets: imports and dependencies
import StudentIcon from "./StudentIcon";
import React, { useState } from "react";
import { profilePictureUrl } from "../Super_Admin_Dashboard/ProfilePictureInput";
import "./StudentHallTickets.css";

// Data types and contracts
type Row = Record<string, any>;

// Main component and state
function Avatar({
  name,
  url,
  school = false,
}: {
  name: string;
  url?: string | null;
  school?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || (school ? "S" : "ST");
  return (
    <div className={`sht-avatar ${school ? "sht-logo" : ""}`}>
      {url && !broken ? (
        <img
          src={profilePictureUrl(url)}
          alt={school ? `${name} logo` : `${name} photo`}
          onError={() => setBroken(true)}
        />
      ) : (
        <span aria-label={school ? "School avatar" : "Student avatar"}>
          {initials}
        </span>
      )}
    </div>
  );
}

export default function StudentHallTickets({
  tickets = [],
  profile = {},
  parent,
  initialTicketId = null,
}: {
  tickets?: Row[];
  profile?: Row;
  parent?: Row | null;
  initialTicketId?: number | null;
}) {
  const [openTicketId, setOpenTicketId] = useState<number | null>(
    initialTicketId,
  );
  if (!tickets.length)
    return <div className="sp-empty">No hall tickets published yet.</div>;
  if (
    openTicketId === null ||
    !tickets.some((ticket) => Number(ticket.id) === openTicketId)
  )
    return (
      <div className="sht-choices">
        {tickets.map((ticket) => (
          <button
            type="button"
            className="sht-choice"
            aria-label={ticket.examName + " View hall ticket"}
            key={ticket.id}
            onClick={() => setOpenTicketId(Number(ticket.id))}
          >
            <span>
              <small>HALL TICKET</small>
              <strong>{ticket.examName}</strong>
            </span>
            <span className="sp-view-eye" title="View hall ticket">
              <StudentIcon name="preview" size={21} />
            </span>
          </button>
        ))}
      </div>
    );

  // Constants and helper functions
  const schoolName = profile.schoolName || "School";
  const studentName = profile.studentName || "Student";
  return (
    <div className="sht-list">
      <button
        type="button"
        className="sht-back"
        onClick={() => setOpenTicketId(null)}
      >
        <StudentIcon name="back" />
        Back to hall tickets
      </button>
      {tickets
        .filter((ticket) => Number(ticket.id) === openTicketId)
        .map((ticket) => (
          <article
            className="sht-card"
            key={ticket.id}
            aria-label={`${ticket.examName} hall ticket`}
          >
            <header className="sht-header">
              <Avatar school name={schoolName} url={profile.schoolLogoUrl} />
              <div>
                <span className="sht-overline">OFFICIAL HALL TICKET</span>
                <h3>{schoolName}</h3>
              </div>
            </header>
            <div className="sht-exam">
              <div>
                <span className="sht-label">EXAMINATION</span>
                <strong>{ticket.examName}</strong>
              </div>
              <span className="sht-status">Admit card</span>
            </div>
            <div className="sht-person">
              <Avatar name={studentName} url={profile.profilePictureUrl} />
              <div>
                <span className="sht-label">STUDENT NAME</span>
                <strong>{studentName}</strong>
                <span>
                  {[profile.className, profile.sectionName]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </div>
            <dl className="sht-details">
              <div>
                <dt>Roll number</dt>
                <dd>{profile.rollNumber || "—"}</dd>
              </div>
              <div>
                <dt>Parent name</dt>
                <dd>{parent?.name || "—"}</dd>
              </div>
              <div>
                <dt>Room number</dt>
                <dd>{ticket.room || "—"}</dd>
              </div>
              <div>
                <dt>Seat number</dt>
                <dd>{ticket.seatNumber || "—"}</dd>
              </div>
              <div className="sht-venue">
                <dt>Venue</dt>
                <dd>
                  {ticket.venue || profile.schoolAddress || "To be announced"}
                </dd>
              </div>
            </dl>
            {ticket.documentUrl && /^https?:\/\//i.test(ticket.documentUrl) && (
              <footer className="sht-footer">
                <a href={ticket.documentUrl} target="_blank" rel="noreferrer">
                  Open attached ticket <StudentIcon name="external" />
                </a>
              </footer>
            )}
          </article>
        ))}
    </div>
  );
}
