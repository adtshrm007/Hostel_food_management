import React, { createContext, useState, useEffect } from 'react';
import authApi from '../api/authApi';
import studentApi from '../api/studentApi';
import adminApi from '../api/adminApi';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userRole) => {
    try {
      setLoading(true);
      if (userRole === 'student') {
        const studentProfile = await studentApi.getProfile();
        setUser({ ...studentProfile, role: 'student' });
      } else if (userRole === 'admin') {
        const adminProfile = await adminApi.getMe();
        setUser({ ...adminProfile, role: 'admin' });
      }
    } catch (err) {
      console.error('Failed to fetch current user profile:', err);
      await logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      fetchUserData(role);
    } else {
      setLoading(false);
    }
  }, [role]);

  const loginStudent = async (email, password) => {
    const data = await authApi.loginStudent({ email, password });
    localStorage.removeItem('token');
    localStorage.setItem('role', 'student');
    setRole('student');
    await fetchUserData('student');
    return data;
  };

  const loginAdmin = async (username, password) => {
    const data = await authApi.loginAdmin({ username, password });
    localStorage.removeItem('token');
    localStorage.setItem('role', 'admin');
    setRole('admin');
    await fetchUserData('admin');
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        loginStudent,
        loginAdmin,
        logout,
        isAuthenticated: !!role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
