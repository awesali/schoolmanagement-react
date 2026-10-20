import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StudentList from "./StudentList";
import { downloadCsv } from "../utils/csv";

jest.mock("react-router-dom", () => ({ Link: ({ children }: any) => <span>{children}</span> }), { virtual: true });
jest.mock("../components/Toast/Toast", () => ({ useToast: () => ({ error: jest.fn(), success: jest.fn(), warning: jest.fn() }) }));
jest.mock("../security/Permissions", () => ({ usePermissions: () => ({ can: () => true }) }));
jest.mock("./AddStudent", () => () => null);
jest.mock("./EditStudent", () => () => null);
jest.mock("./ProfileIdCard", () => () => null);
jest.mock("../utils/csv", () => ({ ...jest.requireActual("../utils/csv"), downloadCsv: jest.fn() }));
jest.mock("./bulkImportJobs", () => ({ startBulkImportJob: () => "test-job", updateBulkImportJob: jest.fn() }));
jest.mock("./BulkImportPreview", () => ({ rows, onConfirm }: any) => rows.length ? <div>
  <p>{rows.flatMap((row: any) => row.errors).join(" ")}</p>
  <button disabled={!rows.some((row: any) => !row.errors.length)} onClick={onConfirm}>Confirm test import</button>
</div> : null);

const headers = "StudentName,RollNumber,DOB,Gender,Email,PhoneNumber,Class,Section,ParentName,ParentEmail,ParentPhone,ParentAddress,ParentRelationship";
const row = 'Neha Ansari,1,08-24-2014,Female,student0001@example.com,9000000001,7 th,A,Saira Ansari,parent0001@example.com,8000000001,"House 1, Sample Colony, Nagpur, Maharashtra",Mother';
const original = global.fetch;
afterEach(() => { global.fetch = original; });

test.each([true, false])("student import validates the row and submits complete fields, address supplied=%s", async (complete) => {
  const requests = jest.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input);
    const data = url.includes("enrollment-info") ? {
      classes: [{ id: 1, name: "7 th" }], sections: [{ id: 2, name: "A", classId: 1 }], sessions: [{ id: 3, isActive: true }],
    } : [];
    return { ok: true, json: async () => ({ success: true, data, currentPage: 1, totalPages: 0, totalRecords: 0 }) } as Response;
  });
  global.fetch = requests;
  const { container } = render(<StudentList selectedSchoolId={7} />);
  await screen.findByRole("button", { name: "Import CSV" });
  const csv = complete ? headers + ",City,State,Country,PinCode\n" + row + ",Nagpur,Maharashtra,India,440001" : headers + "\n" + row;
  const file = new File([csv], "students.csv", { type: "text/csv" });
  Object.defineProperty(file, "text", { value: async () => csv });
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
  const confirm = await screen.findByRole("button", { name: "Confirm test import" });
  if (!complete) {
    expect(confirm).toBeDisabled();
    expect(screen.getByText(/City is required/)).toBeInTheDocument();
    expect(requests.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    return;
  }
  expect(confirm).toBeEnabled();
  fireEvent.click(confirm);
  await waitFor(() => expect(requests.mock.calls.some(([, options]) => options?.method === "POST")).toBe(true));
  const post = requests.mock.calls.find(([, options]) => options?.method === "POST")!;
  const payload = post[1]!.body as FormData;
  expect(payload.get("AdmissionType")).toBe("New Admission");
  expect(payload.get("Address")).toBe("House 1, Sample Colony, Nagpur, Maharashtra");
  expect(payload.get("City")).toBe("Nagpur");
  expect(payload.get("PinCode")).toBe("440001");
  expect(payload.get("Parent.City")).toBe("Nagpur");
  expect(payload.get("Parent.PinCode")).toBe("440001");
  expect(payload.get("DOB")).toBe("2014-08-24");
});

test("the Download Template button downloads v2 with all required columns", async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [], currentPage: 1, totalPages: 0, totalRecords: 0 }) });
  render(<StudentList selectedSchoolId={7} />);
  fireEvent.click(await screen.findByRole("button", { name: "Download Template" }));
  expect(downloadCsv).toHaveBeenCalledWith("student-import-template-v2.csv", expect.arrayContaining([
    "AdmissionType", "Address", "City", "State", "Country", "PinCode", "ParentCity", "ParentState", "ParentCountry", "ParentPinCode",
  ]), expect.any(Array));
});
