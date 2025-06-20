
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { useSettings } from './contexts/SettingsContext';
import { useDatabaseStatus } from './contexts/DatabaseStatusContext'; 
import { useWidgetSettings } from './contexts/WidgetSettingsContext'; 
import { usePingScheduler } from './hooks/usePingScheduler'; 
import { GuestReportModalProvider } from './contexts/GuestReportModalContext'; 
import { useSiteIdentity } from './contexts/SiteIdentityContext';
import { useDiscordSettings } from './contexts/DiscordSettingsContext'; // Added

// Public Pages
import PublicStatusPage from './pages/PublicStatusPage';
import ApiStatusPage from './pages/ApiStatusPage'; 

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ManageServicesPage from './pages/admin/ManageServicesPage';
import ManageIncidentsPage from './pages/admin/ManageIncidentsPage';
import ManageUsersPage from './pages/admin/ManageUsersPage'; 
import ManageServiceGroupsPage from './pages/admin/ManageServiceGroupsPage';
import ManageApiKeysPage from './pages/admin/ManageApiKeysPage';
import WidgetSettingsPage from './pages/admin/WidgetSettingsPage'; 
import EmbedGeneratorPage from './pages/admin/EmbedGeneratorPage'; 
import ManageGuestReportsPage from './pages/admin/ManageGuestReportsPage'; 
import ManageReviewsPage from './pages/admin/ManageReviewsPage'; 
import ManageSeverityLevelsPage from './pages/admin/ManageSeverityLevelsPage'; 
import ManageIncidentStatusesPage from './pages/admin/ManageIncidentStatusesPage'; 
import SiteAppearancePage from './pages/admin/SiteAppearancePage'; 
import ManageDecisionFlowsPage from './pages/admin/ManageDecisionFlowsPage';
import ActivityLogPage from './pages/admin/ActivityLogPage'; 
import DiscordIntegrationPage from './pages/admin/DiscordIntegrationPage'; // Added

// Layouts
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import PublicHeader from './components/layout/PublicHeader';
import PublicFooter from './components/layout/PublicFooter';
import AdminFooter from './components/layout/AdminFooter'; 
import LoadingSpinner from './components/ui/LoadingSpinner';
import MockModeBanner from './components/admin/common/MockModeBanner';
import DatabaseErrorBanner from './components/admin/common/DatabaseErrorBanner'; 
import NotificationContainer from './components/ui/NotificationContainer';
import WidgetSection from './components/admin/dashboard/WidgetSection';
import { WidgetConfig } from './types';


const AdminLayout: React.FC = () => {
  const [isWidgetPanelCollapsed, setIsWidgetPanelCollapsed] = useState(false);
  const { widgetSettings, getAllWidgetConfigs, isLoadingSettings: isLoadingWidgetVisibility } = useWidgetSettings();
  const { user } = useAuth();

  const allWidgetConfigs = getAllWidgetConfigs();
  const activeWidgets = allWidgetConfigs.filter((widget: WidgetConfig) => 
    widgetSettings[widget.id] &&
    (!widget.requiredRole || widget.requiredRole === user?.role)
  );
  const hasActiveWidgets = activeWidgets.length > 0;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-main-bg)]"> 
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden"> 
        <MockModeBanner />
        <DatabaseErrorBanner />
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-main-bg)] p-4 md:p-6">
          <Outlet />
        </main>
        <AdminFooter /> 
      </div>
      {!isLoadingWidgetVisibility && hasActiveWidgets && ( 
        <WidgetSection 
          isCollapsed={isWidgetPanelCollapsed}
          onToggleCollapse={() => setIsWidgetPanelCollapsed(!isWidgetPanelCollapsed)}
        />
      )}
      <NotificationContainer />
    </div>
  );
};

