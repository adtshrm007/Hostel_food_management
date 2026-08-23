import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import studentApi from '../../api/studentApi';
import Loader from '../../components/common/Loader';
import { User, Hash, Home, Calendar, Clock, Utensils, Leaf, Drumstick, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TodayPreference = () => {
  const { user } = useContext(AuthContext);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.4rem',
        fontWeight: 700,
        color: isVeg ? 'var(--color-green)' : 'var(--color-coral-hover)',
        backgroundColor: isVeg ? '#eafbf0' : '#ffebeb',
        padding: '0.4rem 0.8rem',
        borderRadius: '20px',
        textTransform: 'capitalize'
      }}>
        {isVeg ? <Leaf size={16} /> : <Drumstick size={16} />}
        {pref.preference}
      </span>
    );
  };

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
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>Name</span>
                <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1.1rem' }}>{user?.name || 'N/A'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                  <Hash size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }}/> 
                  Registration Number
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1.1rem' }}>{user?.registration_number || 'N/A'}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>
                  <Home size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }}/> 
                  Hostel/Room
                </span>
                <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1.1rem' }}>{user?.hostel || 'N/A'}</span>
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
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1.25rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
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
                <div>
                  {getPrefDisplay('lunch')}
                </div>
              </div>

              {/* Dinner row */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1.25rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
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
                <div>
                  {getPrefDisplay('dinner')}
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default TodayPreference;
