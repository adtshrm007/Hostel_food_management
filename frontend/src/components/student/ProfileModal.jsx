/**
 * ProfileModal.jsx
 *
 * Student profile completion and view modal.
 *
 * Behaviour:
 * - Locked fields (Name, Roll Number, Phone, Email, Hostel) are read-only for students.
 * - Students can update: registration_number, room_number (optional).
 * - Photo upload: <= 250 KB, JPEG/PNG/WebP only.
 * - Max 3 photo replacements per student. Counter shown as X/3.
 * - Profile completion requires a photo — other optional fields remain optional.
 * - Clicking the displayed profile picture opens a full-screen Lightbox.
 * - Lightbox can be closed via X button, backdrop click, or Escape key.
 */

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import studentApi from '../../api/studentApi';
import { extractErrorMessage } from '../../utils/errorHelpers';
import {
  X, User, Hash, Phone, Mail, Building, DoorOpen, Camera,
  Lock, CheckCircle2, AlertCircle, Upload, Trash2, ZoomIn,
} from 'lucide-react';

const MAX_PHOTO_BYTES = 250 * 1024; // 250 KB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_UPLOADS = 3;

/* ─────────────────────────────────────────────── */
/* Lightbox                                         */
/* ─────────────────────────────────────────────── */
const Lightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.90)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
          width: '44px', height: '44px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', backdropFilter: 'blur(4px)',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        aria-label="Close lightbox"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          objectFit: 'contain',
          cursor: 'default',
        }}
      />
    </div>
  );
};