const PublicLayout: React.FC = () => (
  <GuestReportModalProvider>
    <div className="flex flex-col min-h-screen bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-main-bg)]">
      <PublicHeader />
      <main className="flex-1 container mx-auto px-4 py-8 pt-20 md:pt-24"> {/* Adjusted padding-bottom as footer is no longer fixed */}
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  </GuestReportModalProvider>
);

const FullPageLoader: React.FC = () => (
    <div className="flex items-center justify-center h-screen bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-main-bg)]">
        <LoadingSpinner size="lg" />
    </div>
);


const ProtectedAdminRoute: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoader />;
  }

  return user ? <AdminLayout /> : <Navigate to="/admin/login" state={{ from: location }} replace />;
};

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: themeLoading } = useTheme(); 
  const { isLoadingSettings } = useSettings();
  const { isLoadingStatus: isLoadingDbStatus } = useDatabaseStatus(); 
  const { isLoadingSettings: isLoadingWidgetVisibility } = useWidgetSettings(); 
  const { siteIdentity, isLoadingIdentity } = useSiteIdentity(); 
  const { isLoadingDiscordSettings } = useDiscordSettings(); // Added

  usePingScheduler();

  useEffect(() => {
    if (!isLoadingIdentity && siteIdentity) {
      document.title = siteIdentity.siteName || 'Status Dashboard';
      
      let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (siteIdentity.faviconUrl) {
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = siteIdentity.faviconUrl;
      } else if (favicon) { 
        // favicon.remove(); // Or set default
      }

      let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (siteIdentity.metaDescription) {
        if (!metaDescription) {
          metaDescription = document.createElement('meta');
          metaDescription.name = 'description';
          document.head.appendChild(metaDescription);
        }
        metaDescription.content = siteIdentity.metaDescription;
      } else if (metaDescription) {
        // metaDescription.content = 'Default site description'; // Or remove
      }
    }
  }, [siteIdentity, isLoadingIdentity]);

  if (authLoading || themeLoading || isLoadingSettings || isLoadingDbStatus || isLoadingWidgetVisibility || isLoadingIdentity || isLoadingDiscordSettings) {  // Added isLoadingDiscordSettings
    return <FullPageLoader />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<PublicStatusPage />} />
      </Route>

      {/* API Route (no layout) */}
      <Route path="/api/status" element={<ApiStatusPage />} />

      {/* Admin Login */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedAdminRoute />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/services" element={<ManageServicesPage />} />
        <Route path="/admin/service-groups" element={<ManageServiceGroupsPage />} />
        <Route path="/admin/incidents" element={<ManageIncidentsPage />} />
        <Route path="/admin/decision-flows" element={<ManageDecisionFlowsPage />} /> 
        <Route path="/admin/reviews" element={<ManageReviewsPage />} /> 
        <Route path="/admin/guest-reports" element={<ManageGuestReportsPage />} /> 
        <Route path="/admin/embed-generator" element={<EmbedGeneratorPage />} /> 
        <Route path="/admin/users" element={<ManageUsersPage />} /> 
        <Route path="/admin/api-keys" element={<ManageApiKeysPage />} />
        <Route path="/admin/widget-settings" element={<WidgetSettingsPage />} /> 
        <Route path="/admin/site-appearance" element={<SiteAppearancePage />} /> 
        <Route path="/admin/activity-logs" element={<ActivityLogPage />} />
        <Route path="/admin/integrations/discord" element={<DiscordIntegrationPage />} /> {/* Added */}
        <Route path="/admin/integrations" element={<Navigate to="/admin/integrations/discord" replace />} /> {/* Added */}


        {/* Field Customization Routes */}
        <Route path="/admin/field-customization/severity-levels" element={<ManageSeverityLevelsPage />} />
        <Route path="/admin/field-customization/incident-statuses" element={<ManageIncidentStatusesPage />} />
        <Route path="/admin/field-customization" element={<Navigate to="/admin/field-customization/severity-levels" replace />} />

        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
      
      <Route path="*" element={user ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;