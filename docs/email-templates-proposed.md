# Approved email templates

The user approved these exact 17 subject/body drafts, followed by the separately approved student-to-staff message and existing-parent linkage drafts. They were saved to `dbo.EmailTemplates` on 30 Sep 2026. Edit the relevant subject/body here and get fresh approval before changing a saved template.

Common rule: `{{SchoolName}}` is the actual school, dates are displayed as `dd MMM yyyy`, and links point to the signed-in portal. All dynamic values are HTML-encoded before insertion. Passwords are used only in the two credential emails.

## STAFF_CREDENTIALS
**Subject:** Your {{SchoolName}} staff account is ready

**Body:**
```html
<p>Hello {{Name}},</p><p>Your staff account at {{SchoolName}} is ready.</p><p><strong>Username:</strong> {{Email}}<br><strong>Temporary password:</strong> {{Password}}</p><p>Sign in at {{LoginUrl}} and change your password after your first login.</p><p>Regards,<br>{{SchoolName}}</p>
```

## STUDENT_WELCOME
**Subject:** Your {{SchoolName}} student account is ready

**Body:**
```html
<p>Hello {{StudentName}},</p><p>Your student account at {{SchoolName}} is ready for {{ClassName}}.</p><p><strong>Username:</strong> {{Email}}<br><strong>Temporary password:</strong> {{Password}}</p><p>Sign in at {{LoginUrl}} and change your password after your first login.</p><p>Regards,<br>{{SchoolName}}</p>
```

## PARENT_WELCOME
**Subject:** Your {{SchoolName}} parent account is ready

**Body:**
```html
<p>Hello {{ParentName}},</p><p>Your parent account for {{StudentName}} at {{SchoolName}} is ready.</p><p><strong>Username:</strong> {{Email}}<br><strong>Temporary password:</strong> {{Password}}</p><p>Sign in at {{LoginUrl}} and change your password after your first login.</p><p>Regards,<br>{{SchoolName}}</p>
```

## STAFF_UPDATED
**Subject:** Your {{SchoolName}} staff profile was updated

**Body:**
```html
<p>Hello {{Name}},</p><p>Your staff profile at {{SchoolName}} was updated on {{UpdateDate}}. Please sign in to review your information.</p><p>Regards,<br>{{SchoolName}}</p>
```

## STUDENT_UPDATED
**Subject:** Your {{SchoolName}} student profile was updated

**Body:**
```html
<p>Hello {{StudentName}},</p><p>Your student profile at {{SchoolName}} was updated on {{UpdateDate}}. Please sign in to review your information.</p><p>Regards,<br>{{SchoolName}}</p>
```

## SALARY_PAID
**Subject:** Salary slip for {{SalaryMonth}} {{SalaryYear}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{Name}},</p><p>Your salary for {{SalaryMonth}} {{SalaryYear}} has been paid.</p><p><strong>Net amount:</strong> {{NetSalary}}<br><strong>Payment date:</strong> {{PaymentDate}}</p><p>Your detailed salary slip is attached as a PDF.</p><p>Regards,<br>{{SchoolName}}</p>
```

## FEE_PAYMENT_RECEIPT
**Subject:** Payment receipt {{ReceiptNumber}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>We received a payment of {{AmountPaid}} for {{FeeType}} on {{PaymentDate}}.</p><p><strong>Receipt number:</strong> {{ReceiptNumber}}<br><strong>Payment mode:</strong> {{PaymentMode}}</p><p>Your receipt is attached as a PDF.</p><p>Regards,<br>{{SchoolName}}</p>
```

