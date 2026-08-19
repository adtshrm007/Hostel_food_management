import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { extractErrorMessage } from '../../utils/errorHelpers';
import { User, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export const Login = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'student';

  const [activeTab, setActiveTab] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { loginStudent, loginAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setError('');
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (activeTab === 'student') {
        if (!email || !password) {
          throw new Error('Please enter both email and password.');
        }
        await loginStudent(email, password);
        navigate('/student/menu');
      } else {
        if (!username || !password) {
          throw new Error('Please enter both username and password.');
        }
        await loginAdmin(username, password);
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(extractErrorMessage(err, 'Login failed. Please check credentials.'));
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
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ color: 'var(--color-navy)', fontSize: '1.8rem', marginBottom: '0.4rem' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.92rem' }}>
            Access your Gita-Bhojanalay food management account
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
          marginBottom: '1.75rem',
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('student')}
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
            <User size={16} /> Student
          </button>

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
              <label className="form-label">Student Registered Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. student@hostel.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Administrator Username</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                <input
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
              <label className="form-label">Password</label>
              {activeTab === 'student' && (
                <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--color-coral)', fontWeight: 600 }}>
                  Forgot Password?
                </Link>
              )}
            </div>
            <div style={{ position: 'relative', marginTop: '0.3rem' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            {submitting ? 'Authenticating...' : `Log In as ${activeTab === 'student' ? 'Student' : 'Admin'}`}
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
            <>
              Want to request admin access?{' '}
              <Link to="/register?role=admin" style={{ color: 'var(--color-coral)', fontWeight: 700 }}>
                Register Admin
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
