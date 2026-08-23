import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Utensils, Key, ArrowRight, CheckCircle2, TrendingDown, Users, Award } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem', paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <section className="hero-section">
        {/* Subtle Background Glow Accent */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(46,155,98,0.2) 0%, rgba(18,48,74,0) 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src="/logo.webp"
                alt="Gita-Bhojanalay Logo"
                width="48"
                height="48"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  objectFit: 'cover',
                  border: '2px solid var(--color-mint)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                }}
              />
              <span className="badge badge-mint" style={{ width: 'fit-content', padding: '0.5rem 1.2rem', fontSize: '0.85rem' }}>
                <Leaf size={16} /> Eco-Smart Hostel Food Platform
              </span>
            </div>

            <h1 className="hero-title">
              Smart Meal Choices.<br />
              <span style={{ color: 'var(--color-coral)' }}>Zero Food Wastage.</span>
            </h1>

            <p className="hero-subtitle">
              Gita-Bhojanalay connects hostel students and mess management. Submit your weekly meal preferences every weekend to help your college prepare precise quantities and reduce food waste.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Register as Student <ArrowRight size={20} />
              </Link>
              <Link to="/login" className="btn btn-coral btn-lg">
                Student Login
              </Link>
              <Link
                to="/enter-key"
                title="System Access"
                aria-label="System Access Key"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,248,237,0.25)',
                  color: 'rgba(255,248,237,0.45)',
                  background: 'transparent',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-cream)';
                  e.currentTarget.style.borderColor = 'rgba(255,248,237,0.6)';
                  e.currentTarget.style.background = 'rgba(255,248,237,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,248,237,0.45)';
                  e.currentTarget.style.borderColor = 'rgba(255,248,237,0.25)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Key size={20} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Statistics Section */}
      <section className="container">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="badge badge-navy" style={{ marginBottom: '0.75rem' }}>Measurable Sustainability</span>
          <h2>Driving Sustainable Hostel Dining</h2>
          <p style={{ color: 'var(--color-charcoal-muted)' }}>Real-world impact through advance meal preference forecasting</p>
        </div>

        <div className="grid-3">
          <div className="card impact-stat-card">
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--color-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green)' }}>
              <TrendingDown size={32} />
            </div>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--color-green)', margin: 0 }}>40%</h3>
            <h4 style={{ margin: 0 }}>Reduction in Food Wastage</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-charcoal-muted)', margin: 0 }}>
              Precise headcount forecasts allow kitchen staff to cook exact quantities every lunch and dinner.
            </p>
          </div>

          <div className="card impact-stat-card">
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#FFF0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-coral)' }}>
              <Utensils size={32} />
            </div>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--color-coral)', margin: 0 }}>14 Meals</h3>
            <h4 style={{ margin: 0 }}>Weekly Meal Choices</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-charcoal-muted)', margin: 0 }}>
              Students pick Veg or Non-Veg for 7 lunches and 7 dinners during Saturday and Sunday windows.
            </p>
          </div>

          <div className="card impact-stat-card">
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(18, 48, 74, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-navy)' }}>
              <Award size={32} />
            </div>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--color-navy)', margin: 0 }}>100%</h3>
            <h4 style={{ margin: 0 }}>Admin Transparency</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-charcoal-muted)', margin: 0 }}>
              College authorities gain instant access to headcount analytics and individual student preference management.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section style={{ backgroundColor: 'var(--color-white)', padding: '4rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <span className="badge badge-mint" style={{ marginBottom: '0.75rem' }}>Simple 3-Step Process</span>
            <h2>How Gita-Bhojanalay Works</h2>
          </div>

          <div className="grid-3">
            <div className="card" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>1. Saturday / Sunday Window</div>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-charcoal)' }}>
                Log in every weekend when the selection window opens to view the fixed weekly menu for the upcoming Monday through Sunday.
              </p>
            </div>

            <div className="card" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-green)', marginBottom: '0.5rem' }}>2. Submit 14 Preferences</div>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-charcoal)' }}>
                Choose Veg or Non-Veg for all 7 lunches and 7 dinners in one click. Submit your selections securely to lock your headcount.
              </p>
            </div>

            <div className="card" style={{ backgroundColor: 'var(--color-cream)', border: '1px solid var(--border-strong)' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-coral)', marginBottom: '0.5rem' }}>3. Zero Waste Mess Kitchen</div>
              <p style={{ fontSize: '0.95rem', color: 'var(--color-charcoal)' }}>
                Kitchen staff review exact Veg/Non-Veg numbers for every meal, preparing delicious, fresh meals without food waste!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="container">
        <div className="page-header-banner" style={{
          padding: '3.5rem 2.5rem',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div>
            <h2 style={{ color: 'var(--color-cream)', marginBottom: '0.5rem' }}>Ready to Reduce Hostel Food Wastage?</h2>
            <p style={{ color: 'var(--color-mint)', fontSize: '1.05rem', margin: 0 }}>Join your hostel mess platform today as a student or administrator.</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-coral btn-lg">
              Log In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
