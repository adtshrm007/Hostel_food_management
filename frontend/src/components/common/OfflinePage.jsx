import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw, Home, Utensils, Wifi } from 'lucide-react';
import './OfflinePage.css';

/* ─────────────────────────────────────────────────────────────────────────────
   OfflinePage
   Shown whenever ErrorBoundary catches a ChunkLoadError or network failure.
   Matches the Gita-Bhojanalay design system exactly:
     Navy #12304A · Green #2E9B62 · Coral #F28C5B · Cream #FFF8ED
     Fonts: Outfit (heading) · Plus Jakarta Sans (body)
──────────────────────────────────────────────────────────────────────────────*/

const OfflinePage = ({ isOfflineError = true, onRetry }) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pulseActive, setPulseActive] = useState(true);
  const [dotCount, setDotCount] = useState(0);

  // Listen for real connectivity changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Animate the "checking…" dots while retrying
  useEffect(() => {
    if (!isRetrying) return;
    const id = setInterval(() => setDotCount((d) => (d + 1) % 4), 450);
    return () => clearInterval(id);
  }, [isRetrying]);

  // Pulse animation toggle
  useEffect(() => {
    const id = setInterval(() => setPulseActive((v) => !v), 2000);
    return () => clearInterval(id);
  }, []);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setDotCount(0);
    // Give a short visual delay so the user sees feedback, then attempt reload
    await new Promise((r) => setTimeout(r, 1800));
    setIsRetrying(false);

    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  }, [onRetry]);

  const dots = '.'.repeat(dotCount);

  // ─── Inline Styles (all using design-system tokens as CSS custom properties) ─
  const styles = {
    root: {
      minHeight: '100vh',
      width: '100%',
      background: 'linear-gradient(160deg, var(--color-navy-dark) 0%, var(--color-navy) 45%, #0e3d28 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
      position: 'relative',
      overflow: 'hidden',
      padding: '2rem 1.25rem',
    },

    // Decorative background blobs
    blob1: {
      position: 'absolute',
      top: '-12%',
      right: '-8%',
      width: '520px',
      height: '520px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(46,155,98,0.15) 0%, transparent 70%)',
      pointerEvents: 'none',
    },
    blob2: {
      position: 'absolute',
      bottom: '-10%',
      left: '-6%',
      width: '440px',
      height: '440px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(242,140,91,0.12) 0%, transparent 70%)',
      pointerEvents: 'none',
    },
    blob3: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '700px',
      height: '700px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(18,48,74,0.0) 0%, rgba(18,48,74,0.18) 100%)',
      pointerEvents: 'none',
    },

    // Floating grid dots pattern
    gridPattern: {
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'radial-gradient(circle, rgba(228,244,234,0.06) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      pointerEvents: 'none',
    },

    card: {
      position: 'relative',
      zIndex: 2,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(228,244,234,0.15)',
      borderRadius: '28px',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      padding: '3rem 2.5rem',
      maxWidth: '520px',
      width: '100%',
      textAlign: 'center',
      boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05) inset',
    },

    // Brand header inside card
    brandRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.6rem',
      marginBottom: '2rem',
      opacity: 0.85,
    },
    brandIcon: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      objectFit: 'cover',
      border: '1.5px solid rgba(228,244,234,0.4)',
    },
    brandName: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 800,
      fontSize: '1rem',
      color: 'var(--color-cream)',
      letterSpacing: '-0.01em',
    },
    brandDot: {
      color: 'var(--color-coral)',
    },

    // Central icon ring
    iconRing: {
      position: 'relative',
      width: '112px',
      height: '112px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(46,155,98,0.25) 0%, rgba(18,48,74,0.4) 100%)',
      border: '2px solid rgba(46,155,98,0.35)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1.75rem',
      boxShadow: '0 0 0 16px rgba(46,155,98,0.07), 0 0 0 32px rgba(46,155,98,0.04)',
      transition: 'box-shadow 2s ease',
    },
    iconRingPulse: {
      boxShadow: '0 0 0 20px rgba(46,155,98,0.12), 0 0 0 40px rgba(46,155,98,0.05)',
    },

    // Online status pill
    statusPill: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      padding: '0.3rem 0.85rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 700,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      marginBottom: '1.25rem',
    },
    statusOffline: {
      background: 'rgba(229,57,53,0.15)',
      border: '1px solid rgba(229,57,53,0.4)',
      color: '#ff6b6b',
    },
    statusOnline: {
      background: 'rgba(46,155,98,0.15)',
      border: '1px solid rgba(46,155,98,0.4)',
      color: 'var(--color-green-light)',
    },
    statusDot: {
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      flexShrink: 0,
    },

    heading: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 800,
      fontSize: '1.9rem',
      color: 'var(--color-cream)',
      lineHeight: 1.2,
      marginBottom: '0.75rem',
      letterSpacing: '-0.02em',
    },
    subheading: {
      fontSize: '1rem',
      color: 'rgba(228,244,234,0.7)',
      lineHeight: 1.6,
      marginBottom: '2rem',
      maxWidth: '380px',
      margin: '0 auto 2rem',
    },

    divider: {
      width: '48px',
      height: '3px',
      background: 'linear-gradient(90deg, var(--color-green), var(--color-coral))',
      borderRadius: '9999px',
      margin: '0 auto 1.75rem',
    },

    // Steps checklist
    stepsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem',
      marginBottom: '2rem',
      textAlign: 'left',
    },
    stepItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      padding: '0.65rem 0.9rem',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(228,244,234,0.08)',
      borderRadius: '12px',
    },
    stepNum: {
      width: '22px',
      height: '22px',
      borderRadius: '50%',
      background: 'rgba(46,155,98,0.25)',
      border: '1px solid rgba(46,155,98,0.4)',
      color: 'var(--color-green-light)',
      fontSize: '0.7rem',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: '1px',
    },
    stepText: {
      fontSize: '0.88rem',
      color: 'rgba(228,244,234,0.75)',
      lineHeight: 1.45,
    },

    // Action buttons row
    btnRow: {
      display: 'flex',
      gap: '0.85rem',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    btnRetry: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.8rem 1.75rem',
      background: 'linear-gradient(135deg, var(--color-green) 0%, #248151 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '14px',
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: '0.95rem',
      cursor: 'pointer',
      boxShadow: '0 6px 20px rgba(46,155,98,0.4)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s',
      minWidth: '165px',
      justifyContent: 'center',
    },
    btnRetryDisabled: {
      opacity: 0.7,
      cursor: 'not-allowed',
      transform: 'none',
    },
    btnHome: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.8rem 1.5rem',
      background: 'transparent',
      color: 'var(--color-cream)',
      border: '1.5px solid rgba(228,244,234,0.25)',
      borderRadius: '14px',
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'background 0.2s, border-color 0.2s',
      textDecoration: 'none',
    },

    // Footer note
    footerNote: {
      marginTop: '2.25rem',
      fontSize: '0.78rem',
      color: 'rgba(228,244,234,0.35)',
      letterSpacing: '0.02em',
    },

    // Spin animation via inline keyframe injection trick (we'll use a CSS class)
    spinIcon: {
      animation: isRetrying ? 'spin 0.8s linear infinite' : 'none',
    },
  };

  const steps = [
    'Check your Wi-Fi or mobile data connection.',
    'Try toggling Airplane mode off and on.',
    'Restart your router if on a home network.',
  ];

  return (
    <div style={styles.root}>
      {/* Background decoration */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={styles.blob3} />
      <div style={styles.gridPattern} />

        {/* Main Card */}
        <div style={styles.card} className="ob-card">

          {/* Brand */}
          <div style={styles.brandRow}>
            <Utensils size={18} color="var(--color-mint)" />
            <span style={styles.brandName}>
              Gita-Bhojanalay<span style={styles.brandDot}>.</span>
            </span>
          </div>

          {/* Central icon */}
          <div style={{ ...styles.iconRing, ...(pulseActive ? styles.iconRingPulse : {}) }}>
            <WifiOff size={46} color="rgba(228,244,234,0.85)" strokeWidth={1.5} />
          </div>

          {/* Live connectivity status pill */}
          <div>
            <span
              style={{
                ...styles.statusPill,
                ...(isOnline ? styles.statusOnline : styles.statusOffline),
              }}
            >
              <span
                style={{
                  ...styles.statusDot,
                  background: isOnline ? 'var(--color-green-light)' : '#ff6b6b',
                  boxShadow: isOnline
                    ? '0 0 6px rgba(65,186,122,0.8)'
                    : '0 0 6px rgba(255,107,107,0.8)',
                }}
              />
              {isOnline ? (
                <>
                  <Wifi size={11} />
                  &nbsp;Connection Restored
                </>
              ) : (
                <>
                  <WifiOff size={11} />
                  &nbsp;No Internet
                </>
              )}
            </span>
          </div>

          {/* Heading */}
          <h1 style={styles.heading}>
            {isOfflineError ? 'You\'re Offline' : 'Something Went Wrong'}
          </h1>

          {/* Gradient divider */}
          <div style={styles.divider} />

          {/* Description */}
          <p style={styles.subheading}>
            {isOfflineError
              ? 'The app couldn\'t load because there\'s no internet connection. Please check your network and try again.'
              : 'An unexpected error occurred while loading this page. Please try refreshing.'}
          </p>

          {/* Steps */}
          {isOfflineError && (
            <div style={styles.stepsList}>
              {steps.map((step, i) => (
                <div key={i} style={styles.stepItem}>
                  <div style={styles.stepNum}>{i + 1}</div>
                  <span style={styles.stepText}>{step}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div style={styles.btnRow}>
            <button
              style={{
                ...styles.btnRetry,
                ...(isRetrying ? styles.btnRetryDisabled : {}),
              }}
              className="ob-btn-retry"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              <RefreshCw
                size={17}
                className={isRetrying ? 'ob-spin' : ''}
              />
              {isRetrying ? `Retrying${dots}` : 'Retry Connection'}
            </button>

            <a
              href="/"
              style={styles.btnHome}
              className="ob-btn-home"
            >
              <Home size={17} />
              Go Home
            </a>
          </div>

          {/* Footer note */}
          <p style={styles.footerNote}>
            © {new Date().getFullYear()} Gita-Bhojanalay &nbsp;·&nbsp; Zero Food Wastage Initiative
          </p>
      </div>
    </div>
  );
};

export default OfflinePage;
