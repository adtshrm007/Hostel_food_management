import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 50,
  onPageChange,
  itemLabel = 'students',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= 0 || totalPages <= 1) {
    if (totalItems > 0) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 0.5rem',
          fontSize: '0.88rem',
          color: 'var(--color-charcoal-muted)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <span>
            Showing all <strong>{totalItems}</strong> {itemLabel}
          </span>
          <span className="badge badge-navy" style={{ fontSize: '0.75rem' }}>
            Page 1 of 1
          </span>
        </div>
      );
    }
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate pagination numbers with ellipsis logic
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // Number of pages to show around current page

    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        pages.push(i);
      } else if (
        (i === left - 1 && left > 2) ||
        (i === right + 1 && right < totalPages - 1)
      ) {
        pages.push('...');
      }
    }

    // Filter consecutive duplicate ellipses
    return pages.filter((page, index, array) => {
      return page !== '...' || array[index - 1] !== '...';
    });
  };

  const pages = getPageNumbers();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '1.25rem 0.5rem',
      flexWrap: 'wrap',
      gap: '1rem',
      borderTop: '1px solid var(--border-subtle)',
      marginTop: '1rem',
    }}>
      {/* Item Range Display */}
      <div style={{ fontSize: '0.88rem', color: 'var(--color-charcoal-muted)' }}>
        Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems}</strong> {itemLabel}
      </div>

      {/* Pagination Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        flexWrap: 'wrap',
      }}>
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="btn"
          style={{
            padding: '0.4rem 0.6rem',
            minHeight: 'auto',
            borderRadius: '8px',
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-subtle)',
            color: currentPage === 1 ? 'var(--color-charcoal-muted)' : 'var(--color-navy)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.45 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="First Page"
          aria-label="Go to first page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn"
          style={{
            padding: '0.4rem 0.6rem',
            minHeight: 'auto',
            borderRadius: '8px',
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-subtle)',
            color: currentPage === 1 ? 'var(--color-charcoal-muted)' : 'var(--color-navy)',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.45 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Previous Page"
          aria-label="Go to previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Number Buttons */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '0.4rem 0.5rem',
                  fontSize: '0.9rem',
                  color: 'var(--color-charcoal-muted)',
                  userSelect: 'none',
                }}
              >
                …
              </span>
            );
          }

          const isActive = p === currentPage;
          return (
            <button
              key={`page-${p}`}
              type="button"
              onClick={() => onPageChange(p)}
              className="btn"
              style={{
                minWidth: '36px',
                height: '36px',
                padding: '0 0.5rem',
                borderRadius: '8px',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.88rem',
                backgroundColor: isActive ? 'var(--color-navy)' : 'var(--color-white)',
                color: isActive ? 'var(--color-cream)' : 'var(--color-charcoal)',
                border: isActive ? '1.5px solid var(--color-navy)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
              title={`Page ${p}`}
              aria-label={`Go to page ${p}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {p}
            </button>
          );
        })}

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn"
          style={{
            padding: '0.4rem 0.6rem',
            minHeight: 'auto',
            borderRadius: '8px',
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-subtle)',
            color: currentPage === totalPages ? 'var(--color-charcoal-muted)' : 'var(--color-navy)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.45 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Next Page"
          aria-label="Go to next page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="btn"
          style={{
            padding: '0.4rem 0.6rem',
            minHeight: 'auto',
            borderRadius: '8px',
            backgroundColor: 'var(--color-white)',
            border: '1px solid var(--border-subtle)',
            color: currentPage === totalPages ? 'var(--color-charcoal-muted)' : 'var(--color-navy)',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.45 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Last Page"
          aria-label="Go to last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
