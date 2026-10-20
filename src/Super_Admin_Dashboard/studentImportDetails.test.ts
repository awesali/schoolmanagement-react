import { readFileSync } from "fs";
import { resolve } from "path";
import { parseCsv } from "../utils/csv";
import { parseStudentDetailColumns, studentTemplateHeaders, studentTemplateExample } from "./studentImportDetails";
import { toApiDate } from "../utils/importDate";

const legacyRow = { StudentName: "Neha Ansari", ParentAddress: "House 1, Sample Colony, Nagpur, Maharashtra" };
const address = { City: "Nagpur", State: "Maharashtra", Country: "India", PinCode: "440001" };

test("the downloaded example contains every required admission and address field", () => {
  expect(new Set(studentTemplateHeaders).size).toBe(studentTemplateHeaders.length);
  const row = Object.fromEntries(studentTemplateHeaders.map((header, i) => [header, studentTemplateExample[i]]));
  const result = parseStudentDetailColumns(row);
  expect(result.errors).toEqual([]);
  expect(result.payload.AdmissionType).toBe("New Admission");
  expect(result.payload.Address).toBe("12 School Road");
  expect(result.payload["Parent.City"]).toBe("Nagpur");
  expect(result.payload["Parent.PinCode"]).toBe("440001");
});

test("legacy columns default admission type but report missing structured addresses before importing", () => {
  const result = parseStudentDetailColumns(legacyRow);
  expect(result.payload.AdmissionType).toBe("New Admission");
  expect(result.payload.Address).toBe(legacyRow.ParentAddress);
  expect(result.values.City).toBe("");
  expect(result.errors).toEqual(expect.arrayContaining([
    "City is required (or supply ParentCity).", "State is required (or supply ParentState).",
    "Country is required (or supply ParentCountry).", "PinCode must contain a valid 6-digit PIN code.",
  ]));
  expect(result.warnings).toContain("AdmissionType is blank; New Admission will be used.");
  expect(toApiDate("08-24-2014")).toBe("2014-08-24");
});

test("a legacy row with explicit location columns sends both student and parent address details", () => {
  const result = parseStudentDetailColumns({ ...legacyRow, ...address });
  expect(result.errors).toEqual([]);
  expect(result.payload["Parent.Address"]).toBe(legacyRow.ParentAddress);
  expect(result.payload["Parent.City"]).toBe(address.City);
  expect(result.payload["Parent.State"]).toBe(address.State);
  expect(result.payload["Parent.Country"]).toBe(address.Country);
  expect(result.payload["Parent.PinCode"]).toBe(address.PinCode);
});

test("explicit parent addresses remain unchanged", () => {
  const result = parseStudentDetailColumns({ ...legacyRow, ...address, ParentCity: "Pune", ParentState: "Maharashtra", ParentCountry: "India", ParentPinCode: "411001" });
  expect(result.errors).toEqual([]);
  expect(result.payload.City).toBe("Nagpur");
  expect(result.payload["Parent.City"]).toBe("Pune");
  expect(result.payload["Parent.PinCode"]).toBe("411001");
});

test("admission choices, transfer requirements, dates and PIN codes are validated", () => {
  expect(parseStudentDetailColumns({ ...legacyRow, ...address, AdmissionType: "unknown" }).errors).toContain("AdmissionType must be New Admission, Previous School Transfer, or Re-admission.");
  const transfer = parseStudentDetailColumns({ ...legacyRow, ...address, AdmissionType: "previous school transfer", PinCode: "000000", TransferCertificateDate: "02-30-2026" });
  expect(transfer.values.AdmissionType).toBe("Previous School Transfer");
  expect(transfer.errors.join(" ")).toContain("PreviousSchoolName is required");
  expect(transfer.errors.join(" ")).toContain("PreviousClass is required");
  expect(transfer.errors.join(" ")).toContain("TransferCertificateDate");
  expect(transfer.errors.join(" ")).toContain("valid 6-digit PIN");
  const valid = parseStudentDetailColumns({ ...legacyRow, ...address, AdmissionType: "Previous School Transfer", PreviousSchoolName: "Previous School", PreviousClass: "6", TransferCertificateDate: "03-31-2026" });
  expect(valid.errors).toEqual([]);
  expect(valid.payload.TransferCertificateDate).toBe("2026-03-31");
});

test("the directly downloadable v2 CSV exactly matches the current default template", () => {
  const csv = readFileSync(resolve(process.cwd(), "public/student-import-template-v2.csv"), "utf8");
  const rows = parseCsv(csv);
  expect(rows).toHaveLength(1);
  expect(Object.keys(rows[0])).toEqual(studentTemplateHeaders);
  expect(Object.values(rows[0])).toEqual(studentTemplateExample);
  expect(parseStudentDetailColumns(rows[0]).errors).toEqual([]);
});
