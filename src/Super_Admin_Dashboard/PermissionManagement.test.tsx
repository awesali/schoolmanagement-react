import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PermissionManagement from "./PermissionManagement";
import { ToastProvider } from "../components/Toast/Toast";

test("employee access fetches pages on demand and debounces searches", async () => {
  const original = global.fetch;
  const request = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const data = url.includes("/employees?")
      ? Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: "Employee " + i, email: "person" + i + "@example.com", roleId: 2, roleName: "Teacher", isActive: true }))
      : url.endsWith("/dashboard") ? {} : [];
    return { ok: true, status: 200, text: async () => JSON.stringify(data) } as Response;
  });
  global.fetch = request;
  try {
    render(<ToastProvider><PermissionManagement selectedSchoolId={7} /></ToastProvider>);
    await waitFor(() => expect(screen.queryByText(/Loading permission catalog/)).not.toBeInTheDocument());
    expect(request.mock.calls.some(([url]) => String(url).includes("/employees"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Employee Access" }));
    await screen.findByText("Employee 0");
    expect(request.mock.calls.some(([url]) => String(url).includes("page=1&pageSize=50&schoolId=7"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(request.mock.calls.some(([url]) => String(url).includes("page=2&pageSize=50"))).toBe(true));
    const search = screen.getByPlaceholderText("Search by name, email or role");
    fireEvent.change(search, { target: { value: "T" } });
    fireEvent.change(search, { target: { value: "Te" } });
    fireEvent.change(search, { target: { value: "Teacher" } });
    await waitFor(() => expect(request.mock.calls.some(([url]) => String(url).includes("search=Teacher"))).toBe(true));
    const searches = request.mock.calls.filter(([url]) => String(url).includes("search="));
    expect(searches).toHaveLength(1);
    expect(String(searches[0][0])).toContain("page=1&pageSize=50");
  } finally { global.fetch = original; }
});