/* ─────────────────────────────────────────────── */
/* ProfileModal                                     */
/* ─────────────────────────────────────────────── */
const ProfileModal = ({ onClose }) => {
  const { user, refreshUser } = useContext(AuthContext);

  const [regNumber, setRegNumber] = useState(user?.registration_number || '');
  const [roomNumber, setRoomNumber] = useState(user?.room_number || '');

  const [avatarPreview, setAvatarPreview] = useState(user?.profile_picture_url || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarError, setAvatarError] = useState('');
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  const uploadCount = user?.photo_upload_count ?? 0;
  const uploadsLeft = Math.max(0, MAX_UPLOADS - uploadCount);
  const canUpload = uploadsLeft > 0;

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !lightboxOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, lightboxOpen]);

  // Trap focus inside modal
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const handleFileChange = (e) => {
    setAvatarError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError('Invalid format. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    const sizeKB = Math.round(file.size / 1024);
    if (file.size > MAX_PHOTO_BYTES) {
      setAvatarError(`Image size: ${sizeKB} KB. Maximum allowed size: 250 KB. Please upload an image smaller than 250 KB.`);
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    if (!canUpload) {
      setAvatarError('You have reached the maximum allowed photo updates (3). Please contact an administrator.');
      return;
    }

    setUploading(true);
    setAvatarError('');
    try {
      const formData = new FormData();
      formData.append('file', avatarFile);
      const updated = await studentApi.uploadAvatar(formData);
      setAvatarPreview(updated.profile_picture_url);
      setAvatarFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshUser();
      setSaveSuccess('Profile photo updated successfully!');
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setAvatarError(extractErrorMessage(err, 'Failed to upload photo. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    // Check profile completion: a photo is required
    const hasPhoto = !!(user?.profile_picture_url || avatarPreview);
    if (!hasPhoto) {
      setSaveError('A profile photo is required to complete your profile. Please upload a photo first.');
      return;
    }

    setSaving(true);
    try {
      const updates = {};
      if (regNumber.trim() !== (user?.registration_number || '')) {
        updates.registration_number = regNumber.trim() || null;
      }
      if (roomNumber.trim() !== (user?.room_number || '')) {
        updates.room_number = roomNumber.trim() || null;
      }

      if (Object.keys(updates).length > 0) {
        await studentApi.updateProfile(updates);
        await refreshUser();
      }

      setSaveSuccess('Profile saved successfully!');
      setTimeout(() => { setSaveSuccess(''); onClose(); }, 1500);
    } catch (err) {
      setSaveError(extractErrorMessage(err, 'Failed to save profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const lockedFieldStyle = {
    padding: '0.65rem 0.9rem 0.65rem 2.5rem',
    backgroundColor: '#f5f7fa',
    borderRadius: '10px',
    border: '1px solid var(--border-subtle)',
    color: 'var(--color-charcoal-muted)',
    fontSize: '0.95rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const inputIconStyle = {
    position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
    color: 'var(--color-charcoal-muted)',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          backgroundColor: 'rgba(10, 26, 63, 0.55)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal Panel */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Student Profile"
        style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%', maxWidth: '560px',
            maxHeight: '90vh', overflowY: 'auto',
            backgroundColor: 'var(--color-white)',
            borderRadius: '24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
            pointerEvents: 'auto',
            animation: 'slideUp 0.25s ease',
          }}
        >
          {/* Modal Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.5rem 1.5rem 0 1.5rem',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={22} color="var(--color-green)" /> My Profile
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-charcoal-muted)' }}>
                Complete your profile to get started
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close profile modal"
              style={{
                background: 'var(--color-cream)', border: 'none', borderRadius: '50%',
                width: '36px', height: '36px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-navy)', transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-strong)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--color-cream)'}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '1.5rem' }}>

            {/* ── Photo Section ── */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '1rem', marginBottom: '1.75rem',
              padding: '1.5rem',
              backgroundColor: 'var(--color-cream)',
              borderRadius: '16px',
              border: '1px solid var(--border-subtle)',
            }}>
              {/* Avatar */}
              <div style={{ position: 'relative' }}>
                {avatarPreview ? (
                  <div
                    style={{ position: 'relative', cursor: 'zoom-in' }}
                    onClick={() => setLightboxOpen(true)}
                    title="Click to view full size"
                  >
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      style={{
                        width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover',
                        border: '3px solid var(--color-green)',
                        boxShadow: '0 4px 16px rgba(46,155,98,0.25)',
                        display: 'block',
                        transition: 'filter 0.2s',
                      }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.3)', opacity: 0,
                      transition: 'opacity 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}
                    >
                      <ZoomIn size={24} color="#fff" />
                    </div>
                  </div>
                ) : (
                  <div style={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    backgroundColor: '#e8edf5', border: '3px dashed var(--border-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <User size={40} color="var(--color-charcoal-muted)" />
                  </div>
                )}
              </div>

              {/* Upload Counter */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.8rem', fontWeight: 700,
                  color: canUpload ? 'var(--color-green)' : 'var(--color-coral)',
                  backgroundColor: canUpload ? '#eafbf0' : '#ffebeb',
                  padding: '0.3rem 0.75rem', borderRadius: '20px',
                }}>
                  <Camera size={14} />
                  {canUpload
                    ? `${uploadsLeft} photo change${uploadsLeft !== 1 ? 's' : ''} remaining (${uploadCount}/${MAX_UPLOADS} used)`
                    : 'Photo change limit reached — contact Admin'}
                </div>
              </div>

              {/* File Picker & Upload Controls */}
              {canUpload && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <label
                    htmlFor="avatar-file-input"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.55rem 1rem', borderRadius: '10px',
                      backgroundColor: 'var(--color-white)', border: '1px solid var(--border-strong)',
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      color: 'var(--color-navy)', transition: 'border-color 0.2s',
                    }}
                  >
                    <Camera size={15} /> Choose Photo
                  </label>
                  <input
                    id="avatar-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />

                  {avatarFile && (
                    <button
                      type="button"
                      onClick={handleUploadAvatar}
                      disabled={uploading}
                      className="btn btn-primary"
                      style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                    >
                      <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  )}
                </div>
              )}

              {/* Avatar error */}
              {avatarError && (
                <div className="alert alert-danger" style={{ margin: 0, padding: '0.6rem 0.9rem', width: '100%' }}>
                  <AlertCircle size={16} />
                  <span style={{ fontSize: '0.85rem' }}>{avatarError}</span>
                </div>
              )}

              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-charcoal-muted)', textAlign: 'center' }}>
                Max 250 KB · JPEG, PNG, or WebP · Click photo to enlarge
              </p>
            </div>

            {/* ── Locked Fields ── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--color-charcoal-muted)', fontWeight: 700,
              }}>
                <Lock size={14} color="var(--color-charcoal-muted)" />
                LOCKED FIELDS — Contact Admin to change
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { icon: <User size={16} />, label: 'Name', value: user?.name },
                  { icon: <Hash size={16} />, label: 'Roll No.', value: user?.roll_number },
                  { icon: <Phone size={16} />, label: 'Phone', value: user?.phone },
                  { icon: <Building size={16} />, label: 'Hostel', value: user?.hostel },
                ].map(({ icon, label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>
                      {label}
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.55rem 0.9rem', backgroundColor: '#f5f7fa',
                      borderRadius: '10px', border: '1px solid var(--border-subtle)',
                      color: 'var(--color-charcoal)', fontSize: '0.9rem', fontWeight: 600,
                    }}>
                      <span style={{ color: 'var(--color-charcoal-muted)', display: 'flex' }}>{icon}</span>
                      {value || '—'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Email full width */}
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-charcoal-muted)', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Email
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.55rem 0.9rem', backgroundColor: '#f5f7fa',
                  borderRadius: '10px', border: '1px solid var(--border-subtle)',
                  color: 'var(--color-charcoal)', fontSize: '0.9rem', fontWeight: 600,
                }}>
                  <Mail size={16} color="var(--color-charcoal-muted)" />
                  {user?.email || '—'}
                </div>
              </div>
            </div>

            {/* ── Editable Optional Fields ── */}
            <form onSubmit={handleSaveProfile}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--color-green)', fontWeight: 700,
              }}>
                ✏️ OPTIONAL — You can edit these
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="pm-reg-number" className="form-label" style={{ fontSize: '0.82rem' }}>
                    Registration Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={16} style={inputIconStyle} />
                    <input
                      id="pm-reg-number"
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.2rem', fontSize: '0.9rem' }}
                      placeholder="e.g. REG2021001"
                      value={regNumber}
                      onChange={e => setRegNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="pm-room-number" className="form-label" style={{ fontSize: '0.82rem' }}>
                    Room Number
                  </label>
                  <div style={{ position: 'relative' }}>
                    <DoorOpen size={16} style={inputIconStyle} />
                    <input
                      id="pm-room-number"
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.2rem', fontSize: '0.9rem' }}
                      placeholder="e.g. A-101"
                      value={roomNumber}
                      onChange={e => setRoomNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {saveError && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
                  <AlertCircle size={16} />
                  <span style={{ fontSize: '0.85rem' }}>{saveError}</span>
                </div>
              )}
              {saveSuccess && (
                <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                  <CheckCircle2 size={16} />
                  <span style={{ fontSize: '0.85rem' }}>{saveSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || uploading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                <CheckCircle2 size={17} />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Lightbox for full-size photo */}
      {lightboxOpen && avatarPreview && (
        <Lightbox
          src={avatarPreview}
          alt="Profile photo full size"
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </>
  );
};

export default ProfileModal;
