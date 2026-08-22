import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { extractErrorMessage } from '../../utils/errorHelpers';
import { User, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Clock } from 'lucide-react';
import { validatePassword, validateEmail } from '../../utils/validation';

const STUDENT_MAX_ATTEMPTS = 4;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes cooldown

// Security: admin tab only shown when the key gate has been passed
const isAdminUnlocked = () => sessionStorage.getItem('admin_portal_unlocked') === 'true';

export const Login = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'admin' && isAdminUnlocked() ? 'admin' : 'student';

  const [activeTab, setActiveTab] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Student lockout and attempt state persistence
  const [studentLockUntil, setStudentLockUntil] = useState(() => {
    const storedLock = sessionStorage.getItem('student_login_lock_until');
    if (!storedLock) return null;
    const lockTime = parseInt(storedLock, 10);
    if (Date.now() >= lockTime) {
      sessionStorage.removeItem('student_login_lock_until');
      sessionStorage.removeItem('student_login_attempts_left');
      return null;
    }
    return lockTime;
  });
  const [remainingStudentLockSeconds, setRemainingStudentLockSeconds] = useState(0);

  const [studentAttemptsLeft, setStudentAttemptsLeft] = useState(() => {
    const storedLock = sessionStorage.getItem('student_login_lock_until');
    if (storedLock && Date.now() < parseInt(storedLock, 10)) {
      return 0;
    }
    const stored = sessionStorage.getItem('student_login_attempts_left');
    return stored !== null ? parseInt(stored, 10) : STUDENT_MAX_ATTEMPTS;
  });

  const { loginStudent, loginAdmin } = useAuth();
  const navigate = useNavigate();

  // Redirect to key gate if someone tries to access admin login directly
  useEffect(() => {
    if (searchParams.get('role') === 'admin' && !isAdminUnlocked()) {
      navigate('/enter-key', { replace: true });
    }
  }, []);

  // Student lockout timer effect
  useEffect(() => {
    if (!studentLockUntil) {
      setRemainingStudentLockSeconds(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.ceil((studentLockUntil - Date.now()) / 1000));
      setRemainingStudentLockSeconds(diff);

      if (diff <= 0) {
        sessionStorage.removeItem('student_login_lock_until');
        sessionStorage.removeItem('student_login_attempts_left');
        setStudentLockUntil(null);
        setStudentAttemptsLeft(STUDENT_MAX_ATTEMPTS);
        setError('');
      }
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [studentLockUntil]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    setError('');
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'student') {
      if (studentLockUntil && Date.now() < studentLockUntil) {
        setError(`Too many failed attempts. Student login is locked for another ${formatTime(remainingStudentLockSeconds)}.`);
        return;
      }

      if (studentAttemptsLeft <= 0) {
        setError('Too many failed attempts. Access to student login is locked.');
        return;
      }
    }

    // Pre-validate password first since it's required for both tabs
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setError(passwordCheck.errorMsg);
      return;
    }

    if (activeTab === 'student') {
      if (!email) {
        setError('Please enter your email.');
        return;
      }
      const emailCheck = validateEmail(email);
      if (!emailCheck.isValid) {
        setError(emailCheck.errorMsg);
        return;
      }
    } else {
      if (!username) {
        setError('Please enter your username.');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (activeTab === 'student') {
        await loginStudent(email.trim(), password);
        sessionStorage.removeItem('student_login_attempts_left');
        sessionStorage.removeItem('student_login_lock_until');
        navigate('/student/menu');
      } else {
        await loginAdmin(username.trim(), password);
        // Clear the unlock flag after successful admin login
        sessionStorage.removeItem('admin_portal_unlocked');
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (activeTab === 'student') {
        const nextAttempts = studentAttemptsLeft - 1;
        setStudentAttemptsLeft(nextAttempts);
        sessionStorage.setItem('student_login_attempts_left', nextAttempts.toString());

        if (nextAttempts > 0) {
          const apiError = extractErrorMessage(err, 'Login failed. Please check credentials.');
          setError(`${apiError} You have ${nextAttempts} attempt${nextAttempts === 1 ? '' : 's'} left.`);
        } else {
          const expiryTime = Date.now() + LOCKOUT_DURATION_MS;
          sessionStorage.setItem('student_login_lock_until', expiryTime.toString());
          setStudentLockUntil(expiryTime);
          setError('Too many failed attempts. Student login is locked for 5 minutes.');
        }
      } else {
        setError(extractErrorMessage(err, 'Login failed. Please check credentials.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container page-section" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '75vh',
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'var(--color-white)',
        padding: '2rem 1.5rem',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
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
          <h2 style={{ color: 'var(--color-navy)', fontSize: '1.8rem', marginBottom: '0.4rem' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.92rem' }}>
            Access your Gita-Bhojanalay food management account
          </p>

          {/* Student attempts / timer lock badge */}
          {activeTab === 'student' && (
            <div style={{ marginTop: '0.75rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: studentLockUntil || studentAttemptsLeft <= 1 ? 'rgba(229, 57, 53, 0.12)' : studentAttemptsLeft <= 2 ? 'rgba(255, 111, 97, 0.12)' : 'var(--color-cream)',
                  color: studentLockUntil || studentAttemptsLeft <= 1 ? 'var(--color-danger)' : studentAttemptsLeft <= 2 ? 'var(--color-coral)' : 'var(--color-navy)',
                  border: '1px solid currentColor',
                }}
              >
                {studentLockUntil ? (
                  <>
                    <Clock size={14} /> Lockout expires in {formatTime(remainingStudentLockSeconds)}
                  </>
                ) : studentAttemptsLeft > 0 ? (
                  `You have ${studentAttemptsLeft} attempt${studentAttemptsLeft === 1 ? '' : 's'} left`
                ) : (
                  '0 attempts left — Login Locked'
                )}
              </span>
            </div>
          )}
        </div>

        {/* Role Switcher Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          backgroundColor: 'var(--color-cream)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.75rem',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            style={{
              flex: 1,
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
            <User size={16} /> Student
          </button>

          {/* Admin tab only visible after key gate is unlocked */}
          {isAdminUnlocked() && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
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
              <ShieldCheck size={16} /> Admin
            </button>
          )}
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {activeTab === 'student' ? (
            <div className="form-group">
              <label htmlFor="student-email-login" className="form-label">Student Registered Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                <input
                  id="student-email-login"
                  name="email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. student@hostel.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting || (activeTab === 'student' && (studentAttemptsLeft <= 0 || !!studentLockUntil))}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="admin-username-login" className="form-label">Administrator Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                <input
                  id="admin-username-login"
                  name="username"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="user-password-login" className="form-label">Password</label>
              {activeTab === 'student' && (
                <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--color-coral)', fontWeight: 600 }}>
                  Forgot Password?
                </Link>
              )}
            </div>
            <div style={{ position: 'relative', marginTop: '0.3rem' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
              <input
                id="user-password-login"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || (activeTab === 'student' && (studentAttemptsLeft <= 0 || !!studentLockUntil))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={activeTab === 'student' && (studentAttemptsLeft <= 0 || !!studentLockUntil)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: (activeTab === 'student' && (studentAttemptsLeft <= 0 || !!studentLockUntil)) ? 'not-allowed' : 'pointer', color: 'var(--color-charcoal-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || (activeTab === 'student' && (studentAttemptsLeft <= 0 || !!studentLockUntil))}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            {submitting
              ? 'Authenticating...'
              : activeTab === 'student' && studentLockUntil
              ? `Locked (${formatTime(remainingStudentLockSeconds)})`
              : activeTab === 'student' && studentAttemptsLeft <= 0
              ? 'Access Locked'
              : `Log In as ${activeTab === 'student' ? 'Student' : 'Admin'}`}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-charcoal-muted)' }}>
          {activeTab === 'student' ? (
            <>
              Don't have a student account yet?{' '}
              <Link to="/register" style={{ color: 'var(--color-green)', fontWeight: 700 }}>
                Register Here
              </Link>
            </>
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)' }}>
              Admin registrations are managed by active administrators.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

