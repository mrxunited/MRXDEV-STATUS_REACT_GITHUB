

import React from 'react';
import { useDatabaseStatus } from '../../../contexts/DatabaseStatusContext';
import { isAppwriteEffectivelyConfigured } from '../../../services/appwrite'; // Import helper

const DatabaseErrorBanner: React.FC = () => {
  const { isDbAvailable, dbErrorDetails, isLoadingStatus } = useDatabaseStatus();
  const appwriteActuallyConfigured = isAppwriteEffectivelyConfigured();

  if (isLoadingStatus || isDbAvailable) {
    // If DB is available (even if Appwrite isn't configured but we are somehow showing mock data as "available"),
    // or if still loading, don't show this banner.
    // This banner is specifically for when DB is marked UNAVAILABLE.
    return null;
  }
  
  // Determine if the error is due to Appwrite not being configured vs. a runtime DB error.
  // `dbErrorDetails` from context will usually indicate if it's a config issue.
  const isPrimarilyUnconfiguredError = dbErrorDetails && dbErrorDetails.toLowerCase().includes("not configured");
  
  // If Appwrite is effectively configured but db is unavailable and it's NOT a config error, it's a runtime DB error.
  const isRuntimeDbError = appwriteActuallyConfigured && !isDbAvailable && !isPrimarilyUnconfiguredError;

  let iconClass: string;
  let bannerColor: string;
  let messageToShow: string;

  if (isRuntimeDbError) {
    iconClass = "fa-database-slash"; // Error with a configured DB
    bannerColor = "bg-red-600 dark:bg-red-700";
    messageToShow = dbErrorDetails || "Database connection issue detected. Operations may fail.";
  } else { // Covers cases where Appwrite is not effectively configured OR dbErrorDetails explicitly says "not configured"
    iconClass = "fa-exclamation-triangle"; // General warning / config issue
    bannerColor = "bg-yellow-500 dark:bg-yellow-600";
    messageToShow = dbErrorDetails || "Appwrite is not configured. Using fallback data; operations may be limited.";
  }


  return (
    <div className={`${bannerColor} text-white text-xs sm:text-sm font-semibold p-2 text-center shadow-md w-full z-40`}>
      <i className={`fas ${iconClass} mr-2`}></i>
      {messageToShow}
      {!appwriteActuallyConfigured && ( // Show config help link if Appwrite is NOT effectively configured
         <a 
            href="https://github.com/mrx-united/status-dashboard-appwrite-guide/blob/main/DATABASE_SETUP.md" // Replace with actual link to constants.ts or setup guide
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 underline hover:text-opacity-80"
            title="View configuration instructions"
        >
            (Configuration Help)
        </a>
      )}
    </div>
  );
};

export default DatabaseErrorBanner;