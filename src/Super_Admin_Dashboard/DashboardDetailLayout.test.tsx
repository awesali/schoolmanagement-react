// Test setup and fixtures
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DashboardDetailLayout from "./DashboardDetailLayout";

// Constants and helper functions
const mockNavigate = jest.fn();
let mockParams = { schoolId: "5" };
jest.mock(
  "react-router-dom",
  () => ({ useNavigate: () => mockNavigate, useParams: () => mockParams }),
  { virtual: true },
);
jest.mock("../security/Permissions", () => ({
  PAGE_PERMISSIONS: {},
  usePermissions: () => ({ can: () => true }),
}));

beforeEach(() => {
  mockNavigate.mockReset();
  mockParams = { schoolId: "5" };
  localStorage.setItem(
    "token",
    "header." + btoa(JSON.stringify({ RoleId: "1" })) + ".signature",
  );
  global.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({
      data: [{ id: 5, schoolName: "North School", logoUrl: "/logo.png" }],
    }),
  })) as jest.Mock;
});

test("staff detail keeps the admin menu visible and opens the chosen page in the same school", async () => {
  render(
    <DashboardDetailLayout kind="staff">
      <div>Staff profile content</div>
    </DashboardDetailLayout>,
  );
  expect(
    screen.getByRole("navigation", { name: "Admin navigation" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Staff profile content")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Staff List" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await waitFor(() =>
    expect(screen.getByText("North School")).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Student List" }));
  expect(mockNavigate).toHaveBeenCalledWith(
    "/dashboard?schoolId=5&page=Student+List",
  );
});

test("student detail highlights Student List", async () => {
  render(
    <DashboardDetailLayout kind="student">
      <div>Student profile content</div>
    </DashboardDetailLayout>,
  );
  expect(screen.getByRole("button", { name: "Student List" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByText("Student profile content")).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByText("North School")).toBeInTheDocument(),
  );
});
