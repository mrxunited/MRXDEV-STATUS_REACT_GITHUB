

import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';
import { isAppwriteEffectivelyConfigured, isUserExplicitlyInMockMode } from '../../services/appwrite'; 
import { useSiteIdentity } from '../../contexts/SiteIdentityContext'; // Added

const AdminFooter: React.FC = () => {
  const { isLoadingSettings } = useSettings(); 
  const { dbErrorDetails, isLoadingStatus: isLoadingDb } = useDatabaseStatus();
  const { siteIdentity, isLoadingIdentity } = useSiteIdentity(); // Added

  const appwriteActuallyConfigured = isAppwriteEffectivelyConfigured();
  const userForcesMockMode = isUserExplicitlyInMockMode(); 

  let dataSourceStatus = "Determining data source...";
  let iconClass = "fa-question-circle";
  let colorClass = "text-gray-500 dark:text-gray-400";
  let additionalInfo = "";

  if (isLoadingSettings || isLoadingDb || isLoadingIdentity) { // Added isLoadingIdentity
    // dataSourceStatus remains "Determining..."
  } else if (userForcesMockMode) {
    dataSourceStatus = "Mock Data (Forced)";
    iconClass = "fa-flask";
    colorClass = "text-orange-500 dark:text-orange-400";
    additionalInfo = appwriteActuallyConfigured ? "(Live DB calls overridden by UI choice)" : "(Appwrite unconfigured; using mock)";
  } else if (!appwriteActuallyConfigured) {
    dataSourceStatus = "DB Unconfigured";
    iconClass = "fa-plug-circle-exclamation"; 
    colorClass = "text-red-500 dark:text-red-400";
    additionalInfo = "(App may be inoperable; using mock for reads)";
  } else { // Appwrite IS effectively configured, and user is NOT forcing mock mode
    if (dbErrorDetails) { // Live DB connection has an issue
        dataSourceStatus = "Live DB (Error)";
        iconClass = "fa-database-slash";
        colorClass = "text-yellow-500 dark:text-yellow-400";
        additionalInfo = "(Error connecting or fetching data)";
    } else { // Live DB, no errors reported by context
        dataSourceStatus = "Live Database";
        iconClass = "fa-database";
        colorClass = "text-green-600 dark:text-green-400";
    }
  }
  
  const footerMainText = isLoadingIdentity ? `© ${new Date().getFullYear()} MRX United - Administrator Panel.` : siteIdentity.footerText || `© ${new Date().getFullYear()} ${siteIdentity.siteName || 'MRX United'} - Administrator Panel.`;


  return (
    <footer className="bg-[var(--color-light-header-bg)] dark:bg-[var(--color-dark-header-bg)] 
                       text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] 
                       border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] 
                       p-3 text-center text-xs sm:text-sm flex-shrink-0 flex flex-col sm:flex-row justify-between items-center">
      <span dangerouslySetInnerHTML={{ __html: footerMainText.replace(/\n/g, '<br />') }}></span>
      <span className={`font-medium ${colorClass} mt-1 sm:mt-0`} title={dbErrorDetails && appwriteActuallyConfigured && !userForcesMockMode ? dbErrorDetails : additionalInfo || dataSourceStatus}>
        <i className={`fas ${iconClass} mr-1.5`}></i>
        Data Source: {dataSourceStatus}
        {additionalInfo && <span className="text-xs opacity-80 ml-1">{additionalInfo}</span>}
      </span>
    </footer>
  );
};

export default AdminFooter;
