import React from 'react';
import { Heart, Leaf } from 'lucide-react';

export const Footer = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--color-navy-dark)',
      color: 'var(--color-cream)',
      padding: '2.5rem 0 2rem 0',
      marginTop: 'auto',
      borderTop: '3px solid var(--color-green)',
    }}>
      <div className="container" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderBottom: '1px solid rgba(255, 248, 237, 0.1)',
          paddingBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/logo.webp"
              alt="Gita-Bhojanalay Logo"
              width="40"
              height="40"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                objectFit: 'cover',
                border: '1px solid var(--color-mint)',
                flexShrink: 0,
              }}
            />
            <div>
              <h3 style={{ color: 'var(--color-cream)', marginBottom: '0.25rem', fontFamily: 'var(--font-heading)' }}>
                Gita-Bhojanalay Hostel Food Management
              </h3>
              <p style={{ color: 'var(--color-mint)', fontSize: '0.9rem', marginBottom: 0 }}>
                Empowering students and administration to eliminate food wastage through smart weekly choices.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span className="badge badge-mint" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <Leaf size={16} /> Eco-Conscious Platform
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          color: 'rgba(255, 248, 237, 0.6)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div>
            © {new Date().getFullYear()} GITA Autonomous College BBSR. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Crafted with <Heart size={14} color="var(--color-coral)" fill="var(--color-coral)" />by Aditya Prasad Barik & Aditya Sharma
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
