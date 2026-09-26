import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StudentHallTickets from './StudentHallTickets';

test('shows hall-ticket identity, venue and avatar fallbacks', () => {
  render(<StudentHallTickets
    tickets={[{ id: 1, examName: 'Annual Exam', room: 'B-12', seatNumber: 'S-7', venue: 'Main Campus' }]}
    profile={{ studentName: 'Asha Khan', rollNumber: '42', schoolName: 'Green Valley School', className: '10', sectionName: 'A' }}
    parent={{ name: 'Sara Khan' }}
  />);
  expect(screen.getByText('Green Valley School')).toBeInTheDocument();
  expect(screen.getByText('Asha Khan')).toBeInTheDocument();
  expect(screen.getByText('42')).toBeInTheDocument();
  expect(screen.getByText('B-12')).toBeInTheDocument();
  expect(screen.getByText('S-7')).toBeInTheDocument();
  expect(screen.getByText('Main Campus')).toBeInTheDocument();
  expect(screen.getByText('Sara Khan')).toBeInTheDocument();
  expect(screen.getByLabelText('School avatar')).toHaveTextContent('GV');
  expect(screen.getByLabelText('Student avatar')).toHaveTextContent('AK');
});

test('falls back to school address and avatar when photo fails', () => {
  render(<StudentHallTickets tickets={[{ id: 2, examName: 'Science Exam' }]}
    profile={{ studentName: 'Asha Khan', schoolName: 'Green Valley', schoolAddress: 'Main Road', profilePictureUrl: '/missing.png' }} />);
  fireEvent.error(screen.getByAltText('Asha Khan photo'));
  expect(screen.getByLabelText('Student avatar')).toHaveTextContent('AK');
  expect(screen.getByText('Main Road')).toBeInTheDocument();
});
