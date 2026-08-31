import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import FilterBar from '../../components/admin/FilterBar';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import { HOSTEL_OPTIONS } from '../../utils/hostels';
import {
  AlertCircle, CheckCircle, Trash2, Edit3, UserCheck, X,
  ChevronDown, Users, ShieldAlert, Upload, Download, FileText,
  Eye, EyeOff
} from 'lucide-react';

// ─── Confirmation Modal ─────────────────────────────────────────────
const ConfirmModal = ({ open, title, message, confirmLabel, confirmDanger, onConfirm, onCancel, loading, requirePassword }) => {
  const [password, setPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-confirm-password"
                  name="adminConfirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '2.5rem' }}
                  placeholder="Enter your admin password..."
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPassError(''); }}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-charcoal-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
  const [form, setForm] = useState({
    name: '', roll_number: '', phone: '', hostel: '', email: '',
    registration_number: '', room_number: '',
  });

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name || '',
        roll_number: student.roll_number || '',
        phone: student.phone || '',
        hostel: student.hostel || '',
        email: student.email || '',
        registration_number: student.registration_number || '',
        room_number: student.room_number || '',
      });
    }
  }, [student]);

  if (!open || !student) return null;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only send changed fields to admin override endpoint
    const updates = {};
    if (form.name !== student.name) updates.name = form.name;
    if (form.roll_number !== student.roll_number) updates.roll_number = form.roll_number;
    if (form.phone !== student.phone) updates.phone = form.phone;
    if (form.hostel !== student.hostel) updates.hostel = form.hostel;
    if (form.email !== student.email) updates.email = form.email;
    if (form.registration_number !== (student.registration_number || '')) updates.registration_number = form.registration_number || null;
    if (form.room_number !== (student.room_number || '')) updates.room_number = form.room_number || null;
    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    onSave(student.roll_number, updates);
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
              <label htmlFor="edit-student-roll_number" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.3rem', display: 'block' }}>Roll Number</label>
              <input id="edit-student-roll_number" name="roll_number" value={form.roll_number} onChange={handleChange} style={inputStyle} required minLength={2} maxLength={50} />
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

          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="edit-student-email" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.3rem', display: 'block' }}>Email</label>
            <input id="edit-student-email" name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label htmlFor="edit-student-registration_number" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-charcoal-muted)', marginBottom: '0.3rem', display: 'block' }}>Registration No. (optional)</label>
              <input id="edit-student-registration_number" name="registration_number" value={form.registration_number} onChange={handleChange} style={{ ...inputStyle, borderStyle: 'dashed' }} maxLength={50} placeholder="e.g. REG2021001" />
            </div>
            <div>
              <label htmlFor="edit-student-room_number" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-charcoal-muted)', marginBottom: '0.3rem', display: 'block' }}>Room No. (optional)</label>
              <input id="edit-student-room_number" name="room_number" value={form.room_number} onChange={handleChange} style={{ ...inputStyle, borderStyle: 'dashed' }} maxLength={20} placeholder="e.g. A-101" />
            </div>
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

