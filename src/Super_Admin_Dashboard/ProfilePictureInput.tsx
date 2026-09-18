import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';

export const profilePictureUrl = (url?: string | null) =>
  url ? (/^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`) : '';

interface Props {
  id: string;
  currentUrl?: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
}

const ProfilePictureInput: React.FC<Props> = ({ id, currentUrl, file, onChange }) => {
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const imageUrl = preview || profilePictureUrl(currentUrl);
  return (
    <div className="profile-upload-area">
      <button type="button" className="profile-upload-circle" style={{ padding: 0 }} aria-label="Choose profile picture" onClick={() => inputRef.current?.click()}>
        {imageUrl ? <img src={imageUrl} alt="Profile preview" /> : <span aria-hidden="true">+</span>}
      </button>
      <label htmlFor={id} className="profile-upload-title">Change Profile Picture</label>
      <input ref={inputRef} id={id} type="file" accept="image/jpeg,image/png,image/webp"
        onChange={event => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size === 0 || selected.size > 5 * 1024 * 1024) {
            setError('Choose a JPG, PNG, or WebP image up to 5 MB.');
            event.target.value = '';
            return;
          }
          setError('');
          onChange(selected);
        }} />
      <small>JPG, PNG or WebP · Max 5 MB</small>
      {file && <button type="button" className="btn" onClick={() => {
        onChange(null);
        setError('');
        if (inputRef.current) inputRef.current.value = '';
      }}>Undo picture change</button>}
      {error && <p role="alert" className="error-message">{error}</p>}
    </div>
  );
};

export default ProfilePictureInput;
