-- Run this script on the application database before starting the updated backend.
-- Existing salary structures are retained and will generate on day 1 by default.
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'dbo.StaffSalaryStructure', N'U') IS NULL
        THROW 50001, 'StaffSalaryStructure table not found. Select the correct application database.', 1;

    IF OBJECT_ID(N'dbo.SalaryPayment', N'U') IS NULL
        THROW 50002, 'SalaryPayment table not found. Select the correct application database.', 1;

    IF COL_LENGTH('dbo.StaffSalaryStructure', 'SalaryGenerationDay') IS NULL
    BEGIN
        ALTER TABLE dbo.StaffSalaryStructure
            ADD SalaryGenerationDay int NOT NULL
                CONSTRAINT DF_StaffSalaryStructure_SalaryGenerationDay DEFAULT (1);
    END;

    IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.StaffSalaryStructure')
          AND name = N'CK_StaffSalaryStructure_SalaryGenerationDay')
    BEGIN
        EXEC(N'ALTER TABLE dbo.StaffSalaryStructure WITH CHECK
            ADD CONSTRAINT CK_StaffSalaryStructure_SalaryGenerationDay
            CHECK (SalaryGenerationDay BETWEEN 1 AND 28);');
    END;

    IF EXISTS (
        SELECT StaffId
        FROM dbo.StaffSalaryStructure
        WHERE IsActive = 1
        GROUP BY StaffId
        HAVING COUNT(*) > 1)
        THROW 50004, 'A staff member has more than one active salary structure. Deactivate duplicates before continuing.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.StaffSalaryStructure')
          AND name = N'UX_StaffSalaryStructure_ActiveStaff')
    BEGIN
        CREATE UNIQUE INDEX UX_StaffSalaryStructure_ActiveStaff
            ON dbo.StaffSalaryStructure (StaffId)
            WHERE IsActive = 1;
    END;
    IF EXISTS (
        SELECT StaffId, SalaryMonth, SalaryYear
        FROM dbo.SalaryPayment
        GROUP BY StaffId, SalaryMonth, SalaryYear
        HAVING COUNT(*) > 1)
        THROW 50003, 'Duplicate monthly salary records already exist. Resolve them before creating the unique index.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE object_id = OBJECT_ID(N'dbo.SalaryPayment')
          AND name = N'UX_SalaryPayment_StaffMonthYear')
    BEGIN
        CREATE UNIQUE INDEX UX_SalaryPayment_StaffMonthYear
            ON dbo.SalaryPayment (StaffId, SalaryMonth, SalaryYear);
    END;

    COMMIT TRANSACTION;
    PRINT 'Automatic salary generation schema applied successfully.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