// ─── Import Student Modal (CSV / Excel) ──────────────────────────────
const ImportStudentModal = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setError('');
      setSuccessMsg('');
      setLoading(false);
      setDragActive(false);
    }
  }, [open]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    setSuccessMsg('');
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Invalid file type. Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = 'name,roll_number,phone,hostel,email,password,registration_number,room_number\n' +
      'Rahul Sharma,21CS001,+919876543210,Gita Bhawan Block A,rahul.sharma@example.com,Rahul@123,REG2021001,A-101\n' +
      'Ananya Verma,21CS002,+919876543211,Gita Bhawan Block B,ananya.verma@example.com,Ananya@123,,\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_import_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV or Excel file to upload.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await adminApi.importStudents(formData);
      setSuccessMsg(response.message || `Successfully imported ${response.imported_count} student(s)!`);
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err) {
      console.error('Import failed:', err);
      const detail = err?.response?.data?.detail || err.message || 'File rejected. Import failed.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(18,48,74,0.65)', backdropFilter: 'blur(4px)' }}
      />
      <div className="card" style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 580,
        padding: 0, overflow: 'hidden', animation: 'fadeIn 0.2s ease',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)', borderRadius: '20px'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'var(--color-navy)', color: 'var(--color-cream)',
          padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Upload size={22} color="var(--color-mint)" />
            <div>
              <h3 style={{ color: 'var(--color-cream)', margin: 0, fontSize: '1.25rem' }}>
                Import / Add Students (CSV / Excel)
              </h3>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-mint)', opacity: 0.9 }}>
                Upload .csv, .xlsx, or .xls file to bulk feed the database
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-cream)', padding: '0.4rem', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Column Guidelines Box */}
          <div style={{
            backgroundColor: 'var(--color-cream)', border: '1px solid var(--border-subtle)',
            borderRadius: '12px', padding: '1rem 1.25rem', fontSize: '0.88rem'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Required Header Columns</span>
              <button
                type="button"
                onClick={handleDownloadSampleCSV}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem', color: 'var(--color-green)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Download size={14} /> Download Sample CSV
              </button>
            </div>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--color-charcoal-muted)' }}>
              The uploaded file <strong>must contain</strong> the following columns (case-insensitive):
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              <span className="badge badge-mint">name *</span>
              <span className="badge badge-mint">registration_number *</span>
              <span className="badge badge-mint">phone *</span>
              <span className="badge badge-mint">hostel *</span>
              <span className="badge badge-mint">email *</span>
              <span className="badge badge-navy">password (optional)</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)', marginTop: '0.5rem' }}>
              * If <code>password</code> is omitted, the student's registration_number number will be used as their default password.
            </div>
          </div>

          {/* Notifications */}
          {error && (
            <div className="alert alert-danger" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.88rem' }}>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success" style={{ margin: 0 }}>
              <CheckCircle size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{successMsg}</div>
            </div>
          )}

          {/* Drag & Drop File Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--color-green)' : file ? 'var(--color-navy)' : 'var(--border-strong)'}`,
              backgroundColor: dragActive ? 'var(--color-mint-light)' : file ? 'var(--color-cream)' : '#FAFCFE',
              borderRadius: '16px', padding: '1.75rem 1.5rem', textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {file ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={36} color="var(--color-green)" />
                <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem' }}>{file.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-charcoal-muted)' }}>
                  {(file.size / 1024).toFixed(1)} KB — Ready to validate & feed database
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-coral)', fontWeight: 600, marginTop: '0.2rem' }}>
                  Click to change file
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Upload size={36} color="var(--color-navy)" />
                <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem' }}>
                  Drag & Drop CSV or Excel file here
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)' }}>
                  or <span style={{ color: 'var(--color-green)', fontWeight: 600, textDecoration: 'underline' }}>browse from computer</span>
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)', marginTop: '0.25rem' }}>
                  Supported extensions: .csv, .xlsx, .xls
                </span>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-coral btn-sm"
              disabled={loading || !file}
              style={{ minWidth: '140px' }}
            >
              {loading ? 'Validating & Feeding...' : 'Validate & Feed Database'}
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
const PAGE_SIZE = 50;

export const ManageStudents = () => {
  const navigate = useNavigate();

  // Student data
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
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
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Loading states
  const [actionLoading, setActionLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  // Use a stable ref for the select-all checkbox to avoid forced reflow
  const selectAllCheckboxRef = useRef(null);
  const tableContainerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ─── Fetch Students ─────────────────────────────────────────────
  const fetchStudents = useCallback(async (page = 1, search = searchQuery, hostel = selectedHostel) => {
    try {
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
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to fetch student records:', err);
      setError('Could not load student records.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedHostel]);

  useEffect(() => {
    fetchStudents(1, searchQuery, selectedHostel);
  }, [selectedHostel]); // Auto search on hostel change

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

  // ─── Selection Handlers ────────────────────────────────────────
  const toggleSelect = (roll_number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(roll_number)) {
        next.delete(roll_number);
      } else {
        next.add(roll_number);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === students.length && students.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.roll_number)));
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
      message: `Are you sure you want to permanently delete "${student.name}" (Roll: ${student.roll_number})? All associated food preferences will also be deleted. This action cannot be undone.`,
      confirmLabel: 'Verify & Delete Permanently',
      confirmDanger: true,
      requirePassword: true,
      onConfirm: async (adminPassword) => {
        try {
          setActionLoading(true);
          await adminApi.deleteStudent(student.roll_number, adminPassword);
          showToast(`Student "${student.name}" deleted successfully.`);
          setStudents((prev) => prev.filter((s) => s.roll_number !== student.roll_number));
          setTotalStudents((prev) => Math.max(0, prev - 1));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(student.roll_number);
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
          setStudents((prev) => prev.filter((s) => !selectedIds.has(s.roll_number)));
          setTotalStudents((prev) => Math.max(0, prev - count));
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

  const handleEditSave = async (rollNumberOrId, updates) => {
    try {
      setActionLoading(true);
      setEditError('');
      const updated = await adminApi.updateStudent(rollNumberOrId, updates);
      setStudents((prev) => prev.map((s) => (s.roll_number === rollNumberOrId ? { ...s, ...updated } : s)));
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
        <button
          onClick={() => setImportModalOpen(true)}
          className="btn btn-outline-light"
          style={{ width: 'fit-content', gap: '0.5rem' }}
        >
          <Upload size={18} /> Import / Add Students (CSV/Excel)
        </button>
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
        onSearch={handleSearch}
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
                onClick={() => setSelectedIds(new Set(students.map((s) => s.roll_number)))}
              >
                Select all {students.length} on this page
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
      <div ref={tableContainerRef}>
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
                    <th style={{ padding: '1rem 1rem' }}>SL NO.</th>
                    <th style={{ padding: '1rem 1rem' }}>Name</th>
                    <th style={{ padding: '1rem 1rem' }}>Roll No.</th>
                    <th style={{ padding: '1rem 1rem' }}>Hostel</th>
                    <th style={{ padding: '1rem 1rem' }}>Contact</th>
                    <th style={{ padding: '1rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const isSelected = selectedIds.has(student.roll_number);
                    return (
                      <tr
                        key={student.roll_number}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: isSelected
                            ? 'rgba(242, 140, 91, 0.08)'
                            : index % 2 === 0 ? 'var(--color-white)' : 'var(--color-cream)',
                          transition: 'background-color var(--transition-fast)',
                        }}
                      >
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                          <label htmlFor={`select-student-checkbox-${student.roll_number}`} className="sr-only">
                            Select {student.name} ({student.roll_number})
                          </label>
                          <input
                            id={`select-student-checkbox-${student.roll_number}`}
                            name={`selectStudent_${student.roll_number}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(student.roll_number)}
                            aria-label={`Select ${student.name} (${student.roll_number})`}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-coral)' }}
                          />
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                          #{(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
                          <div>{student.name}</div>
                          {student.profile_picture_url && (
                            <img src={student.profile_picture_url} alt="avatar"
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--color-green)', marginTop: '3px' }} />
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className="badge badge-navy">{student.roll_number}</span>
                          {student.registration_number && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)', marginTop: '2px' }}>Reg: {student.registration_number}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                          {student.hostel}
                          {student.room_number && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)' }}>Room: {student.room_number}</div>
                          )}
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

      <ImportStudentModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false);
          fetchStudents();
          showToast('Student batch imported successfully!');
        }}
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
