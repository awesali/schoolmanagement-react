import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TeacherStudentAttendance from "./TeacherStudentAttendance";
import TeacherWorkspace, { teacherRequest } from "./TeacherWorkspace";
import Sidebar from "./Sidebar";
import { usePermissions } from "../security/Permissions";

jest.mock("../security/Permissions", () => ({
  usePermissions: jest.fn(),
  PAGE_PERMISSIONS: {},
}));
const permissions = usePermissions as jest.Mock;
const roster = [
  {
    id: 1,
    enrollmentId: 11,
    studentName: "Ahmed Khan",
    className: "8",
    sectionName: "A",
    sectionId: 7,
  },
  {
    id: 2,
    enrollmentId: 12,
    studentName: "Sara Sheikh",
    className: "8",
    sectionName: "A",
    sectionId: 7,
  },
  {
    id: 3,
    enrollmentId: 13,
    studentName: "Other Class",
    className: "9",
    sectionName: "B",
    sectionId: 8,
  },
];
let requests: { url: string; init?: RequestInit }[];
beforeEach(() => {
  permissions.mockReturnValue({ can: () => true });
  requests = [];
  global.fetch = jest.fn(async (url, init) => {
    requests.push({ url: String(url), init });
    const requestUrl = String(url);
    return {
      ok: true,
      json: async () => ({
        success: true,
        sections: requestUrl.includes("student-attendance-roster")
          ? [{ sectionId: 7, className: "8", sectionName: "A" }]
          : undefined,
        data: requestUrl.includes("section-students") ? roster.slice(0, 2) : [],
      }),
    } as Response;
  });
});
test("submits the complete selected class even when search hides students", async () => {
  render(<TeacherStudentAttendance />);
  await screen.findByText("Ahmed Khan");
  fireEvent.click(screen.getByRole("button", { name: /Mark all present/ }));
  fireEvent.change(screen.getByPlaceholderText("Search by student name"), {
    target: { value: "Ahmed" },
  });
  fireEvent.change(screen.getByLabelText("Attendance for Ahmed Khan"), {
    target: { value: "Late" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Submit class attendance" }),
  );
  await screen.findByText(/Attendance submitted at/);
  const request = requests.find((r) => r.init?.method === "POST");
  expect(JSON.parse(String(request?.init?.body))).toMatchObject({
    sectionId: 7,
    students: [
      { studentId: 1, enrollmentId: 11, status: "Late" },
      { studentId: 2, enrollmentId: 12, status: "Present" },
    ],
  });
  expect(
    screen.queryByRole("button", { name: "Submit class attendance" }),
  ).not.toBeInTheDocument();
});
test("requires every student to be marked before submission", async () => {
  render(<TeacherStudentAttendance />);
  await screen.findByText("Ahmed Khan");
  fireEvent.change(screen.getByLabelText("Attendance for Ahmed Khan"), {
    target: { value: "Present" },
  });
  expect(
    screen.getByRole("button", { name: "Submit class attendance" }),
  ).toBeDisabled();
});
test("read-only teachers cannot mark or submit attendance", async () => {
  permissions.mockReturnValue({
    can: (_: string, action: string) => action === "read",
  });
  render(<TeacherStudentAttendance />);
  await screen.findByText("Ahmed Khan");
  expect(
    screen.queryByLabelText("Attendance for Ahmed Khan"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Mark all present/ }),
  ).not.toBeInTheDocument();
});
test("API errors are visible and prevent an empty successful submission", async () => {
  global.fetch = jest.fn(
    async () =>
      ({
        ok: false,
        json: async () => ({ message: "Access denied" }),
      }) as Response,
  );
  render(<TeacherStudentAttendance />);
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Access denied"),
  );
  expect(
    screen.queryByRole("button", { name: "Submit class attendance" }),
  ).not.toBeInTheDocument();
});
test("admin sidebar retains its original branding and teacher attendance has a distinct active item", () => {
  const { rerender } = render(
    <Sidebar
      activePage="Dashboard"
      onNavigate={jest.fn()}
      isCollapsed={false}
      userRole="1"
    />,
  );
  expect(screen.getByText("SchoolAdmin")).toBeInTheDocument();
  expect(screen.queryByText("Daily workspace")).not.toBeInTheDocument();
  rerender(
    <Sidebar
      activePage="Attendance"
      attendanceType="staff"
      onNavigate={jest.fn()}
      isCollapsed={false}
      userRole="2"
    />,
  );
  expect(screen.getByRole("button", { name: "My attendance" })).toHaveClass(
    "active",
  );
  expect(
    screen.getByRole("button", { name: "Student attendance" }),
  ).not.toHaveClass("active");
});

test("history includes students who are no longer in the current roster", async () => {
  global.fetch = jest.fn(
    async (url) =>
      ({
        ok: true,
        json: async () => ({
          success: true,
          sections: String(url).includes("student-attendance-roster")
            ? [{ sectionId: 7, className: "8", sectionName: "A" }]
            : undefined,
          data: String(url).includes("section-students")
            ? roster.slice(0, 2)
            : String(url).includes("student-attendance-history")
              ? [
                {
                  studentId: 99,
                  enrollmentId: 199,
                  studentName: "Former Student",
                  className: "8",
                  sectionName: "A",
                  sectionId: 7,
                  status: "Present",
                },
                ]
              : [],
        }),
      }) as Response,
  );
  render(<TeacherStudentAttendance />);
  await screen.findByText("Ahmed Khan");
  fireEvent.click(screen.getByRole("button", { name: "Attendance history" }));
  expect(await screen.findByText("Former Student")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Submit class attendance" }),
  ).not.toBeInTheDocument();
});

test("turns a non-JSON server failure into a readable message", async () => {
  global.fetch = jest.fn(async () =>
    ({
      ok: false,
      status: 500,
      text: async () => "Microsoft.Data.SqlClient.SqlException",
    }) as Response,
  );

  await expect(teacherRequest("/api/Teacher/homework")).rejects.toThrow(
    "The server could not complete this request (500). Please contact the administrator.",
  );
});

test("today's timetable shows only the logged-in teacher's assigned subject and class time", async () => {
  const today = new Date().getDay();
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      success: true,
      attendancePending: 0,
      studentsAbsent: 0,
      classes: [
        {
          id: 8,
          className: "Class 8",
          sections: [
            {
              id: 7,
              sectionName: "A",
              isClassTeacher: false,
              subjects: [{ subjectId: 3, subjectName: "Mathematics" }],
            },
          ],
        },
      ],
      slots: [
        {
          id: "7-today-1",
          day: today,
          period: 1,
          start: "09:00",
          end: "09:45",
          className: "Class 8 · A",
          subject: "Mathematics",
          sectionId: 7,
        },
      ],
    }),
  } as Response));

  render(<TeacherWorkspace userName="Rahul" onNavigate={jest.fn()} />);

  expect(await screen.findByRole("heading", { name: "Class 8 · A" })).toBeInTheDocument();
  expect(screen.getByText("Mathematics")).toBeInTheDocument();
  expect(screen.getByText("09:00")).toBeInTheDocument();
  expect(screen.getByText("09:45")).toBeInTheDocument();
});
