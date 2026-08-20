import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import FilterBar from '../../components/admin/FilterBar';
import Loader from '../../components/common/Loader';
import { HOSTEL_OPTIONS } from '../../utils/hostels';
import {
  AlertCircle, CheckCircle, Trash2, Edit3, UserCheck, X,
  ChevronDown, Users, ShieldAlert
} from 'lucide-react';

// ─── Confirmation Modal ─────────────────────────────────────────────
const ConfirmModal = ({ open, title, message, confirmLabel, confirmDanger, onConfirm, onCancel, loading, requirePassword }) => {
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');

  useEffect(() => {
    if (open) {
      setPassword('');
      setPassError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (requirePassword && !password) {
      setPassError('Admin password is required to confirm deletion.');
      return;
    }
    onConfirm(password);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div
        onClick={onCancel}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18,48,74,0.55)', backdropFilter: 'blur(4px)' }}
      />
      <div className="card" style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 480,
        margin: '1rem', padding: '2rem', animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <ShieldAlert size={24} color="var(--color-danger)" />
          <h4 style={{ margin: 0, color: 'var(--color-navy)' }}>{title}</h4>
        </div>
        <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          {message}
        </p>

        <form onSubmit={handleSubmit}>
          {requirePassword && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="admin-confirm-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.35rem', display: 'block' }}>
                Confirm Admin Password <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="admin-confirm-password"
                name="adminConfirmPassword"
                type="password"
                className="form-input"
                placeholder="Enter your admin password..."
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPassError(''); }}
                required
                autoFocus
              />
              {passError && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                  {passError}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} disabled={loading}>Cancel</button>
            <button
              type="submit"
              className={`btn btn-sm ${confirmDanger ? '' : 'btn-primary'}`}
              style={confirmDanger ? { backgroundColor: 'var(--color-danger)', color: '#fff', boxShadow: '0 4px 14px rgba(229,57,53,0.3)' } : {}}
              disabled={loading}
            >
              {loading ? 'Verifying & Deleting...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Edit Student Modal ─────────────────────────────────────────────
const EditStudentModal = ({ open, student, onSave, onClose, loading, error }) => {
  const [form, setForm] = useState({ name: '', roll: '', phone: '', hostel: '', email: '' });

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name || '',
        roll: student.roll || '',
        phone: student.phone || '',
        hostel: student.hostel || '',
        email: student.email || '',
      });
    }
  }, [student]);

  if (!open || !student) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only send changed fields
    const updates = {};
    if (form.name !== student.name) updates.name = form.name;
    if (form.roll !== student.roll) updates.roll = form.roll;
    if (form.phone !== student.phone) updates.phone = form.phone;
    if (form.hostel !== student.hostel) updates.hostel = form.hostel;
    if (form.email !== student.email) updates.email = form.email;
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    onSave(student.student_id, updates);
  };

  const inputStyle = {
    width: '100%', padding: '0.7rem 1rem', borderRadius: 'var(--radius-sm)',
    border: '1.5px solid var(--border-strong)', backgroundColor: 'var(--color-white)',
    fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--color-charcoal)',
    transition: 'border-color var(--transition-fast)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18,48,74,0.55)', backdropFilter: 'blur(4px)' }}
      />
      <div className="card" style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 540,
        margin: '1rem', padding: '2rem', animation: 'fadeIn 0.2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: 0, color: 'var(--color-navy)' }}>
            <Edit3 size={18} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
            Edit Student Details
          </h4>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
            <AlertCircle size={18} /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="edit-student-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.3rem', display: 'block' }}>Name</label>
              <input id="edit-student-name" name="name" value={form.name} onChange={handleChange} style={inputStyle} required minLength={2} maxLength={100} />
            </div>
            <div>
              <label htmlFor="edit-student-roll" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.3rem', display: 'block' }}>Roll Number</label>
              <input id="edit-student-roll" name="roll" value={form.roll} onChange={handleChange} style={inputStyle} required minLength={2} maxLength={30} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label htmlFor="edit-student-phone" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.3rem', display: 'block' }}>Phone</label>
              <input id="edit-student-phone" name="phone" value={form.phone} onChange={handleChange} style={inputStyle} required pattern="^\+?[0-9]{10,15}$" title="Valid phone number (10–15 digits)" />
            </div>
            <div>
              <label htmlFor="edit-student-hostel" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.3rem', display: 'block' }}>Hostel</label>
              <select id="edit-student-hostel" name="hostel" value={form.hostel} onChange={handleChange} style={{ ...inputStyle, appearance: 'none' }}>
                {HOSTEL_OPTIONS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="edit-student-email" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.3rem', display: 'block' }}>Email</label>
            <input id="edit-student-email" name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} required />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Toast Notification ─────────────────────────────────────────────
const Toast = ({ message, type, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`alert ${type === 'success' ? 'alert-success' : 'alert-danger'}`}
      style={{
        position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 10000,
        maxWidth: 420, boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 0.25s ease',
        cursor: 'pointer',
      }}
      onClick={onDismiss}
    >
      {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      <span>{message}</span>
    </div>
  );
};

