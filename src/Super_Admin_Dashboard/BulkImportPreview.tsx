import React from 'react';
import Modal from './Modal';

export interface ImportPreviewRow {
  rowNumber: number;
  values: Record<string, string>;
  errors: string[];
  warnings: string[];
  payload?: unknown;
}

interface Props {
  title: string;
  columns: string[];
  rows: ImportPreviewRow[];
  importing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const BulkImportPreview: React.FC<Props> = ({ title, columns, rows, importing, onClose, onConfirm }) => {
  const validCount = rows.filter(row => row.errors.length === 0).length;
  const errorCount = rows.length - validCount;
  const warningCount = rows.filter(row => row.warnings.length > 0).length;

  return (
    <Modal isOpen={rows.length > 0} onClose={onClose} title={title} showSubmit={false} showCancel={false} size="large">
      <div style={{ padding: '20px 24px 24px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <span className="status-badge active">{validCount} valid</span>
          <span className="status-badge inactive">{errorCount} with errors</span>
          <span style={{ color: '#975a16' }}>{warningCount} with warnings</span>
        </div>
        <div style={{ maxHeight: '55vh', overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          <table className="staff-table" style={{ minWidth: Math.max(1200, columns.length * 150 + 340), width: '100%' }}>
            <thead><tr><th>Row</th>{columns.map(column => <th key={column}>{column}</th>)}<th>Validation</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.rowNumber} style={{ background: row.errors.length ? '#fff5f5' : row.warnings.length ? '#fffaf0' : undefined }}>
                  <td>{row.rowNumber}</td>
                  {columns.map(column => <td key={column}>{row.values[column] || '-'}</td>)}
                  <td style={{ minWidth: 240 }}>
                    {row.errors.map(error => <div key={error} style={{ color: '#c53030' }}>Error: {error}</div>)}
                    {row.warnings.map(warning => <div key={warning} style={{ color: '#975a16' }}>Warning: {warning}</div>)}
                    {!row.errors.length && !row.warnings.length && <span style={{ color: '#2f855a' }}>Ready</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <button className="btn" disabled={importing} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={importing || validCount === 0} onClick={onConfirm}>
            {importing ? 'Importing...' : `Import ${validCount} valid row${validCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkImportPreview;
