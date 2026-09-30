// Test setup and fixtures
import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import ReceptionistDashboard, { ReceptionEntry } from "./ReceptionistDashboard";
jest.mock("../security/Permissions", () => ({
  usePermissions: () => ({ loading: false, can: () => false }),
}));
jest.mock("./StudentList", () => () => null);
jest.mock("./ParentList", () => () => null);
jest.mock("./StudentServicesManagement", () => () => null);
jest.mock("./FinanceManagement", () => () => null);

// Constants and helper functions
const visitor: ReceptionEntry = {
  id: 1,
  kind: "Visitor",
  name: "Visitor One",
  phone: "9876543210",
  contactPerson: "School office",
  purpose: "Document collection",
  status: "Checked in",
  scheduledAt: "2026-09-28T09:00:00",
  followUpDate: null,
  checkedOutAt: null,
  version: "AAAAAAAB",
};
const enquiry: ReceptionEntry = {
  ...visitor,
  id: 2,
  kind: "Enquiry",
  name: "Parent enquiry",
  purpose: "Class 4 admission",
  status: "Follow-up",
  followUpDate: "2026-09-28T00:00:00",
};
const data = {
  schoolId: 7,
  schoolName: "School Seven",
  academicYear: "2026-27",
  generatedAt: "2026-09-28T04:00:00Z",
  entries: [visitor, enquiry],
  followUps: [enquiry],
  onSite: [visitor],
};
beforeEach(() => {
  localStorage.setItem("token", "reception-token");
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => data });
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
const show = () =>
  render(
    <ReceptionistDashboard
      userName="Reception User"
      onLogout={jest.fn()}
      onProfile={jest.fn()}
    />,
  );
test("shows school records and drills into current visitors without exposing ungranted services", async () => {
  show();
  await screen.findByText("School Seven");
  expect(
    screen.queryByRole("button", { name: "Students" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Currently on campus/ }));
  expect(screen.getByLabelText("Currently on campus")).toBeChecked();
  expect(screen.getByText("Visitor One")).toBeInTheDocument();
  expect(screen.queryByText("Parent enquiry")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search register"), {
    target: { value: "not found" },
  });
  expect(screen.getByText("No matching records")).toBeInTheDocument();
});
test("saves a visitor to the API and refreshes the register", async () => {
  show();
  await screen.findByText("School Seven");
  fireEvent.click(
    screen.getByRole("button", { name: /＋ Check in a visitor/ }),
  );
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Full name *"), {
    target: { value: "New Visitor" },
  });
  fireEvent.change(within(dialog).getByLabelText("Purpose / notes *"), {
    target: { value: "Meeting the office" },
  });
  fireEvent.click(
    within(dialog).getByRole("button", { name: "Check in visitor" }),
  );
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/receptionist/entries"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"name":"New Visitor"'),
      }),
    ),
  );
  expect(
    await screen.findByText("Visitor recorded successfully."),
  ).toBeInTheDocument();
});
test("checkout sends the concurrency token and keeps a failed update open for review", async () => {
  show();
  await screen.findByText("School Seven");
  fireEvent.click(screen.getByRole("button", { name: "Visitors" }));
  fireEvent.click(screen.getByRole("button", { name: "Check out" }));
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 409,
    json: async () => ({
      message:
        "Another receptionist updated this record. Refresh and try again.",
    }),
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Save update",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Another receptionist",
  );
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/entries/1/status"),
    expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining('"version":"AAAAAAAB"'),
    }),
  );
});
test("follow-up queue includes open records due through the selected date", async () => {
  show();
  await screen.findByText("School Seven");
  fireEvent.click(
    screen.getByRole("button", { name: "Open follow-up queue →" }),
  );
  expect(screen.getByText("Parent enquiry")).toBeInTheDocument();
  expect(screen.queryByText("Visitor One")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Register date"), {
    target: { value: "2026-09-27" },
  });
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("date=2026-09-27"),
      expect.anything(),
    ),
  );
});
test("failed refresh removes stale records and offers a retry", async () => {
  show();
  await screen.findByText("School Seven");
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status: 403,
    json: async () => ({}),
  });
  fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "active receptionist account",
  );
  expect(screen.queryByText("Visitor One")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Visitor One")).toBeInTheDocument();
});

test("resolving an overdue follow-up clears its old due date", async () => {
  show();
  await screen.findByText("School Seven");
  fireEvent.click(
    screen.getByRole("button", { name: "Open follow-up queue →" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Update" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("New status"), {
    target: { value: "Resolved" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save update" }));
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/entries/2/status"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          status: "Resolved",
          version: enquiry.version,
          followUpDate: null,
        }),
      }),
    ),
  );
});
