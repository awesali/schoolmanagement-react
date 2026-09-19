import React from 'react';
import Modal from './Modal';
import './ImportResults.css';

export interface ImportFailure {
  rowNumber: number;
  name: string;
  email: string;
  message: string;
}
export interface ImportResult {
  imported: number;
  errors: ImportFailure[];
}

const ImportResults: React.FC<{ type: 'Student' | 'Staff'; result: ImportResult | null; onClose: () => void }> = ({ type, result, onClose }) => (
  <Modal isOpen={!!result} onClose={onClose} title={`${type} Import Results`} showSubmit={false} showCancel={false} size="large">
    {result && <div className="import-results">
      <div className="import-results-summary" aria-label="Import summary">
        <span className="import-results-success">{result.imported} imported successfully</span>
        <span className="import-results-failed">{result.errors.length} failed to import</span>
      </div>
      <div className="import-results-heading">
        <h4>Records that need attention</h4>
        <p>CSV row numbers help you find each record in your file.</p>
      </div>
      <div className="import-results-table-wrapper">
        <table className="import-results-table">
          <thead><tr><th scope="col">CSV Row</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Reason for failure</th></tr></thead>
          <tbody>{result.errors.map(error => <tr key={error.rowNumber}>
            <td>{error.rowNumber}</td><td>{error.name || '—'}</td><td>{error.email || '—'}</td>
            <td className="import-results-error">{error.message}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="import-results-help"><strong>Next step</strong>
        <p>Correct the records listed above, then import only those records again. Successfully imported records are already saved.</p>
      </div>
    </div>}
  </Modal>
);

export default ImportResults;
