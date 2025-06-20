

import React from 'react';
// useSettings import removed as we use more direct helpers
import { isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured } from '../../../services/appwrite'; 

const MockModeBanner: React.FC = () => {
  // isLoadingSettings might still be relevant if settings context has other async ops,
  // but for mock mode display, direct helpers are more precise.
  // const { isLoadingSettings } = useSettings(); 
  const userForcesMockMode = isUserExplicitlyInMockMode();
  const appwriteIsReady = isAppwriteEffectivelyConfigured();

  // Only show the banner if the user is *explicitly* forcing mock mode.
  // If Appwrite isn't configured, DatabaseErrorBanner will handle that message.
  if (!userForcesMockMode) {
    return null;
  }

  const message = appwriteIsReady 
    ? "Developer Mock UI Active. Live backend calls are overridden by UI choice."
    : "Developer Mock UI Active. (Appwrite is not configured; relying on mock data.)";

  return (
    <div className="bg-orange-500 dark:bg-orange-600 text-white text-xs sm:text-sm font-semibold p-2 text-center shadow-md w-full z-40">
      <i className="fas fa-flask mr-2"></i>
      {message}
      <a 
        href="?mock=false" 
        onClick={(e) => {
            e.preventDefault();
            const url = new URL(window.location.href);
            url.searchParams.delete('mock');
            // Also attempt to clear the localStorage setting if user clicks this link
            try {
              localStorage.removeItem('mrx-mock-mode');
            } catch (err) {
              console.warn("Could not clear mock-mode from localStorage via link", err);
            }
            window.location.href = url.toString(); // Refresh to apply
        }}
        className="ml-2 underline hover:text-orange-200"
        title="Switch to Live Data (if configured) by removing ?mock override and localStorage setting"
        >
        (Exit Mock UI Override)
      </a>
    </div>
  );
};

export default MockModeBanner;