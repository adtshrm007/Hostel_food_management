import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import authApi from '../../api/authApi';
import { extractErrorMessage } from '../../utils/errorHelpers';
import { User, Mail, Lock, Phone, Building, Hash, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { HOSTEL_OPTIONS } from '../../utils/hostels';

export const Register = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'student';

  const [activeTab, setActiveTab] = useState(initialRole);
  const [showPassword, setShowPassword] = useState(false);

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    roll: '',
    phone: '',
    hostel: HOSTEL_OPTIONS[0],
    email: '',
    password: '',
  });

  // Admin Form State (only username & password)
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleStudentChange = (e) => {
    setStudentForm({
      ...studentForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleAdminChange = (e) => {
    setAdminForm({
      ...adminForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmitStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      await authApi.registerStudent(studentForm);
      setSuccessMsg('Student registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      setError(extractErrorMessage(err, 'Registration failed. Please check inputs.'));
    } finally {
      setSubmitting(false);
    }
  };

  const ADMIN_USERNAME_REGEX = /^(?=.{5,20}$)(?!.*__)(?!.*_$)[A-Z][a-zA-Z0-9_]+$/;
  const ADMIN_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;

  const handleSubmitAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const username = (adminForm.username || '').trim();
    const password = (adminForm.password || '').trim();

    if (!ADMIN_USERNAME_REGEX.test(username)) {
      setError(
        'Admin username must be 5-20 characters long, start with an uppercase letter (A-Z), cannot contain consecutive underscores ("__") or end with an underscore ("_"), and contain only letters, numbers, and underscores.'
      );
      return;
    }

    if (!ADMIN_PASSWORD_REGEX.test(password)) {
      setError(
        'Admin password must be 8-16 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character (@$!%*?&).'
      );
      return;
    }

    setSubmitting(true);

    try {
      await authApi.registerAdmin({ username, password });
      setSuccessMsg('Admin registration request submitted successfully! An existing administrator must grant your approval request before you can log in.');
    } catch (err) {
      console.error('Admin registration error:', err);
      setError(extractErrorMessage(err, 'Admin registration failed. Username may already exist.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container page-section" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: 'var(--color-white)',
        padding: '2rem 1.5rem',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/logo.webp"
            alt="Gita-Bhojanalay Logo"
            width="56"
            height="56"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              objectFit: 'cover',
              border: '2px solid var(--color-green)',
              boxShadow: '0 4px 12px rgba(46, 155, 98, 0.2)',
              marginBottom: '0.75rem',
            }}
          />
          <br />
          <span className="badge badge-mint" style={{ marginBottom: '0.5rem' }}>Gita-Bhojanalay Account Registration</span>
          <h2 style={{ color: 'var(--color-navy)', fontSize: '1.8rem', marginBottom: '0.4rem' }}>
            Create New Account
          </h2>
          <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.9rem' }}>
            {activeTab === 'student'
              ? 'Register as a student to submit weekly food choices'
              : 'Register as an admin (requires approval from an existing administrator)'}
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          backgroundColor: 'var(--color-cream)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('student'); setError(''); setSuccessMsg(''); }}
            style={{
              padding: '0.6rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              backgroundColor: activeTab === 'student' ? 'var(--color-navy)' : 'transparent',
              color: activeTab === 'student' ? 'var(--color-cream)' : 'var(--color-charcoal-muted)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <User size={16} /> Register Student
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setError(''); setSuccessMsg(''); }}
            style={{
              padding: '0.6rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              backgroundColor: activeTab === 'admin' ? 'var(--color-navy)' : 'transparent',
              color: activeTab === 'admin' ? 'var(--color-cream)' : 'var(--color-charcoal-muted)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ShieldCheck size={16} /> Register Admin
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Student Registration Form */}
        {activeTab === 'student' ? (
          <form onSubmit={handleSubmitStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-student-name" className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                <input
                  id="reg-student-name"
                  type="text"
                  name="name"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. Rahul Sharma"
                  value={studentForm.name}
                  onChange={handleStudentChange}
                  required
                />
              </div>
            </div>

            <div className="grid-2 form-grid-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="reg-student-roll" className="form-label">Roll Number</label>
                <div style={{ position: 'relative' }}>
                  <Hash size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                  <input
                    id="reg-student-roll"
                    type="text"
                    name="roll"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. 21CS101"
                    value={studentForm.roll}
                    onChange={handleStudentChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="reg-student-phone" className="form-label">Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                  <input
                    id="reg-student-phone"
                    type="text"
                    name="phone"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="e.g. 9876543210"
                    value={studentForm.phone}
                    onChange={handleStudentChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid-2 form-grid-2" style={{ gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="reg-student-hostel" className="form-label">Hostel Name</label>
                <div style={{ position: 'relative' }}>
                  <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)', pointerEvents: 'none' }} />
                  <select
                    id="reg-student-hostel"
                    name="hostel"
                    className="form-select"
                    style={{ paddingLeft: '2.5rem' }}
                    value={studentForm.hostel}
                    onChange={handleStudentChange}
                    required
                  >
                    {HOSTEL_OPTIONS.map((hostelName) => (
                      <option key={hostelName} value={hostelName}>
                        {hostelName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="reg-student-email" className="form-label">Student Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                  <input
                    id="reg-student-email"
                    type="email"
                    name="email"
                    className="form-input"
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="student@hostel.edu"
                    value={studentForm.email}
                    onChange={handleStudentChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="reg-student-password" className="form-label">Create Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                <input
                  id="reg-student-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  placeholder="••••••••"
                  value={studentForm.password}
                  onChange={handleStudentChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-charcoal-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            >
              {submitting ? 'Registering Account...' : 'Complete Student Registration'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          /* Admin Registration Form (Username & Password only) */
          <form onSubmit={handleSubmitAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
              ℹ️ Admin accounts require approval from an existing administrator before access is granted.
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-admin-username" className="form-label">Admin Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                <input
                  id="reg-admin-username"
                  type="text"
                  name="username"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. Admin_john1"
                  value={adminForm.username}
                  onChange={handleAdminChange}
                  required
                />
              </div>
              <small style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-muted)', marginTop: '0.25rem', display: 'block' }}>
                5-20 chars, must start with uppercase letter (A-Z), no consecutive ('__') or trailing ('_') underscores.
              </small>
            </div>

            <div className="form-group" style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="reg-admin-password" className="form-label">Admin Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                <input
                  id="reg-admin-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  placeholder="Create admin password"
                  value={adminForm.password}
                  onChange={handleAdminChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-charcoal-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-muted)', marginTop: '0.25rem', display: 'block' }}>
                8-16 chars, must contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special char (@$!%*?&).
              </small>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-coral"
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            >
              {submitting ? 'Submitting Request...' : 'Submit Admin Registration Request'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-charcoal-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-green)', fontWeight: 700 }}>
            Log In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
