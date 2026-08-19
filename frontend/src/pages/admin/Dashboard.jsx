import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import StudentTable from '../../components/admin/StudentTable';
import { ShieldCheck, Users, Building, TrendingDown, ArrowRight, Leaf, Drumstick, Utensils, Calendar, UserCheck, Check, X, ShieldAlert } from 'lucide-react';

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
    const dateStr = d.toISOString().split('T')[0];
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
  const [students, setStudents] = useState([]);
  const [pendingAdmins, setPendingAdmins] = useState([]);
  const [rangeSummary, setRangeSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Memoize date calculations to prevent main thread blocking during renders
  const rangeDates = useMemo(() => getDatesFromTodayToNextSunday(), []);
  const [selectedDateStr, setSelectedDateStr] = useState(rangeDates[0]?.dateStr || '');

  const start_date = rangeDates[0]?.dateStr;
  const end_date = rangeDates[rangeDates.length - 1]?.dateStr;

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentData, summaryData, pendingAdminData] = await Promise.all([
        adminApi.getStudents(),
        adminApi.getDailySummary({ start_date, end_date }).catch(() => null),
        adminApi.getPendingAdmins().catch(() => []),
      ]);
      setStudents(studentData);
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
    setActionLoadingId(adminId);
    setActionSuccessMsg('');
    try {
      await adminApi.approveAdmin(adminId);
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
    setActionLoadingId(adminId);
    setActionSuccessMsg('');
    try {
      await adminApi.rejectAdmin(adminId);
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

  const totalStudents = students.length;
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

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/admin/records" className="btn btn-coral">
            <Users size={18} /> Student Directory
          </Link>
        </div>
      </div>

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
        <Link to="/admin/records" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-green)' }}>
          View Full Directory <ArrowRight size={16} />
        </Link>
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
