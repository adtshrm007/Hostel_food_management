import React from 'react';
import { Search, Building, X } from 'lucide-react';

import { HOSTEL_OPTIONS } from '../../utils/hostels';

export const FilterBar = ({
  searchQuery,
  setSearchQuery,
  selectedHostel,
  setSelectedHostel,
  onSearch,
  onReset,
}) => {

  return (
    <div className="card" style={{
      backgroundColor: 'var(--color-white)',
      marginBottom: '1.5rem',
      padding: '1.25rem',
    }}>
      <form onSubmit={(e) => { e.preventDefault(); onSearch(); }} style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* Search Query Input */}
        <div style={{ flex: '1 1 220px', position: 'relative', width: '100%' }}>
          <label htmlFor="student-search-query" className="sr-only">Search by name, roll no, reg no, email, or phone</label>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
          <input
            id="student-search-query"
            name="searchQuery"
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by name, roll no, reg no, email, or phone..."
            aria-label="Search students by name, roll no, reg no, email, or phone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Hostel Filter Dropdown */}
        <div style={{ flex: '0 1 200px', position: 'relative', width: '100%', minWidth: '160px' }}>
          <label htmlFor="hostel-filter-select" className="sr-only">Filter students by hostel</label>
          <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)', pointerEvents: 'none' }} />
          <select
            id="hostel-filter-select"
            name="selectedHostel"
            className="form-select"
            style={{ paddingLeft: '2.5rem' }}
            aria-label="Filter students by hostel"
            value={selectedHostel}
            onChange={(e) => setSelectedHostel(e.target.value)}
          >
            <option value="">All Hostels</option>
            {HOSTEL_OPTIONS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>

        {/* Search & Reset Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-primary btn-sm">
            <Search size={16} /> Filter
          </button>

          {(searchQuery || selectedHostel) && (
            <button type="button" onClick={onReset} className="btn btn-outline btn-sm">
              <X size={16} /> Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FilterBar;
