import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './components/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/admin/AdminLogin';
import AuthCallback from './pages/AuthCallback';
import DownloadPage from './pages/DownloadPage';
import React from 'react';
import NotFound from './pages/NotFound';

// SaaS Root
import SaasLogin from './pages/saas/SaasLogin';
import SaasLayout from './pages/saas/SaasLayout';
import SaasDashboard from './pages/saas/SaasDashboard';
import SaasAcademies from './pages/saas/SaasAcademies';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import PlayersManagement from './pages/admin/PlayersManagement';
import CoachesManagement from './pages/admin/CoachesManagement';
import SquadsManagement from './pages/admin/SquadsManagement';
import AttendanceManagement from './pages/admin/AttendanceManagement';
import Evaluations from './pages/admin/Evaluations';
import FinancesManagement from './pages/admin/FinancesManagement';
import SubscriptionsManagement from './pages/admin/SubscriptionsManagement';
import EventsManagement from './pages/admin/EventsManagement';
import SettingsManagement from './pages/admin/SettingsManagement';
import AdminsManagement from './pages/admin/AdminsManagement';
import ChatManagement from './pages/admin/ChatManagement';
import MatchesManagement from './pages/admin/MatchesManagement';
import TrainingManagement from './pages/admin/TrainingManagement';
import MedicalManagement from './pages/admin/MedicalManagement';
import KitsManagement from './pages/admin/KitsManagement';
import InventoryManagement from './pages/admin/InventoryManagement';
import ExpensesManagement from './pages/admin/ExpensesManagement';

// Coach
import CoachLayout from './pages/coach/CoachLayout';
import CoachDashboard from './pages/coach/CoachDashboard';
import CoachSquads from './pages/coach/CoachSquads';
import CoachAttendance from './pages/coach/CoachAttendance';
import CoachEvaluations from './pages/coach/CoachEvaluations';
import CoachMatches from './pages/coach/CoachMatches';
import CoachChat from './pages/coach/CoachChat';

// Parent
import ParentLayout from './pages/parent/ParentLayout';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentChildProfile from './pages/parent/ParentChildProfile';
import ParentAttendance from './pages/parent/ParentAttendance';
import ParentEvaluations from './pages/parent/ParentEvaluations';
import ParentPayments from './pages/parent/ParentPayments';
import ParentChat from './pages/parent/ParentChat';

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <LanguageProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/saas/login" element={<SaasLogin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* SaaS Root */}
          <Route path="/saas" element={<SaasLayout />}>
            <Route index element={<Navigate to="/saas/dashboard" replace />} />
            <Route path="dashboard" element={<SaasDashboard />} />
            <Route path="academies" element={<SaasAcademies />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="players" element={<PlayersManagement />} />
            <Route path="coaches" element={<CoachesManagement />} />
            <Route path="squads" element={<SquadsManagement />} />
            <Route path="attendance" element={<AttendanceManagement />} />
            <Route path="evaluations" element={<Evaluations />} />
            <Route path="finances" element={<FinancesManagement />} />
            <Route path="subscriptions" element={<SubscriptionsManagement />} />
            <Route path="events" element={<EventsManagement />} />
            <Route path="matches" element={<MatchesManagement />} />
            <Route path="training" element={<TrainingManagement />} />
            <Route path="medical" element={<MedicalManagement />} />
            <Route path="kits" element={<KitsManagement />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="expenses" element={<ExpensesManagement />} />
            <Route path="admins" element={<AdminsManagement />} />
            <Route path="chat" element={<ChatManagement />} />
            <Route path="settings" element={<SettingsManagement />} />
          </Route>

          {/* Coach */}
          <Route path="/coach" element={<CoachLayout />}>
            <Route index element={<Navigate to="/coach/dashboard" replace />} />
            <Route path="dashboard" element={<CoachDashboard />} />
            <Route path="squads" element={<CoachSquads />} />
            <Route path="attendance" element={<CoachAttendance />} />
            <Route path="evaluations" element={<CoachEvaluations />} />
            <Route path="matches" element={<CoachMatches />} />
            <Route path="chat" element={<CoachChat />} />
          </Route>

          {/* Parent */}
          <Route path="/parent" element={<ParentLayout />}>
            <Route index element={<Navigate to="/parent/dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="child" element={<ParentChildProfile />} />
            <Route path="attendance" element={<ParentAttendance />} />
            <Route path="evaluations" element={<ParentEvaluations />} />
            <Route path="payments" element={<ParentPayments />} />
            <Route path="chat" element={<ParentChat />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </LanguageProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
