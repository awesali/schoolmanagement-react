import React from 'react';
import './ProfileIdCard.css';

export interface ProfileIdCardField {
  label: string;
  value?: React.ReactNode;
}

interface ProfileIdCardProps {
  name: string;
  type: 'Student' | 'Employee';
  identifier: string;
  subtitle: string;
  organization?: string;
  status: boolean;
  fields: ProfileIdCardField[];
  onEdit?: () => void;
}

const initialsFor = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';

const ProfileIdCard: React.FC<ProfileIdCardProps> = ({
  name, type, identifier, subtitle, organization, status, fields, onEdit
}) => (
  <div className="profile-card-shell">
    <article className="profile-id-card">
      <header className="profile-card-brand">
        <div>
          <span className="profile-card-eyebrow">{organization || 'School Management System'}</span>
          <h2>{type} Identity Card</h2>
        </div>
        <span className="profile-card-mark">ID</span>
      </header>

      <section className="profile-card-person">
        <div className="profile-card-avatar" aria-label={`${name} initials`}>
          {initialsFor(name)}
        </div>
        <div className="profile-card-person-copy">
          <h3>{name}</h3>
          <p>{subtitle}</p>
          <span className={`profile-card-status ${status ? 'active' : 'inactive'}`}>
            {status ? 'Active' : 'Inactive'}
          </span>
        </div>
      </section>

      <dl className="profile-card-details">
        {fields.map(field => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value || '—'}</dd>
          </div>
        ))}
      </dl>

      <footer className="profile-card-footer">
        <span>{identifier}</span>
        <span>Verified school record</span>
      </footer>
    </article>

    <div className="profile-card-actions">
      {onEdit && (
        <button type="button" className="profile-card-edit" onClick={onEdit}>
          Edit Profile
        </button>
      )}
      <button type="button" className="profile-card-print" onClick={() => window.print()}>
        Print ID Card
      </button>
    </div>
  </div>
);

export default ProfileIdCard;
