
import React from 'react';
import { useSettings } from '../../../contexts/SettingsContext';

const MockDataToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { isMockMode, toggleMockMode, isLoadingSettings } = useSettings();

  if (isLoadingSettings) {
    return <div className={`text-xs px-2 py-1 rounded ${className}`}>Loading settings...</div>;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className={`text-xs font-medium ${isMockMode ? 'text-orange-500 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>
        Mock Data:
      </span>
      <label htmlFor="mock-data-toggle" className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          id="mock-data-toggle"
          className="sr-only peer"
          checked={isMockMode}
          onChange={toggleMockMode}
        />
        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-400 dark:peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500 dark:peer-checked:bg-orange-600"></div>
      </label>
      <span className={`text-xs font-semibold ${isMockMode ? 'text-orange-500 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
        {isMockMode ? 'ON' : 'OFF'}
      </span>
    </div>
  );
};

export default MockDataToggle;
