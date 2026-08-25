import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import studentApi from '../../api/studentApi';
import Loader from '../../components/common/Loader';
import {
  User, Hash, Home, Calendar, Clock, Utensils,
  Leaf, Drumstick, ArrowLeft, ShieldAlert, X, ZoomIn,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/* ── Lightbox ── */
const Lightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.90)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          width: '44px', height: '44px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', backdropFilter: 'blur(4px)',
        }}
        aria-label="Close lightbox"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          objectFit: 'contain', cursor: 'default',
        }}
      />
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
};

export const TodayPreference = () => {
  const { user } = useContext(AuthContext);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    const fetchTodayPrefs = async () => {
      try {
        setLoading(true);
        const data = await studentApi.getTodayPreferences();
        setPreferences(data || []);
      } catch (err) {
        console.error("Failed to load today's preferences:", err);
        setError("Could not load today's preferences. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTodayPrefs();
  }, []);

  if (loading) {
    return <Loader message="Loading your preferences for today..." />;
  }

  const today = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString(undefined, dateOptions);

  const getPrefDisplay = (mealType) => {
    const pref = preferences.find((p) => p.meal_type.toLowerCase() === mealType.toLowerCase());
    if (!pref) return <span style={{ color: 'var(--color-charcoal-muted)' }}>Not selected</span>;

    const isVeg = pref.preference.toLowerCase() === 'veg';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        fontWeight: 700,
        color: isVeg ? 'var(--color-green)' : 'var(--color-coral-hover)',
        backgroundColor: isVeg ? '#eafbf0' : '#ffebeb',
        padding: '0.4rem 0.8rem', borderRadius: '20px', textTransform: 'capitalize'
      }}>
        {isVeg ? <Leaf size={16} /> : <Drumstick size={16} />}
        {pref.preference}
      </span>
    );
  };

  const hasPhoto = !!user?.profile_picture_url;

  return (
    <div className="container page-section" style={{ maxWidth: '700px', margin: '0 auto' }}>

      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/student/menu" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-navy)', fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
      </div>

      <div className="card" style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: '24px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden'
      }}>
        {/* Header Area */}
        <div style={{
          backgroundColor: 'var(--color-navy)',
          padding: '2rem',
          color: 'var(--color-white)',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--color-cream)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={28} color="var(--color-mint)" />
            Today's Preference
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', color: 'var(--color-mint)', fontSize: '1.1rem', fontWeight: 500 }}>
            {formattedDate}
          </p>
        </div>

        {error && <div className="alert alert-danger" style={{ margin: '1rem' }}>{error}</div>}

        <div style={{ padding: '2rem' }}>
          {/* Student Info Section */}
          <div style={{
            backgroundColor: 'var(--color-cream)',
            padding: '1.5rem',
            borderRadius: '16px',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-navy)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={20} color="var(--color-coral)" /> Student Details
            </h3>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Profile Picture */}
              <div style={{ flexShrink: 0 }}>
                {hasPhoto ? (
                  <div
                    style={{ position: 'relative', cursor: 'zoom-in' }}
                    onClick={() => setLightboxOpen(true)}
                    title="Click to view full size"
                  >
                    <img
                      src={user.profile_picture_url}
                      alt={`${user?.name}'s profile`}
                      style={{
                        width: '80px', height: '80px',
                        borderRadius: '50%', objectFit: 'cover',
                        border: '3px solid var(--color-green)',
                        boxShadow: '0 4px 12px rgba(46,155,98,0.2)',
                        display: 'block',
                      }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <ZoomIn size={20} color="#fff" />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '50%',
                    backgroundColor: '#e8edf5',
                    border: '3px dashed var(--border-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <User size={32} color="var(--color-charcoal-muted)" />
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', flex: 1 }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>Name</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem' }}>{user?.name || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                    <Hash size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                    Roll Number
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem' }}>{user?.roll_number || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                    <Home size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                    Hostel
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem' }}>{user?.hostel || 'N/A'}</span>
                </div>
                {user?.room_number && (
                  <div>
                    <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>Room</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem' }}>{user.room_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Read-Only Preferences Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-navy)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Utensils size={20} color="var(--color-green)" /> Today's Meal Selections
              </h3>
              <span className="badge badge-navy" style={{ fontSize: '0.75rem' }}>
                <ShieldAlert size={12} /> Static View
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Lunch row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem', border: '1px solid var(--border-subtle)', borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: '#fff8e1', padding: '0.6rem', borderRadius: '50%' }}>
                    <Clock size={20} color="#f59e0b" />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontWeight: 800, color: 'var(--color-navy)', fontSize: '1.1rem' }}>Lunch</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)' }}>Afternoon Meal</span>
                  </div>
                </div>
                <div>{getPrefDisplay('lunch')}</div>
              </div>

              {/* Dinner row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem', border: '1px solid var(--border-subtle)', borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: '#f0f5ff', padding: '0.6rem', borderRadius: '50%' }}>
                    <Clock size={20} color="#3b82f6" />
                  </div>
                  <div>
                    <span style={{ display: 'block', fontWeight: 800, color: 'var(--color-navy)', fontSize: '1.1rem' }}>Dinner</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)' }}>Evening Meal</span>
                  </div>
                </div>
                <div>{getPrefDisplay('dinner')}</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Full-screen Lightbox */}
      {lightboxOpen && user?.profile_picture_url && (
        <Lightbox
          src={user.profile_picture_url}
          alt={`${user?.name}'s profile photo`}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
};

export default TodayPreference;
