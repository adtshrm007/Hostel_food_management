import React, { useState, useEffect } from 'react';
import studentApi from '../../api/studentApi';
import menuApi from '../../api/menuApi';
import PreferenceCard from '../../components/student/PreferenceCard';
import Loader from '../../components/common/Loader';
import { isSelectionWindowOpen, getUpcomingWeekDays } from '../../utils/dateHelpers';
import { Calendar, CheckCircle2, AlertCircle, ShieldAlert, Send, Save, Lock, FileCheck } from 'lucide-react';

export const PreferenceSelect = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [menuItems, setMenuItems] = useState([]);
  const [existingPreferences, setExistingPreferences] = useState([]);
  const [selections, setSelections] = useState({}); // key: `${dateStr}_${mealType}` -> 'veg' | 'non_veg'
  const [windowOpen, setWindowOpen] = useState(false);

  const weekDays = getUpcomingWeekDays();

  // Check if student has finalized their weekly submission
  const isFinalized = existingPreferences.length > 0 && existingPreferences.every((p) => p.is_submitted);
  const isDraftSaved = existingPreferences.length > 0 && existingPreferences.some((p) => !p.is_submitted);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [menuData, prefData, windowStatus] = await Promise.all([
          menuApi.getWeeklyMenu(),
          studentApi.getWeeklyPreferences(),
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

    loadData();
  }, []);


  const handleSelectChoice = (dateStr, mealType, choice) => {
    if (isFinalized || !windowOpen) return;
    const key = `${dateStr}_${mealType}`;
    setSelections((prev) => ({
      ...prev,
      [key]: choice,
    }));
  };

  const calculateSelectedCount = () => {
    let count = 0;
    weekDays.forEach((day) => {
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

    weekDays.forEach((day) => {
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
      setError('Please select a food preference (Veg or Non-Veg) for all 14 meal slots before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await studentApi.submitWeeklyPreferences(preferencesList, isFinal);
      setExistingPreferences(saved);

      if (isFinal) {
        setSuccessMsg('Your 14 weekly meal preferences have been FINALIZED and submitted! Choices are now locked.');
      } else {
        setSuccessMsg('Draft preferences saved successfully! You can modify choices anytime until the window closes or click Final Submit.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to submit preferences:', err);
      const detail = err?.response?.data?.detail || err.message || 'Failed to submit preferences.';
      setError(detail);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading your upcoming week preferences..." />;
  }

  return (
    <div className="container page-section">
      {/* Banner */}
      <div className="page-header-banner">
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span className={`badge ${windowOpen ? (isFinalized ? 'badge-coral' : 'badge-mint') : 'badge-coral'}`}>
              <Calendar size={14} /> {isFinalized ? 'Finalized & Locked' : (windowOpen ? 'Selection Window Open' : 'Window Closed')}
            </span>
            <span className="badge badge-navy">
              Upcoming Week ({weekDays[0].formattedDate} – {weekDays[6].formattedDate})
            </span>
            {isDraftSaved && !isFinalized && (
              <span className="badge badge-mint" style={{ backgroundColor: '#fff8e1', color: '#b45309', borderColor: '#fde68a' }}>
                <FileCheck size={14} /> Draft Saved
              </span>
            )}
          </div>

          <h2 style={{ color: 'var(--color-cream)', marginBottom: '0.25rem' }}>
            Select Upcoming Week Preferences
          </h2>
          <p style={{ color: 'var(--color-mint)', fontSize: '0.95rem', margin: 0 }}>
            {isFinalized
              ? 'Your preferences for this week are locked and finalized.'
              : 'Choose Veg or Non-Veg for all 14 lunch and dinner slots.'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div style={{
          backgroundColor: 'rgba(255, 248, 237, 0.1)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          border: '1px solid rgba(255, 248, 237, 0.2)',
          minWidth: '140px',
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-coral)', lineHeight: 1 }}>
            {calculateSelectedCount()} / 14
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-cream)', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.2rem' }}>
            Meals Selected
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

      {isFinalized && (
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

      {/* 14 Meal Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {weekDays.map((day) => {
          const dayNameLower = day.dayName.toLowerCase();
          const dayMenuItems = menuItems.filter((item) => item.day_of_week.toLowerCase() === dayNameLower);
          const lunchItem = dayMenuItems.find((item) => item.meal_type.toLowerCase() === 'lunch');
          const dinnerItem = dayMenuItems.find((item) => item.meal_type.toLowerCase() === 'dinner');

          const lunchKey = `${day.dateStr}_lunch`;
          const dinnerKey = `${day.dateStr}_dinner`;

          // Check if admin overridden
          const lunchExisting = existingPreferences.find((p) => p.meal_date === day.dateStr && p.meal_type === 'lunch');
          const dinnerExisting = existingPreferences.find((p) => p.meal_date === day.dateStr && p.meal_type === 'dinner');

          return (
            <div key={day.dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{
                color: 'var(--color-navy)',
                fontSize: '1.25rem',
                borderBottom: '2px solid var(--border-strong)',
                paddingBottom: '0.4rem',
              }}>
                {day.dayName} <span style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.9rem', fontWeight: 500 }}>({day.formattedDate})</span>
              </h3>

              <div className="grid-2">
                <PreferenceCard
                  dayName={day.dayName}
                  formattedDate={day.formattedDate}
                  mealType="lunch"
                  vegMenu={lunchItem?.veg_menu}
                  nonVegMenu={lunchItem?.non_veg_menu}
                  selectedChoice={selections[lunchKey]}
                  onSelect={(choice) => handleSelectChoice(day.dateStr, 'lunch', choice)}
                  isAdminOverridden={!!lunchExisting?.updated_by}
                  disabled={isFinalized || !windowOpen}
                />

                <PreferenceCard
                  dayName={day.dayName}
                  formattedDate={day.formattedDate}
                  mealType="dinner"
                  vegMenu={dinnerItem?.veg_menu}
                  nonVegMenu={dinnerItem?.non_veg_menu}
                  selectedChoice={selections[dinnerKey]}
                  onSelect={(choice) => handleSelectChoice(day.dateStr, 'dinner', choice)}
                  isAdminOverridden={!!dinnerExisting?.updated_by}
                  disabled={isFinalized || !windowOpen}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Action Bar */}
      {!isFinalized && windowOpen && (
        <div className="sticky-submit-bar">
          <div>
            <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '1.1rem' }}>
              Save or Finalize Week Preferences?
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-charcoal-muted)' }}>
              {calculateSelectedCount() === 14 ? '✅ All 14 meal slots selected' : `⚠️ ${14 - calculateSelectedCount()} meal slots remaining`}
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

