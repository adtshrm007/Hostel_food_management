import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Key, ArrowRight, AlertCircle, ArrowLeft, Eye, EyeOff, Clock } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes cooldown

export const EnterKey = () => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [lockUntil, setLockUntil] = useState(() => {
    const storedLock = sessionStorage.getItem('admin_key_lock_until');
    if (!storedLock) return null;
    const lockTime = parseInt(storedLock, 10);
    if (Date.now() >= lockTime) {
      sessionStorage.removeItem('admin_key_lock_until');
      sessionStorage.removeItem('admin_key_attempts_left');
      return null;
    }
    return lockTime;
  });
  const [remainingLockSeconds, setRemainingLockSeconds] = useState(0);

  const [attemptsLeft, setAttemptsLeft] = useState(() => {
    const storedLock = sessionStorage.getItem('admin_key_lock_until');
    if (storedLock && Date.now() < parseInt(storedLock, 10)) {
      return 0;
    }
    const stored = sessionStorage.getItem('admin_key_attempts_left');
    return stored !== null ? parseInt(stored, 10) : MAX_ATTEMPTS;
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Cooldown countdown timer effect
  useEffect(() => {
    if (!lockUntil) {
      setRemainingLockSeconds(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setRemainingLockSeconds(diff);

      if (diff <= 0) {
        // Cooldown finished: automatically reset back to 5 attempts
        sessionStorage.removeItem('admin_key_lock_until');
        sessionStorage.removeItem('admin_key_attempts_left');
        setLockUntil(null);
        setAttemptsLeft(MAX_ATTEMPTS);
        setError('');
      }
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [lockUntil]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

    if (lockUntil && Date.now() < lockUntil) {
      setError(`Too many failed attempts. Security gate is locked for another ${formatTime(remainingLockSeconds)}.`);
      return;
    }

    if (attemptsLeft <= 0) {
      setError('Too many failed attempts. Access to the security gate is locked.');
      return;
    }

    setIsSubmitting(true);

    try {
      const hashedVal = await sha256(keyInput.trim());
      // The SHA-256 hash of '2024@c@llpolice@2024'
      const targetHash = 'a11cddf53d0585e749c4c7af556f2eba0ebd9034ee707aac347dc674c7ebd2e4';

      if (hashedVal === targetHash) {
        sessionStorage.removeItem('admin_key_attempts_left');
        sessionStorage.removeItem('admin_key_lock_until');
        sessionStorage.setItem('admin_portal_unlocked', 'true');
        navigate('/login?role=admin');
      } else {
        const nextAttempts = attemptsLeft - 1;
        setAttemptsLeft(nextAttempts);
        sessionStorage.setItem('admin_key_attempts_left', nextAttempts.toString());

        if (nextAttempts > 0) {
          setError(`Incorrect PIN. You have ${nextAttempts} attempt${nextAttempts === 1 ? '' : 's'} left to enter the key.`);
        } else {
          const expiryTime = Date.now() + LOCKOUT_DURATION_MS;
          sessionStorage.setItem('admin_key_lock_until', expiryTime.toString());
          setLockUntil(expiryTime);
          setError('Too many failed attempts. Security gate is locked for 5 minutes.');
        }
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
                backgroundColor: lockUntil || attemptsLeft <= 1 ? 'rgba(229, 57, 53, 0.12)' : attemptsLeft <= 3 ? 'rgba(255, 111, 97, 0.12)' : 'var(--color-cream)',
                color: lockUntil || attemptsLeft <= 1 ? 'var(--color-danger)' : attemptsLeft <= 3 ? 'var(--color-coral)' : 'var(--color-navy)',
                border: '1px solid currentColor',
              }}
            >
              {lockUntil ? (
                <>
                  <Clock size={14} /> Lockout expires in {formatTime(remainingLockSeconds)}
                </>
              ) : attemptsLeft > 0 ? (
                `You have ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left to enter the key`
              ) : (
                '0 attempts left — Gate Locked'
              )}
            </span>
          </div>
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
                placeholder={lockUntil ? `Locked — try again in ${formatTime(remainingLockSeconds)}` : attemptsLeft <= 0 ? 'Access locked' : 'Enter system security key'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                required
                disabled={attemptsLeft <= 0 || isSubmitting || !!lockUntil}
                style={{ paddingRight: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                disabled={attemptsLeft <= 0 || !!lockUntil}
                aria-label={showKey ? 'Hide key' : 'Show key'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: (attemptsLeft <= 0 || lockUntil) ? 'not-allowed' : 'pointer',
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
            disabled={isSubmitting || attemptsLeft <= 0 || !!lockUntil}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            {isSubmitting ? 'Verifying...' : lockUntil ? `Locked (${formatTime(remainingLockSeconds)})` : attemptsLeft <= 0 ? 'Access Locked' : 'Unlock Portal'}
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
