import React, { useState } from 'react';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50]
}) => {
  const [pageInput, setPageInput] = useState('');

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setPageInput('');
    }
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
    setPageInput('');
  };

  if (totalRecords === 0) return null;

  return (
    <div className="pagination-container">
      {/* First Page */}
      <button
        className="pagination-btn"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        title="First Page"
      >
        ≪
      </button>

      {/* Previous Page */}
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        title="Previous Page"
      >
        ‹ Prev
      </button>

      {/* Next Page */}
      <button
        className="pagination-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        title="Next Page"
      >
        Next ›
      </button>

      {/* Last Page */}
      <button
        className="pagination-btn"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        title="Last Page"
      >
        ≫
      </button>

      {/* Page Size Selector */}
      <select
        className="page-size-select"
        value={pageSize}
        onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
      >
        {pageSizeOptions.map(size => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>

      {/* Page Input */}
      <span className="page-label">Page:</span>
      <form onSubmit={handlePageInputSubmit} className="page-input-form">
        <input
          type="number"
          min="1"
          max={totalPages}
          value={pageInput || currentPage}
          onChange={handlePageInputChange}
          onBlur={handlePageInputBlur}
          className="page-input"
        />
      </form>

      <span className="page-total">of {totalPages}</span>
    </div>
  );
};

export default Pagination;