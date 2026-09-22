-- Select the application database in SSMS and run this before the updated backend.
-- Existing staff records are retained. Their employment type stays empty until edited.
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'dbo.Staff', N'U') IS NULL
        THROW 50001, 'Staff table not found. Select the correct application database.', 1;
    IF COL_LENGTH('dbo.Staff', 'EmploymentType') IS NULL
        ALTER TABLE dbo.Staff ADD EmploymentType nvarchar(50) NULL;
    COMMIT TRANSACTION;
    PRINT 'Staff EmploymentType column added successfully.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;