## EXAM_TIMETABLE_PUBLISHED
**Subject:** {{ExamName}} timetable published — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>The timetable for {{ExamName}} is available for {{ClassName}} / {{SectionName}}.</p><p>The complete timetable, including subjects, dates, times and venue where available, is attached as a PDF.</p><p>Regards,<br>{{SchoolName}}</p>
```

## EXAM_RESULT_PUBLISHED
**Subject:** {{ExamName}} result published — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>Your result for {{ExamName}} has been published.</p><p><strong>Class:</strong> {{ClassName}} / {{SectionName}}<br><strong>Roll number:</strong> {{RollNumber}}</p><p>Your report card, including subject marks and overall result, is attached as a PDF.</p><p>Regards,<br>{{SchoolName}}</p>
```

## UNIT_TEST_CREATED
**Subject:** New unit test: {{TestName}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>A unit test has been scheduled for your class.</p><p><strong>Test:</strong> {{TestName}}<br><strong>Subject:</strong> {{SubjectName}}<br><strong>Date:</strong> {{TestDate}}<br><strong>Class:</strong> {{ClassName}} / {{SectionName}}</p><p>Sign in to see the details.</p><p>Regards,<br>{{SchoolName}}</p>
```

## LEAVE_REQUEST_DECIDED
**Subject:** Leave request {{Decision}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>Your leave request for {{FromDate}} to {{ToDate}} was {{Decision}}.</p><p><strong>Response:</strong> {{Response}}</p><p>Sign in to see the request status.</p><p>Regards,<br>{{SchoolName}}</p>
```

## SCHOOL_EVENT_PUBLISHED
**Subject:** New school event: {{EventTitle}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>A new event has been added for your school or class.</p><p><strong>Event:</strong> {{EventTitle}}<br><strong>Date:</strong> {{EventDate}}</p><p>{{Description}}</p><p>Regards,<br>{{SchoolName}}</p>
```

## ANNOUNCEMENT_PUBLISHED
**Subject:** {{AnnouncementTitle}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>A new announcement has been published for your school or class.</p><p><strong>{{AnnouncementTitle}}</strong></p><p>{{AnnouncementBody}}</p><p>Regards,<br>{{SchoolName}}</p>
```

## ACHIEVEMENT_AWARDED
**Subject:** Congratulations on your achievement — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>Congratulations! {{SchoolName}} has recorded an achievement for you.</p><p><strong>{{AchievementTitle}}</strong></p><p>{{Description}}</p><p>Regards,<br>{{SchoolName}}</p>
```

## HALL_TICKET_PUBLISHED
**Subject:** Hall ticket for {{ExamName}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>Your hall ticket for {{ExamName}} is available.</p><p><strong>Seat:</strong> {{SeatNumber}}<br><strong>Room:</strong> {{Room}}</p><p>Sign in to view and download it.</p><p>Regards,<br>{{SchoolName}}</p>
```

## HOMEWORK_PUBLISHED
**Subject:** New homework: {{HomeworkTitle}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>New homework has been published in {{SubjectName}} for your class.</p><p><strong>{{HomeworkTitle}}</strong><br><strong>Due:</strong> {{DueDate}}</p><p>Sign in to read and submit it.</p><p>Regards,<br>{{SchoolName}}</p>
```

## TEACHER_MESSAGE_RECEIVED
**Subject:** New message from {{TeacherName}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StudentName}},</p><p>{{TeacherName}} sent you a new message. Sign in to view the conversation and reply.</p><p>Regards,<br>{{SchoolName}}</p>
```
## STUDENT_MESSAGE_RECEIVED
**Subject:** New student message from {{StudentName}} — {{SchoolName}}

**Body:**
```html
<p>Hello {{StaffName}},</p><p>{{StudentName}} sent you a new message. Sign in to read and reply.</p><p>Regards,<br>{{SchoolName}}</p>
```

## PARENT_STUDENT_LINKED
**Subject:** {{StudentName}} linked to your {{SchoolName}} parent account

**Body:**
```html
<p>Hello {{ParentName}},</p><p>{{StudentName}} has been linked to your existing parent account at {{SchoolName}}. Sign in with your current credentials to view the student.</p><p>Regards,<br>{{SchoolName}}</p>
```
