import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './components/ThemeContext';
import { BrandingProvider } from './components/BrandingContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import ImpersonationBanner from './components/ImpersonationBanner';
import React, { Suspense, lazy, useEffect } from 'react';

// Pages — Eagerly loaded (public/critical)
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/admin/AdminLogin';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';

// Lazy-loaded pages — only loaded when navigated to
const DownloadPage = lazy(() => import('./pages/DownloadPage'));
const QRLoginPage = lazy(() => import('./pages/QRLoginPage'));
const ParentSignup = lazy(() => import('./pages/parent/ParentSignup'));
const AcademyPublicPage = lazy(() => import('./pages/AcademyPublicPage'));
const AcademyDirectory = lazy(() => import('./pages/AcademyDirectory'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

// SaaS Root
const SaasLogin = lazy(() => import('./pages/saas/SaasLogin'));
const SaasLanding = lazy(() => import('./pages/saas/SaasLanding'));
const SaasLayout = lazy(() => import('./pages/saas/SaasLayout'));
const SaasDashboard = lazy(() => import('./pages/saas/SaasDashboard'));
const SaasAcademies = lazy(() => import('./pages/saas/SaasAcademies'));
const SaasSubscriptions = lazy(() => import('./pages/saas/SaasSubscriptions'));
const SaasDomains = lazy(() => import('./pages/saas/SaasDomains'));
const SaasSettings = lazy(() => import('./pages/saas/SaasSettings'));
const SaasNotifications = lazy(() => import('./pages/saas/SaasNotifications'));
const SaasAnalytics = lazy(() => import('./pages/saas/SaasAnalytics'));
const SaasAcademyDetail = lazy(() => import('./pages/saas/SaasAcademyDetail'));
const SaasCoupons = lazy(() => import('./pages/saas/SaasCoupons'));
const SaasEmails = lazy(() => import('./pages/saas/SaasEmails'));
const SaasAds = lazy(() => import('./pages/saas/SaasAds'));

// Admin
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const PlayersManagement = lazy(() => import('./pages/admin/PlayersManagement'));
const CoachesManagement = lazy(() => import('./pages/admin/CoachesManagement'));
const SquadsManagement = lazy(() => import('./pages/admin/SquadsManagement'));
const AttendanceManagement = lazy(() => import('./pages/admin/AttendanceManagement'));
const Evaluations = lazy(() => import('./pages/admin/Evaluations'));
const FinancesManagement = lazy(() => import('./pages/admin/FinancesManagement'));
const SubscriptionsManagement = lazy(() => import('./pages/admin/SubscriptionsManagement'));
const EventsManagement = lazy(() => import('./pages/admin/EventsManagement'));
const TournamentsManagement = lazy(() => import('./pages/admin/TournamentsManagement'));
const TryoutsManagement = lazy(() => import('./pages/admin/TryoutsManagement'));
const SettingsManagement = lazy(() => import('./pages/admin/SettingsManagement'));
const AdminsManagement = lazy(() => import('./pages/admin/AdminsManagement'));
const MatchManagerInvite = lazy(() => import('./pages/admin/MatchManagerInvite'));
const ChatManagement = lazy(() => import('./pages/admin/ChatManagement'));
const MatchesManagement = lazy(() => import('./pages/admin/MatchesManagement'));
const TrainingManagement = lazy(() => import('./pages/admin/TrainingManagement'));
const MedicalManagement = lazy(() => import('./pages/admin/MedicalManagement'));
const KitsManagement = lazy(() => import('./pages/admin/KitsManagement'));
const InventoryManagement = lazy(() => import('./pages/admin/InventoryManagement'));
const ExpensesManagement = lazy(() => import('./pages/admin/ExpensesManagement'));
const AdminTactics = lazy(() => import('./pages/admin/AdminTactics'));
const AdminPendingParents = lazy(() => import('./pages/admin/AdminPendingParents'));
const BranchesManagement = lazy(() => import('./pages/admin/BranchesManagement'));
const SubscriptionPage = lazy(() => import('./pages/admin/SubscriptionPage'));
const EquipmentSettings = lazy(() => import('./pages/admin/EquipmentSettings'));
const SanctionsManagement = lazy(() => import('./pages/admin/SanctionsManagement'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const Invoice = lazy(() => import('./pages/Invoice'));

// Coach
const CoachLayout = lazy(() => import('./pages/coach/CoachLayout'));
const CoachDashboard = lazy(() => import('./pages/coach/CoachDashboard'));
const CoachSquads = lazy(() => import('./pages/coach/CoachSquads'));
const CoachAttendance = lazy(() => import('./pages/coach/CoachAttendance'));
const CoachEvaluations = lazy(() => import('./pages/coach/CoachEvaluations'));
const CoachMatches = lazy(() => import('./pages/coach/CoachMatches'));
const CoachChat = lazy(() => import('./pages/coach/CoachChat'));
const CoachTryouts = lazy(() => import('./pages/coach/CoachTryouts'));
const CoachVideoAnalysis = lazy(() => import('./pages/coach/CoachVideoAnalysis'));

// Parent
const ParentLayout = lazy(() => import('./pages/parent/ParentLayout'));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ParentChildProfile = lazy(() => import('./pages/parent/ParentChildProfile'));
const ParentAttendance = lazy(() => import('./pages/parent/ParentAttendance'));
const ParentEvaluations = lazy(() => import('./pages/parent/ParentEvaluations'));
const ParentPayments = lazy(() => import('./pages/parent/ParentPayments'));
const ParentChat = lazy(() => import('./pages/parent/ParentChat'));
const ParentCheckout = lazy(() => import('./pages/parent/ParentCheckout'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0c29' }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
      <p className="text-indigo-300/60 text-xs font-black uppercase tracking-widest">Chargement...</p>
    </div>
  </div>
);

// Bridges non-React api.js 401 handler to React Router navigation
// so that impersonation exits use SPA navigation instead of hard reloads.
function ImpersonationExitHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e) => {
      const to = e.detail?.to || '/admin/players';
      navigate(to, { replace: true });
    };
    window.addEventListener('impersonation-exit', handler);
    return () => window.removeEventListener('impersonation-exit', handler);
  }, [navigate]);
  return null;
}

function getAppType() {
  const hostname = window.location.hostname.replace('www.', '');
  const mainDomains = [
    'localhost',
    'academy-frontend-82081149217.europe-west1.run.app',
    'academy-app-mu.vercel.app',
    'dainty-speculoos-433706.netlify.app',
    'jolly-kangaroo-3c3d92.netlify.app'
  ];
  
  if (mainDomains.includes(hostname)) {
    return 'SAAS';
  }
  return 'ACADEMY';
}

function App() {
  const appType = getAppType();

  return (
    <ErrorBoundary>
    <ThemeProvider>
    <LanguageProvider>
    <ToastProvider>
      <BrandingProvider>
      <Router>
        <ImpersonationExitHandler />
        <ImpersonationBanner />
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={appType === 'SAAS' ? <SaasLanding /> : <LandingPage />} />
          <Route path="/saas-platform" element={<Navigate to="/" replace />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/qr-login" element={<QRLoginPage />} />
          <Route path="/saas/login" element={<SaasLogin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/parent/signup" element={<ParentSignup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {/* Public Academy Pages */}
          <Route path="/academies" element={<AcademyDirectory />} />
          <Route path="/academy/:subdomain" element={<AcademyPublicPage />} />

          {/* SaaS Root */}
          <Route path="/saas" element={<SaasLayout />}>
            <Route index element={<Navigate to="/saas/dashboard" replace />} />
            <Route path="dashboard" element={<SaasDashboard />} />
            <Route path="academies" element={<SaasAcademies />} />
            <Route path="academies/:academyId" element={<SaasAcademyDetail />} />
            <Route path="domains" element={<SaasDomains />} />
            <Route path="subscriptions" element={<SaasSubscriptions />} />
            <Route path="settings" element={<SaasSettings />} />
            <Route path="notifications" element={<SaasNotifications />} />
            <Route path="analytics" element={<SaasAnalytics />} />
            <Route path="coupons" element={<SaasCoupons />} />
            <Route path="emails" element={<SaasEmails />} />
            <Route path="ads" element={<SaasAds />} />
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
            <Route path="tournaments" element={<TournamentsManagement />} />
            <Route path="tryouts" element={<TryoutsManagement />} />
            <Route path="matches" element={<MatchesManagement />} />
            <Route path="training" element={<TrainingManagement />} />
            <Route path="medical" element={<MedicalManagement />} />
            <Route path="kits" element={<KitsManagement />} />
            <Route path="equipment-settings" element={<EquipmentSettings />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="expenses" element={<ExpensesManagement />} />
            <Route path="admins" element={<AdminsManagement />} />
            <Route path="programmateur" element={<MatchManagerInvite />} />
            <Route path="branches" element={<BranchesManagement />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="chat" element={<ChatManagement />} />
            <Route path="tactics" element={<AdminTactics />} />
            <Route path="pending-parents" element={<AdminPendingParents />} />
            <Route path="sanctions" element={<SanctionsManagement />} />
            <Route path="settings" element={<SettingsManagement />} />
            <Route path="analytics" element={<AdminAnalytics />} />
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
            <Route path="tryouts" element={<CoachTryouts />} />
            <Route path="video-analysis" element={<CoachVideoAnalysis />} />
          </Route>

          {/* Parent */}
          <Route path="/parent" element={<ParentLayout />}>
            <Route index element={<Navigate to="/parent/dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="checkout" element={<ParentCheckout />} />
            <Route path="child" element={<ParentChildProfile />} />
            <Route path="attendance" element={<ParentAttendance />} />
            <Route path="evaluations" element={<ParentEvaluations />} />
            <Route path="payments" element={<ParentPayments />} />
            <Route path="chat" element={<ParentChat />} />
          </Route>

          {/* Invoice (standalone printable page) */}
          <Route path="/invoice/:paymentId" element={<Invoice />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </Router>
    </BrandingProvider>
    </ToastProvider>
    </LanguageProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
