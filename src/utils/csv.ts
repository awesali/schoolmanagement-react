export const parseCsv = (text: string): Record<string, string>[] => {
  const content = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (quoted && content[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value.trim()); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && content[i + 1] === '\n') i++;
      row.push(value.trim()); value = '';
      if (row.some(cell => cell)) rows.push(row);
      row = [];
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(cell => cell)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map(header => header.trim());
  return rows.slice(1).map(values =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))
  );
};

const escapeCell = (value: unknown) => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const downloadCsv = (filename: string, headers: string[], rows: unknown[][]) => {
  const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
