import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import authApi from '../../api/authApi';
import useAuth from '../../hooks/useAuth';
import StudentTable from '../../components/admin/StudentTable';
import { ShieldCheck, Users, Building, TrendingDown, ArrowRight, Leaf, Drumstick, Utensils, Calendar, UserCheck, Check, X, ShieldAlert, Shield, Trash2, Eye, EyeOff, UserPlus, Lock, User, AlertCircle, CheckCircle2, Power, ToggleLeft, ToggleRight, Clock } from 'lucide-react';
import { validatePassword } from '../../utils/validation';

import { toLocalDateStr } from '../../utils/dateHelpers';

// Helper to generate dates from Today to Next Sunday
const getDatesFromTodayToNextSunday = () => {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
  let daysUntilNextSunday;
  if (currentDay === 0) {
    daysUntilNextSunday = 7;
  } else {
    const daysUntilNextMonday = 8 - currentDay;
    daysUntilNextSunday = daysUntilNextMonday + 6;
  }

  for (let i = 0; i <= daysUntilNextSunday; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = toLocalDateStr(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    dates.push({
      dateStr,
      dayName,
      formattedDate: formatted,
      isToday: i === 0,
      isNextSunday: i === daysUntilNextSunday,
    });
  }

  return dates;
};

export const Dashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [totalRegisteredCount, setTotalRegisteredCount] = useState(0);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [rangeSummary, setRangeSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [allAdmins, setAllAdmins] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminListLoading, setAdminListLoading] = useState(false);

  // Modal Sub-states
  const [modalTab, setModalTab] = useState('list'); // 'list' or 'add'
  
  // Register Admin Form State
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Delete Admin State
  const [deletingAdmin, setDeletingAdmin] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Manage Window State
  const [showWindowModal, setShowWindowModal] = useState(false);
  const [windowScope, setWindowScope] = useState('single'); // 'single', 'this_week', 'upcoming_week', 'both_weeks'
  const [windowDate, setWindowDate] = useState('');
  const [windowData, setWindowData] = useState(null);
  const [windowLoading, setWindowLoading] = useState(false);
  const [windowActionLoading, setWindowActionLoading] = useState(false);
  const [windowError, setWindowError] = useState('');
  const [windowSuccessMsg, setWindowSuccessMsg] = useState('');

  // Memoize date calculations to prevent main thread blocking during renders
  const rangeDates = useMemo(() => getDatesFromTodayToNextSunday(), []);
  const [selectedDateStr, setSelectedDateStr] = useState(rangeDates[0]?.dateStr || '');

  const start_date = rangeDates[0]?.dateStr;
  const end_date = rangeDates[rangeDates.length - 1]?.dateStr;

  const fetchWindowStatus = async (targetDateStr) => {
    setWindowLoading(true);
    setWindowError('');
    setWindowSuccessMsg('');
    try {
      const data = await adminApi.getWindowOverride(targetDateStr);
      setWindowData(data);
    } catch (err) {
      console.error('Failed to fetch window status:', err);
      setWindowError('Failed to load window status for selected date.');
    } finally {
      setWindowLoading(false);
    }
  };

  const handleOpenWindowModal = () => {
    const defaultDate = selectedDateStr || rangeDates[0]?.dateStr || toLocalDateStr(new Date());
    setWindowDate(defaultDate);
    setWindowScope('single');
    setWindowError('');
    setWindowSuccessMsg('');
    setShowWindowModal(true);
    fetchWindowStatus(defaultDate);
  };

  const handleWindowDateChange = (newDate) => {
    setWindowDate(newDate);
    fetchWindowStatus(newDate);
  };

  const handleToggleWindowStatus = async () => {
    if (!windowDate) return;
    setWindowActionLoading(true);
    setWindowError('');
    setWindowSuccessMsg('');
    try {
      const updated = await adminApi.toggleWindowOverride(windowDate);
      setWindowData(updated);
      setWindowSuccessMsg(
        `Successfully ${updated.is_open ? 'OPENED' : 'CLOSED'} preference window for ${updated.target_date}! (${updated.toggles_left} toggles remaining today).`
      );
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to toggle window:', err);
      setWindowError(err.response?.data?.detail || 'Failed to toggle window status.');
    } finally {
      setWindowActionLoading(false);
    }
  };

  const handleBatchWindowAction = async (action) => {
    setWindowActionLoading(true);
    setWindowError('');
    setWindowSuccessMsg('');
    try {
      const res = await adminApi.batchWindowOverride({
        scope: windowScope,
        action,
      });
      setWindowSuccessMsg(res.message);
      if (windowDate) {
        fetchWindowStatus(windowDate);
      }
      fetchDashboardData();
    } catch (err) {
      console.error('Failed batch window action:', err);
      setWindowError(err.response?.data?.detail || 'Failed to update window status.');
    } finally {
      setWindowActionLoading(false);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentData, countData, summaryData, pendingAdminData] = await Promise.all([
        adminApi.getStudents({ limit: 10 }),
        adminApi.getStudentsCount().catch(() => null),
        adminApi.getDailySummary({ start_date, end_date }).catch(() => null),
        adminApi.getPendingAdmins().catch(() => []),
      ]);
      setStudents(studentData || []);
      if (countData && typeof countData.total === 'number') {
        setTotalRegisteredCount(countData.total);
      } else {
        setTotalRegisteredCount((studentData || []).length);
      }
      if (summaryData?.daily_summaries) {
        setRangeSummary(summaryData.daily_summaries);
      }
      setPendingAdmins(pendingAdminData || []);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError('Could not load student records for administration.');
    } finally {
      setLoading(false);
    }
  }, [start_date, end_date]);

  useEffect(() => {
    if (start_date && end_date) {
      fetchDashboardData();
    }
  }, [start_date, end_date, fetchDashboardData]);

  const handleApproveAdmin = async (adminId, username) => {
    setActionLoadingId(username);
    setActionSuccessMsg('');
    try {
      await adminApi.approveAdmin(username);
      setActionSuccessMsg(`Successfully granted admin registration request for @${username}!`);
      const updatedPending = await adminApi.getPendingAdmins();
      setPendingAdmins(updatedPending);
    } catch (err) {
      console.error('Failed to approve admin:', err);
      setError('Failed to approve admin request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectAdmin = async (adminId, username) => {
    setActionLoadingId(username);
    setActionSuccessMsg('');
    try {
      await adminApi.rejectAdmin(username);
      setActionSuccessMsg(`Rejected admin registration request for @${username}.`);
      const updatedPending = await adminApi.getPendingAdmins();
      setPendingAdmins(updatedPending);
    } catch (err) {
      console.error('Failed to reject admin:', err);
      setError('Failed to reject admin request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchAllAdmins = async () => {
    setAdminListLoading(true);
    try {
      const data = await adminApi.getAllAdmins();
      setAllAdmins(data);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setAdminListLoading(false);
    }
  };

  const handleOpenAdminModal = () => {
    setShowAdminModal(true);
    setModalTab('list');
    setRegUsername('');
    setRegPassword('');
    setShowRegPassword(false);
    setRegError('');
    setRegSuccessMsg('');
    setDeletingAdmin(null);
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError('');
    fetchAllAdmins();
  };

  const ADMIN_USERNAME_REGEX = /^(?=.{5,20}$)(?!.*__)(?!.*_$)[A-Z][a-zA-Z0-9_]+$/;

  const handleRegisterAdmin = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccessMsg('');

    const username = (regUsername || '').trim();
    const password = (regPassword || '').trim();

    if (!ADMIN_USERNAME_REGEX.test(username)) {
      setRegError(
        'Admin username must be 5-20 characters long, start with an uppercase letter (A-Z), cannot contain consecutive underscores ("__") or end with an underscore ("_"), and contain only letters, numbers, and underscores.'
      );
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setRegError(passwordCheck.errorMsg);
      return;
    }

    setRegSubmitting(true);
    try {
      await authApi.registerAdmin({ username, password });
      setRegSuccessMsg(`Successfully submitted registration request for @${username}! It is now pending approval below.`);
      setRegUsername('');
      setRegPassword('');
      // Refresh list of pending admins immediately
      const updatedPending = await adminApi.getPendingAdmins();
      setPendingAdmins(updatedPending);
      fetchAllAdmins();
    } catch (err) {
      console.error('Failed to register admin:', err);
      setRegError(err.response?.data?.detail || 'Failed to register admin. Username may already exist.');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleDeleteAdminSubmit = async (e) => {
    e.preventDefault();
    setDeleteError('');

    if (!deletingAdmin) return;

    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm.');
      return;
    }

    // Client-side validation: the admin's password must meet the standard format
    // (this mirrors what was set when the account was created)
    const passwordCheck = validatePassword(deletePassword);
    if (!passwordCheck.isValid) {
      setDeleteError(`Invalid password format — ${passwordCheck.errorMsg}`);
      return;
    }

    setDeleteSubmitting(true);
    try {
      await adminApi.deleteAdmin(deletingAdmin.username, deletePassword);
      setDeletingAdmin(null);
      setDeletePassword('');
      setShowDeletePassword(false);
      fetchAllAdmins();
    } catch (err) {
      console.error('Failed to delete admin:', err);
      setDeleteError(err.response?.data?.detail || 'Incorrect password. Deletion failed.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const totalStudents = totalRegisteredCount || students.length;
  const uniqueHostels = useMemo(() => Array.from(new Set(students.map((s) => s.hostel))).length, [students]);

  const activeDailySummary = useMemo(() => {
    return rangeSummary[selectedDateStr] || {
      date: selectedDateStr,
      lunch: { veg: 0, non_veg: 0, total: 0 },
      dinner: { veg: 0, non_veg: 0, total: 0 },
      total_veg: 0,
      total_non_veg: 0,
      total_responses: 0,
    };
  }, [rangeSummary, selectedDateStr]);

  const selectedDateObj = useMemo(() => {
    return rangeDates.find((d) => d.dateStr === selectedDateStr) || rangeDates[0];
  }, [rangeDates, selectedDateStr]);

  return (
    <div className="container page-section">
      {/* Header Banner - Renders IMMEDIATELY on first paint for fast LCP & zero CLS */}
      <div className="page-header-banner">
        <div>
          <span className="badge badge-mint" style={{ marginBottom: '0.5rem' }}>
            <ShieldCheck size={14} /> Administration Control
          </span>
          <h2 style={{ color: 'var(--color-cream)', marginBottom: '0.25rem' }}>
            Hostel Food & Wastage Dashboard
          </h2>
          <p style={{ color: 'var(--color-mint)', fontSize: '0.95rem', margin: 0 }}>
            Manage student registrations, review weekly preferences, and override meal choices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button onClick={handleOpenWindowModal} className="btn" style={{ backgroundColor: 'var(--color-green)', color: 'var(--color-white)', border: 'none' }}>
            <Power size={18} /> Manage Window
          </button>
          <button onClick={handleOpenAdminModal} className="btn" style={{ backgroundColor: 'var(--color-navy)', color: 'var(--color-cream)', border: 'none' }}>
            <Shield size={18} /> Manage Admins
          </button>
          <Link to="/admin/records" className="btn btn-coral">
            <Users size={18} /> Student Directory
          </Link>
        </div>
      </div>

      {/* Manage Selection Window Modal */}
      {showWindowModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(18, 48, 74, 0.55)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => {
            if (!windowActionLoading) {
              setShowWindowModal(false);
            }
          }}
        >
          <div
            style={{
              position: 'relative', zIndex: 1, width: '100%', maxWidth: 480,
              backgroundColor: 'var(--color-white)', borderRadius: '20px',
              boxShadow: 'var(--shadow-lg)', padding: '2rem 1.75rem',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Power size={22} color="var(--color-green)" />
                <h3 style={{ margin: 0, color: 'var(--color-navy)', fontSize: '1.2rem' }}>
                  Manage Selection Window
                </h3>
              </div>
              {!windowActionLoading && (
                <button onClick={() => setShowWindowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-charcoal-muted)', padding: '4px' }}>
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Scope Selection Tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.4rem',
              marginBottom: '1.25rem',
              backgroundColor: 'var(--color-cream)',
              padding: '0.35rem',
              borderRadius: 'var(--radius-md)',
            }}>
              {[
                { id: 'single', label: 'Day' },
                { id: 'this_week', label: 'This Wk' },
                { id: 'upcoming_week', label: 'Next Wk' },
                { id: 'both_weeks', label: 'Both Wks' },
              ].map((tab) => {
                const isActive = windowScope === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setWindowScope(tab.id);
                      setWindowError('');
                      setWindowSuccessMsg('');
                    }}
                    style={{
                      padding: '0.45rem 0.3rem',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--color-navy)' : 'transparent',
                      color: isActive ? 'var(--color-cream)' : 'var(--color-charcoal-muted)',
                      transition: 'all var(--transition-fast)',
                      textAlign: 'center',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Error / Success Notifications */}
            {windowError && (
              <div className="alert alert-danger" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                <AlertCircle size={16} />
                <span>{windowError}</span>
              </div>
            )}

            {windowSuccessMsg && (
              <div className="alert alert-success" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                <CheckCircle2 size={16} />
                <span>{windowSuccessMsg}</span>
              </div>
            )}

            {/* VIEW 1: SPECIFIC SINGLE DAY */}
            {windowScope === 'single' && (
              <>
                {/* Date Select Dropdown */}
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="window-date-select" className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                    Select Target Date
                  </label>
                  <select
                    id="window-date-select"
                    className="form-input"
                    value={windowDate}
                    onChange={(e) => handleWindowDateChange(e.target.value)}
                    disabled={windowLoading || windowActionLoading}
                  >
                    {rangeDates.map((d) => (
                      <option key={d.dateStr} value={d.dateStr}>
                        {d.isToday ? 'Today (' + d.formattedDate + ')' : d.dayName + ', ' + d.formattedDate} ({d.dateStr})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Window Status Card */}
                {windowLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-muted)' }}>
                    Loading window status...
                  </div>
                ) : windowData ? (
                  <div style={{
                    backgroundColor: 'var(--color-cream)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                        Current Window Status:
                      </span>
                      <span className={`badge ${windowData.is_open ? 'badge-mint' : 'badge-coral'}`} style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                        {windowData.is_open ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)' }}>
                      <span>Daily Toggle Limit (3 max):</span>
                      <span style={{ fontWeight: 700, color: windowData.toggles_left > 0 ? 'var(--color-navy)' : 'var(--color-danger)' }}>
                        {windowData.toggle_count} / 3 used ({windowData.toggles_left} remaining)
                      </span>
                    </div>

                    {windowData.toggles_left === 0 && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <ShieldAlert size={14} /> Maximum limit of 3 toggles reached for this day across all admins.
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Action Toggle Button */}
                {windowData && (
                  <button
                    type="button"
                    onClick={handleToggleWindowStatus}
                    disabled={windowLoading || windowActionLoading || windowData.toggles_left === 0}
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      backgroundColor: windowData.is_open ? 'var(--color-danger)' : 'var(--color-green)',
                      color: 'var(--color-white)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      opacity: windowData.toggles_left === 0 ? 0.6 : 1,
                      cursor: windowData.toggles_left === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Power size={18} />
                    {windowActionLoading
                      ? 'Updating Window Status...'
                      : windowData.is_open
                      ? 'CLOSE Selection Window for This Day'
                      : 'OPEN Selection Window for This Day'}
                  </button>
                )}
              </>
            )}

            {/* VIEW 2: THIS WEEK (CURRENT 7 DAYS) */}
            {windowScope === 'this_week' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  backgroundColor: 'var(--color-cream)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Calendar size={18} color="var(--color-navy)" />
                    <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                      Active Current Week (7 Days)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', margin: 0, lineHeight: 1.5 }}>
                    Applies to all 7 days of the active week (Monday through Sunday). Students will immediately be permitted or restricted from setting preferences for this week.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    disabled={windowActionLoading}
                    onClick={() => handleBatchWindowAction('open')}
                    className="btn btn-primary"
                    style={{ padding: '0.8rem 0.5rem', fontWeight: 700, fontSize: '0.88rem' }}
                  >
                    {windowActionLoading ? 'Processing...' : '🟢 Open This Week'}
                  </button>
                  <button
                    type="button"
                    disabled={windowActionLoading}
                    onClick={() => handleBatchWindowAction('close')}
                    className="btn"
                    style={{ padding: '0.8rem 0.5rem', fontWeight: 700, fontSize: '0.88rem', backgroundColor: 'var(--color-danger)', color: '#fff' }}
                  >
                    {windowActionLoading ? 'Processing...' : '🔴 Close This Week'}
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 3: UPCOMING WEEK (NEXT 7 DAYS) */}
            {windowScope === 'upcoming_week' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  backgroundColor: 'var(--color-cream)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Calendar size={18} color="var(--color-navy)" />
                    <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                      Upcoming Week (7 Days)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', margin: 0, lineHeight: 1.5 }}>
                    Applies to all 7 days of next week (Monday through Sunday). Allows students to set their food preferences in advance even outside weekend hours.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    disabled={windowActionLoading}
                    onClick={() => handleBatchWindowAction('open')}
                    className="btn btn-primary"
                    style={{ padding: '0.8rem 0.5rem', fontWeight: 700, fontSize: '0.88rem' }}
                  >
                    {windowActionLoading ? 'Processing...' : '🟢 Open Next Week'}
                  </button>
                  <button
                    type="button"
                    disabled={windowActionLoading}
                    onClick={() => handleBatchWindowAction('close')}
                    className="btn"
                    style={{ padding: '0.8rem 0.5rem', fontWeight: 700, fontSize: '0.88rem', backgroundColor: 'var(--color-danger)', color: '#fff' }}
                  >
                    {windowActionLoading ? 'Processing...' : '🔴 Close Next Week'}
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 4: BOTH WEEKS (14 DAYS) */}
            {windowScope === 'both_weeks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  backgroundColor: 'var(--color-cream)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Calendar size={18} color="var(--color-coral)" />
                    <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                      Both Weeks (14 Days Combined)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', margin: 0, lineHeight: 1.5 }}>
                    Applies concurrently across all 14 days (Current Week + Upcoming Week). Completely opens or locks student meal selections across the entire 2-week period.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    disabled={windowActionLoading}
                    onClick={() => handleBatchWindowAction('open')}
                    className="btn btn-primary"
                    style={{ padding: '0.8rem 0.5rem', fontWeight: 700, fontSize: '0.88rem' }}
                  >
                    {windowActionLoading ? 'Processing...' : '🟢 Open Both Weeks'}
                  </button>
                  <button
                    type="button"
                    disabled={windowActionLoading}
                    onClick={() => handleBatchWindowAction('close')}
                    className="btn"
                    style={{ padding: '0.8rem 0.5rem', fontWeight: 700, fontSize: '0.88rem', backgroundColor: 'var(--color-danger)', color: '#fff' }}
                  >
                    {windowActionLoading ? 'Processing...' : '🔴 Close Both Weeks'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage Admins Modal */}
      {showAdminModal && (

        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(18, 48, 74, 0.55)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => {
            if (!regSubmitting && !deleteSubmitting) {
              setShowAdminModal(false);
            }
          }}
        >
          <div
            style={{
              position: 'relative', zIndex: 1, width: '100%', maxWidth: 480,
              backgroundColor: 'var(--color-white)', borderRadius: '20px',
              boxShadow: 'var(--shadow-lg)', padding: '2rem 1.75rem',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Shield size={22} color="var(--color-navy)" />
                <h3 style={{ margin: 0, color: 'var(--color-navy)', fontSize: '1.2rem' }}>
                  {deletingAdmin ? 'Confirm Deletion' : 'Manage Administrators'}
                </h3>
              </div>
              {!regSubmitting && !deleteSubmitting && (
                <button onClick={() => setShowAdminModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-charcoal-muted)', padding: '4px' }}>
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Modal Tab Switcher (hidden when confirming deletion) */}
            {!deletingAdmin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setModalTab('list')}
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: modalTab === 'list' ? 'var(--color-navy)' : 'var(--color-cream)',
                    color: modalTab === 'list' ? 'var(--color-cream)' : 'var(--color-charcoal-muted)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Shield size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Admin List
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('add');
                    setRegError('');
                    setRegSuccessMsg('');
                  }}
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    backgroundColor: modalTab === 'add' ? 'var(--color-navy)' : 'var(--color-cream)',
                    color: modalTab === 'add' ? 'var(--color-cream)' : 'var(--color-charcoal-muted)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <UserPlus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Add Admin
                </button>
              </div>
            )}

            {/* Deletion Password Request View */}
            {deletingAdmin ? (
              <form onSubmit={handleDeleteAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="alert alert-danger" style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>⚠️ <strong>Warning:</strong> You are about to permanently delete admin account <strong>@{deletingAdmin.username}</strong>.</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>This operation is irreversible and will remove all their admin access credentials.</div>
                </div>

                {deleteError && (
                  <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>
                    <AlertCircle size={16} />
                    <span>{deleteError}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="admin-delete-password-verify" className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                    Confirm Your Password <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                    <input
                      id="admin-delete-password-verify"
                      name="deletePasswordVerify"
                      type={showDeletePassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter YOUR admin password to confirm"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword((v) => !v)}
                      aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-charcoal-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setDeletingAdmin(null);
                      setDeletePassword('');
                      setShowDeletePassword(false);
                      setDeleteError('');
                    }}
                    disabled={deleteSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm"
                    style={{ backgroundColor: 'var(--color-danger)', color: 'var(--color-white)', boxShadow: '0 4px 14px rgba(229,57,53,0.3)' }}
                    disabled={deleteSubmitting}
                  >
                    {deleteSubmitting ? 'Verifying & Deleting...' : 'Confirm Delete Admin'}
                  </button>
                </div>
              </form>
            ) : modalTab === 'list' ? (
              /* TAB 1: LIST ACTIVE ADMINS */
              <>
                {adminListLoading ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-muted)' }}>Loading admins...</div>
                ) : allAdmins.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-charcoal-muted)' }}>No approved admins found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {allAdmins.map((admin, index) => {
                      const isSelf = admin.username === user?.username;
                      return (
                        <div
                          key={admin.username}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                            backgroundColor: index % 2 === 0 ? 'var(--color-cream)' : 'var(--color-white)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '36px', height: '36px', borderRadius: '50%',
                              backgroundColor: isSelf ? 'var(--color-green)' : 'var(--color-navy)',
                              color: 'var(--color-cream)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                            }}>
                              {admin.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                @{admin.username}
                                {isSelf && (
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-green)', backgroundColor: 'rgba(46, 155, 98, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {!isSelf && (
                              <button
                                onClick={() => setDeletingAdmin(admin)}
                                className="btn"
                                style={{
                                  padding: '0.35rem 0.5rem',
                                  minHeight: 'auto',
                                  backgroundColor: 'transparent',
                                  color: 'var(--color-danger)',
                                  border: '1px solid var(--color-danger)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title={`Delete @${admin.username}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            <span className="badge badge-navy" style={{ fontSize: '0.7rem' }}>#{index + 1}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', backgroundColor: 'var(--color-cream)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600 }}>
                    Total Active Admins: <strong style={{ color: 'var(--color-navy)' }}>{allAdmins.length}</strong>
                  </span>
                </div>
              </>
            ) : (
              /* TAB 2: ADD NEW ADMIN FORM */
              <form onSubmit={handleRegisterAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="alert alert-info" style={{ fontSize: '0.85rem', margin: 0 }}>
                  ℹ️ Newly registered admins are added as <strong>pending approval</strong>. They will need to be approved from the requests dashboard to log in.
                </div>

                {regError && (
                  <div className="alert alert-danger" style={{ fontSize: '0.85rem', margin: 0 }}>
                    <AlertCircle size={16} />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccessMsg && (
                  <div className="alert alert-success" style={{ fontSize: '0.85rem', margin: 0 }}>
                    <CheckCircle2 size={16} />
                    <span>{regSuccessMsg}</span>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="reg-admin-username-dashboard" className="form-label">New Admin Username</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                    <input
                      id="reg-admin-username-dashboard"
                      name="regUsernameDashboard"
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="e.g. Admin_john1"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      required
                      disabled={regSubmitting}
                    />
                  </div>
                  <small style={{ fontSize: '0.72rem', color: 'var(--color-charcoal-muted)', marginTop: '0.2rem', display: 'block', lineHeight: 1.3 }}>
                    5-20 chars, must start with uppercase letter (A-Z), no consecutive ('__') or trailing ('_') underscores.
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="reg-admin-password-dashboard" className="form-label">Create Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)' }} />
                    <input
                      id="reg-admin-password-dashboard"
                      name="regPasswordDashboard"
                      type={showRegPassword ? 'text' : 'password'}
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                      placeholder="Create password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required
                      disabled={regSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-charcoal-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <small style={{ fontSize: '0.72rem', color: 'var(--color-charcoal-muted)', marginTop: '0.2rem', display: 'block', lineHeight: 1.3 }}>
                    8-16 chars, must contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special char (@$!%*?&).
                  </small>
                </div>

                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="btn btn-coral"
                  style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem' }}
                >
                  {regSubmitting ? 'Registering Account...' : 'Register New Admin'}
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {actionSuccessMsg && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <UserCheck size={18} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card stat-card">
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'var(--color-mint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-green)', flexShrink: 0 }}>
            <Users size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Registered Students</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)' }}>
              {loading ? <span className="skeleton" style={{ width: '40px', height: '32px' }} /> : totalStudents}
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#FFF0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-coral)', flexShrink: 0 }}>
            <Building size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Hostels</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-navy)' }}>
              {loading ? <span className="skeleton" style={{ width: '30px', height: '32px' }} /> : (uniqueHostels || 1)}
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: 'rgba(18, 48, 74, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-navy)', flexShrink: 0 }}>
            <TrendingDown size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Wastage Reduction</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-green)' }}>~40%</div>
          </div>
        </div>
      </div>

      {/* PENDING ADMIN APPROVAL REQUESTS SECTION */}
      {pendingAdmins.length > 0 && (
        <div className="card" style={{
          backgroundColor: '#FFF0E8',
          border: '2px solid var(--color-coral)',
          borderRadius: '20px',
          padding: '1.5rem',
          marginBottom: '2.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <ShieldAlert size={22} color="var(--color-coral-hover)" />
            <h3 style={{ color: 'var(--color-navy)', margin: 0, fontSize: '1.25rem' }}>
              Pending Admin Registration Requests ({pendingAdmins.length})
            </h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-charcoal-muted)', marginBottom: '1.25rem' }}>
            The following admin accounts have registered and are waiting for your approval to gain access to this dashboard.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {pendingAdmins.map((item) => (
              <div
                key={item.admin_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-white)',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(242, 140, 91, 0.3)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '1rem' }}>
                    @{item.username}
                  </span>
                  <span className="badge badge-coral" style={{ marginLeft: '0.6rem', fontSize: '0.7rem' }}>
                    Pending Approval
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    disabled={actionLoadingId === item.admin_id}
                    onClick={() => handleApproveAdmin(item.admin_id, item.username)}
                    className="btn btn-sm btn-primary"
                  >
                    <Check size={14} /> Approve Request
                  </button>

                  <button
                    type="button"
                    disabled={actionLoadingId === item.admin_id}
                    onClick={() => handleRejectAdmin(item.admin_id, item.username)}
                    className="btn btn-sm btn-outline"
                    style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Directory Preview Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ color: 'var(--color-navy)' }}>Registered Students Directory</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/admin/records" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-green)' }}>
            View Full Directory <ArrowRight size={16} />
          </Link>
          <Link to="/admin/manage-students" className="btn btn-sm btn-coral">
            <Users size={16} /> Manage Students
          </Link>
        </div>
      </div>

      <StudentTable students={students.slice(0, 5)} loading={loading} />

      {/* MULTI-DAY FOOD PREFERENCE SUMMARY SECTION (TODAY TO NEXT SUNDAY) */}
      <div style={{ marginTop: '3.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '2px solid var(--border-strong)',
          paddingBottom: '0.75rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Utensils size={22} color="var(--color-coral)" />
              <h3 style={{ color: 'var(--color-navy)', margin: 0 }}>Food Preference Headcount Summary</h3>
            </div>
            <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.9rem', margin: '0.2rem 0 0 0' }}>
              Real-time Veg vs. Non-Veg counts from <strong>Today ({rangeDates[0]?.formattedDate})</strong> to <strong>Next Sunday ({rangeDates[rangeDates.length - 1]?.formattedDate})</strong>
            </p>
          </div>

          <span className="badge badge-navy" style={{ padding: '0.4rem 0.9rem' }}>
            Range: {rangeDates[0]?.formattedDate} – {rangeDates[rangeDates.length - 1]?.formattedDate}
          </span>
        </div>

        {/* Date Tabs / Selectable Pills */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
          scrollbarWidth: 'thin',
        }}>
          {rangeDates.map((item) => {
            const isSelected = item.dateStr === selectedDateStr;
            const daySummary = rangeSummary[item.dateStr];
            const hasData = daySummary && daySummary.total_responses > 0;

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setSelectedDateStr(item.dateStr)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--color-green)' : '1px solid var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--color-navy)' : 'var(--color-white)',
                  color: isSelected ? 'var(--color-cream)' : 'var(--color-navy)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  minWidth: '95px',
                  flexShrink: 0,
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                }}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: isSelected ? 'var(--color-coral)' : 'var(--color-charcoal-muted)' }}>
                  {item.isToday ? 'Today' : item.dayName}
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0.1rem 0' }}>
                  {item.formattedDate}
                </span>
                {hasData && (
                  <span className={`badge ${isSelected ? 'badge-mint' : 'badge-navy'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginTop: '0.2rem' }}>
                    {daySummary.total_responses} meals
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* SELECTED DATE BREAKDOWN CARDS */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="var(--color-green)" />
            Headcount Details for {selectedDateObj?.dayName}, {selectedDateObj?.formattedDate} ({selectedDateStr})
            {selectedDateObj?.isToday && <span className="badge badge-mint">Today</span>}
          </div>

          <div className="grid-3">
            {/* LUNCH SUMMARY */}
            <div className="card" style={{
              backgroundColor: 'var(--color-white)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: '20px',
              padding: '1.5rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.6rem',
              }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-navy)' }}>
                  ☀️ Lunch Preferences
                </span>
                <span className="badge badge-mint">
                  {loading ? <span className="skeleton" style={{ width: '35px', height: '16px' }} /> : `${activeDailySummary.lunch.total} Total`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-mint)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(46, 155, 98, 0.2)',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Leaf size={18} /> Veg
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-green)' }}>
                    {loading ? <span className="skeleton" style={{ width: '24px', height: '24px' }} /> : activeDailySummary.lunch.veg}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFF0E8',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(242, 140, 91, 0.25)',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-coral-hover)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Drumstick size={18} /> Non-Veg
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-coral-hover)' }}>
                    {loading ? <span className="skeleton" style={{ width: '24px', height: '24px' }} /> : activeDailySummary.lunch.non_veg}
                  </span>
                </div>
              </div>
            </div>

            {/* DINNER SUMMARY */}
            <div className="card" style={{
              backgroundColor: 'var(--color-white)',
              border: '1.5px solid var(--border-subtle)',
              borderRadius: '20px',
              padding: '1.5rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '0.6rem',
              }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-navy)' }}>
                  🌙 Dinner Preferences
                </span>
                <span className="badge badge-coral">
                  {loading ? <span className="skeleton" style={{ width: '35px', height: '16px' }} /> : `${activeDailySummary.dinner.total} Total`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-mint)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(46, 155, 98, 0.2)',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Leaf size={18} /> Veg
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-green)' }}>
                    {loading ? <span className="skeleton" style={{ width: '24px', height: '24px' }} /> : activeDailySummary.dinner.veg}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFF0E8',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(242, 140, 91, 0.25)',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-coral-hover)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Drumstick size={18} /> Non-Veg
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-coral-hover)' }}>
                    {loading ? <span className="skeleton" style={{ width: '24px', height: '24px' }} /> : activeDailySummary.dinner.non_veg}
                  </span>
                </div>
              </div>
            </div>

            {/* COMBINED DAILY TOTAL SUMMARY */}
            <div className="card" style={{
              backgroundColor: 'var(--color-navy)',
              color: 'var(--color-cream)',
              borderRadius: '20px',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-md)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                borderBottom: '1px solid rgba(255, 248, 237, 0.15)',
                paddingBottom: '0.6rem',
              }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-cream)' }}>
                  📊 Daily Combined Total
                </span>
                <span className="badge badge-mint">
                  {loading ? <span className="skeleton" style={{ width: '35px', height: '16px' }} /> : `${activeDailySummary.total_responses} Entries`}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(46, 155, 98, 0.2)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(46, 155, 98, 0.3)',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-mint)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Leaf size={18} /> Total Veg Headcount
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-mint)' }}>
                    {loading ? <span className="skeleton" style={{ width: '24px', height: '24px' }} /> : activeDailySummary.total_veg}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(242, 140, 91, 0.2)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(242, 140, 91, 0.3)',
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-coral-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Drumstick size={18} /> Total Non-Veg Headcount
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-coral)' }}>
                    {loading ? <span className="skeleton" style={{ width: '24px', height: '24px' }} /> : activeDailySummary.total_non_veg}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FULL RANGE HEADCOUNT OVERVIEW TABLE (TODAY TO NEXT SUNDAY) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--color-white)' }}>
          <div style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-cream)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '1.1rem' }}>
              Full Mess Headcount Forecast (Today to Next Sunday)
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal-muted)' }}>
              Total days in forecast: {rangeDates.length}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-navy)', color: 'var(--color-cream)', fontFamily: 'var(--font-heading)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.85rem 1.1rem' }}>Date</th>
                  <th style={{ padding: '0.85rem 1.1rem' }}>Day</th>
                  <th style={{ padding: '0.85rem 1.1rem' }}>Lunch Veg</th>
                  <th style={{ padding: '0.85rem 1.1rem' }}>Lunch Non-Veg</th>
                  <th style={{ padding: '0.85rem 1.1rem' }}>Dinner Veg</th>
                  <th style={{ padding: '0.85rem 1.1rem' }}>Dinner Non-Veg</th>
                  <th style={{ padding: '0.85rem 1.1rem', textAlign: 'right' }}>Total Headcount</th>
                </tr>
              </thead>
              <tbody>
                {rangeDates.map((d, index) => {
                  const s = rangeSummary[d.dateStr] || { lunch: { veg: 0, non_veg: 0 }, dinner: { veg: 0, non_veg: 0 }, total_responses: 0 };
                  const isSelected = d.dateStr === selectedDateStr;

                  return (
                    <tr
                      key={d.dateStr}
                      onClick={() => setSelectedDateStr(d.dateStr)}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        backgroundColor: isSelected ? 'var(--color-mint-light)' : (index % 2 === 0 ? 'var(--color-white)' : 'var(--color-cream)'),
                        cursor: 'pointer',
                        transition: 'background-color var(--transition-fast)',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1.1rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                        {d.formattedDate} {d.isToday && <span className="badge badge-mint" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: '0.3rem' }}>Today</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', fontWeight: 600 }}>
                        {d.dayName}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', color: 'var(--color-green)', fontWeight: 700 }}>
                        {loading ? <span className="skeleton" style={{ width: '20px', height: '16px' }} /> : (s.lunch?.veg || 0)}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', color: 'var(--color-coral-hover)', fontWeight: 700 }}>
                        {loading ? <span className="skeleton" style={{ width: '20px', height: '16px' }} /> : (s.lunch?.non_veg || 0)}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', color: 'var(--color-green)', fontWeight: 700 }}>
                        {loading ? <span className="skeleton" style={{ width: '20px', height: '16px' }} /> : (s.dinner?.veg || 0)}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', color: 'var(--color-coral-hover)', fontWeight: 700 }}>
                        {loading ? <span className="skeleton" style={{ width: '20px', height: '16px' }} /> : (s.dinner?.non_veg || 0)}
                      </td>
                      <td style={{ padding: '0.85rem 1.1rem', textAlign: 'right', fontWeight: 800, color: 'var(--color-navy)' }}>
                        {loading ? <span className="skeleton" style={{ width: '40px', height: '16px' }} /> : `${s.total_responses || 0} meals`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
