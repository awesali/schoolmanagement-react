import React, { useState } from 'react';
import { profilePictureUrl } from './ProfilePictureInput';
import './StaffList.css';

const ProfileListAvatar: React.FC<{ name: string; pictureUrl?: string | null; onView: () => void }> = ({ name, pictureUrl, onView }) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = profilePictureUrl(pictureUrl);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : parts[0]?.[0].toUpperCase() || '?';

  return imageUrl && failedUrl !== imageUrl ? (
    <button type="button" className="staff-list-avatar staff-photo-button" onClick={onView} aria-label={`View ${name}'s profile photo`}>
      <img src={imageUrl} alt={`${name} profile`} onError={() => setFailedUrl(imageUrl)} />
    </button>
  ) : (
    <div className="staff-list-avatar"><span role="img" aria-label={`${name} initials`}>{initials}</span></div>
  );
};

export default ProfileListAvatar;
