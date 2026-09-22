import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccountProfile from './AccountProfile';
const mockSuccess = jest.fn(), mockError = jest.fn();
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>, Navigate: () => null }), { virtual: true });
jest.mock('../components/Toast/Toast', () => ({ useToast: () => ({ success: mockSuccess, error: mockError }) }));
jest.mock('./ProfilePictureInput', () => ({ __esModule: true, default: ({ onChange }: any) => <input aria-label="Profile Picture" type="file" onChange={(e: any) => onChange(e.target.files[0])} /> }));
const profile = { id: 1, name: 'Admin User', email: 'admin@test.com', phone: '9876543210', roleName: 'Super Admin', schoolName: 'Test School' };
const response = (data: any, ok = true) => Promise.resolve({ ok, text: async () => JSON.stringify(data) });
beforeEach(() => { localStorage.setItem('token', 'token'); mockSuccess.mockReset(); mockError.mockReset(); global.fetch = jest.fn(() => response(profile)) as any; });
test('loads account details and updates name, phone and image using multipart data', async () => {
 (global.fetch as jest.Mock).mockImplementationOnce(() => response(profile)).mockImplementationOnce((_url: string, options: any) => response({ success: true, data: { ...profile, name: options.body.get('Name') } }));
 render(<AccountProfile />); expect(await screen.findByDisplayValue('Admin User')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'Updated Admin' } });
 const file = new File(['logo'], 'profile.png', { type: 'image/png' }); fireEvent.change(screen.getByLabelText('Profile Picture'), { target: { files: [file] } });
 fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));
 await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
 const options = (global.fetch as jest.Mock).mock.calls[1][1]; expect(options.method).toBe('PUT'); expect(options.body.get('Name')).toBe('Updated Admin'); expect(options.body.get('ProfilePicture')).toBe(file); expect(options.headers['Content-Type']).toBeUndefined();
});
test('validates password confirmation before API and submits current password on success', async () => {
 (global.fetch as jest.Mock).mockImplementationOnce(() => response(profile)).mockImplementationOnce(() => response({ success: true }));
 render(<AccountProfile />); await screen.findByDisplayValue('Admin User');
 fireEvent.change(screen.getByLabelText('Current Password *'), { target: { value: 'Current123' } }); fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'NewPass123' } }); fireEvent.change(screen.getByLabelText('Confirm New Password *'), { target: { value: 'Different123' } }); fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
 expect(mockError).toHaveBeenCalledWith('New password and confirmation do not match.'); expect(global.fetch).toHaveBeenCalledTimes(1);
 fireEvent.change(screen.getByLabelText('Confirm New Password *'), { target: { value: 'NewPass123' } }); fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
 await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2)); const body=JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body); expect(body.currentPassword).toBe('Current123'); expect(body.newPassword).toBe('NewPass123');
});
