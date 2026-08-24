import React, { useState, useEffect } from 'react';
import studentApi from '../../api/studentApi';
import menuApi from '../../api/menuApi';
import PreferenceCard from '../../components/student/PreferenceCard';
import Loader from '../../components/common/Loader';
import {
  isSelectionWindowOpen,
  getCurrentWeekDays,
  getUpcomingWeekDays,
} from '../../utils/dateHelpers';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Send,
  Save,
  Lock,
  FileCheck,
  CalendarDays,
} from 'lucide-react';

export const PreferenceSelect = () => {
  const [loading, setLoading] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [menuItems, setMenuItems] = useState([]);
  const [existingPreferences, setExistingPreferences] = useState([]);
  const [selections, setSelections] = useState({}); // key: `${dateStr}_${mealType}` -> 'veg' | 'non_veg'
  const [windowOpen, setWindowOpen] = useState(false);

  // Week selection: 'upcoming' or 'current'
  const [activeWeekTab, setActiveWeekTab] = useState(
    isSelectionWindowOpen() ? 'upcoming' : 'current'
  );

  const currentWeekDays = getCurrentWeekDays();
  const upcomingWeekDays = getUpcomingWeekDays();
  const activeWeekDays = activeWeekTab === 'current' ? currentWeekDays : upcomingWeekDays;

  // Check if student has finalized their weekly submission for the active week
  const isFinalized =
    existingPreferences.length > 0 && existingPreferences.every((p) => p.is_submitted);
  const isDraftSaved =
    existingPreferences.length > 0 && existingPreferences.some((p) => !p.is_submitted);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const initialWeekStart = (
          activeWeekTab === 'current' ? currentWeekDays[0] : upcomingWeekDays[0]
        ).dateStr;

        const [menuData, prefData, windowStatus] = await Promise.all([
          menuApi.getWeeklyMenu(),
          studentApi.getWeeklyPreferences(initialWeekStart),
          studentApi.getTodayWindowStatus().catch(() => ({ is_open: isSelectionWindowOpen() })),
        ]);

        setMenuItems(menuData);
        setExistingPreferences(prefData || []);
        setWindowOpen(windowStatus?.is_open ?? isSelectionWindowOpen());

        // Pre-fill selections from stored preferences
        const initialSelections = {};
        (prefData || []).forEach((pref) => {
          const key = `${pref.meal_date}_${pref.meal_type.toLowerCase()}`;
          initialSelections[key] = pref.preference.toLowerCase();
        });
        setSelections(initialSelections);
      } catch (err) {
        console.error('Failed to load preferences data:', err);
        setError('Failed to load preferences data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleTabChange = async (tab) => {
    if (tab === activeWeekTab) return;
    setActiveWeekTab(tab);
    setError('');
    setSuccessMsg('');

    const targetDays = tab === 'current' ? currentWeekDays : upcomingWeekDays;
    const weekStartStr = targetDays[0].dateStr;

    try {
      setLoadingWeek(true);
      const prefData = await studentApi.getWeeklyPreferences(weekStartStr);
      setExistingPreferences(prefData || []);

      const newSelections = {};
      (prefData || []).forEach((pref) => {
        const key = `${pref.meal_date}_${pref.meal_type.toLowerCase()}`;
        newSelections[key] = pref.preference.toLowerCase();
      });
      setSelections(newSelections);
    } catch (err) {
      console.error('Failed to load preferences for selected week:', err);
      setError('Failed to load preferences for selected week.');
    } finally {
      setLoadingWeek(false);
    }
  };

  const handleSelectChoice = (dateStr, mealType, choice) => {
    if (!windowOpen || (isFinalized && !windowOpen)) return;
    const key = `${dateStr}_${mealType}`;
    setSelections((prev) => ({
      ...prev,
      [key]: choice,
    }));
  };

  const calculateSelectedCount = () => {
    let count = 0;
    activeWeekDays.forEach((day) => {
      ['lunch', 'dinner'].forEach((mealType) => {
        const key = `${day.dateStr}_${mealType}`;
        if (selections[key]) count++;
      });
    });
    return count;
  };

  const handleSubmitAll = async (isFinal = false) => {
    setError('');
    setSuccessMsg('');

    // Construct 14 items
    const preferencesList = [];
    let missingField = false;

    activeWeekDays.forEach((day) => {
      ['lunch', 'dinner'].forEach((mealType) => {
        const key = `${day.dateStr}_${mealType}`;
        const prefValue = selections[key];

        if (!prefValue) {
          missingField = true;
        } else {
          preferencesList.push({
            meal_date: day.dateStr,
            meal_type: mealType,
            preference: prefValue,
          });
        }
      });
    });

    if (missingField || preferencesList.length < 14) {
      setError(
        'Please select a food preference (Veg or Non-Veg) for all 14 meal slots before saving.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const saved = await studentApi.submitWeeklyPreferences(preferencesList, isFinal);
      setExistingPreferences(saved);

      const weekLabel = activeWeekTab === 'current' ? 'Current Week' : 'Upcoming Week';
      if (isFinal) {
        setSuccessMsg(
          `Your 14 ${weekLabel} meal preferences have been FINALIZED and submitted! Choices are now locked.`
        );
      } else {
        setSuccessMsg(
          `Draft ${weekLabel} preferences saved successfully! You can modify choices anytime until the window closes or click Final Submit.`
        );
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to submit preferences:', err);
      const detail =
        err?.response?.data?.detail || err.message || 'Failed to submit preferences.';
      setError(detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading your preferences..." />;
  }

  return (
    <div className="container page-section">
      {/* Banner */}
      <div className="page-header-banner">
        <div>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '0.5rem',
            }}
          >
            <span className={`badge ${windowOpen ? 'badge-mint' : 'badge-coral'}`}>
              <Calendar size={14} />{' '}
              {windowOpen
                ? isFinalized
                  ? 'Window Re-opened — Edit Allowed'
                  : 'Selection Window Open'
                : isFinalized
                ? 'Finalized & Locked'
                : 'Window Closed'}
            </span>
            <span className="badge badge-navy">
              {activeWeekTab === 'current' ? 'Current Week' : 'Upcoming Week'} (
              {activeWeekDays[0].formattedDate} – {activeWeekDays[6].formattedDate})
            </span>
            {isDraftSaved && !isFinalized && (
              <span
                className="badge badge-mint"
                style={{
                  backgroundColor: '#fff8e1',
                  color: '#b45309',
                  borderColor: '#fde68a',
                }}
              >
                <FileCheck size={14} /> Draft Saved
              </span>
            )}
          </div>

          <h2 style={{ color: 'var(--color-cream)', marginBottom: '0.25rem' }}>
            Select {activeWeekTab === 'current' ? 'Current Week' : 'Upcoming Week'} Preferences
          </h2>
          <p style={{ color: 'var(--color-mint)', fontSize: '0.95rem', margin: 0 }}>
            {isFinalized
              ? `Your preferences for this ${activeWeekTab === 'current' ? 'current' : 'upcoming'} week are locked and finalized.`
              : 'Choose Veg or Non-Veg for all 14 lunch and dinner slots.'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div
          style={{
            backgroundColor: 'rgba(255, 248, 237, 0.1)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            border: '1px solid rgba(255, 248, 237, 0.2)',
            minWidth: '140px',
          }}
        >
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'var(--color-coral)',
              lineHeight: 1,
            }}
          >
            {calculateSelectedCount()} / 14
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-cream)',
              fontWeight: 600,
              textTransform: 'uppercase',
              marginTop: '0.2rem',
            }}
          >
            Meals Selected
          </div>
        </div>
      </div>

      {/* Week Selector Toggle Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '1.5rem 0',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: '#e2e8f0',
            padding: '5px',
            borderRadius: '16px',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
            gap: '6px',
            maxWidth: '100%',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabChange('current')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              transition: 'all 0.2s ease',
              backgroundColor:
                activeWeekTab === 'current' ? 'var(--color-navy)' : 'transparent',
              color:
                activeWeekTab === 'current'
                  ? 'var(--color-cream)'
                  : 'var(--color-charcoal-muted)',
              boxShadow:
                activeWeekTab === 'current'
                  ? '0 4px 12px rgba(15, 23, 42, 0.2)'
                  : 'none',
            }}
          >
            <CalendarDays
              size={18}
              color={
                activeWeekTab === 'current' ? 'var(--color-coral)' : 'currentColor'
              }
            />
            Current Week ({currentWeekDays[0].formattedDate} – {currentWeekDays[6].formattedDate})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('upcoming')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.95rem',
              transition: 'all 0.2s ease',
              backgroundColor:
                activeWeekTab === 'upcoming' ? 'var(--color-navy)' : 'transparent',
              color:
                activeWeekTab === 'upcoming'
                  ? 'var(--color-cream)'
                  : 'var(--color-charcoal-muted)',
              boxShadow:
                activeWeekTab === 'upcoming'
                  ? '0 4px 12px rgba(15, 23, 42, 0.2)'
                  : 'none',
            }}
          >
            <Calendar
              size={18}
              color={
                activeWeekTab === 'upcoming' ? 'var(--color-mint)' : 'currentColor'
              }
            />
            Upcoming Week ({upcomingWeekDays[0].formattedDate} – {upcomingWeekDays[6].formattedDate})
          </button>
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

      {isFinalized && !windowOpen && (
        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <Lock size={20} />
          <span>
            <strong>Weekly Submission Finalized:</strong> Your preferences for this week have been permanently submitted. If you need any changes, please contact an administrator to perform an override.
          </span>
        </div>
      )}

      {!windowOpen && !isFinalized && (
        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <ShieldAlert size={20} />
          <span>
            <strong>Preference Selection Closed:</strong> Student preference submissions are permitted only on Saturdays and Sundays. Draft selections have been automatically finalized for the upcoming week.
          </span>
        </div>
      )}

      {loadingWeek ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <Loader message="Loading week preferences..." />
        </div>
      ) : (
        /* 14 Meal Cards Grid */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {activeWeekDays.map((day) => {
            const dayNameLower = day.dayName.toLowerCase();
            const dayMenuItems = menuItems.filter(
              (item) => item.day_of_week.toLowerCase() === dayNameLower
            );
            const lunchItem = dayMenuItems.find(
              (item) => item.meal_type.toLowerCase() === 'lunch'
            );
            const dinnerItem = dayMenuItems.find(
              (item) => item.meal_type.toLowerCase() === 'dinner'
            );

            const lunchKey = `${day.dateStr}_lunch`;
            const dinnerKey = `${day.dateStr}_dinner`;

            // Check if admin overridden
            const lunchExisting = existingPreferences.find(
              (p) => p.meal_date === day.dateStr && p.meal_type === 'lunch'
            );
            const dinnerExisting = existingPreferences.find(
              (p) => p.meal_date === day.dateStr && p.meal_type === 'dinner'
            );

            return (
              <div
                key={day.dateStr}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <h3
                  style={{
                    color: 'var(--color-navy)',
                    fontSize: '1.25rem',
                    borderBottom: '2px solid var(--border-strong)',
                    paddingBottom: '0.4rem',
                  }}
                >
                  {day.dayName}{' '}
                  <span
                    style={{
                      color: 'var(--color-charcoal-muted)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    ({day.formattedDate})
                  </span>
                </h3>

                <div className="grid-2">
                  <PreferenceCard
                    dayName={day.dayName}
                    formattedDate={day.formattedDate}
                    mealType="lunch"
                    vegMenu={lunchItem?.veg_menu}
                    nonVegMenu={lunchItem?.non_veg_menu}
                    selectedChoice={selections[lunchKey]}
                    onSelect={(choice) =>
                      handleSelectChoice(day.dateStr, 'lunch', choice)
                    }
                    isAdminOverridden={!!lunchExisting?.updated_by}
                    disabled={!windowOpen}
                  />

                  <PreferenceCard
                    dayName={day.dayName}
                    formattedDate={day.formattedDate}
                    mealType="dinner"
                    vegMenu={dinnerItem?.veg_menu}
                    nonVegMenu={dinnerItem?.non_veg_menu}
                    selectedChoice={selections[dinnerKey]}
                    onSelect={(choice) =>
                      handleSelectChoice(day.dateStr, 'dinner', choice)
                    }
                    isAdminOverridden={!!dinnerExisting?.updated_by}
                    disabled={!windowOpen}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Action Bar */}
      {windowOpen && (
        <div className="sticky-submit-bar">
          <div>
            <div
              style={{
                fontWeight: 800,
                color: 'var(--color-navy)',
                fontSize: '1.1rem',
              }}
            >
              Save or Finalize {activeWeekTab === 'current' ? 'Current' : 'Upcoming'} Week Preferences?
            </div>
            <div
              style={{
                fontSize: '0.88rem',
                color: 'var(--color-charcoal-muted)',
              }}
            >
              {calculateSelectedCount() === 14
                ? '✅ All 14 meal slots selected'
                : `⚠️ ${14 - calculateSelectedCount()} meal slots remaining`}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSubmitAll(false)}
              disabled={submitting || calculateSelectedCount() < 14}
              className="btn btn-secondary"
              style={{ fontWeight: 700 }}
            >
              <Save size={18} />
              {submitting ? 'Saving Draft...' : 'Save Draft Preferences'}
            </button>

            <button
              type="button"
              onClick={() => handleSubmitAll(true)}
              disabled={submitting || calculateSelectedCount() < 14}
              className="btn btn-primary btn-lg"
              style={{ fontWeight: 800 }}
            >
              <Send size={18} />
              {submitting ? 'Finalizing...' : 'Final Submit Preferences'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreferenceSelect;
