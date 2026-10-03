IF COL_LENGTH(N'dbo.Schools', N'EmailVerificationRequired') IS NULL
BEGIN
    ALTER TABLE dbo.Schools ADD EmailVerificationRequired bit NOT NULL
        CONSTRAINT DF_Schools_EmailVerificationRequired DEFAULT (1) WITH VALUES;
END;
