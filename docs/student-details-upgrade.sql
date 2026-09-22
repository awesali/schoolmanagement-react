-- Select the application database in SSMS and run before starting the updated backend.
-- Existing student records are retained; new fields remain empty until edited.
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;
    IF OBJECT_ID(N'dbo.Students', N'U') IS NULL
        THROW 50001, 'Students table not found. Select the correct application database.', 1;

    IF COL_LENGTH('dbo.Students', 'Address') IS NULL ALTER TABLE dbo.Students ADD Address nvarchar(500) NULL;
    IF COL_LENGTH('dbo.Students', 'AddressLine2') IS NULL ALTER TABLE dbo.Students ADD AddressLine2 nvarchar(200) NULL;
    IF COL_LENGTH('dbo.Students', 'Landmark') IS NULL ALTER TABLE dbo.Students ADD Landmark nvarchar(200) NULL;
    IF COL_LENGTH('dbo.Students', 'City') IS NULL ALTER TABLE dbo.Students ADD City nvarchar(100) NULL;
    IF COL_LENGTH('dbo.Students', 'District') IS NULL ALTER TABLE dbo.Students ADD District nvarchar(100) NULL;
    IF COL_LENGTH('dbo.Students', 'State') IS NULL ALTER TABLE dbo.Students ADD State nvarchar(100) NULL;
    IF COL_LENGTH('dbo.Students', 'Country') IS NULL ALTER TABLE dbo.Students ADD Country nvarchar(100) NULL;
    IF COL_LENGTH('dbo.Students', 'PinCode') IS NULL ALTER TABLE dbo.Students ADD PinCode nvarchar(6) NULL;
    IF COL_LENGTH('dbo.Students', 'AdmissionType') IS NULL ALTER TABLE dbo.Students ADD AdmissionType nvarchar(50) NULL;
    IF COL_LENGTH('dbo.Students', 'PreviousSchoolName') IS NULL ALTER TABLE dbo.Students ADD PreviousSchoolName nvarchar(200) NULL;
    IF COL_LENGTH('dbo.Students', 'PreviousSchoolAddress') IS NULL ALTER TABLE dbo.Students ADD PreviousSchoolAddress nvarchar(500) NULL;
    IF COL_LENGTH('dbo.Students', 'PreviousClass') IS NULL ALTER TABLE dbo.Students ADD PreviousClass nvarchar(50) NULL;
    IF COL_LENGTH('dbo.Students', 'PreviousBoard') IS NULL ALTER TABLE dbo.Students ADD PreviousBoard nvarchar(100) NULL;
    IF COL_LENGTH('dbo.Students', 'TransferCertificateNumber') IS NULL ALTER TABLE dbo.Students ADD TransferCertificateNumber nvarchar(100) NULL;
    IF COL_LENGTH('dbo.Students', 'TransferCertificateDate') IS NULL ALTER TABLE dbo.Students ADD TransferCertificateDate datetime2 NULL;
    IF COL_LENGTH('dbo.Students', 'ReasonForLeaving') IS NULL ALTER TABLE dbo.Students ADD ReasonForLeaving nvarchar(500) NULL;

    COMMIT TRANSACTION;
    PRINT 'Student address and admission-history fields added successfully.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;