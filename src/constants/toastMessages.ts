export const TOAST_MESSAGES = {
  common: { networkError: 'Network error. Please try again.', unexpectedError: 'Something went wrong. Please try again.' },
  school: { created: 'School created successfully!', createFailed: 'Failed to create school.' },
  document: { deleted: 'Document deleted successfully.', deleteFailed: 'Failed to delete document.' },
  attendance: {
    staffRequired: 'Please mark your attendance as Present or Absent.',
    studentsRequired: (count: number) => `Please mark attendance for all students. ${count} student(s) are still unmarked.`,
    saved: (date: string) => `Attendance marked successfully for ${date}!`,
    saveFailed: 'Failed to mark attendance.',
    saveError: 'An error occurred while marking attendance.',
  },
  dependency: {
    classRequired: 'Please create a class before adding a student.',
    teacherRequired: 'Please add a teacher before creating a class.',
  },
} as const;
