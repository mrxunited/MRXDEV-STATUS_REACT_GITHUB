import React from 'react';
import { OverallPublicStatus, SystemStatusLevel } from '../../types';
// StatusPill import removed

interface OverallStatusBannerProps {
  status: OverallPublicStatus;
}

const getBannerStyles = (level: SystemStatusLevel): string => {
  // Brand color for maintenance, other colors for statuses.
  // Dark mode theming will be handled by StatusPill, these are background colors.
  switch (level) {
    case SystemStatusLevel.OPERATIONAL:
      return 'bg-green-500 dark:bg-green-600 border-green-600 dark:border-green-700';
    case SystemStatusLevel.DEGRADED:
      return 'bg-yellow-500 dark:bg-yellow-600 border-yellow-600 dark:border-yellow-700';
    case SystemStatusLevel.PARTIAL_OUTAGE:
      return 'bg-orange-500 dark:bg-orange-600 border-orange-600 dark:border-orange-700';
    case SystemStatusLevel.MAJOR_OUTAGE:
      return 'bg-red-600 dark:bg-red-700 border-red-700 dark:border-red-800';
    case SystemStatusLevel.MAINTENANCE:
      return 'bg-[var(--color-primary-blue)] border-[var(--color-primary-blue-hover)]'; // Using brand blue
    default: // UNKNOWN
      return 'bg-gray-500 dark:bg-gray-600 border-gray-600 dark:border-gray-700';
  }
};

const getIconForStatus = (level: SystemStatusLevel): string => {
    switch(level) {
        case SystemStatusLevel.OPERATIONAL: return "fas fa-check-circle";
        case SystemStatusLevel.DEGRADED: return "fas fa-exclamation-triangle";
        case SystemStatusLevel.PARTIAL_OUTAGE: return "fas fa-broadcast-tower";
        case SystemStatusLevel.MAJOR_OUTAGE: return "fas fa-times-circle";
        case SystemStatusLevel.MAINTENANCE: return "fas fa-wrench";
        case SystemStatusLevel.UNKNOWN:
        default: return "fas fa-question-circle";
    }
}

const OverallStatusBanner: React.FC<OverallStatusBannerProps> = ({ status }) => {
  const bannerColor = getBannerStyles(status.level);
  const statusIcon = getIconForStatus(status.level);

  return (
    <div className={`p-6 rounded-lg shadow-lg text-white ${bannerColor}`}>
      <div className="flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center mb-3 md:mb-0">
          <i className={`${statusIcon} text-3xl md:text-4xl mr-4`}></i>
          <h2 className="text-xl sm:text-2xl font-semibold">{status.message}</h2>
        </div>
        <p className="text-sm opacity-90 text-gray-100 dark:text-gray-200 mt-2 md:mt-0">
          Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default OverallStatusBanner;