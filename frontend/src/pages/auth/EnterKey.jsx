import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Key, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export const EnterKey = () => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // SHA-256 function using standard browser crypto subtle API
  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const hashedVal = await sha256(keyInput.trim());
      // The SHA-256 hash of '2024@c@llpolice@2024'
      const targetHash = 'a11cddf53d0585e749c4c7af556f2eba0ebd9034ee707aac347dc674c7ebd2e4';

      if (hashedVal === targetHash) {
        sessionStorage.setItem('admin_portal_unlocked', 'true');
        navigate('/login?role=admin');
      } else {
        setError('Incorrect PIN. Access denied.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        padding: '2.5rem 2rem',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-subtle)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
            backgroundColor: 'rgba(255, 111, 97, 0.1)',
            color: 'var(--color-coral)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 4px 12px rgba(255, 111, 97, 0.15)',
          }}>
            <Key size={30} />
          </div>
          <h2 style={{ color: 'var(--color-navy)', fontSize: '1.75rem', marginBottom: '0.5rem', fontWeight: 800 }}>
            Enter Security Key
          </h2>
          <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.92rem', lineHeight: 1.4 }}>
            Please enter the system key to authorize access to the Administrator Portal.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Key Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="security-key-input" className="form-label" style={{ fontWeight: 600 }}>
              System Key PIN
            </label>
            <div style={{ position: 'relative', marginTop: '0.4rem' }}>
              <input
                id="security-key-input"
                name="securityKey"
                type={showKey ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter system security key"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                required
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Hide key' : 'Show key'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-charcoal-muted)',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="security-key-submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            {isSubmitting ? 'Verifying...' : 'Unlock Portal'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link to="/" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--color-charcoal-muted)',
            fontSize: '0.88rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'color var(--transition-fast)',
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--color-navy)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--color-charcoal-muted)'}
          >
            <ArrowLeft size={16} /> Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EnterKey;
