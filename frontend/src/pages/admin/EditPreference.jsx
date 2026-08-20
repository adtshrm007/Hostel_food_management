import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import menuApi from '../../api/menuApi';
import Loader from '../../components/common/Loader';
import { formatDatePretty } from '../../utils/dateHelpers';
import { Edit3, ShieldAlert, CheckCircle2, AlertCircle, ArrowLeft, Leaf, Drumstick } from 'lucide-react';

// Helper to generate 14 selectable dates covering current week and upcoming week
const getAdminSelectableDates = () => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
  
  // Calculate current week's Monday
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysFromMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const dates = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Generate 14 days (7 days current week + 7 days upcoming week)
  for (let i = 0; i < 14; i++) {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = dayNames[i % 7];
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isCurrentWeek = i < 7;

    dates.push({
      dateStr,
      dayName,
      formattedDate: formatted,
      label: `${dayName} — ${formatted} (${isCurrentWeek ? 'Current Week' : 'Upcoming Week'})`,
    });
  }

  return dates;
};

export const EditPreference = () => {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('student_id');

  const [student, setStudent] = useState(null);
  const [existingPreferences, setExistingPreferences] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectableDates = getAdminSelectableDates();

  // Override Form State
  const [mealDate, setMealDate] = useState(selectableDates[0]?.dateStr || new Date().toISOString().split('T')[0]);
  const [mealType, setMealType] = useState('lunch');
  const [preferenceChoice, setPreferenceChoice] = useState('veg');

  const navigate = useNavigate();

  useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [studentData, prefData, menuData] = await Promise.all([
          adminApi.getStudentById(studentId),
          adminApi.getStudentPreferences(studentId),
          menuApi.getWeeklyMenu(),
        ]);

        setStudent(studentData);
        setExistingPreferences(prefData);
        setMenuItems(menuData);
      } catch (err) {
        console.error('Failed to load student preference data for admin:', err);
        setError('Could not load student details or preferences.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  const handleAdminOverride = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!mealDate || !mealType || !preferenceChoice) {
      setError('Please select date, meal type, and preference.');
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.updateStudentPreference(studentId, {
        meal_date: mealDate,
        meal_type: mealType,
        preference: preferenceChoice,
      });

      setSuccessMsg(`Successfully updated preference for ${formatDatePretty(mealDate)} ${mealType.toUpperCase()} to ${preferenceChoice.toUpperCase()}!`);
      
      // Refresh stored student preferences
      const updatedPrefs = await adminApi.getStudentPreferences(studentId);
      setExistingPreferences(updatedPrefs);
    } catch (err) {
      console.error('Failed to update student preference:', err);
      const detail = err?.response?.data?.detail || err.message || 'Failed to update preference.';
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading student preference configuration..." />;
  }

  if (!studentId || !student) {
    return (
      <div className="container page-section" style={{ textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 1.5rem', backgroundColor: 'var(--color-white)' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto 1rem auto' }} />
          <h3>No Student Selected</h3>
          <p>Please select a student from the directory to override preferences.</p>
          <button onClick={() => navigate('/admin/records')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Go to Student Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-section">
      {/* Back Button */}
      <button onClick={() => navigate('/admin/records')} className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={16} /> Back to Student Directory
      </button>

      {/* Target Student Header Card */}
      <div className="page-header-banner">
        <div>
          <span className="badge badge-mint" style={{ marginBottom: '0.5rem' }}>
            <ShieldAlert size={14} /> Admin Preference Override
          </span>
          <h2 style={{ color: 'var(--color-cream)', marginBottom: '0.25rem' }}>
            {student.name}
          </h2>
          <div style={{ color: 'var(--color-mint)', fontSize: '0.95rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <span><strong>Roll:</strong> {student.roll}</span>
            <span><strong>Hostel:</strong> {student.hostel}</span>
            <span><strong>Email:</strong> {student.email}</span>
            <span><strong>Phone:</strong> {student.phone}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid-2">
        {/* Override Form Panel */}
        <div className="card" style={{ backgroundColor: 'var(--color-white)', padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--color-navy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={20} color="var(--color-coral)" /> Override Meal Preference
          </h3>

          <form onSubmit={handleAdminOverride} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label htmlFor="override-meal-date-select" className="form-label">Select Meal Date</label>
              <select
                id="override-meal-date-select"
                name="mealDate"
                className="form-select"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                required
              >
                {selectableDates.map((day) => (
                  <option key={day.dateStr} value={day.dateStr}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select Meal Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setMealType('lunch')}
                  className="btn"
                  style={{
                    backgroundColor: mealType === 'lunch' ? 'var(--color-navy)' : 'var(--color-cream)',
                    color: mealType === 'lunch' ? 'var(--color-cream)' : 'var(--color-navy)',
                    border: '1.5px solid var(--color-navy)',
                  }}
                >
                  ☀️ Lunch
                </button>
                <button
                  type="button"
                  onClick={() => setMealType('dinner')}
                  className="btn"
                  style={{
                    backgroundColor: mealType === 'dinner' ? 'var(--color-navy)' : 'var(--color-cream)',
                    color: mealType === 'dinner' ? 'var(--color-cream)' : 'var(--color-navy)',
                    border: '1.5px solid var(--color-navy)',
                  }}
                >
                  🌙 Dinner
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Administrator Food Choice</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setPreferenceChoice('veg')}
                  className="btn"
                  style={{
                    backgroundColor: preferenceChoice === 'veg' ? 'var(--color-green)' : 'var(--color-mint)',
                    color: preferenceChoice === 'veg' ? 'var(--color-white)' : 'var(--color-green)',
                    border: '2px solid var(--color-green)',
                  }}
                >
                  <Leaf size={16} /> Veg
                </button>
                <button
                  type="button"
                  onClick={() => setPreferenceChoice('non_veg')}
                  className="btn"
                  style={{
                    backgroundColor: preferenceChoice === 'non_veg' ? 'var(--color-coral)' : '#FFF0E8',
                    color: preferenceChoice === 'non_veg' ? 'var(--color-white)' : 'var(--color-coral-hover)',
                    border: '2px solid var(--color-coral)',
                  }}
                >
                  <Drumstick size={16} /> Non-Veg
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-coral btn-lg"
              style={{ marginTop: '0.5rem', width: '100%' }}
            >
              {submitting ? 'Applying Override...' : 'Apply Admin Override'}
            </button>
          </form>
        </div>

        {/* Existing Preferences Summary */}
        <div className="card" style={{ backgroundColor: 'var(--color-white)', padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--color-navy)', marginBottom: '1.25rem' }}>
            Current Saved Preferences
          </h3>

          {existingPreferences.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-muted)' }}>
              No preferences submitted yet for this student.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
              {existingPreferences.map((pref) => (
                <div
                  key={pref.preference_id}
                  style={{
                    padding: '0.85rem 1.1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-cream)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                      {formatDatePretty(pref.meal_date)} ({pref.meal_type.toUpperCase()})
                    </div>
                    {pref.updated_by && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-coral)', fontWeight: 600 }}>
                        Overridden by Admin #{pref.updated_by}
                      </div>
                    )}
                  </div>

                  <span className={`badge ${pref.preference === 'veg' ? 'badge-mint' : 'badge-coral'}`}>
                    {pref.preference === 'veg' ? 'VEG' : 'NON-VEG'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditPreference;
