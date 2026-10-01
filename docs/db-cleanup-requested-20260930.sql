SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @Execute bit = 0; -- Change to 1 only after reviewing the preview and backup.
DECLARE @Emails table (Email nvarchar(320) PRIMARY KEY);
INSERT @Emails VALUES
(N'awesalisayed3@gmail.com'),(N'awesalisayed@gmail.com'),(N'awesali03@outlook.com'),
(N'aamirsheikh71@outlook.com'),(N'awealisayed5@gmail.com'),(N'sayedawesali190@gmail.com'),
(N'awesalisayed5@gmail.com'),(N'driveawes@gmail.com'),(N'awealisayed@gmail.com'),
(N'sayedawesali4@gmail.com'),(N'aamirsheikh@gmail.com'),(N'awesalisaye@gmail.com');
CREATE TABLE #Emails(Email nvarchar(320) PRIMARY KEY);
INSERT #Emails SELECT Email FROM @Emails;
DECLARE @Schools table (Id int PRIMARY KEY);
INSERT @Schools VALUES (1),(2),(5),(6),(7);
CREATE TABLE #Target (TableName sysname NOT NULL, Id bigint NOT NULL, PRIMARY KEY (TableName,Id));
CREATE TABLE #Relations (ChildTable sysname NOT NULL, ChildColumn sysname NOT NULL, ParentTable sysname NOT NULL, PRIMARY KEY(ChildTable,ChildColumn,ParentTable));
CREATE TABLE #ColumnMap (ColumnName sysname NOT NULL, ParentTable sysname NOT NULL);
INSERT #ColumnMap VALUES
('SchoolId','Schools'),('School_Id','Schools'),('schoolId','Schools'),
('StudentId','Students'),('Student_Id','Students'),('ParentId','ParentDetails'),
('StaffId','Staff'),('Staff_Id','Staff'),('usersid','Users'),('UserId','Users'),
('EnrollmentId','StudentEnrollment'),('FromEnrollmentId','StudentEnrollment'),('ToEnrollmentId','StudentEnrollment'),
('SectionId','SectionDetails'),('ExamId','Exams'),('ExamScheduleId','ExamSchedules'),
('SubjectId','Subjects'),('StudentFeeId','StudentFees'),('FeeTypeId','FeeTypes'),
('StudentTransportAllocationId','StudentTransportAllocations'),('TransportFeeId','TransportFees'),
('VehicleAssignmentId','TransportVehicleAssignments'),('VehicleId','TransportVehicles'),
('RouteId','TransportRoutes'),('StudentOrderId','InventoryStudentOrders'),
('ProductId','InventoryProducts'),('ProductVariantId','InventoryProductVariants'),
('KitId','InventoryKits'),('PurchaseOrderId','InventoryPurchaseOrders'),('ReturnId','InventoryReturns'),
('AccountId','AccountingAccounts'),('AccountingVoucherId','AccountingVouchers'),
('AcademicSessionId','AcademicSessions'),('SessionId','AcademicSessions'),
('ClassId','classes'),('ExamTypeId','ExamTypes');
INSERT #Target(TableName,Id) SELECT 'Schools',Id FROM dbo.Schools WHERE Id IN (SELECT Id FROM @Schools);
DECLARE @table sysname,@column sysname,@parent sysname,@sql nvarchar(max),@delta int,@added int;
DECLARE seed CURSOR LOCAL FAST_FORWARD FOR
SELECT t.name,c.name FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
WHERE c.name IN ('SchoolId','School_Id','schoolId') AND t.name NOT IN ('Schools','AccountingPeriods');
OPEN seed; FETCH NEXT FROM seed INTO @table,@column;
WHILE @@FETCH_STATUS=0 BEGIN
 SET @sql=N'INSERT #Target(TableName,Id) SELECT N'''+REPLACE(@table,'''','''''')+N''',r.Id FROM dbo.'+QUOTENAME(@table)+N' r WHERE r.'+QUOTENAME(@column)+N' IN (1,2,5,6,7) AND NOT EXISTS (SELECT 1 FROM #Target t WHERE t.TableName=N'''+REPLACE(@table,'''','''''')+N''' AND t.Id=r.Id)';
 EXEC sys.sp_executesql @sql;
 FETCH NEXT FROM seed INTO @table,@column;
END CLOSE seed; DEALLOCATE seed;
DECLARE emailSeed CURSOR LOCAL FAST_FORWARD FOR
SELECT t.name,c.name FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id WHERE c.name='Email' AND t.name NOT IN ('EmailTemplates','Schools');
OPEN emailSeed; FETCH NEXT FROM emailSeed INTO @table,@column;
WHILE @@FETCH_STATUS=0 BEGIN
 SET @sql=N'INSERT #Target(TableName,Id) SELECT N'''+REPLACE(@table,'''','''''')+N''',r.Id FROM dbo.'+QUOTENAME(@table)+N' r WHERE LOWER(LTRIM(RTRIM(r.'+QUOTENAME(@column)+N'))) IN (SELECT Email FROM @EmailList) AND NOT EXISTS (SELECT 1 FROM #Target t WHERE t.TableName=N'''+REPLACE(@table,'''','''''')+N''' AND t.Id=r.Id)';
 -- Table variables are not visible inside dynamic SQL; pass values via a temp table.
 SET @sql=REPLACE(@sql,N'@EmailList',N'#Emails');
 EXEC sys.sp_executesql @sql;
 FETCH NEXT FROM emailSeed INTO @table,@column;
END CLOSE emailSeed; DEALLOCATE emailSeed;
INSERT #Relations(ChildTable,ChildColumn,ParentTable)
SELECT DISTINCT t.name,c.name,m.ParentTable FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
JOIN #ColumnMap m ON m.ColumnName=c.name
WHERE EXISTS(SELECT 1 FROM sys.columns x JOIN sys.tables p ON p.object_id=x.object_id WHERE p.name=m.ParentTable AND x.name='Id')
AND EXISTS(SELECT 1 FROM sys.columns x WHERE x.object_id=t.object_id AND x.name='Id')
AND NOT(t.name='SectionDetails' AND c.name='StaffId')
AND NOT(t.name='AccountingAudits' AND c.name='UserId')
AND NOT(m.ParentTable='AcademicSessions' AND t.name NOT IN ('UserSessionAccess','SyllabusProgress'))
AND NOT(t.name='Students' AND c.name='ParentId' AND m.ParentTable<>'ParentDetails');
INSERT #Relations(ChildTable,ChildColumn,ParentTable)
SELECT DISTINCT OBJECT_NAME(fk.parent_object_id),pc.name,OBJECT_NAME(fk.referenced_object_id)
FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id
JOIN sys.columns pc ON pc.object_id=fkc.parent_object_id AND pc.column_id=fkc.parent_column_id
WHERE EXISTS(SELECT 1 FROM sys.columns x WHERE x.object_id=fk.parent_object_id AND x.name='Id')
AND EXISTS(SELECT 1 FROM sys.columns x WHERE x.object_id=fk.referenced_object_id AND x.name='Id')
AND NOT EXISTS(SELECT 1 FROM #Relations r WHERE r.ChildTable=OBJECT_NAME(fk.parent_object_id) AND r.ChildColumn=pc.name AND r.ParentTable=OBJECT_NAME(fk.referenced_object_id));
SET @delta=1;
WHILE @delta>0 BEGIN
 SET @delta=0;
 DECLARE rel CURSOR LOCAL FAST_FORWARD FOR SELECT ChildTable,ChildColumn,ParentTable FROM #Relations;
 OPEN rel; FETCH NEXT FROM rel INTO @table,@column,@parent;
 WHILE @@FETCH_STATUS=0 BEGIN
  SET @sql=N'INSERT #Target(TableName,Id) SELECT N'''+REPLACE(@table,'''','''''')+N''',c.Id FROM dbo.'+QUOTENAME(@table)+N' c JOIN #Target p ON p.TableName=N'''+REPLACE(@parent,'''','''''')+N''' AND p.Id=c.'+QUOTENAME(@column)+N' WHERE NOT EXISTS(SELECT 1 FROM #Target t WHERE t.TableName=N'''+REPLACE(@table,'''','''''')+N''' AND t.Id=c.Id); SET @n=@@ROWCOUNT;';
  SET @added=0; BEGIN TRY EXEC sys.sp_executesql @sql,N'@n int OUTPUT',@n=@added OUTPUT; END TRY BEGIN CATCH DECLARE @detail nvarchar(2048)=CONCAT(@table,'.',@column,' -> ',@parent,': ',ERROR_MESSAGE()); THROW 51001,@detail,1; END CATCH; SET @delta+=@added;
  FETCH NEXT FROM rel INTO @table,@column,@parent;
 END CLOSE rel; DEALLOCATE rel;
 -- ProfilePictures uses PersonType + PersonId instead of a normal FK.
 INSERT #Target(TableName,Id)
 SELECT 'ProfilePictures',p.Id FROM dbo.ProfilePictures p JOIN #Target t ON t.Id=p.PersonId AND t.TableName=CASE p.PersonType WHEN 'Student' THEN 'Students' WHEN 'Staff' THEN 'Staff' WHEN 'School' THEN 'Schools' WHEN 'Parent' THEN 'ParentDetails' END
 WHERE NOT EXISTS(SELECT 1 FROM #Target x WHERE x.TableName='ProfilePictures' AND x.Id=p.Id);
 SET @delta+=@@ROWCOUNT;
END;
-- Orphaned parent profiles whose every student is already in the target set.
INSERT #Target(TableName,Id)
SELECT 'ParentDetails',p.Id FROM dbo.ParentDetails p
WHERE EXISTS(SELECT 1 FROM dbo.Students s JOIN #Target t ON t.TableName='Students' AND t.Id=s.Id WHERE s.ParentId=p.Id)
AND NOT EXISTS(SELECT 1 FROM dbo.Students s WHERE s.ParentId=p.Id AND NOT EXISTS(SELECT 1 FROM #Target t WHERE t.TableName='Students' AND t.Id=s.Id))
AND NOT EXISTS(SELECT 1 FROM #Target t WHERE t.TableName='ParentDetails' AND t.Id=p.Id);
-- Credentials linked to selected students or parents, even when their email was not in the input list.
INSERT #Target(TableName,Id)
SELECT 'Students_Parents_Creds',c.Id FROM dbo.Students_Parents_Creds c
WHERE (EXISTS(SELECT 1 FROM dbo.Students s JOIN #Target t ON t.TableName='Students' AND t.Id=s.Id WHERE LOWER(s.Email)=LOWER(c.Email) AND s.SchoolId=c.School_Id)
    OR EXISTS(SELECT 1 FROM dbo.ParentDetails p JOIN #Target t ON t.TableName='ParentDetails' AND t.Id=p.Id WHERE LOWER(p.Email)=LOWER(c.Email)))
AND NOT EXISTS(SELECT 1 FROM #Target t WHERE t.TableName='Students_Parents_Creds' AND t.Id=c.Id);
INSERT #Target(TableName,Id)
SELECT 'ProfilePictures',p.Id FROM dbo.ProfilePictures p JOIN #Target t ON t.TableName='ParentDetails' AND t.Id=p.PersonId
WHERE p.PersonType='Parent' AND NOT EXISTS(SELECT 1 FROM #Target x WHERE x.TableName='ProfilePictures' AND x.Id=p.Id);SELECT TableName,COUNT_BIG(*) AS RowsToDelete FROM #Target GROUP BY TableName ORDER BY RowsToDelete DESC,TableName;
SELECT COUNT_BIG(*) AS TotalTargetRows FROM #Target;
SELECT s.Id,s.SchoolId,s.StudentName,s.ParentId FROM dbo.Students s JOIN #Target t ON t.TableName='Students' AND t.Id=s.Id WHERE s.SchoolId NOT IN (1,2,5,6,7) ORDER BY s.SchoolId,s.Id;
IF @Execute=0 RETURN;
BEGIN TRANSACTION;
BEGIN TRY
 -- Null references that should remain in other schools rather than deleting unrelated records.
 UPDATE sch SET Email=NULL FROM dbo.Schools sch JOIN #Emails e ON LOWER(LTRIM(RTRIM(sch.Email)))=e.Email WHERE NOT EXISTS(SELECT 1 FROM #Target t WHERE t.TableName='Schools' AND t.Id=sch.Id);
 UPDATE s SET SuperAdminId=NULL FROM dbo.Schools s JOIN #Target t ON t.TableName='Users' AND t.Id=s.SuperAdminId WHERE NOT EXISTS(SELECT 1 FROM #Target x WHERE x.TableName='Schools' AND x.Id=s.Id);
 UPDATE sec SET StaffId=NULL FROM dbo.SectionDetails sec JOIN #Target t ON t.TableName='Staff' AND t.Id=sec.StaffId WHERE NOT EXISTS(SELECT 1 FROM #Target x WHERE x.TableName='SectionDetails' AND x.Id=sec.Id);
 UPDATE sec SET MonitorStudentId=NULL FROM dbo.SectionDetails sec JOIN #Target t ON t.TableName='Students' AND t.Id=sec.MonitorStudentId WHERE NOT EXISTS(SELECT 1 FROM #Target x WHERE x.TableName='SectionDetails' AND x.Id=sec.Id);
 UPDATE req SET RecipientUserId=NULL FROM dbo.StudentServiceRequests req JOIN #Target t ON t.TableName='Users' AND t.Id=req.RecipientUserId WHERE NOT EXISTS(SELECT 1 FROM #Target x WHERE x.TableName='StudentServiceRequests' AND x.Id=req.Id);
 DELETE FROM dbo.AccountingPeriods WHERE SchoolId IN (SELECT Id FROM @Schools);
 CREATE TABLE #Remaining(TableName sysname PRIMARY KEY);
 INSERT #Remaining SELECT DISTINCT TableName FROM #Target;
 WHILE EXISTS(SELECT 1 FROM #Remaining) BEGIN
  SET @table=NULL;
  SELECT TOP(1) @table=r.TableName FROM #Remaining r
  WHERE NOT EXISTS(SELECT 1 FROM #Relations rel JOIN #Remaining child ON child.TableName=rel.ChildTable WHERE rel.ParentTable=r.TableName AND rel.ChildTable<>r.TableName)
  ORDER BY r.TableName;
  IF @table IS NULL THROW 51000,'Delete dependency cycle detected',1;
  SET @sql=N'DELETE c FROM dbo.'+QUOTENAME(@table)+N' c JOIN #Target t ON t.TableName=N'''+REPLACE(@table,'''','''''')+N''' AND t.Id=c.Id;';
  EXEC sys.sp_executesql @sql;
  DELETE FROM #Remaining WHERE TableName=@table;
 END;
 COMMIT TRANSACTION;
END TRY BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
