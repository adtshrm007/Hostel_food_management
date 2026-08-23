import { HOSTEL_OPTIONS } from './hostels';

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates password strength and returns a detailed message if weak.
 * @param {string} password 
 * @returns {{isValid: boolean, errorMsg: string}}
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, errorMsg: 'Password is required.' };
  }

  const errors = [];
  if (password.length < 8 || password.length > 16) {
    errors.push('be 8 to 16 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('contain at least one uppercase letter (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('contain at least one lowercase letter (a-z)');
  }
  if (!/\d/.test(password)) {
    errors.push('contain at least one digit (0-9)');
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('contain at least one special character (@$!%*?&)');
  }

  // Check for characters outside the allowed set
  if (/[^A-Za-z\d@$!%*?&]/.test(password)) {
    errors.push('only contain letters, digits, and special characters from @$!%*?&');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errorMsg: `Password must: ${errors.join(', ')}.`
    };
  }

  return { isValid: true, errorMsg: '' };
};

/**
 * Validates email address format and standard size constraint.
 * @param {string} email 
 * @returns {{isValid: boolean, errorMsg: string}}
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, errorMsg: 'Email address is required.' };
  }

  if (email.length > 254) {
    return { isValid: false, errorMsg: 'Email address is too long (maximum 254 characters allowed).' };
  }

  if (email.length < 5) {
    return { isValid: false, errorMsg: 'Email address is too short (minimum 5 characters required).' };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, errorMsg: 'Please enter a valid, universally accepted email format (e.g. name@domain.com).' };
  }

  return { isValid: true, errorMsg: '' };
};

/**
 * Validates that the selected hostel is strictly from the allowed options list.
 * @param {string} hostel 
 * @returns {{isValid: boolean, errorMsg: string}}
 */
export const validateHostel = (hostel) => {
  if (!hostel) {
    return { isValid: false, errorMsg: 'Hostel selection is required.' };
  }

  if (!HOSTEL_OPTIONS.includes(hostel)) {
    return { isValid: false, errorMsg: 'Invalid hostel selected. Please select a valid option from the dropdown menu.' };
  }

  return { isValid: true, errorMsg: '' };
};
