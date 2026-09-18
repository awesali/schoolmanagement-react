import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditStaff from './EditStaff';
import EditStudent from './EditStudent';

const person = {
  id: 7, name: 'Test Person', studentName: 'Test Person', email: 'test@example.com',
  phone: '1234567890', phoneNumber: '1234567890', dob: '2000-01-01', doj: '2020-01-01',
  genderCode: 'M', roleId: 1, roleName: 'Teacher', schoolName: 'School', address: 'Address',
  schoolId: 1, className: 'Class 1', sectionName: 'A', academicSession: '2026',
  isActive: true, documents: [], profilePictureUrl: '/profilepictures/current.jpg',
};

beforeEach(() => {
  global.fetch = jest.fn().mockImplementation((_url, options) => Promise.resolve({
    ok: true,
    json: async () => options?.method === 'PUT' ? { success: true } : { success: false },
  }));
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe.each(['staff', 'student'] as const)('%s profile picture editing', kind => {
  const setup = () => {
    const onSuccess = jest.fn();
    const onClose = jest.fn();
    const view = render(kind === 'staff'
      ? <EditStaff isOpen staff={person} onSuccess={onSuccess} onClose={onClose} />
      : <EditStudent isOpen student={person} schoolId={1} onSuccess={onSuccess} onClose={onClose} />);
    return { ...view, onSuccess, onClose };
  };
  const submittedBody = () => (fetch as jest.Mock).mock.calls.find(([, options]) => options?.method === 'PUT')?.[1].body as FormData;

  test('previews and sends a replacement separately from documents', async () => {
    const { container, onSuccess } = setup();
    expect(screen.getByAltText('Profile preview')).toHaveAttribute('src', expect.stringContaining('/profilepictures/current.jpg'));
    const picture = new File(['image'], 'new.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Change Profile Picture'), { target: { files: [picture] } });
    expect(screen.getByAltText('Profile preview')).toHaveAttribute('src', 'blob:preview');
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(submittedBody().get('ProfilePicture')).toBe(picture);
    expect(submittedBody().has('Files')).toBe(false);
  });

  test('undo keeps the existing picture and omits the upload', async () => {
    const { container, onSuccess } = setup();
    fireEvent.change(screen.getByLabelText('Change Profile Picture'), { target: { files: [new File(['image'], 'new.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByText('Undo picture change'));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(screen.getByAltText('Profile preview')).toHaveAttribute('src', expect.stringContaining('/profilepictures/current.jpg'));
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(submittedBody().has('ProfilePicture')).toBe(false);
  });

  test('rejects unsupported and oversized images', () => {
    setup();
    for (const file of [new File(['text'], 'file.txt', { type: 'text/plain' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })]) {
      fireEvent.change(screen.getByLabelText('Change Profile Picture'), { target: { files: [file] } });
      expect(screen.getByRole('alert')).toHaveTextContent('up to 5 MB');
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    }
  });

  test('shows backend errors and keeps the edit form open', async () => {
    const { container, onClose } = setup();
    (fetch as jest.Mock).mockImplementation(async () => ({ ok: false, json: async () => ({ success: false, message: 'Upload failed' }) }));
    fireEvent.submit(container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload failed');
    expect(onClose).not.toHaveBeenCalled();
  });
});
