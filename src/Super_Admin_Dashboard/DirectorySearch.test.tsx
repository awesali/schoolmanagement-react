import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudentList from "./StudentList";
import StaffList from "./StaffList";
import PrincipalStudentDirectory from "./PrincipalStudentDirectory";

jest.mock("react-router-dom", () => ({ Link: ({ children }: any) => <span>{children}</span> }), { virtual: true });
jest.mock("../components/Toast/Toast", () => ({ useToast: () => ({ error: jest.fn() }) }));
jest.mock("./AddStudent", () => () => null);
jest.mock("./EditStudent", () => () => null);
jest.mock("./AddStaff", () => () => null);
jest.mock("./EditStaff", () => () => null);
jest.mock("./ProfileIdCard", () => () => null);

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test.each(["students", "staff"])("%s filters while typing, keeps pagination, and restores all results when emptied", async (kind) => {
  const request = jest.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const term = url.searchParams.get("search");
    const page = Number(url.searchParams.get("page"));
    const record = { id: page, studentName: "Ayesha " + page, name: "Ayesha " + page, dob: "2015-01-01", doj: "2020-01-01", roleName: "Teacher", documents: [], isActive: true };
    return { ok: true, json: async () => ({ success: true, data: term === "Nobody" ? [] : [record], totalRecords: term === "Nobody" ? 0 : 30, totalPages: 3, currentPage: page }) } as Response;
  });
  global.fetch = request;
  render(kind === "students" ? <StudentList selectedSchoolId={7} /> : <StaffList selectedSchoolId={7} />);
  await screen.findByText("Ayesha 1");
  fireEvent.click(screen.getByTitle("Next Page"));
  await screen.findByText("Ayesha 2");
  const input = screen.getByRole("searchbox", { name: "Search " + kind + " by name" });
  fireEvent.change(input, { target: { value: "Ayesha & Noor" } });
  await screen.findByText("Ayesha 1");
  let last = new URL(String(request.mock.calls[request.mock.calls.length - 1][0]));
  expect(last.searchParams.get("search")).toBe("Ayesha & Noor");
  expect(last.searchParams.get("page")).toBe("1");
  fireEvent.click(screen.getByTitle("Next Page"));
  await screen.findByText("Ayesha 2");
  last = new URL(String(request.mock.calls[request.mock.calls.length - 1][0]));
  expect(last.searchParams.get("search")).toBe("Ayesha & Noor");
  fireEvent.change(input, { target: { value: "Nobody" } });
  await screen.findByText(kind === "students" ? "No students match that name." : "No staff match that name.");
  expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "" } });
  expect(new URL(String(request.mock.calls[request.mock.calls.length - 1][0])).searchParams.has("search")).toBe(false);
  await screen.findByText("Ayesha 1");
  expect(new URL(String(request.mock.calls[request.mock.calls.length - 1][0])).searchParams.has("search")).toBe(false);
});

test("principal student results filter live and return to the full list when emptied", async () => {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const term = new URL(String(input)).searchParams.get("search");
    return { ok: true, json: async () => ({ success: true, data: [{ id: 1, studentName: term ? "Ayesha Khan" : "Original student", className: "Class 4", sectionName: "A" }], totalPages: 1 }) } as Response;
  });
  render(<PrincipalStudentDirectory />);
  await screen.findByText("Original student");
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value: "Ayesha" } });
  await screen.findByText("Ayesha Khan");
  expect(String((global.fetch as jest.Mock).mock.calls[1][0])).toContain("search=Ayesha&page=1&pageSize=20");
  expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "" } });
  expect(String((global.fetch as jest.Mock).mock.calls[2][0])).toContain("search=&page=1&pageSize=20");
  await screen.findByText("Original student");
  expect(screen.queryByText("Ayesha Khan")).not.toBeInTheDocument();
});

test.each(["students", "staff"])("%s ignores a late search response after the input is emptied", async (kind) => {
  let finishOld: (response: Response) => void = () => {};
  const response = (name: string) => ({ ok: true, json: async () => ({ success: true,
    data: [{ id: 1, studentName: name, name, dob: "2015-01-01", doj: "2020-01-01", roleName: "Teacher", documents: [], isActive: true }],
    totalRecords: 1, totalPages: 1, currentPage: 1,
  }) } as Response);
  const request = jest.fn((input: RequestInfo | URL, options?: RequestInit) => {
    if (new URL(String(input)).searchParams.get("search") === "Old")
      return new Promise<Response>((resolve) => { finishOld = resolve; });
    return Promise.resolve(response("Original record"));
  });
  global.fetch = request;
  render(kind === "students" ? <StudentList selectedSchoolId={7} /> : <StaffList selectedSchoolId={7} />);
  await screen.findByText("Original record");
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value: "Old" } });
  const oldSignal = request.mock.calls[1][1]?.signal;
  fireEvent.change(input, { target: { value: "" } });
  expect(oldSignal?.aborted).toBe(true);
  await screen.findByText("Original record");
  await act(async () => { finishOld(response("Outdated result")); });
  expect(screen.queryByText("Outdated result")).not.toBeInTheDocument();
  expect(screen.getByText("Original record")).toBeInTheDocument();
});
