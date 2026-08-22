import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authApi from '../../api/authApi';
import { extractErrorMessage } from '../../utils/errorHelpers';
import { Mail, Lock, KeyRound, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff, Hash } from 'lucide-react';
import { validatePassword, validateEmail } from '../../utils/validation';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState(''); // Registration Number or Phone
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !identifier || !newPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setError(emailCheck.errorMsg);
      return;
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.isValid) {
      setError(passwordCheck.errorMsg);
      return;
    }

    setSubmitting(true);
    try {
      await authApi.forgotPasswordStudent({
        email,
        identifier,
        new_password: newPassword,
      });

      setSuccessMsg('Your password has been successfully reset! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(extractErrorMessage(err, 'Password reset failed. Please verify your details.'));
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
        maxWidth: '480px',
        backgroundColor: 'var(--color-white)',
        padding: '2.5rem 2rem',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Back Link */}
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-navy)', fontSize: '0.88rem', fontWeight: 600, marginBottom: '1.25rem' }}>
          <ArrowLeft size={16} /> Back to Login
        </Link>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <span className="badge badge-mint" style={{ marginBottom: '0.5rem' }}>Student Account Recovery</span>
          <h2 style={{ color: 'var(--color-navy)', fontSize: '1.8rem', marginBottom: '0.4rem' }}>
            Reset Password
          </h2>
          <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.9rem' }}>
            Enter your registered email and registration/phone number to create a new password
          </p>
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

        {/* Reset Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="forgot-student-email" className="form-label">Registered Student Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
              <input
                id="forgot-student-email"
                name="email"
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

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="forgot-student-identifier" className="form-label">Registration Number or Phone Number</label>
            <div style={{ position: 'relative' }}>
              <Hash size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
              <input
                id="forgot-student-identifier"
                name="identifier"
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Enter Registration No or Phone (for verification)"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="forgot-student-newpassword" className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
              <input
                id="forgot-student-newpassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="Create new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
            {submitting ? 'Resetting Password...' : 'Reset Password'}
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
