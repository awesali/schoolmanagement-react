-- Select the application database in SSMS and run before starting the updated backend.
-- Existing parent records are retained.
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'dbo.ParentDetails', N'U') IS NULL
        THROW 50001, 'ParentDetails table not found. Select the correct application database.', 1;
    IF COL_LENGTH('dbo.ParentDetails', 'AddressLine2') IS NULL ALTER TABLE dbo.ParentDetails ADD AddressLine2 nvarchar(200) NULL;
    IF COL_LENGTH('dbo.ParentDetails', 'Landmark') IS NULL ALTER TABLE dbo.ParentDetails ADD Landmark nvarchar(200) NULL;
    IF COL_LENGTH('dbo.ParentDetails', 'City') IS NULL ALTER TABLE dbo.ParentDetails ADD City nvarchar(100) NULL;
    IF COL_LENGTH('dbo.ParentDetails', 'District') IS NULL ALTER TABLE dbo.ParentDetails ADD District nvarchar(100) NULL;
    IF COL_LENGTH('dbo.ParentDetails', 'State') IS NULL ALTER TABLE dbo.ParentDetails ADD State nvarchar(100) NULL;
    IF COL_LENGTH('dbo.ParentDetails', 'Country') IS NULL ALTER TABLE dbo.ParentDetails ADD Country nvarchar(100) NULL;
    IF COL_LENGTH('dbo.ParentDetails', 'PinCode') IS NULL ALTER TABLE dbo.ParentDetails ADD PinCode nvarchar(6) NULL;
    COMMIT TRANSACTION;
    PRINT 'Detailed parent address fields added successfully.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;