import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Link } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import Loader from './components/common/Loader';

// Layout Wrappers
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import { Outlet } from 'react-router-dom';

// Lazy-loaded Pages (Code Splitting to eliminate Unused JavaScript & large initial payloads)
// retryDynamicImport handles stale-chunk 404s after redeployment by reloading once.
const retryDynamicImport = (importFn) => {
  return lazy(() =>
    importFn().catch(() => {
      // Chunk failed to load (likely stale hash after deploy). Reload once.
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        // Return a never-resolving promise so React doesn't try to render during reload
        return new Promise(() => {});
      }
      // Already reloaded once — clear flag and let the error propagate
      sessionStorage.removeItem('chunk_reload');
      return importFn();
    })
  );
};

// Clear the reload flag on successful page load
if (sessionStorage.getItem('chunk_reload')) {
  sessionStorage.removeItem('chunk_reload');
}

const LandingPage = retryDynamicImport(() => import('./pages/LandingPage'));
const Login = retryDynamicImport(() => import('./pages/auth/Login'));
const EnterKey = retryDynamicImport(() => import('./pages/auth/EnterKey'));
const Register = retryDynamicImport(() => import('./pages/auth/Register'));
const ForgotPassword = retryDynamicImport(() => import('./pages/auth/ForgotPassword'));
const MenuView = retryDynamicImport(() => import('./pages/student/MenuView'));
const PreferenceSelect = retryDynamicImport(() => import('./pages/student/PreferenceSelect'));
const Dashboard = retryDynamicImport(() => import('./pages/admin/Dashboard'));
const StudentRecords = retryDynamicImport(() => import('./pages/admin/StudentRecords'));
const EditPreference = retryDynamicImport(() => import('./pages/admin/EditPreference'));
const ManageStudents = retryDynamicImport(() => import('./pages/admin/ManageStudents'));
const TodayPreference = retryDynamicImport(() => import('./pages/student/TodayPreference'));

import { useRouteError } from 'react-router-dom';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

const ErrorFallback = () => {
  const error = useRouteError();
  console.error('Route error caught by ErrorBoundary:', error);

  return (
    <div className="container page-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', textAlign: 'center', borderRadius: '24px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(229, 57, 53, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
          <AlertCircle size={32} />
        </div>
        <h3 style={{ color: 'var(--color-navy)', marginBottom: '0.5rem' }}>Something Went Wrong</h3>
        <p style={{ color: 'var(--color-charcoal-muted)', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          An unexpected error occurred. Please try refreshing the page or returning home.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => window.location.reload()} className="btn btn-outline btn-sm">
            <RefreshCw size={16} /> Refresh Page
          </button>
          <Link to="/" className="btn btn-primary btn-sm">
            <Home size={16} /> Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

const MainLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, minHeight: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
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
    errorElement: <ErrorFallback />,
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
        path: 'enter-key',
        element: <EnterKey />,
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
          {
            path: 'today',
            element: (
              <ProtectedRoute allowedRole="student">
                <TodayPreference />
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
          {
            path: 'manage-students',
            element: (
              <ProtectedRoute allowedRole="admin">
                <ManageStudents />
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
