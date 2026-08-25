import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authApi from '../../api/authApi';
import { extractErrorMessage } from '../../utils/errorHelpers';
import { User, Mail, Lock, Phone, Building, Hash, DoorOpen, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { HOSTEL_OPTIONS } from '../../utils/hostels';
import { validatePassword, validateEmail, validateHostel } from '../../utils/validation';

export const Register = () => {
  const [showPassword, setShowPassword] = useState(false);

  // Student Form State
  const [studentForm, setStudentForm] = useState({
    name: '',
    roll_number: '',         // Mandatory — primary academic identifier
    phone: '',
    hostel: HOSTEL_OPTIONS[0],
    email: '',
    password: '',
    registration_number: '', // Optional
    room_number: '',          // Optional
  });

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleStudentChange = (e) => {
    setStudentForm({
      ...studentForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmitStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Perform strong validations
    const emailCheck = validateEmail(studentForm.email);
    if (!emailCheck.isValid) {
      setError(emailCheck.errorMsg);
      return;
    }

    const passwordCheck = validatePassword(studentForm.password);
    if (!passwordCheck.isValid) {
      setError(passwordCheck.errorMsg);
      return;
    }

    const hostelCheck = validateHostel(studentForm.hostel);
    if (!hostelCheck.isValid) {
      setError(hostelCheck.errorMsg);
      return;
    }

    setSubmitting(true);

    // Build payload — only include optional fields if non-empty
    const payload = {
      name: studentForm.name,
      roll_number: studentForm.roll_number,
      phone: studentForm.phone,
      hostel: studentForm.hostel,
      email: studentForm.email,
      password: studentForm.password,
    };
    if (studentForm.registration_number.trim()) {
      payload.registration_number = studentForm.registration_number.trim();
    }
    if (studentForm.room_number.trim()) {
      payload.room_number = studentForm.room_number.trim();
    }

    try {
      await authApi.registerStudent(payload);
      setSuccessMsg('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error('Registration error:', err);
      setError(extractErrorMessage(err, 'Registration failed. Please check inputs.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputIconStyle = {
    position: 'absolute', left: '12px', top: '50%',
    transform: 'translateY(-50%)', color: 'var(--color-charcoal-muted)',
  };

  return (
    <div className="container page-section" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
    }}>
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '560px',
        backgroundColor: 'var(--color-white)',
        padding: '2rem 1.5rem',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/logo.webp"
            alt="Gita-Bhojanalay Logo"
            width="56"
            height="56"
            style={{
              width: '56px', height: '56px', borderRadius: '16px', objectFit: 'cover',
              border: '2px solid var(--color-green)',
              boxShadow: '0 4px 12px rgba(46, 155, 98, 0.2)', marginBottom: '0.75rem',
            }}
          />
          <br />
          <span className="badge badge-mint" style={{ marginBottom: '0.5rem' }}>Gita-Bhojanalay Account Registration</span>
          <h2 style={{ color: 'var(--color-navy)', fontSize: '1.8rem', marginBottom: '0.4rem' }}>
            Create New Account
          </h2>
          <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.9rem' }}>
            Register as a student to submit weekly food choices
          </p>
        </div>

        {/* Notifications */}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Student Registration Form */}
        <form onSubmit={handleSubmitStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Full Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-student-name" className="form-label">Full Name <span style={{ color: 'var(--color-coral)' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={inputIconStyle} />
              <input
                id="reg-student-name"
                type="text"
                name="name"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="e.g. Rahul Sharma"
                value={studentForm.name}
                onChange={handleStudentChange}
                required
              />
            </div>
          </div>

          {/* Roll Number + Phone */}
          <div className="grid-2 form-grid-2" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-student-roll" className="form-label">
                Roll Number <span style={{ color: 'var(--color-coral)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={18} style={inputIconStyle} />
                <input
                  id="reg-student-roll"
                  type="text"
                  name="roll_number"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. 21CS001"
                  value={studentForm.roll_number}
                  onChange={handleStudentChange}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-student-phone" className="form-label">
                Phone Number <span style={{ color: 'var(--color-coral)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={inputIconStyle} />
                <input
                  id="reg-student-phone"
                  type="tel"
                  name="phone"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. 9876543210"
                  value={studentForm.phone}
                  onChange={handleStudentChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Hostel + Email */}
          <div className="grid-2 form-grid-2" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-student-hostel" className="form-label">
                Hostel <span style={{ color: 'var(--color-coral)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={18} style={inputIconStyle} />
                <select
                  id="reg-student-hostel"
                  name="hostel"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', appearance: 'none' }}
                  value={studentForm.hostel}
                  onChange={handleStudentChange}
                  required
                >
                  {HOSTEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-student-email" className="form-label">
                Email <span style={{ color: 'var(--color-coral)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={inputIconStyle} />
                <input
                  id="reg-student-email"
                  type="email"
                  name="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="e.g. student@hostel.edu"
                  value={studentForm.email}
                  onChange={handleStudentChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reg-student-password" className="form-label">
              Create Password <span style={{ color: 'var(--color-coral)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={inputIconStyle} />
              <input
                id="reg-student-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                placeholder="••••••••"
                value={studentForm.password}
                onChange={handleStudentChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-charcoal-muted)', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Optional Section Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-charcoal-muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>
              Optional — can be added later in Profile
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          </div>

          {/* Registration Number + Room Number (Optional) */}
          <div className="grid-2 form-grid-2" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-student-regnum" className="form-label" style={{ color: 'var(--color-charcoal-muted)' }}>
                Registration Number
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={18} style={{ ...inputIconStyle, color: 'var(--color-mint)' }} />
                <input
                  id="reg-student-regnum"
                  type="text"
                  name="registration_number"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', borderStyle: 'dashed' }}
                  placeholder="e.g. REG2021001"
                  value={studentForm.registration_number}
                  onChange={handleStudentChange}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="reg-student-room" className="form-label" style={{ color: 'var(--color-charcoal-muted)' }}>
                Room Number
              </label>
              <div style={{ position: 'relative' }}>
                <DoorOpen size={18} style={{ ...inputIconStyle, color: 'var(--color-mint)' }} />
                <input
                  id="reg-student-room"
                  type="text"
                  name="room_number"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', borderStyle: 'dashed' }}
                  placeholder="e.g. A-101"
                  value={studentForm.room_number}
                  onChange={handleStudentChange}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
          >
            {submitting ? 'Registering Account...' : 'Complete Student Registration'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-charcoal-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--color-green)', fontWeight: 700 }}>
            Log In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
