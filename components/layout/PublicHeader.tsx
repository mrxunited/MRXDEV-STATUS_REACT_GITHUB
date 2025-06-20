
import React from 'react';
import { Link } from 'react-router-dom';
import ThemeSwitcher from '../ui/ThemeSwitcher';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import { useGuestReportModal } from '../../contexts/GuestReportModalContext'; 
import { useSiteIdentity } from '../../contexts/SiteIdentityContext'; // Added

const PublicHeader: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { openGuestReportModal } = useGuestReportModal(); 
  const { siteIdentity, isLoadingIdentity } = useSiteIdentity(); // Added

  const renderAuthButton = () => {
    if (authLoading) {
      return (
        <div className="px-4 py-2 text-sm h-[36px] w-[120px] flex items-center justify-center"> 
          <LoadingSpinner size="sm" />
        </div>
      );
    }

    if (user) {
      return (
        <Link
          to="/admin/dashboard"
          className="px-4 py-2 text-sm font-medium 
                     text-[var(--color-primary-blue)] dark:text-[var(--color-primary-blue-hover)]
                     hover:bg-blue-100 dark:hover:bg-slate-700 
                     rounded-md transition-colors flex items-center"
          title="Go to Admin Panel"
        >
          <i className="fas fa-tachometer-alt mr-2"></i>Admin Panel
        </Link>
      );
    }

    return (
      <Link
        to="/admin/login"
        className="px-4 py-2 text-sm font-medium 
                   text-gray-700 dark:text-gray-300 
                   hover:text-[var(--color-primary-blue)] dark:hover:text-[var(--color-primary-blue-hover)]
                   hover:bg-gray-200 dark:hover:bg-slate-700 
                   rounded-md transition-colors flex items-center"
        title="Admin Login"
      >
        <i className="fas fa-user-shield mr-2"></i>Admin Login
      </Link>
    );
  };

  const siteName = isLoadingIdentity ? 'Loading...' : siteIdentity.siteName || 'System Status';
  const logoUrl = isLoadingIdentity ? null : siteIdentity.logoUrl;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-slate-100 dark:bg-[var(--color-dark-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] shadow-md border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] transform"> {/* Added transform class */}
      <div className="container mx-auto px-4 h-full flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-3">
          {logoUrl ? (
            <img src={logoUrl} alt={`${siteName} Logo`} className="h-10 w-auto max-h-10" />
          ) : (
            <i className="fas fa-shield-alt text-[var(--color-primary-blue)] text-3xl"></i>
          )}
          <div>
            <h1 className="text-xl font-bold">{siteName}</h1>
            <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">System Status</p>
          </div>
        </Link>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
              onClick={openGuestReportModal}
              className="px-3 py-2 sm:px-4 text-xs sm:text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-md shadow-sm hover:shadow transition-all flex items-center"
              title="Report an issue you are experiencing"
          >
              <i className="fas fa-exclamation-circle mr-1.5 sm:mr-2"></i>Report Issue
          </button>
          <ThemeSwitcher />
          {renderAuthButton()}
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
