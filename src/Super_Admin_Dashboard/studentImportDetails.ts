import { ADMISSION_TYPES, studentDetailValues } from "./StudentDetailSections";
import { importDateError, toApiDate } from "../utils/importDate";

const columnName = (key: string) => key[0].toUpperCase() + key.slice(1);
const studentColumns = Object.keys(studentDetailValues()).map(columnName);
const addressColumns = ["Address", "AddressLine2", "Landmark", "City", "District", "State", "Country", "PinCode"];
const parentColumns = addressColumns.map((key) => "Parent" + key);
const limits: Record<string, number> = {
  Address: 500, AddressLine2: 200, Landmark: 200, City: 100, District: 100, State: 100,
  Country: 100, PinCode: 6, AdmissionType: 50, PreviousSchoolName: 200,
  PreviousSchoolAddress: 500, PreviousClass: 50, PreviousBoard: 100,
  TransferCertificateNumber: 100, ReasonForLeaving: 500,
};

export const studentTemplateHeaders = [
  "StudentName", "RollNumber", "DOB", "Gender", "Email", "PhoneNumber", "Class", "Section",
  ...studentColumns,
  "ParentName", "ParentEmail", "ParentPhone", ...parentColumns, "ParentRelationship",
];
const example: Record<string, string> = {
  StudentName: "Example Student", RollNumber: "1", DOB: "01-31-2015", Gender: "Female",
  Email: "student@example.com", PhoneNumber: "9876543210", Class: "1", Section: "A",
  AdmissionType: "New Admission", Address: "12 School Road", City: "Nagpur", State: "Maharashtra",
  Country: "India", PinCode: "440001", ParentName: "Parent Name", ParentEmail: "parent@example.com",
  ParentPhone: "9876543211", ParentAddress: "12 School Road", ParentCity: "Nagpur",
  ParentState: "Maharashtra", ParentCountry: "India", ParentPinCode: "440001", ParentRelationship: "Mother",
};
export const studentTemplateExample = studentTemplateHeaders.map((header) => example[header] || "");

export const parseStudentDetailColumns = (row: Record<string, string>) => {
  const values: Record<string, string> = {};
  const errors: string[] = [], warnings: string[] = [];
  [...studentColumns, ...parentColumns].forEach((key) => { values[key] = (row[key] || "").trim(); });
  if (!values.AdmissionType) {
    values.AdmissionType = studentDetailValues().admissionType;
    warnings.push("AdmissionType is blank; New Admission will be used.");
  }
  const admissionType = ADMISSION_TYPES.find((type) => type.toLowerCase() === values.AdmissionType.toLowerCase());
  if (!admissionType) errors.push("AdmissionType must be New Admission, Previous School Transfer, or Re-admission.");
  else values.AdmissionType = admissionType;

  // Reuse an explicitly supplied family address, without guessing city/state/PIN from free text.
  addressColumns.forEach((key) => {
    if (!values[key] && values["Parent" + key]) {
      values[key] = values["Parent" + key];
      warnings.push(key + " is blank; using Parent" + key + ".");
    }
    if (!values["Parent" + key] && values[key]) {
      values["Parent" + key] = values[key];
      warnings.push("Parent" + key + " is blank; using " + key + ".");
    }
  });
  ["Address", "City", "State", "Country"].forEach((key) => {
    if (!values[key]) errors.push(key + " is required (or supply Parent" + key + ").");
  });
  ["PinCode", "ParentPinCode"].forEach((key) => {
    if (!/^[1-9]\d{5}$/.test(values[key])) errors.push(key + " must contain a valid 6-digit PIN code.");
  });
  Object.entries(limits).forEach(([key, limit]) => {
    if (values[key].length > limit) errors.push(key + ": maximum " + limit + " characters.");
    if (addressColumns.includes(key) && values["Parent" + key].length > limit)
      errors.push("Parent" + key + ": maximum " + limit + " characters.");
  });
  if (values.AdmissionType === "Previous School Transfer") {
    if (!values.PreviousSchoolName) errors.push("PreviousSchoolName is required for Previous School Transfer.");
    if (!values.PreviousClass) errors.push("PreviousClass is required for Previous School Transfer.");
  }
  const payload: Record<string, string> = {};
  studentColumns.forEach((key) => { payload[key] = values[key]; });
  parentColumns.forEach((key) => { payload["Parent." + key.slice("Parent".length)] = values[key]; });
  if (values.TransferCertificateDate) {
    const error = importDateError("TransferCertificateDate", values.TransferCertificateDate);
    if (error) errors.push(error);
    payload.TransferCertificateDate = toApiDate(values.TransferCertificateDate);
  }
  return { values, payload, errors, warnings };
};
