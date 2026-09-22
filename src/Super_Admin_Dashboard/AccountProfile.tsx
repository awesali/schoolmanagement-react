import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { BackIcon } from '../components/Icons/Icons';
import { LoadingButton, PageLoader } from '../components/Loader/Loader';
import { useToast } from '../components/Toast/Toast';
import ProfilePictureInput from './ProfilePictureInput';
import './AccountProfile.css';

interface AccountDetails {
  id: number;
  name: string;
  email: string;
  phone?: string;
  roleName?: string;
  schoolName?: string;
  profilePictureUrl?: string | null;
}

const AccountProfile: React.FC = () => {
  const toast = useToast();
  const [profile, setProfile] = useState<AccountDetails | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [picture, setPicture] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  const readResponse = async (response: Response, fallback: string) => {
    const text = await response.text();
    let result: any = {};
    try { result = text ? JSON.parse(text) : {}; } catch { throw new Error(fallback); }
    if (!response.ok || result.success === false) throw new Error(result.message || fallback);
    return result;
  };
  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, { headers: headers() });
      const result = await readResponse(response, 'Unable to load your profile.');
      setProfile(result); setName(result.name || ''); setPhone(result.phone || '');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load your profile.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { toast.error('Enter your name.'); return; }
    if (phone && !/^\d{10}$/.test(phone)) { toast.error('Phone number must contain 10 digits.'); return; }
    setSaving(true);
    try {
      const body = new FormData(); body.append('Name', cleanName); body.append('Phone', phone);
      if (picture) body.append('ProfilePicture', picture);
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, { method: 'PUT', headers: headers(), body });
      const result = await readResponse(response, 'Unable to update your profile.');
      setProfile(result.data); setName(result.data.name || ''); setPhone(result.data.phone || ''); setPicture(null);
      toast.success('Profile updated successfully.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update your profile.'); }
    finally { setSaving(false); }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwords.newPassword.length < 8) { toast.error('New password must contain at least 8 characters.'); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error('New password and confirmation do not match.'); return; }
    if (passwords.currentPassword === passwords.newPassword) { toast.error('New password must be different from the current password.'); return; }
    setChangingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(passwords),
      });
      await readResponse(response, 'Unable to change password.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to change password.'); }
    finally { setChangingPassword(false); }
  };

  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  if (loading) return <PageLoader label="Loading profile..." />;
  return <main className="account-profile-page">
    <Link className="staff-profile-back" to="/dashboard"><BackIcon />Back to Dashboard</Link>
    <header><h1>My Profile</h1><p>View and update your account details.</p></header>
    {!profile ? <section className="account-profile-card"><p>Profile details could not be loaded.</p><button className="btn btn-secondary" onClick={loadProfile}>Retry</button></section> : <div className="account-profile-grid">
      <section className="account-profile-card">
        <h2>Profile Details</h2>
        <form onSubmit={saveProfile}>
          <ProfilePictureInput id="account-profile-picture" currentUrl={profile.profilePictureUrl} file={picture} onChange={setPicture} label="Profile Picture" undoAsIcon />
          <div className="form-group"><label htmlFor="account-name">Name *</label><input id="account-name" value={name} maxLength={150} onChange={e => setName(e.target.value)} required /></div>
          <div className="form-group"><label>Email</label><input value={profile.email} disabled /></div>
          <div className="form-group"><label htmlFor="account-phone">Phone</label><input id="account-phone" value={phone} inputMode="numeric" maxLength={10} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
          <div className="account-readonly"><div><span>Role</span><strong>{profile.roleName || '-'}</strong></div><div><span>School</span><strong>{profile.schoolName || '-'}</strong></div></div>
          <LoadingButton type="submit" className="btn btn-primary" loading={saving} loadingText="Saving profile...">Save Profile</LoadingButton>
        </form>
      </section>
      <section className="account-profile-card">
        <h2>Change Password</h2>
        <form onSubmit={changePassword}>
          <div className="form-group"><label htmlFor="current-password">Current Password *</label><input id="current-password" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={e => setPasswords(v => ({ ...v, currentPassword: e.target.value }))} required /></div>
          <div className="form-group"><label htmlFor="new-password">New Password *</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} value={passwords.newPassword} onChange={e => setPasswords(v => ({ ...v, newPassword: e.target.value }))} required /><small>Minimum 8 characters.</small></div>
          <div className="form-group"><label htmlFor="confirm-password">Confirm New Password *</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={passwords.confirmPassword} onChange={e => setPasswords(v => ({ ...v, confirmPassword: e.target.value }))} required /></div>
          <LoadingButton type="submit" className="btn btn-primary" loading={changingPassword} loadingText="Changing password...">Change Password</LoadingButton>
        </form>
      </section>
    </div>}
  </main>;
};
export default AccountProfile;
