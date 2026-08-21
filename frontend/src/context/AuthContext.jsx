import React, { createContext, useState, useEffect } from 'react';
import authApi from '../api/authApi';
import studentApi from '../api/studentApi';
import adminApi from '../api/adminApi';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const [loading, setLoading] = useState(true);

  // Parse payload from JWT token to check expiration and basic role info
  const decodeToken = (jwtToken) => {
    try {
      const base64Url = jwtToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const fetchUserData = async (jwtToken, userRole) => {
    try {
      if (userRole === 'student') {
        const studentProfile = await studentApi.getProfile();
        setUser({ ...studentProfile, role: 'student' });
      } else if (userRole === 'admin') {
        const adminProfile = await adminApi.getMe();
        setUser({ ...adminProfile, role: 'admin' });
      }
    } catch (err) {
      console.error('Failed to fetch current user profile:', err);
      logout();
    }
  };

  const isTokenExpired = (jwtToken) => {
    const payload = decodeToken(jwtToken);
    if (!payload || !payload.exp) return true;
    // exp is in seconds, Date.now() is in ms
    return Date.now() >= payload.exp * 1000;
  };

  // Optimistically resolve loading immediately if we have cached credentials,
  // then validate against the server in the background. If the token is invalid/expired
  // the fetchUserData error path calls logout() which clears state and redirects.
  useEffect(() => {
    if (token && role) {
      // If token is already expired locally, skip the API call and logout silently
      if (isTokenExpired(token)) {
        logout();
        setLoading(false);
        return;
      }
      // Immediately unblock page render — ProtectedRoute will render children now.
      setLoading(false);
      // Validate token in background; logout() handles redirect on failure.
      fetchUserData(token, role);
    } else {
      setLoading(false);
    }
  }, [token, role]);

  const loginStudent = async (email, password) => {
    const data = await authApi.loginStudent({ email, password });
    const jwt = data.access_token;
    localStorage.setItem('token', jwt);
    localStorage.setItem('role', 'student');
    setToken(jwt);
    setRole('student');
    await fetchUserData(jwt, 'student');
    return data;
  };

  const loginAdmin = async (username, password) => {
    const data = await authApi.loginAdmin({ username, password });
    const jwt = data.access_token;
    localStorage.setItem('token', jwt);
    localStorage.setItem('role', 'admin');
    setToken(jwt);
    setRole('admin');
    await fetchUserData(jwt, 'admin');
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setToken(null);
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        loginStudent,
        loginAdmin,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
