import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit3, UserCheck } from 'lucide-react';

export const StudentTable = ({ students = [], loading = false, startIndex = 0 }) => {
  const navigate = useNavigate();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading students list...</div>;
  }

  if (students.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: 'var(--color-white)' }}>
        <UserCheck size={48} color="var(--color-charcoal-muted)" style={{ margin: '0 auto 1rem auto' }} />
        <h4 style={{ color: 'var(--color-navy)' }}>No Students Found</h4>
        <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.9rem' }}>
          Try clearing filters or registering new students in the system.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--color-white)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.92rem',
        }}>
          <thead>
            <tr style={{
              backgroundColor: 'var(--color-navy)',
              color: 'var(--color-cream)',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <th style={{ padding: '1rem 1.25rem' }}>SL NO.</th>
              <th style={{ padding: '1rem 1.25rem' }}>Name</th>
              <th style={{ padding: '1rem 1.25rem' }}>Roll / Reg No.</th>
              <th style={{ padding: '1rem 1.25rem' }}>Hostel</th>
              <th style={{ padding: '1rem 1.25rem' }}>Contact</th>
              <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr
                key={student.roll_number || student.registration_number || student.student_id || index}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: index % 2 === 0 ? 'var(--color-white)' : 'var(--color-cream)',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                  #{(startIndex || 0) + index + 1}
                </td>
                <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
                  <div>{student.name}</div>
                  {student.profile_picture_url && (
                    <img
                      src={student.profile_picture_url}
                      alt="avatar"
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1.5px solid var(--color-green)',
                        marginTop: '3px',
                      }}
                    />
                  )}
                </td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <span className="badge badge-navy">{student.roll_number || student.registration_number || '—'}</span>
                  {student.registration_number && student.roll_number && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)', marginTop: '2px' }}>
                      Reg: {student.registration_number}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem 1.25rem', fontWeight: 500 }}>
                  {student.hostel}
                  {student.room_number && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)' }}>
                      Room: {student.room_number}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem 1.25rem', color: 'var(--color-charcoal-muted)', fontSize: '0.85rem' }}>
                  <div>{student.email}</div>
                  <div>{student.phone}</div>
                </td>
                <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => navigate(`/admin/preference/edit?registration_number=${encodeURIComponent(student.roll_number || student.registration_number)}`)}
                      className="btn btn-sm btn-primary"
                      title="Override Preference"
                    >
                      <Edit3 size={14} /> Override
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentTable;
