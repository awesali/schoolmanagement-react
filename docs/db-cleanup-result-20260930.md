# Database cleanup — 30 September 2026

The requested cleanup was committed to the `SchoolManagement` database after a successful rollback rehearsal.

- Target preview: 673 ID-based rows across school and email related tables. `AccountingPeriods` had zero matching rows.
- Deleted school master records: IDs 1, 2, 5, 6, and 7, with their related rows.
- Deleted records matching the 12 email addresses from the request across all schools, including global `Users` IDs 1 and 64.
- Deleted the four linked school 8 students (IDs 138–141), their related credentials, and the shared parent row as approved.
- Preserved school master IDs 3, 8, 9, and 10; their matching `Schools.Email` fields were set to `NULL`.

Verification after commit found zero rows for school IDs 1, 2, 5, 6, and 7 in every table with a `SchoolId`, `School_Id`, or `schoolId` column. It found zero matches for the 12 addresses in every table with an `Email` column. Schools 3, 8, 9, and 10 remained, as did school 4 exams 9–13 and the shared school 11 parent (ID 34).

Before deletion, a full `COPY_ONLY` SQL Server backup was created with `CHECKSUM` and passed `RESTORE VERIFYONLY WITH CHECKSUM`:

`C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\Backup\SchoolManagement_before_requested_cleanup_20260930_104224.bak`

The reviewed cleanup script is `db-cleanup-requested-20260930.sql`. Its default is preview mode (`@Execute = 0`).
