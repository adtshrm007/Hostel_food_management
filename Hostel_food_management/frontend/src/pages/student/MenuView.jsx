import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import menuApi from '../../api/menuApi';
import Loader from '../../components/common/Loader';
import { Utensils, Calendar, Leaf, Drumstick, ArrowRight } from 'lucide-react';

export const MenuView = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const data = await menuApi.getWeeklyMenu();
        setMenuItems(data);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
        setError('Could not load weekly menu. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Group menu by day
  const groupedMenu = daysOrder.map((day) => {
    const dayItems = menuItems.filter((item) => item.day_of_week.toLowerCase() === day);
    const lunch = dayItems.find((item) => item.meal_type.toLowerCase() === 'lunch');
    const dinner = dayItems.find((item) => item.meal_type.toLowerCase() === 'dinner');
    return {
      day,
      lunch,
      dinner,
    };
  });

  if (loading) {
    return <Loader message="Loading weekly hostel menu..." />;
  }

  return (
    <div className="container page-section">
      {/* Page Header */}
      <div className="page-header-banner">
        <div>
          <span className="badge badge-mint" style={{ marginBottom: '0.5rem' }}>Fixed Weekly Menu</span>
          <h2 style={{ color: 'var(--color-cream)', marginBottom: '0.25rem' }}>
            Hostel Mess Food Schedule
          </h2>
          <p style={{ color: 'var(--color-mint)', fontSize: '0.95rem', margin: 0 }}>
            Review the 14 available meal options for Monday through Sunday.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/student/today" className="btn btn-outline-light" style={{ width: 'fit-content' }}>
            <Calendar size={20} /> See Today's Preference
          </Link>
          <Link to="/student/preference" className="btn btn-coral btn-lg" style={{ width: 'fit-content' }}>
            <Calendar size={20} /> Set My Preferences <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Menu Grid Grouped by Day */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {groupedMenu.map(({ day, lunch, dinner }) => (
          <div key={day} className="card" style={{
            backgroundColor: 'var(--color-white)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <h3 style={{
              textTransform: 'capitalize',
              color: 'var(--color-navy)',
              fontSize: '1.3rem',
              borderBottom: '2px solid var(--color-mint)',
              paddingBottom: '0.75rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Utensils size={22} color="var(--color-green)" /> {day} Menu
            </h3>

            <div className="grid-2">
              {/* LUNCH BOX */}
              <div style={{
                backgroundColor: 'var(--color-cream)',
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid var(--border-strong)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-navy)' }}>
                    ☀️ Lunch
                  </span>
                  <span className="badge badge-navy">Fixed Meal</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Leaf size={14} /> Veg Option:
                    </span>{' '}
                    <span style={{ color: 'var(--color-charcoal)', fontWeight: 500 }}>{lunch?.veg_menu || 'Not scheduled'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-coral-hover)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Drumstick size={14} /> Non-Veg Option:
                    </span>{' '}
                    <span style={{ color: 'var(--color-charcoal)', fontWeight: 500 }}>{lunch?.non_veg_menu || 'Not scheduled'}</span>
                  </div>
                </div>
              </div>

              {/* DINNER BOX */}
              <div style={{
                backgroundColor: 'var(--color-cream)',
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid var(--border-strong)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-navy)' }}>
                    🌙 Dinner
                  </span>
                  <span className="badge badge-navy">Fixed Meal</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-green)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Leaf size={14} /> Veg Option:
                    </span>{' '}
                    <span style={{ color: 'var(--color-charcoal)', fontWeight: 500 }}>{dinner?.veg_menu || 'Not scheduled'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-coral-hover)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Drumstick size={14} /> Non-Veg Option:
                    </span>{' '}
                    <span style={{ color: 'var(--color-charcoal)', fontWeight: 500 }}>{dinner?.non_veg_menu || 'Not scheduled'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuView;
