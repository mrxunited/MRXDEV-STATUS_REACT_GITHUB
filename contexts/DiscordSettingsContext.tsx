
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { DiscordSettings } from '../types';
import { adminGetDiscordSettings, adminUpdateDiscordSettings } from '../services/appwrite/discordConfigService';
import { DEFAULT_DISCORD_SETTINGS, LOCAL_STORAGE_DISCORD_SETTINGS_KEY } from '../constants';

interface DiscordSettingsContextType {
  discordSettings: DiscordSettings;
  isLoadingDiscordSettings: boolean;
  updateDiscordSettings: (settings: Partial<Omit<DiscordSettings, '$id' | 'updatedAt'>>) => Promise<void>;
  fetchDiscordSettings: () => Promise<void>;
}

const DiscordSettingsContext = createContext<DiscordSettingsContextType | undefined>(undefined);

export const DiscordSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [discordSettings, setDiscordSettings] = useState<DiscordSettings>(DEFAULT_DISCORD_SETTINGS);
  const [isLoadingDiscordSettings, setIsLoadingDiscordSettings] = useState(true);

  const fetchDiscordSettings = useCallback(async () => {
    setIsLoadingDiscordSettings(true);
    try {
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_DISCORD_SETTINGS_KEY);
      if (storedSettings) {
        setDiscordSettings(JSON.parse(storedSettings));
      }
      const settings = await adminGetDiscordSettings();
      setDiscordSettings(settings || DEFAULT_DISCORD_SETTINGS);
      if (settings) {
        localStorage.setItem(LOCAL_STORAGE_DISCORD_SETTINGS_KEY, JSON.stringify(settings));
      } else {
        localStorage.setItem(LOCAL_STORAGE_DISCORD_SETTINGS_KEY, JSON.stringify(DEFAULT_DISCORD_SETTINGS));
      }
    } catch (error) {
      console.error("Failed to fetch Discord settings:", error);
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_DISCORD_SETTINGS_KEY);
      setDiscordSettings(storedSettings ? JSON.parse(storedSettings) : DEFAULT_DISCORD_SETTINGS);
    } finally {
      setIsLoadingDiscordSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscordSettings();
  }, [fetchDiscordSettings]);

  const updateDiscordSettings = useCallback(async (settingsUpdate: Partial<Omit<DiscordSettings, '$id' | 'updatedAt'>>) => {
    setIsLoadingDiscordSettings(true);
    try {
      const newSettings = { ...discordSettings, ...settingsUpdate };
      const updatedSettings = await adminUpdateDiscordSettings(newSettings);
      setDiscordSettings(updatedSettings);
      localStorage.setItem(LOCAL_STORAGE_DISCORD_SETTINGS_KEY, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error("Failed to update Discord settings:", error);
      throw error; 
    } finally {
      setIsLoadingDiscordSettings(false);
    }
  }, [discordSettings]);

  return (
    <DiscordSettingsContext.Provider value={{ discordSettings, isLoadingDiscordSettings, updateDiscordSettings, fetchDiscordSettings }}>
      {children}
    </DiscordSettingsContext.Provider>
  );
};

export const useDiscordSettings = (): DiscordSettingsContextType => {
  const context = useContext(DiscordSettingsContext);
  if (context === undefined) {
    throw new Error('useDiscordSettings must be used within a DiscordSettingsProvider');
  }
  return context;
};
