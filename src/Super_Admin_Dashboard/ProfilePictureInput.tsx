import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import { CloseIcon } from '../components/Icons/Icons';

export const profilePictureUrl = (url?: string | null) =>
  url ? (/^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`) : '';

interface Props {
  id: string;
  currentUrl?: string | null;
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  undoAsIcon?: boolean;
}

const ProfilePictureInput: React.FC<Props> = ({ id, currentUrl, file, onChange, label = 'Profile Picture', undoAsIcon = false }) => {
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
  const undoChange = () => {
    onChange(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };
  return (
    <div className="profile-upload-area">
      <div className="profile-upload-control">
        <button type="button" className="profile-upload-circle" style={{ padding: 0 }} aria-label={`Choose ${label.toLowerCase()}`} onClick={() => inputRef.current?.click()}>
          {imageUrl ? <img src={imageUrl} alt={`${label} preview`} /> : <span aria-hidden="true">+</span>}
        </button>
        {file && undoAsIcon && <button type="button" className="profile-upload-undo" title={`Undo ${label.toLowerCase()} change`}
          aria-label={`Undo ${label.toLowerCase()} change`} onClick={undoChange}><CloseIcon size={16} /></button>}
      </div>
      <label htmlFor={id} className="profile-upload-title">{imageUrl ? `Change ${label}` : `Add ${label}`}</label>
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
      {file && !undoAsIcon && <button type="button" className="btn" onClick={undoChange}>Undo {label.toLowerCase()} change</button>}
      {error && <p role="alert" className="error-message">{error}</p>}
    </div>
  );
};

export default ProfilePictureInput;
