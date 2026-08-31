import React, { useState, useEffect } from 'react';
import adminApi from '../../api/adminApi';
import FilterBar from '../../components/admin/FilterBar';
import StudentTable from '../../components/admin/StudentTable';
import Loader from '../../components/common/Loader';
import { AlertCircle } from 'lucide-react';

export const StudentRecords = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostel, setSelectedHostel] = useState('');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.getStudents({
        search: searchQuery,
        hostel: selectedHostel,
      });
      setStudents(data);
    } catch (err) {
      console.error('Failed to fetch student records:', err);
      setError('Could not load student records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedHostel]); // Auto search on hostel dropdown change

  const handleReset = () => {
    setSearchQuery('');
    setSelectedHostel('');
    adminApi.getStudents().then((data) => setStudents(data));
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
        onSearch={fetchStudents}
        onReset={handleReset}
      />

      <StudentTable students={students} loading={loading} />
    </div>
  );
};

export default StudentRecords;
