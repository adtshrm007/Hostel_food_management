import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../../api/adminApi';
import FilterBar from '../../components/admin/FilterBar';
import StudentTable from '../../components/admin/StudentTable';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import { AlertCircle } from 'lucide-react';

const PAGE_SIZE = 50;

export const StudentRecords = () => {
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostel, setSelectedHostel] = useState('');

  const tableContainerRef = useRef(null);

  const fetchStudents = useCallback(async (page = 1, search = searchQuery, hostel = selectedHostel) => {
    try {
      setLoading(true);
      setError('');
      const skip = (page - 1) * PAGE_SIZE;

      const [data, countData] = await Promise.all([
        adminApi.getStudents({
          search,
          hostel,
          skip,
          limit: PAGE_SIZE,
        }),
        adminApi.getStudentsCount({
          search,
          hostel,
        }).catch(() => null),
      ]);

      setStudents(data || []);
      if (countData && typeof countData.total === 'number') {
        setTotalStudents(countData.total);
      } else {
        setTotalStudents((data || []).length);
      }
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch student records:', err);
      setError('Could not load student records.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedHostel]);

  // Initial load & when hostel changes
  useEffect(() => {
    fetchStudents(1, searchQuery, selectedHostel);
  }, [selectedHostel]);

  const handleSearch = () => {
    fetchStudents(1, searchQuery, selectedHostel);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedHostel('');
    fetchStudents(1, '', '');
  };

  const handlePageChange = (newPage) => {
    fetchStudents(newPage, searchQuery, selectedHostel);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="container page-section">
      <div className="page-header-banner">
        <div>
          <span className="badge badge-mint" style={{ marginBottom: '0.5rem' }}>Admin Operations</span>
          <h2 style={{ color: 'var(--color-cream)', marginBottom: '0.25rem' }}>
            Student Records & Search Directory
          </h2>
          <p style={{ color: 'var(--color-mint)', fontSize: '0.95rem', margin: 0 }}>
            Filter students by name, roll number, registration number, hostel, or contact info to inspect or override preferences.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedHostel={selectedHostel}
        setSelectedHostel={setSelectedHostel}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      <div ref={tableContainerRef}>
        <StudentTable
          students={students}
          loading={loading}
          startIndex={(currentPage - 1) * PAGE_SIZE}
        />
      </div>

      {/* Pagination Controls */}
      {!loading && totalStudents > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalStudents}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          itemLabel="students"
        />
      )}
    </div>
  );
};

export default StudentRecords;
