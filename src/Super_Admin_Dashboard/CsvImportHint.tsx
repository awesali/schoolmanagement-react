import React, { useId, useState } from 'react';
import './CsvImportHint.css';

const CsvImportHint: React.FC = () => {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  return (
  <div className="csv-import-hint" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" className="csv-import-hint-icon" aria-label="CSV import information"
      aria-describedby={open ? tooltipId : undefined}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(true)}
      onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>i</button>
    {open && <div id={tooltipId} role="tooltip" className="csv-import-hint-tooltip">
      <strong className="csv-import-hint-title">Importing a CSV?</strong>
      <p>Enter dates as <strong>MM/DD/YYYY</strong> or <strong>MM-DD-YYYY</strong> (month first), e.g. <span className="csv-import-hint-example">1/31/2010</span> or <span className="csv-import-hint-example">01-31-2010</span>. Profile photos are optional.</p>
    </div>}
  </div>
  );
};

export default CsvImportHint;
