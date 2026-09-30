// Test setup and fixtures
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LibrarianDashboard from "./LibrarianDashboard";

// Constants and helper functions
const onLogout = jest.fn();
const onProfile = jest.fn();
const reservation = {
  id: 4,
  bookName: "Science Today",
  studentName: "Asha",
  status: "Pending",
  requestedAt: "2026-09-28T10:00:00",
};
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(
    "token",
    "header." + btoa(JSON.stringify({ SchoolId: 7 })) + ".signature",
  );
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: { reservations: [reservation] },
    }),
  });
});
const show = () =>
  render(
    <LibrarianDashboard
      userName="Librarian"
      schoolName="School"
      onLogout={onLogout}
      onProfile={onProfile}
    />,
  );
test("loads school reservations, searches and updates a reservation", async () => {
  show();
  expect(await screen.findByText("Science Today")).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/overview?schoolId=7"),
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: expect.stringContaining("Bearer "),
      }),
    }),
  );
  fireEvent.change(screen.getByLabelText("Search"), {
    target: { value: "Unknown" },
  });
  expect(
    screen.getByText("No reservations match your filters."),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search"), {
    target: { value: "Asha" },
  });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Mark Science Today for Asha as Ready",
    }),
  );
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/library-reservations/4/status"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ schoolId: 7, status: "Ready" }),
      }),
    ),
  );
  expect(
    await screen.findByRole("button", {
      name: "Mark Science Today for Asha as Collected",
    }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "My profile" }));
  fireEvent.click(screen.getByRole("button", { name: "Logout" }));
  expect(onProfile).toHaveBeenCalled();
  expect(onLogout).toHaveBeenCalled();
});
test("failed updates retain the current reservation status", async () => {
  show();
  await screen.findByText("Science Today");
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 403 });
  fireEvent.click(
    screen.getByRole("button", {
      name: "Mark Science Today for Asha as Ready",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to access library reservations",
  );
  expect(
    screen.getByRole("button", {
      name: "Mark Science Today for Asha as Ready",
    }),
  ).toBeInTheDocument();
});
test("missing school assignment does not request another school from local storage", async () => {
  localStorage.setItem(
    "token",
    "header." + btoa(JSON.stringify({})) + ".signature",
  );
  localStorage.setItem("schoolId", "99");
  show();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "school assignment",
  );
  expect(global.fetch).not.toHaveBeenCalled();
});
