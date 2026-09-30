// Test setup and fixtures
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudentChangePassword from "./StudentChangePassword";

beforeEach(() => {
  localStorage.setItem("token", "student-token");
});

test("changes student password through the student endpoint and clears the form", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  }) as jest.Mock;
  render(<StudentChangePassword />);
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "old-password" },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "new-password-123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "new-password-123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Password changed successfully.",
    ),
  );
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/StudentPortal/change-password"),
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer student-token",
      }),
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "new-password-123",
        confirmPassword: "new-password-123",
      }),
    }),
  );
  expect(screen.getByLabelText("Current password")).toHaveValue("");
});

test("does not submit when confirmation differs", () => {
  global.fetch = jest.fn() as jest.Mock;
  render(<StudentChangePassword />);
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "old-password" },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "new-password-123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "other-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
  expect(screen.getByRole("alert")).toHaveTextContent("do not match");
  expect(global.fetch).not.toHaveBeenCalled();
});
