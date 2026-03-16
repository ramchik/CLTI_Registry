import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientListPage from './pages/PatientListPage';
import PatientDetailPage from './pages/PatientDetailPage';
import NewPatientPage from './pages/NewPatientPage';
import EpisodeWizardPage from './pages/EpisodeWizardPage';
import FollowupPage from './pages/FollowupPage';
import StatisticsPage from './pages/StatisticsPage';
import ExportPage from './pages/ExportPage';
import AuditLogPage from './pages/AuditLogPage';
import { api } from './api';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    api.checkAuth().then(res => {
      if (res?.loggedIn) setLoggedIn(true);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <Layout darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientListPage />} />
        <Route path="/patients/new" element={<NewPatientPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/patients/:patientId/episodes/new" element={<EpisodeWizardPage />} />
        <Route path="/patients/:patientId/episodes/:episodeId" element={<EpisodeWizardPage />} />
        <Route path="/patients/:patientId/episodes/:episodeId/followup" element={<FollowupPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/audit" element={<AuditLogPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
