import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import menuApi from '../../api/menuApi';
import Loader from '../../components/common/Loader';
import { formatDatePretty, toLocalDateStr } from '../../utils/dateHelpers';
import { Edit3, ShieldAlert, CheckCircle2, AlertCircle, ArrowLeft, Leaf, Drumstick, Trash2, Eye, EyeOff, History, X, Search, FileText } from 'lucide-react';

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
    const dateStr = toLocalDateStr(d);
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
  const studentId = searchParams.get('registration_number') || searchParams.get('student_id');

  const [student, setStudent] = useState(null);
  const [existingPreferences, setExistingPreferences] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  const selectableDates = getAdminSelectableDates();

  // Override Form State
  const [mealDate, setMealDate] = useState(selectableDates[0]?.dateStr || toLocalDateStr(new Date()));
  const [mealType, setMealType] = useState('lunch');
  const [preferenceChoice, setPreferenceChoice] = useState('veg');

  const navigate = useNavigate();

  useEffect(() => {
    if (!studentId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        let studentData = null;
        try {
          studentData = await adminApi.getStudentById(studentId);
          setStudent(studentData);
        } catch (sErr) {
          console.error('Failed to load student info:', sErr);
        }

        try {
          const prefData = await adminApi.getStudentPreferences(studentId);
          setExistingPreferences(Array.isArray(prefData) ? prefData : []);
        } catch (pErr) {
          console.error('Failed to load student preferences:', pErr);
        }

        try {
          const menuData = await menuApi.getWeeklyMenu();
          setMenuItems(menuData || []);
        } catch (mErr) {
          console.error('Failed to load weekly menu:', mErr);
        }

        if (!studentData) {
          setError('Student record not found or could not be loaded.');
        }
      } catch (err) {
        console.error('Unexpected error loading edit preference data:', err);
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

  const handleDeleteSingle = async (preferenceId) => {
    setError('');
    setSuccessMsg('');
    setDeletingId(preferenceId);
    try {
      await adminApi.deletePreference(studentId, preferenceId);
      setSuccessMsg('Preference deleted successfully.');
      const updatedPrefs = await adminApi.getStudentPreferences(studentId);
      setExistingPreferences(updatedPrefs);
    } catch (err) {
      console.error('Failed to delete preference:', err);
      const detail = err?.response?.data?.detail || err.message || 'Failed to delete preference.';
      setError(detail);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(`Are you sure you want to clear ALL ${existingPreferences.length} saved preferences for this student? This cannot be undone.`)) {
      return;
    }
    setError('');
    setSuccessMsg('');
    setClearingAll(true);
    try {
      await adminApi.clearAllPreferences(studentId);
      setSuccessMsg('All preferences cleared successfully.');
      setExistingPreferences([]);
    } catch (err) {
      console.error('Failed to clear all preferences:', err);
      const detail = err?.response?.data?.detail || err.message || 'Failed to clear preferences.';
      setError(detail);
    } finally {
      setClearingAll(false);
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

  // Sort preferences: newest (by meal_date) first — stack order
  const sortedPreferences = [...existingPreferences].sort((a, b) => {
    const dateCompare = new Date(b.meal_date) - new Date(a.meal_date);
    if (dateCompare !== 0) return dateCompare;
    // If same date, show dinner after lunch (dinner first visually since it's newest override behavior)
    return b.meal_type.localeCompare(a.meal_type);
  });

  const PREVIEW_COUNT = 5;
  const visiblePreferences = showAll ? sortedPreferences : sortedPreferences.slice(0, PREVIEW_COUNT);
  const hasMore = sortedPreferences.length > PREVIEW_COUNT;

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
            <span><strong>Reg No:</strong> {student.registration_number}</span>
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
          {/* Header with View All Logs and Clear All buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ color: 'var(--color-navy)', margin: 0 }}>
              Current Saved Preferences
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {existingPreferences.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowLogsModal(true)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'var(--color-cream)',
                    color: 'var(--color-navy)',
                    border: '1.5px solid var(--color-navy)',
                    fontWeight: 700,
                    gap: '0.35rem',
                  }}
                >
                  <History size={14} /> View All Logs ({existingPreferences.length})
                </button>
              )}
              {existingPreferences.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: '#FFEBEE',
                    color: 'var(--color-danger)',
                    border: '1.5px solid var(--color-danger)',
                    fontWeight: 700,
                    gap: '0.3rem',
                  }}
                >
                  <Trash2 size={14} />
                  {clearingAll ? 'Clearing...' : 'Clear All'}
                </button>
              )}
            </div>
          </div>

          {existingPreferences.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-muted)' }}>
              No preferences submitted yet for this student.
            </div>
          ) : (
            <>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                maxHeight: showAll ? '400px' : 'none',
                overflowY: showAll ? 'auto' : 'visible',
                paddingRight: showAll ? '0.5rem' : '0'
              }}>
                {visiblePreferences.map((pref) => (
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
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                        {formatDatePretty(pref.meal_date)} ({pref.meal_type.toUpperCase()})
                      </div>
                      {pref.updated_by && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-coral)', fontWeight: 600 }}>
                          Overridden by Admin
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge ${pref.preference === 'veg' ? 'badge-mint' : 'badge-coral'}`}>
                        {pref.preference === 'veg' ? 'VEG' : 'NON-VEG'}
                      </span>
                      <button
                        onClick={() => handleDeleteSingle(pref.preference_id)}
                        disabled={deletingId === pref.preference_id}
                        title="Delete this preference"
                        className="btn btn-sm"
                        style={{
                          padding: '0.3rem 0.5rem',
                          minHeight: 'auto',
                          backgroundColor: 'transparent',
                          color: 'var(--color-danger)',
                          border: '1px solid var(--color-danger)',
                          borderRadius: '8px',
                          opacity: deletingId === pref.preference_id ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* See All / Collapse toggle */}
              {hasMore && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '1rem', width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {showAll ? (
                    <><EyeOff size={16} /> Show Less</>
                  ) : (
                    <><Eye size={16} /> See All ({sortedPreferences.length} preferences)</>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* FULL LOGS MODAL */}
      {showLogsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(10, 28, 44, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem',
        }}>
          <div className="card" style={{
            backgroundColor: 'var(--color-white)',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: 'var(--color-navy)',
              color: 'var(--color-cream)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <History size={22} color="var(--color-mint)" />
                <div>
                  <h3 style={{ color: 'var(--color-cream)', margin: 0, fontSize: '1.25rem' }}>
                    All Saved Preference Logs
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-mint)', opacity: 0.9 }}>
                    Student: {student.name} ({student.registration_number}) — Total {existingPreferences.length} records
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-cream)', padding: '0.4rem', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Bar inside Modal */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--color-cream)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--color-charcoal-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter logs by date (e.g. Aug 20), meal (lunch/dinner), or preference (veg/non_veg)..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Modal Content / Log List */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sortedPreferences
                .filter((pref) => {
                  if (!logSearch.trim()) return true;
                  const term = logSearch.toLowerCase();
                  return (
                    formatDatePretty(pref.meal_date).toLowerCase().includes(term) ||
                    (pref.meal_date || '').toLowerCase().includes(term) ||
                    (pref.meal_type || '').toLowerCase().includes(term) ||
                    (pref.preference || '').toLowerCase().includes(term)
                  );
                })
                .map((pref, index) => (
                  <div
                    key={pref.preference_id}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-white)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className="badge badge-navy" style={{ fontSize: '0.75rem' }}>#{index + 1}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '1rem' }}>
                          {formatDatePretty(pref.meal_date)} ({pref.meal_type.toUpperCase()})
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)', marginTop: '0.2rem' }}>
                          Week Start: {pref.week_start_date}
                        </div>
                        {pref.updated_by ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-coral)', fontWeight: 600, marginTop: '0.1rem' }}>
                            Overridden by Admin {pref.updated_at ? `on ${formatDatePretty(pref.updated_at)}` : ''}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-green)', fontWeight: 500, marginTop: '0.1rem' }}>
                            Submitted by Student
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${pref.preference === 'veg' ? 'badge-mint' : 'badge-coral'}`} style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}>
                        {pref.preference === 'veg' ? 'VEG' : 'NON-VEG'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(pref.preference_id)}
                        disabled={deletingId === pref.preference_id}
                        title="Delete log entry"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: '#FFEBEE',
                          color: 'var(--color-danger)',
                          border: '1px solid var(--color-danger)',
                          borderRadius: '8px',
                          padding: '0.4rem 0.6rem',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'var(--color-cream)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearingAll}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#FFEBEE',
                  color: 'var(--color-danger)',
                  border: '1.5px solid var(--color-danger)',
                  fontWeight: 700,
                  gap: '0.3rem',
                }}
              >
                <Trash2 size={14} /> Clear All Logs
              </button>
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="btn btn-navy btn-sm"
              >
                Close Logs View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditPreference;
