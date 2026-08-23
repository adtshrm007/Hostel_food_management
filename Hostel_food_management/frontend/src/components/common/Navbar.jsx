import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { UtensilsCrossed, Calendar, ShieldCheck, LogOut, User, Menu, X } from 'lucide-react';

export const Navbar = () => {
  const { isAuthenticated, role, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header style={{
      backgroundColor: 'var(--color-navy)',
      borderBottom: '2px solid rgba(46, 155, 98, 0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 20px rgba(18, 48, 74, 0.3)',
    }}>
      {/* Mobile overlay */}
      <div
        className={`navbar-nav-mobile-overlay ${mobileOpen ? 'navbar-nav-mobile-overlay--active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <div className="container" style={{ position: 'relative' }}>
        <div className="navbar-header">
          {/* Brand Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <img
              src="/logo.webp"
              alt="Gita-Bhojanalay Logo"
              width="42"
              height="42"
              fetchpriority="high"
              elementtiming="lcp-logo"
              decoding="async"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                objectFit: 'cover',
                border: '2px solid var(--color-mint)',
                boxShadow: '0 4px 12px rgba(46, 155, 98, 0.4)',
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '1.4rem',
                color: 'var(--color-cream)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}>
                Gita-Bhojanalay<span style={{ color: 'var(--color-coral)' }}>.</span>
              </div>
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--color-mint)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                Zero Food Wastage
              </div>
            </div>
          </Link>

          {/* Hamburger Button (shown on mobile via CSS) */}
          <button
            className="navbar-hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Navigation Links */}
          <nav className={`navbar-nav ${mobileOpen ? 'navbar-nav--open' : ''}`}>
            {!isAuthenticated && (
              <>
                <Link to="/" className="btn btn-ghost" style={{ color: 'var(--color-cream)' }}>
                  Home
                </Link>
                <Link to="/login" className="btn btn-outline" style={{ borderColor: 'var(--color-mint)', color: 'var(--color-cream)' }}>
                  Student Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Register Student
                </Link>
              </>
            )}

            {isAuthenticated && role === 'student' && (
              <>
                <Link
                  to="/student/menu"
                  className="btn"
                  style={{
                    backgroundColor: isActive('/student/menu') ? 'rgba(228, 244, 234, 0.15)' : 'transparent',
                    color: isActive('/student/menu') ? 'var(--color-coral)' : 'var(--color-cream)',
                    border: 'none',
                  }}
                >
                  <UtensilsCrossed size={18} />
                  Weekly Menu
                </Link>
                <Link
                  to="/student/preference"
                  className="btn"
                  style={{
                    backgroundColor: isActive('/student/preference') ? 'rgba(228, 244, 234, 0.15)' : 'transparent',
                    color: isActive('/student/preference') ? 'var(--color-coral)' : 'var(--color-cream)',
                    border: 'none',
                  }}
                >
                  <Calendar size={18} />
                  Set Preferences
                </Link>
              </>
            )}

            {isAuthenticated && role === 'admin' && (
              <>
                <Link
                  to="/admin/dashboard"
                  className="btn"
                  style={{
                    backgroundColor: isActive('/admin/dashboard') ? 'rgba(228, 244, 234, 0.15)' : 'transparent',
                    color: isActive('/admin/dashboard') ? 'var(--color-coral)' : 'var(--color-cream)',
                    border: 'none',
                  }}
                >
                  <ShieldCheck size={18} />
                  Admin Dashboard
                </Link>
                <Link
                  to="/admin/records"
                  className="btn"
                  style={{
                    backgroundColor: isActive('/admin/records') ? 'rgba(228, 244, 234, 0.15)' : 'transparent',
                    color: isActive('/admin/records') ? 'var(--color-coral)' : 'var(--color-cream)',
                    border: 'none',
                  }}
                >
                  <User size={18} />
                  Student Directory
                </Link>
              </>
            )}

            {/* User Status / Logout */}
            {isAuthenticated && (
              <div className="navbar-user-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '0.5rem' }}>
                <div style={{
                  backgroundColor: 'rgba(255, 248, 237, 0.1)',
                  border: '1px solid rgba(255, 248, 237, 0.2)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '0.35rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--color-cream)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  <span className="badge badge-mint" style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}>
                    {role}
                  </span>
                  <span>{user?.name || user?.username || 'User'}</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="btn btn-sm btn-coral"
                  title="Logout"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
