# Email flow test checklist

Use a test school and real inboxes controlled by your team. The updated backend was restarted on 30 Sep 2026 and Swagger returned HTTP 200 at `https://localhost:7015/swagger/index.html`. The student UI is currently responding at `http://localhost:3000/student` (port 3001 is not listening). Approved subject/body text is in `email-templates-proposed.md` and stored in `dbo.EmailTemplates`.

## Verification already done

- Backend Release build: passed; restarted process on port 7015; Swagger returned HTTP 200.
- Frontend production build: passed with existing lint warnings; student UI returned HTTP 200 on port 3000.
- Approved templates: 19 original active rows confirmed; verification template added after separate approval in `dbo.EmailTemplates`.
- PDF sample: parsed as one page with expected text using PdfPig.
- Real inbox delivery and create/pay/publish end-to-end cases below still require controlled test accounts; no emails were sent to actual students or staff during this verification.

## Setup

1. Admin: create an active academic session, class, section, subject, teacher assignment and one test student with a distinct parent email. Keep all records in the same school/session.
2. Check both student and parent inboxes, including spam. Every student-targeted event should address both in one SMTP message. Staff events go to that staff email.
3. In Swagger, confirm `EmailSettings` are configured in the backend environment; do not paste credentials into a ticket or browser.

## Actions and expected checks

| Action in app | Create or change | Check |
| --- | --- | --- |
| Admin > Add Staff | Add staff with a valid, controlled email | Staff receives credentials plus a verification link. Staff appears as Pending email verification and cannot sign in until the link is opened. |
| Admin > Add Student | Add student and parent with different controlled emails | Student and new parent get separate credentials plus separate verification links. Each new login stays inactive until its own link is opened. Existing parent accounts get a linkage notice and keep their existing login. |
| Admin > Staff/Student lists > Import | Import 2 valid rows and 1 invalid email row | Invalid row is rejected in preview. Each accepted row uses the same create API and welcome email. Failed rows remain in the import error list. |
| Admin > Edit Staff/Student | Change an ordinary profile detail and save | Staff gets staff-update email. Student and parent get student-update email. Invalid email is rejected in UI and API. |
| Admin > Salary > Generate/Pay | Generate a pending salary and pay it | Staff receives formatted mail and salary-slip PDF with basic, bonus, deduction, net, date and method; status becomes Paid. |
| Admin > Fees > Assign/Pay | Assign a fee to the test student, then record a partial payment | Student and parent receive receipt PDF; payment history and pending balance reflect the amount. |
| Admin > Transport > Payments | Allocate transport and record a monthly payment | Student and parent receive a transport receipt PDF; transport payment history shows the receipt. |
| Admin > Exam Management | Create exam, add section-specific subject schedules, publish | Student and parent receive that section's formatted timetable PDF. Repeating publish must not send a duplicate. |
| Teacher > Unit Tests | Create a test for a subject and section the teacher teaches | Only students enrolled in that class/section and their parents receive the test notice. |
| Teacher > Marks Entry, then Admin > Results | Enter every scheduled subject mark, generate and publish result | Each student and parent receives a subject-wise PDF report card with totals and overall status. Publishing a second time must not duplicate email. |
| Admin > Hall Tickets | Create and publish a hall ticket for the test student | Student and parent receive ticket PDF with seat/room/venue. Editing an already published ticket must not resend unless publication changes from false to true. |
| Teacher > Homework | Create and publish homework in the section | Student and parent receive homework notice. Drafts send no email. |
| Student > Services > Leave, then recipient dashboard | Submit a leave request and approve/reject it | Student and parent receive decision and response. A pending request sends no decision email. |
| Admin > Events / Announcements / Achievements | Add one section-scoped event, publish an announcement, award an achievement | Only matching students and parents receive event/announcement email; achievement goes to that student and parent. |
| Teacher > Messages | Send a message to the student | Student and parent receive the new-message email and the chat record appears. |
| Student > Messages | Select a staff recipient and send a message | Only that staff member receives the new-message email; the conversation appears in their dashboard. |

## Per-school verification setting

1. Open **School List** and use the **Email verification** switch on one test school. Each school has its own setting; existing schools start **On**.
2. With **On**, add staff and a student with a new parent. Both creation APIs require SMTP acceptance and save pending accounts. Staff, student and new parent can sign in only after opening their own verification links.
3. Turn **Off** for that school and add another staff member or student. Only credential emails are sent. The accounts are active after the SMTP send succeeds, and the UI shows usernames and passwords in a one-time popup. Closing it clears the passwords from the UI. Bulk import shows a one-time list of credentials after the job completes.
4. Turn **Off** after creating a pending account in step 2. That earlier account must still require its verification link. Turning the setting back **On** affects new accounts only.
5. Check a different school: its toggle and new-account behavior must stay unchanged.
## Mailbox verification check

1. Add one staff member using a controlled inbox. The admin list should show **Pending email verification**. Sign-in should fail until the recipient opens the verification link; then the list should show **Active** and sign-in should work.
2. Add a student and new parent with two controlled inboxes. Verify each mailbox separately; each login should become usable only after its own link is opened.
3. For an address that cannot receive mail, SMTP may still accept the message. The account must remain **Pending email verification**. Do not expect an immediate "email does not exist" error.
4. Let a link expire or edit a pending account's email address and save. A fresh credentials email and verification link should go to the corrected address. The old link must no longer activate the account.
5. Opening the same link a second time should not reactivate an account that was disabled later.
## Mail failure check (test environment only)

Set a deliberately unavailable SMTP host in the **test backend environment**, restart it, and repeat one new student create, one fee payment, and one salary payment. Each API should report failure. Check that the new student/payment or that salary's Paid status did not commit. Restore SMTP settings and restart. Do not run this check against production SMTP or real financial records.

## Verification notes

- An SMTP success means the mail server accepted the message; it does not prove delivery to the inbox. Check inbox/spam and SMTP logs.
- For multi-recipient or batch actions, a later SMTP failure can occur after an earlier recipient accepted mail even though the database transaction rolls back. Reconcile failed attempts before retrying to avoid duplicate notices.
- The PDF generator was parsed successfully with PdfPig. Full visual rendering was unavailable in the local environment; open a received PDF and confirm spacing, names, amounts and page breaks before production use. The current PDF font supports ASCII text; non-ASCII characters are replaced with `?` in attachments.
