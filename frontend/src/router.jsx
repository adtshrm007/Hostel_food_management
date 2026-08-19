import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import Loader from './components/common/Loader';

// Layout Wrappers
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import { Outlet } from 'react-router-dom';

// Lazy-loaded Pages (Code Splitting to eliminate Unused JavaScript & large initial payloads)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const MenuView = lazy(() => import('./pages/student/MenuView'));
const PreferenceSelect = lazy(() => import('./pages/student/PreferenceSelect'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const StudentRecords = lazy(() => import('./pages/admin/StudentRecords'));
const EditPreference = lazy(() => import('./pages/admin/EditPreference'));

const MainLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Suspense fallback={<Loader message="Loading page..." fullPage={true} />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: 'student',
        children: [
          {
            path: 'menu',
            element: (
              <ProtectedRoute allowedRole="student">
                <MenuView />
              </ProtectedRoute>
            ),
          },
          {
            path: 'preference',
            element: (
              <ProtectedRoute allowedRole="student">
                <PreferenceSelect />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: 'admin',
        children: [
          {
            path: 'dashboard',
            element: (
              <ProtectedRoute allowedRole="admin">
                <Dashboard />
              </ProtectedRoute>
            ),
          },
          {
            path: 'records',
            element: (
              <ProtectedRoute allowedRole="admin">
                <StudentRecords />
              </ProtectedRoute>
            ),
          },
          {
            path: 'preference/edit',
            element: (
              <ProtectedRoute allowedRole="admin">
                <EditPreference />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;
