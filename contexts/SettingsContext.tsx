
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

interface SettingsContextType {
  isMockMode: boolean;
  toggleMockMode: () => void;
  isLoadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedMockMode = localStorage.getItem('mrx-mock-mode');
      if (storedMockMode !== null) {
        setIsMockMode(JSON.parse(storedMockMode));
      }
    } catch (error) {
      console.error("Error loading mock mode setting from localStorage:", error);
      // Keep default isMockMode (false) if localStorage fails
    }
    setIsLoadingSettings(false);
  }, []);

  const toggleMockMode = useCallback(() => {
    setIsMockMode(prevMode => {
      const newMode = !prevMode;
      try {
        localStorage.setItem('mrx-mock-mode', JSON.stringify(newMode));
      } catch (error) {
        console.error("Error saving mock mode setting to localStorage:", error);
      }
      // Provide a small visual feedback or log for the mode change
      console.log(`Mock Data Mode ${newMode ? 'Enabled' : 'Disabled'}. Refresh may be needed for all services to reflect change.`);
      alert(`Mock Data Mode has been ${newMode ? 'Enabled' : 'Disabled'}. Some changes might require a page refresh to fully apply.`);
      return newMode;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ isMockMode, toggleMockMode, isLoadingSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
