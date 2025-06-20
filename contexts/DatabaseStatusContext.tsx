import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { APPWRITE_CONFIG } from '../constants'; // To check if Appwrite is configured

// Check if Appwrite connection details are placeholders
const IS_APPWRITE_CONFIGURED_PROPERLY =
  APPWRITE_CONFIG.endpoint !== 'YOUR_APPWRITE_ENDPOINT' &&
  APPWRITE_CONFIG.projectId !== 'YOUR_APPWRITE_PROJECT_ID' &&
  APPWRITE_CONFIG.databaseId !== 'YOUR_DATABASE_ID';

interface DatabaseStatusContextType {
  isDbAvailable: boolean;
  dbErrorDetails: string | null;
  isLoadingStatus: boolean;
  setDbUnavailable: (message: string) => void; // For manually setting an error, e.g., from an API call failure
  setDbAvailable: () => void; // For manually clearing an error
}

const DatabaseStatusContext = createContext<DatabaseStatusContextType | undefined>(undefined);

export const DatabaseStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDbAvailable, setIsDbAvailable] = useState<boolean>(true);
  const [dbErrorDetails, setDbErrorDetails] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

  useEffect(() => {
    setIsLoadingStatus(true);
    if (!IS_APPWRITE_CONFIGURED_PROPERLY) {
      setIsDbAvailable(false);
      setDbErrorDetails("Appwrite backend is not configured. The application is operating in a fallback mode. Please provide valid Appwrite connection details in 'constants.ts'.");
    } else {
      // In a real app, you might perform an initial health check call here.
      // For now, if configured, assume it's available until an error occurs.
      setIsDbAvailable(true);
      setDbErrorDetails(null);
    }
    setIsLoadingStatus(false);
  }, []);

  const setDbUnavailable = useCallback((message: string) => {
    setIsDbAvailable(false);
    setDbErrorDetails(message);
  }, []);

  const setDbAvailable = useCallback(() => {
    // Only set to available if it's actually configured.
    if (IS_APPWRITE_CONFIGURED_PROPERLY) {
        setIsDbAvailable(true);
        setDbErrorDetails(null);
    } else {
        setIsDbAvailable(false);
        setDbErrorDetails("Appwrite backend is not configured. The application is operating in a fallback mode. Please provide valid Appwrite connection details in 'constants.ts'.");
    }
  }, []);

  return (
    <DatabaseStatusContext.Provider value={{ isDbAvailable, dbErrorDetails, isLoadingStatus, setDbUnavailable, setDbAvailable }}>
      {children}
    </DatabaseStatusContext.Provider>
  );
};

export const useDatabaseStatus = (): DatabaseStatusContextType => {
  const context = useContext(DatabaseStatusContext);
  if (context === undefined) {
    throw new Error('useDatabaseStatus must be used within a DatabaseStatusProvider');
  }
  return context;
};