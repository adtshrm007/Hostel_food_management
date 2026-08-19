import React from 'react';
import { Leaf, Drumstick, CheckCircle2, ShieldAlert } from 'lucide-react';

export const PreferenceCard = ({
  dayName,
  formattedDate,
  mealType, // 'lunch' | 'dinner'
  vegMenu,
  nonVegMenu,
  selectedChoice, // 'veg' | 'non_veg' | null
  onSelect,
  isAdminOverridden = false,
}) => {
  const isLunch = mealType === 'lunch';

  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      backgroundColor: 'var(--color-white)',
      borderRadius: 'var(--radius-lg)',
      border: selectedChoice ? '2px solid var(--color-green)' : '1px solid var(--border-subtle)',
      boxShadow: selectedChoice ? '0 8px 24px rgba(46, 155, 98, 0.15)' : 'var(--shadow-md)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-navy)', textTransform: 'capitalize' }}>
            {dayName} <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--color-charcoal-muted)' }}>({formattedDate})</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isLunch ? '☀️ Lunch Meal' : '🌙 Dinner Meal'}
          </div>
        </div>

        {isAdminOverridden && (
          <span className="badge badge-coral" style={{ fontSize: '0.7rem' }}>
            <ShieldAlert size={12} /> Admin Locked
          </span>
        )}
      </div>

      {/* Choice Options */}
      <div className="preference-choice-grid">
        {/* VEG OPTION */}
        <button
          type="button"
          disabled={isAdminOverridden}
          onClick={() => onSelect('veg')}
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: selectedChoice === 'veg' ? '2.5px solid var(--color-green)' : '1.5px solid var(--border-subtle)',
            backgroundColor: selectedChoice === 'veg' ? 'var(--color-mint)' : 'var(--color-white)',
            textAlign: 'left',
            cursor: isAdminOverridden ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-fast)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--color-green)',
            }}>
              <Leaf size={16} /> Veg
            </span>
            {selectedChoice === 'veg' && (
              <CheckCircle2 size={18} color="var(--color-green)" fill="var(--color-mint)" />
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)', fontWeight: 500, lineHeight: 1.3 }}>
            {vegMenu || 'Standard Veg Meal'}
          </div>
        </button>

        {/* NON-VEG OPTION */}
        <button
          type="button"
          disabled={isAdminOverridden}
          onClick={() => onSelect('non_veg')}
          style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: selectedChoice === 'non_veg' ? '2.5px solid var(--color-coral)' : '1.5px solid var(--border-subtle)',
            backgroundColor: selectedChoice === 'non_veg' ? '#FFF0E8' : 'var(--color-white)',
            textAlign: 'left',
            cursor: isAdminOverridden ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-fast)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--color-coral-hover)',
            }}>
              <Drumstick size={16} /> Non-Veg
            </span>
            {selectedChoice === 'non_veg' && (
              <CheckCircle2 size={18} color="var(--color-coral-hover)" fill="#FFF0E8" />
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-charcoal)', fontWeight: 500, lineHeight: 1.3 }}>
            {nonVegMenu || 'Standard Non-Veg Meal'}
          </div>
        </button>
      </div>
    </div>
  );
};

export default PreferenceCard;
