-- User-authorized sample marks for the 16 missing entries in yearly 2026 (exam 15).
-- Existing 24 locked marks are never updated. This script runs once and aborts
-- if the exam, enrollment, marks, configuration, or publication scope changed.
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF NOT EXISTS (SELECT 1 FROM dbo.Exams WITH (UPDLOCK, HOLDLOCK)
                   WHERE Id = 15 AND SchoolId = 13 AND AcademicSessionId = 17
                     AND Name = N'yearly 2026' AND IsActive = 1)
        THROW 51001, 'Expected yearly 2026 exam was not found.', 1;

    SELECT se.Id AS EnrollmentId, se.StudentId, se.ClassId, se.SectionId
    INTO #Students
    FROM dbo.StudentEnrollment se WITH (UPDLOCK, HOLDLOCK)
    WHERE se.SchoolId = 13 AND se.SessionId = 17
      AND se.ClassId = 49 AND se.SectionId = 51
      AND se.IsActive = 1 AND se.EnrollmentStatus = 'Active';
    IF (SELECT COUNT(*) FROM #Students) <> 4
        THROW 51002, 'Expected four active Class 10 A enrollments.', 1;
    IF EXISTS (SELECT 1 FROM #Students WHERE (EnrollmentId = 210 AND StudentId <> 200)
        OR (EnrollmentId = 212 AND StudentId <> 202)
        OR (EnrollmentId = 213 AND StudentId <> 203)
        OR (EnrollmentId = 219 AND StudentId <> 206))
        THROW 51003, 'Student/enrollment mapping changed.', 1;
    IF (SELECT COUNT(*) FROM #Students WHERE EnrollmentId IN (210, 212, 213, 219)) <> 4
        THROW 51004, 'Target enrollment list changed.', 1;

    SELECT st.EnrollmentId, st.StudentId, sc.Id AS ScheduleId, sc.SubjectId,
           config.MaxMarks, config.PassingMarks
    INTO #Expected
    FROM #Students st
    JOIN dbo.ExamSchedules sc WITH (UPDLOCK, HOLDLOCK)
      ON sc.ExamId = 15 AND sc.SchoolId = 13
     AND sc.ClassId = st.ClassId AND sc.SectionId = st.SectionId
     AND sc.IsActive = 1 AND sc.SubjectId IS NOT NULL
    OUTER APPLY (
        SELECT TOP (1) es.MaxMarks, es.PassingMarks
        FROM dbo.ExamSubjects es
        WHERE es.ExamId = 15 AND es.SchoolId = 13 AND es.ClassId = st.ClassId
          AND es.SubjectId = sc.SubjectId AND es.IsActive = 1
          AND (es.SectionId = st.SectionId OR es.SectionId IS NULL)
        ORDER BY CASE WHEN es.SectionId = st.SectionId THEN 0 ELSE 1 END
    ) config;
    IF (SELECT COUNT(*) FROM #Expected) <> 40
        THROW 51005, 'Expected exactly 40 student-subject rows.', 1;
    IF EXISTS (SELECT 1 FROM #Expected
               WHERE MaxMarks <> 100 OR PassingMarks <> 50
                  OR MaxMarks IS NULL OR PassingMarks IS NULL)
        THROW 51006, 'Subject mark configuration changed.', 1;

    CREATE TABLE #Scores (
        EnrollmentId int NOT NULL, StudentId int NOT NULL,
        ScheduleId int NOT NULL, ObtainedMarks decimal(8,2) NOT NULL
    );
    INSERT INTO #Scores (EnrollmentId, StudentId, ScheduleId, ObtainedMarks) VALUES
        (210,200,36,62), (210,200,35,84), (210,200,29,58), (210,200,34,66),
        (212,202,36,76), (212,202,35,80), (212,202,29,71), (212,202,34,73),
        (213,203,36,69), (213,203,35,76), (213,203,29,72), (213,203,34,64),
        (219,206,36,70), (219,206,35,75), (219,206,29,67), (219,206,34,72);
    IF (SELECT COUNT(*) FROM #Scores) <> 16
        THROW 51007, 'Sample score list is incomplete.', 1;
    IF EXISTS (SELECT EnrollmentId, ScheduleId FROM #Scores
               GROUP BY EnrollmentId, ScheduleId HAVING COUNT(*) <> 1)
        THROW 51008, 'Duplicate sample score.', 1;
    IF EXISTS (SELECT 1 FROM #Scores s
               LEFT JOIN #Expected e ON e.EnrollmentId = s.EnrollmentId
                   AND e.StudentId = s.StudentId AND e.ScheduleId = s.ScheduleId
               WHERE e.ScheduleId IS NULL OR s.ObtainedMarks < 0
                  OR s.ObtainedMarks > e.MaxMarks)
        THROW 51009, 'A score is outside its scheduled student/subject or max marks.', 1;

    IF (SELECT COUNT(*) FROM dbo.ExamMarks m WITH (UPDLOCK, HOLDLOCK)
        WHERE m.ExamId = 15 AND m.SchoolId = 13 AND m.IsActive = 1) <> 24
        THROW 51010, 'Existing mark count changed.', 1;
    IF (SELECT SUM(m.ObtainedMarks) FROM dbo.ExamMarks m
        WHERE m.ExamId = 15 AND m.SchoolId = 13 AND m.IsActive = 1) <> 1121
        THROW 51011, 'Existing mark values changed.', 1;
    IF EXISTS (SELECT 1 FROM dbo.ExamMarks m
               WHERE m.ExamId = 15 AND m.SchoolId = 13 AND m.IsActive = 1
                 AND (m.IsLocked <> 1 OR m.IsLocked IS NULL))
        THROW 51012, 'Existing mark lock state changed.', 1;
    IF EXISTS (SELECT 1 FROM #Scores s JOIN dbo.ExamMarks m
               ON m.EnrollmentId = s.EnrollmentId AND m.ExamScheduleId = s.ScheduleId
              AND m.ExamId = 15 AND m.SchoolId = 13 AND m.IsActive = 1)
        THROW 51013, 'A sample mark was already entered.', 1;
    IF (SELECT COUNT(*) FROM dbo.ExamResults r WITH (UPDLOCK, HOLDLOCK)
        WHERE r.ExamId = 15 AND r.SchoolId = 13 AND r.Published = 1
          AND r.EnrollmentId IN (210,212,213,219)) <> 4
        THROW 51014, 'Published result scope changed.', 1;

    INSERT INTO dbo.ExamMarks (
        SchoolId, ExamId, ExamScheduleId, StudentId, EnrollmentId,
        ObtainedMarks, Remarks, EnteredBy, Created_Date, IsLocked,
        CreatedDate, EnteredDate, IsActive
    )
    SELECT 13, 15, s.ScheduleId, s.StudentId, s.EnrollmentId,
           s.ObtainedMarks, N'Sample mark entered at user request', NULL,
           SYSUTCDATETIME(), 0, SYSUTCDATETIME(), SYSUTCDATETIME(), 1
    FROM #Scores s;
    IF @@ROWCOUNT <> 16
        THROW 51015, 'Unexpected inserted mark count.', 1;

    IF EXISTS (
        SELECT 1 FROM #Expected e
        LEFT JOIN dbo.ExamMarks m ON m.EnrollmentId = e.EnrollmentId
          AND m.ExamScheduleId = e.ScheduleId AND m.ExamId = 15
          AND m.SchoolId = 13 AND m.IsActive = 1
        GROUP BY e.EnrollmentId, e.ScheduleId
        HAVING COUNT(m.Id) <> 1 OR MIN(m.ObtainedMarks) IS NULL
           OR MIN(m.ObtainedMarks) < 0 OR MAX(m.ObtainedMarks) > MAX(e.MaxMarks)
    )
        THROW 51016, 'Final marks are missing, duplicated, or invalid.', 1;

    SELECT e.EnrollmentId, e.StudentId,
           SUM(e.MaxMarks) AS TotalMarks,
           SUM(m.ObtainedMarks) AS ObtainedMarks,
           MIN(CASE WHEN m.ObtainedMarks >= e.PassingMarks THEN 1 ELSE 0 END) AS Passed
    INTO #Summary
    FROM #Expected e
    JOIN dbo.ExamMarks m ON m.EnrollmentId = e.EnrollmentId
      AND m.ExamScheduleId = e.ScheduleId AND m.ExamId = 15
      AND m.SchoolId = 13 AND m.IsActive = 1
    GROUP BY e.EnrollmentId, e.StudentId;
    IF (SELECT COUNT(*) FROM #Summary) <> 4
        THROW 51017, 'Expected four complete result summaries.', 1;

    UPDATE r
    SET r.TotalMarks = s.TotalMarks,
        r.ObtainedMarks = s.ObtainedMarks,
        r.Percentage = ROUND(s.ObtainedMarks * 100.0 / s.TotalMarks, 2),
        r.Grade = CASE
            WHEN s.ObtainedMarks * 100.0 / s.TotalMarks >= 90 THEN 'A+'
            WHEN s.ObtainedMarks * 100.0 / s.TotalMarks >= 80 THEN 'A'
            WHEN s.ObtainedMarks * 100.0 / s.TotalMarks >= 70 THEN 'B'
            WHEN s.ObtainedMarks * 100.0 / s.TotalMarks >= 60 THEN 'C'
            WHEN s.ObtainedMarks * 100.0 / s.TotalMarks >= 35 THEN 'D'
            ELSE 'F' END,
        r.ResultStatus = CASE WHEN s.Passed = 1 THEN 'PASS' ELSE 'FAIL' END,
        r.Published = 1
    FROM dbo.ExamResults r
    JOIN #Summary s ON s.EnrollmentId = r.EnrollmentId AND s.StudentId = r.StudentId
    WHERE r.ExamId = 15 AND r.SchoolId = 13;
    IF @@ROWCOUNT <> 4
        THROW 51018, 'Unexpected result update count.', 1;

    UPDATE dbo.Exams
    SET ResultPublished = 1
    WHERE Id = 15 AND SchoolId = 13 AND AcademicSessionId = 17;
    IF @@ROWCOUNT <> 1
        THROW 51019, 'Unexpected exam publication update count.', 1;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;