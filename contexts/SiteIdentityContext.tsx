
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { SiteIdentitySettings } from '../types';
import { adminGetSiteIdentitySettings, adminUpdateSiteIdentitySettings } from '../services/appwrite/siteSettingsService';
import { DEFAULT_SITE_IDENTITY, LOCAL_STORAGE_SITE_IDENTITY_KEY } from '../constants';

interface SiteIdentityContextType {
  siteIdentity: SiteIdentitySettings;
  isLoadingIdentity: boolean;
  updateSiteIdentity: (settings: Partial<Omit<SiteIdentitySettings, '$id' | 'updatedAt'>>) => Promise<void>;
  fetchSiteIdentity: () => Promise<void>;
}

const SiteIdentityContext = createContext<SiteIdentityContextType | undefined>(undefined);

export const SiteIdentityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [siteIdentity, setSiteIdentity] = useState<SiteIdentitySettings>(DEFAULT_SITE_IDENTITY);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);

  const fetchSiteIdentity = useCallback(async () => {
    setIsLoadingIdentity(true);
    try {
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_SITE_IDENTITY_KEY);
      if (storedSettings) {
        setSiteIdentity(JSON.parse(storedSettings));
      }
      // Fetch from backend to ensure freshness, even if localStorage is used for initial paint
      const settings = await adminGetSiteIdentitySettings();
      setSiteIdentity(settings || DEFAULT_SITE_IDENTITY);
      if (settings) {
        localStorage.setItem(LOCAL_STORAGE_SITE_IDENTITY_KEY, JSON.stringify(settings));
      } else if (storedSettings) { // If backend fetch fails but we had stored settings, use them.
        // Keep stored settings
      } else { // No backend, no stored, use default and try to save it.
        localStorage.setItem(LOCAL_STORAGE_SITE_IDENTITY_KEY, JSON.stringify(DEFAULT_SITE_IDENTITY));
        // Optionally try to save defaults to backend if it's the very first run and no settings exist.
        // This is commented out to avoid unintentional writes on fresh setups without specific user action.
        // await adminUpdateSiteIdentitySettings(DEFAULT_SITE_IDENTITY);
      }
    } catch (error) {
      console.error("Failed to fetch site identity settings:", error);
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_SITE_IDENTITY_KEY);
      setSiteIdentity(storedSettings ? JSON.parse(storedSettings) : DEFAULT_SITE_IDENTITY);
    } finally {
      setIsLoadingIdentity(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteIdentity();
  }, [fetchSiteIdentity]);

  const updateSiteIdentity = useCallback(async (settingsUpdate: Partial<Omit<SiteIdentitySettings, '$id' | 'updatedAt'>>) => {
    setIsLoadingIdentity(true);
    try {
      const newSettings = { ...siteIdentity, ...settingsUpdate };
      const updatedSettings = await adminUpdateSiteIdentitySettings(newSettings);
      setSiteIdentity(updatedSettings);
      localStorage.setItem(LOCAL_STORAGE_SITE_IDENTITY_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error("Failed to update site identity settings:", error);
      throw error; // Re-throw to be caught by the calling component
    } finally {
      setIsLoadingIdentity(false);
    }
  }, [siteIdentity]);

  return (
    <SiteIdentityContext.Provider value={{ siteIdentity, isLoadingIdentity, updateSiteIdentity, fetchSiteIdentity }}>
      {children}
    </SiteIdentityContext.Provider>
  );
};

export const useSiteIdentity = (): SiteIdentityContextType => {
  const context = useContext(SiteIdentityContext);
  if (context === undefined) {
    throw new Error('useSiteIdentity must be used within a SiteIdentityProvider');
  }
  return context;
};
