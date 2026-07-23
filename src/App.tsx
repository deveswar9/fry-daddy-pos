import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './features/auth/LoginPage';
import { Layout } from './components/Layout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TableDetailsPage } from './features/tables/TableDetailsPage';
import { MenuManagementPage } from './features/admin/MenuManagementPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { isFirebaseConfigured } from '@/firebase/config';
import { AlertTriangle } from 'lucide-react';

const ProtectedRoutes: React.FC = () => {
  const { counter, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs tracking-wider text-slate-400 uppercase">Synchronizing with Live Database...</p>
        </div>
      </div>
    );
  }

  // If Restaurant / Fast Food Counter session not selected, force login
  if (!counter) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
};

const AppContent: React.FC = () => {
  if (!isFirebaseConfigured && import.meta.env.PROD && import.meta.env.MODE !== 'test') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold mb-2">Live Database Connection Required</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            Firebase credentials are not configured or placeholder was detected. Please configure your <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">.env.local</code> file to enable live POS database connections.
          </p>
          <div className="text-xs text-left bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-4 rounded-xl font-mono text-slate-600 dark:text-slate-400">
            VITE_FIREBASE_API_KEY=...<br />
            VITE_FIREBASE_PROJECT_ID=...
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard and Action Routes */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/table/:id" element={<TableDetailsPage />} />
          <Route path="/menu" element={<MenuManagementPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Fallback routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
