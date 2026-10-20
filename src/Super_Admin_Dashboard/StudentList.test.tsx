import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudentList from "./StudentList";

jest.mock("react-router-dom", () => ({ Link: ({ children }: any) => <span>{children}</span> }), { virtual: true });
jest.mock("../components/Toast/Toast", () => ({ useToast: () => ({ error: jest.fn() }) }));
jest.mock("./AddStudent", () => () => null);
jest.mock("./EditStudent", () => () => null);
jest.mock("./ProfileIdCard", () => () => null);

test("loads only the requested page even with 50,000 students", async () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("page"));
    const size = Number(url.searchParams.get("pageSize"));
    return { ok: true, json: async () => ({ success: true,
      data: [{ id: page, studentName: "Student page " + page, dob: "2015-01-01", isActive: true }],
      currentPage: page, totalPages: Math.ceil(50000 / size), totalRecords: 50000,
    }) } as Response;
  });
  global.fetch = fetchMock;
  try {
    render(<StudentList selectedSchoolId={7} />);
    await screen.findByText("Student page 1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("schoolId=7&page=1&pageSize=10");
    fireEvent.click(screen.getByTitle("Next Page"));
    await screen.findByText("Student page 2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain("page=2&pageSize=10");
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "50" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    await screen.findByText("Student page 1");
    expect(String(fetchMock.mock.calls[2][0])).toContain("page=1&pageSize=50");
  } finally { global.fetch = originalFetch; }
});
