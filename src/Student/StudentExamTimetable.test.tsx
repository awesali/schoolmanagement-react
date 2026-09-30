// Test setup and fixtures
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import StudentExamTimetable from "./StudentExamTimetable";

test("shows published student papers by exam, date and time", () => {
  render(
    <StudentExamTimetable
      papers={[
        {
          id: 1,
          examName: "Annual",
          subjectName: "English",
          examDate: "2026-09-27T00:00:00",
          startTime: "09:00:00",
          endTime: "12:00:00",
        },
        {
          id: 2,
          examName: "Annual",
          subjectName: "Maths",
          examDate: "2026-09-28T00:00:00",
          startTime: "09:00:00",
          endTime: "12:00:00",
        },
        {
          id: 3,
          examName: "Midterm",
          subjectName: "Science",
          examDate: "2026-10-01T00:00:00",
          startTime: "13:00:00",
          endTime: "14:00:00",
        },
      ]}
    />,
  );
  expect(
    screen.queryByRole("region", { name: "Annual exam timetable" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /Annual.*View timetable/ }),
  );

  // Constants and helper functions
  const annual = screen.getByRole("region", { name: "Annual exam timetable" });
  expect(within(annual).getAllByRole("row")).toHaveLength(3);
  expect(within(annual).getByText("9:00 AM – 12:00 PM")).toBeInTheDocument();
  expect(within(annual).getByText("Maths")).toBeInTheDocument();
  expect(
    screen.queryByRole("region", { name: "Midterm exam timetable" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /Back to exam timetables/ }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Midterm.*View timetable/ }),
  );
  expect(
    within(
      screen.getByRole("region", { name: "Midterm exam timetable" }),
    ).queryByText("Maths"),
  ).not.toBeInTheDocument();
});
