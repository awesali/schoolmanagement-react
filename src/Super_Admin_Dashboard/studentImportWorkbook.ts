import { parseCsv } from "../utils/csv";

export const normalizeClassName = (name: unknown): string =>
  String(name ?? "").replace(/\s+/g, "").toLowerCase();

export const createStudentWorkbook = async (headers: string[], example: string[], classes: string[]) => {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const students = workbook.addWorksheet("Students");
  const choices = workbook.addWorksheet("Classes");
  const names = Array.from(new Set(classes));
  if (!names.length) throw new Error("Create a class before downloading the student template.");
  names.forEach((name) => { choices.addRow([name]); });
  workbook.definedNames.add("'Classes'!$A$1:$A$" + names.length, "StudentClasses");
  choices.state = "hidden";
  const sample = [...example];
  const classColumn = headers.indexOf("Class") + 1;
  sample[classColumn - 1] = names[0];
  students.addRow(headers);
  students.addRow(sample);
  students.getRow(1).font = { bold: true };
  students.views = [{ state: "frozen", ySplit: 1 }];
  students.columns.forEach((column) => { column.width = 24; });
  // Range validation avoids allocating a million worksheet rows.
  (students as any).dataValidations.add("G2:G10001", {
    type: "list", allowBlank: false, formulae: ["StudentClasses"],
    showErrorMessage: true, errorStyle: "stop", errorTitle: "Select an existing class",
    error: "Choose a class from the dropdown.",
  });
  return workbook;
};

export const downloadStudentWorkbook = async (headers: string[], example: string[], classes: string[]) => {
  const workbook = await createStudentWorkbook(headers, example, classes);
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-import-template-v3.xlsx";
  link.click();
  URL.revokeObjectURL(url);
};

// ExcelJS expects unprefixed SpreadsheetML element names. Excel and other
// spreadsheet editors may legally write the same elements with a namespace prefix.
export const normalizeWorkbookXml = async (buffer: ArrayBuffer) => {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  let changed = false;
  const entries = Object.values(zip.files).filter((entry) => !entry.dir && entry.name.startsWith("xl/") && entry.name.endsWith(".xml"));
  for (const entry of entries) {
    let xml = await entry.async("string");
    const prefixes = Array.from(xml.matchAll(/xmlns:([\w.-]+)=["']http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main["']/g), (match) => match[1]);
    for (const prefix of prefixes) {
      xml = xml.replace(/<(\/?)([\w.-]+):/g, (tag, slash, tagPrefix) => tagPrefix === prefix ? "<" + slash : tag);
    }
    if (prefixes.length) { zip.file(entry.name, xml); changed = true; }
  }
  return changed ? zip.generateAsync({ type: "arraybuffer" }) : buffer;
};

export const readStudentImport = async (file: File): Promise<Record<string, string>[]> => {
  if (!file.name.toLowerCase().endsWith(".xlsx")) return parseCsv(await file.text());
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(await normalizeWorkbookXml(await file.arrayBuffer()));
  } catch {
    throw new Error("Unable to read this Excel workbook. Save it as an Excel Workbook (.xlsx) and try again, or upload a CSV file.");
  }
  const sheet = workbook.getWorksheet("Students");
  if (!sheet) throw new Error("The workbook must contain a Students sheet. Download the latest template.");
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, column) => { headers[column - 1] = cell.text.trim(); });
  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const values = headers.map((header, column) => {
      const cell = row.getCell(column + 1);
      if (cell.value instanceof Date) return cell.value.toISOString().slice(0, 10);
      return cell.text.trim();
    });
    if (values.some(Boolean)) rows.push(Object.fromEntries(headers.map((header, column) => [header, values[column]])));
  });
  return rows;
};