// ─── Table Skeleton ────────────────────────────────────────────────
const TableSkeleton = () => (
  <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--color-white)', minHeight: '440px' }}>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-navy)', height: '48px' }}>
            <th style={{ width: '48px', padding: '1rem' }} />
            <th style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '40px', height: '14px' }} /></th>
            <th style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '120px', height: '14px' }} /></th>
            <th style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '80px', height: '14px' }} /></th>
            <th style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '100px', height: '14px' }} /></th>
            <th style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '140px', height: '14px' }} /></th>
            <th style={{ padding: '1rem', textAlign: 'right' }}><div className="skeleton" style={{ width: '90px', height: '14px', marginLeft: 'auto' }} /></th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', height: '64px' }}>
              <td style={{ padding: '1rem', textAlign: 'center' }}><div className="skeleton" style={{ width: '18px', height: '18px', margin: '0 auto' }} /></td>
              <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '30px', height: '16px' }} /></td>
              <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '140px', height: '16px' }} /></td>
              <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '70px', height: '22px', borderRadius: '12px' }} /></td>
              <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '110px', height: '16px' }} /></td>
              <td style={{ padding: '1rem' }}><div className="skeleton" style={{ width: '160px', height: '28px' }} /></td>
              <td style={{ padding: '1rem', textAlign: 'right' }}><div className="skeleton" style={{ width: '120px', height: '32px', borderRadius: '8px', marginLeft: 'auto' }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// ManageStudents Page
// ═══════════════════════════════════════════════════════════════════
export const ManageStudents = () => {
  const navigate = useNavigate();

  // Student data
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostel, setSelectedHostel] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', confirmDanger: false, onConfirm: null });
  const [editModal, setEditModal] = useState({ open: false, student: null });
  const [editError, setEditError] = useState('');

  // Loading states
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Use a stable ref for the select-all checkbox to avoid forced reflow
  const selectAllCheckboxRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ─── Fetch Students ─────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    try {
      setError('');
      const data = await adminApi.getStudents({
        search: searchQuery,
        hostel: selectedHostel,
      });
      setStudents(data);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to fetch student records:', err);
      setError('Could not load student records.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedHostel]);

  useEffect(() => {
    fetchStudents();
  }, [selectedHostel]); // Auto search on hostel change

  const handleReset = () => {
    setSearchQuery('');
    setSelectedHostel('');
    setSelectedIds(new Set());
    adminApi.getStudents().then((data) => {
      setStudents(data);
    });
  };

  // ─── Selection Handlers ────────────────────────────────────────
  const toggleSelect = (studentId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length && students.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.student_id)));
    }
  };

  const allSelected = students.length > 0 && selectedIds.size === students.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < students.length;

  // Set indeterminate via useEffect to avoid forced DOM reflow during render
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // ─── Delete Single ─────────────────────────────────────────────
  const handleDeleteSingle = (student) => {
    setConfirmModal({
      open: true,
      title: 'Delete Student Permanently',
      message: `Are you sure you want to permanently delete "${student.name}" (${student.roll})? All associated food preferences will also be deleted. This action cannot be undone.`,
      confirmLabel: 'Verify & Delete Permanently',
      confirmDanger: true,
      requirePassword: true,
      onConfirm: async (adminPassword) => {
        try {
          setActionLoading(true);
          await adminApi.deleteStudent(student.student_id, adminPassword);
          showToast(`Student "${student.name}" deleted successfully.`);
          setStudents((prev) => prev.filter((s) => s.student_id !== student.student_id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(student.student_id);
            return next;
          });
        } catch (err) {
          showToast(err?.response?.data?.detail || 'Failed to delete student.', 'error');
        } finally {
          setActionLoading(false);
          setConfirmModal((m) => ({ ...m, open: false }));
        }
      },
    });
  };

  // ─── Delete Bulk ───────────────────────────────────────────────
  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    setConfirmModal({
      open: true,
      title: `Delete ${count} Student${count > 1 ? 's' : ''} Permanently`,
      message: `You are about to permanently delete ${count} student record${count > 1 ? 's' : ''} and all associated food preferences. This action cannot be undone.`,
      confirmLabel: `Verify & Delete ${count} Student${count > 1 ? 's' : ''}`,
      confirmDanger: true,
      requirePassword: true,
      onConfirm: async (adminPassword) => {
        try {
          setActionLoading(true);
          await adminApi.deleteStudentsBulk(Array.from(selectedIds), adminPassword);
          showToast(`Successfully deleted ${count} student${count > 1 ? 's' : ''}.`);
          setStudents((prev) => prev.filter((s) => !selectedIds.has(s.student_id)));
          setSelectedIds(new Set());
        } catch (err) {
          showToast(err?.response?.data?.detail || 'Failed to delete students.', 'error');
        } finally {
          setActionLoading(false);
          setConfirmModal((m) => ({ ...m, open: false }));
        }
      },
    });
  };

  // ─── Edit ──────────────────────────────────────────────────────
  const handleEditOpen = (student) => {
    setEditError('');
    setEditModal({ open: true, student });
  };

  const handleEditSave = async (studentId, updates) => {
    try {
      setActionLoading(true);
      setEditError('');
      const updated = await adminApi.updateStudent(studentId, updates);
      setStudents((prev) => prev.map((s) => (s.student_id === studentId ? updated : s)));
      setEditModal({ open: false, student: null });
      showToast('Student details updated successfully.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setEditError(typeof detail === 'string' ? detail : 'Failed to update student.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="container page-section">
      {/* Header Banner */}
      <div className="page-header-banner">
        <div>
          <span className="badge badge-mint" style={{ marginBottom: '0.5rem' }}>Admin Operations</span>
          <h2 style={{ color: 'var(--color-cream)', margin: '0.25rem 0 0', fontSize: '1.6rem', fontWeight: 700 }}>
            Manage Students
          </h2>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedHostel={selectedHostel}
        setSelectedHostel={setSelectedHostel}
        onSearch={fetchStudents}
        onReset={handleReset}
      />

      {/* Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="card" style={{
          marginBottom: '1rem', padding: '0.85rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.75rem',
          backgroundColor: 'rgba(18, 48, 74, 0.04)',
          border: '1.5px solid var(--color-navy)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-navy" style={{ fontSize: '0.85rem', padding: '0.3rem 0.8rem' }}>
              {selectedIds.size} selected
            </span>
            {selectedIds.size < students.length && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-green)', fontSize: '0.85rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setSelectedIds(new Set(students.map((s) => s.student_id)))}
              >
                Select all {students.length} students
              </button>
            )}
            {selectedIds.size > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.85rem', padding: '0.25rem 0.6rem' }}
                onClick={() => setSelectedIds(new Set())}
              >
                Clear selection
              </button>
            )}
          </div>
          <button
            className="btn btn-sm"
            style={{ backgroundColor: 'var(--color-danger)', color: '#fff', boxShadow: '0 4px 14px rgba(229,57,53,0.3)' }}
            onClick={handleDeleteSelected}
          >
            <Trash2 size={15} /> Delete Selected
          </button>
        </div>
      )}

      {/* Student Table with Checkboxes */}
      {loading ? (
        <TableSkeleton />
      ) : students.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: 'var(--color-white)' }}>
          <UserCheck size={48} color="var(--color-charcoal-muted)" style={{ margin: '0 auto 1rem auto' }} />
          <h4 style={{ color: 'var(--color-navy)' }}>No Students Found</h4>
          <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.9rem' }}>
            Try clearing filters or registering new students in the system.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--color-white)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.92rem',
            }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--color-navy)',
                  color: 'var(--color-cream)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  <th style={{ padding: '1rem 0.75rem', width: '48px', textAlign: 'center' }}>
                    <label htmlFor="select-all-students-checkbox" className="sr-only">Select all students</label>
                    <input
                      id="select-all-students-checkbox"
                      name="selectAllStudents"
                      type="checkbox"
                      checked={allSelected}
                      ref={selectAllCheckboxRef}
                      onChange={toggleSelectAll}
                      aria-label="Select all students"
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-coral)' }}
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    />
                  </th>
                  <th style={{ padding: '1rem 1rem' }}>ID</th>
                  <th style={{ padding: '1rem 1rem' }}>Name</th>
                  <th style={{ padding: '1rem 1rem' }}>Roll No.</th>
                  <th style={{ padding: '1rem 1rem' }}>Hostel</th>
                  <th style={{ padding: '1rem 1rem' }}>Contact</th>
                  <th style={{ padding: '1rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const isSelected = selectedIds.has(student.student_id);
                  return (
                    <tr
                      key={student.student_id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected
                          ? 'rgba(242, 140, 91, 0.08)'
                          : index % 2 === 0 ? 'var(--color-white)' : 'var(--color-cream)',
                        transition: 'background-color var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                        <label htmlFor={`select-student-checkbox-${student.student_id}`} className="sr-only">
                          Select {student.name} ({student.roll})
                        </label>
                        <input
                          id={`select-student-checkbox-${student.student_id}`}
                          name={`selectStudent_${student.student_id}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(student.student_id)}
                          aria-label={`Select ${student.name} (${student.roll})`}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-coral)' }}
                        />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                        #{student.student_id}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
                        {student.name}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className="badge badge-navy">{student.roll}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                        {student.hostel}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--color-charcoal-muted)', fontSize: '0.85rem' }}>
                        <div>{student.email}</div>
                        <div>{student.phone}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleEditOpen(student)}
                            className="btn btn-sm btn-primary"
                            title="Edit Student Details"
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(student)}
                            className="btn btn-sm btn-outline"
                            style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                            title="Delete Student Permanently"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmDanger={confirmModal.confirmDanger}
        requirePassword={confirmModal.requirePassword}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, open: false }))}
        loading={actionLoading}
      />

      <EditStudentModal
        open={editModal.open}
        student={editModal.student}
        onSave={handleEditSave}
        onClose={() => setEditModal({ open: false, student: null })}
        loading={actionLoading}
        error={editError}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ManageStudents;
