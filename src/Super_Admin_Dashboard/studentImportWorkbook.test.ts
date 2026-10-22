import { createStudentWorkbook, normalizeClassName, readStudentImport } from "./studentImportWorkbook";
import { studentTemplateHeaders, studentTemplateExample } from "./studentImportDetails";

test.each(["10 th", "10Th", "10th", " 10   Th ", "10\tTH"])("normalizes %s to the existing class key", (value) => {
  expect(normalizeClassName(value)).toBe(normalizeClassName("10 Th"));
  expect(normalizeClassName(value)).not.toBe(normalizeClassName("11 Th"));
});

test("template retains all current classes and dropdown validation after an Excel round trip", async () => {
  const classes = ["7 Th", "8 Th", "9 Th", "10 Th"];
  const workbook = await createStudentWorkbook(studentTemplateHeaders, studentTemplateExample, classes);
  const buffer = await workbook.xlsx.writeBuffer();
  const { Workbook } = await import("exceljs");
  const restored = new Workbook();
  await restored.xlsx.load(buffer);
  expect(restored.getWorksheet("Classes")!.getColumn(1).values.slice(1)).toEqual(classes);
  expect(restored.getWorksheet("Students")!.getCell("G2").dataValidation.formulae).toEqual(["StudentClasses"]);
  expect(restored.getWorksheet("Students")!.getCell("G10000").dataValidation.type).toBe("list");
  const rows = await readStudentImport({ name: "students.xlsx", arrayBuffer: async () => buffer } as unknown as File);
  expect(rows[0].Class).toBe("7 Th");
  expect(rows[0].City).toBe("Nagpur");
});

test("a school without classes cannot download a misleading template", async () => {
  await expect(createStudentWorkbook(studentTemplateHeaders, studentTemplateExample, [])).rejects.toThrow("Create a class");
});


test("imports valid workbooks with prefixed SpreadsheetML tags", async () => {
  const { default: JSZip } = await import("jszip");
  const workbook = await createStudentWorkbook(studentTemplateHeaders, studentTemplateExample, ["10 Th"]);
  const zip = await JSZip.loadAsync(await workbook.xlsx.writeBuffer());
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.startsWith("xl/") || !entry.name.endsWith(".xml")) continue;
    let xml = await entry.async("string");
    const namespace = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    if (!xml.includes(namespace)) continue;
    xml = xml.replace(namespace, 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"');
    xml = xml.replace(/<(\/?)([A-Za-z][\w.-]*)(?=[\s/>])/g, "<$1x:$2");
    zip.file(entry.name, xml);
  }
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  const rows = await readStudentImport({ name: "students.xlsx", arrayBuffer: async () => buffer } as File);
  expect(rows[0].Class).toBe("10 Th");
  expect(rows[0].City).toBe("Nagpur");
});

test("unreadable workbooks show a useful error", async () => {
  await expect(readStudentImport({ name: "broken.xlsx", arrayBuffer: async () => new ArrayBuffer(0) } as File)).rejects.toThrow("Save it as an Excel Workbook");
});
