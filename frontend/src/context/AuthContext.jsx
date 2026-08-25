import React, { createContext, useState, useEffect } from 'react';
import authApi from '../api/authApi';
import studentApi from '../api/studentApi';
import adminApi from '../api/adminApi';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const data = await authApi.getMe();
      setRole(data.role);
      setUser({ ...data.user, role: data.role });
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error('Failed to fetch current user profile:', err);
      }
      setRole(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const loginStudent = async (email, password) => {
    const data = await authApi.loginStudent({ email, password });
    await fetchUserData();
    return data;
  };

  const loginAdmin = async (username, password) => {
    const data = await authApi.loginAdmin({ username, password });
    await fetchUserData();
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setRole(null);
    setUser(null);
  };

  /**
   * Refresh the current user's profile from the server.
   * Use this after profile or avatar updates to keep context in sync.
   */
  const refreshUser = async () => {
    try {
      if (role === 'student') {
        const profileData = await studentApi.getProfile();
        setUser({ ...profileData, role: 'student' });
      } else if (role === 'admin') {
        const adminData = await adminApi.getMe();
        setUser({ ...adminData, role: 'admin' });
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
    }
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
        refreshUser,
        isAuthenticated: !!role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
