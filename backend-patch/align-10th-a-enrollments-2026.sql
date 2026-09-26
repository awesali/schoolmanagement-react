-- Review before running against the configured SchoolManagement database.
-- Exam 15 (yearly 2026) uses active session 17; these three Class 10 A
-- enrollments at school 13 still reference inactive session 16.
-- The enrollment IDs remain the same, preserving linked attendance records.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (
    SELECT 1 FROM dbo.StudentEnrollment
    WHERE StudentId IN (200, 202, 203) AND SessionId = 17
)
    THROW 51001, 'A target student already has a session 17 enrollment.', 1;

IF (
    SELECT COUNT(*) FROM dbo.StudentEnrollment
    WHERE Id IN (210, 212, 213) AND SchoolId = 13
      AND ClassId = 49 AND SectionId = 51 AND SessionId = 16
      AND IsActive = 1 AND EnrollmentStatus = 'Active'
) <> 3
    THROW 51002, 'Enrollment scope changed; no records were updated.', 1;

IF NOT EXISTS (
    SELECT 1 FROM dbo.AcademicSessions
    WHERE Id = 17 AND SchoolId = 13 AND IsActive = 1
)
    THROW 51003, 'Target academic session is not active.', 1;

UPDATE dbo.StudentEnrollment
SET SessionId = 17, Updated_Date = SYSUTCDATETIME()
WHERE Id IN (210, 212, 213) AND SchoolId = 13
  AND ClassId = 49 AND SectionId = 51 AND SessionId = 16;

IF @@ROWCOUNT <> 3
    THROW 51004, 'Unexpected update count.', 1;

COMMIT TRANSACTION;
