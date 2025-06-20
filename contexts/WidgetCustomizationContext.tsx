
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { 
    AllWidgetCustomizationSettings, 
    ClockWidgetSettings, 
    CalendarWidgetSettings, 
    WeatherWidgetSettings,
    ClockFormat,
    CalendarStartDay,
    WeatherUnit,
    WeatherLocationMode
} from '../types';
import { LOCAL_STORAGE_WIDGET_CUSTOM_SETTINGS_KEY } from '../constants';

const DEFAULT_CLOCK_SETTINGS: ClockWidgetSettings = { format: '24h' };
const DEFAULT_CALENDAR_SETTINGS: CalendarWidgetSettings = { startDay: 'sunday' };
const DEFAULT_WEATHER_SETTINGS: WeatherWidgetSettings = { 
  unit: 'C', 
  locationMode: 'auto', 
  manualLocation: '', 
  lastCoords: null,
  apiKey: '', // Added default apiKey
};

interface WidgetCustomizationContextType {
  customSettings: AllWidgetCustomizationSettings;
  updateClockSettings: (settings: Partial<ClockWidgetSettings>) => void;
  updateCalendarSettings: (settings: Partial<CalendarWidgetSettings>) => void;
  updateWeatherSettings: (settings: Partial<WeatherWidgetSettings>) => void;
  isLoadingCustomSettings: boolean;
}

const WidgetCustomizationContext = createContext<WidgetCustomizationContextType | undefined>(undefined);

export const WidgetCustomizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customSettings, setCustomSettings] = useState<AllWidgetCustomizationSettings>({
    clock: DEFAULT_CLOCK_SETTINGS,
    calendar: DEFAULT_CALENDAR_SETTINGS,
    weather: DEFAULT_WEATHER_SETTINGS,
  });
  const [isLoadingCustomSettings, setIsLoadingCustomSettings] = useState<boolean>(true);

  useEffect(() => {
    setIsLoadingCustomSettings(true);
    try {
      const storedSettingsRaw = localStorage.getItem(LOCAL_STORAGE_WIDGET_CUSTOM_SETTINGS_KEY);
      if (storedSettingsRaw) {
        const storedSettings = JSON.parse(storedSettingsRaw) as AllWidgetCustomizationSettings;
        setCustomSettings(prev => ({
          clock: { ...DEFAULT_CLOCK_SETTINGS, ...storedSettings.clock }, // Ensure defaults are applied if new fields added
          calendar: { ...DEFAULT_CALENDAR_SETTINGS, ...storedSettings.calendar },
          weather: { ...DEFAULT_WEATHER_SETTINGS, ...storedSettings.weather },
        }));
      } else {
        // If no stored settings, initialize with defaults
        const initialDefaults = {
            clock: DEFAULT_CLOCK_SETTINGS,
            calendar: DEFAULT_CALENDAR_SETTINGS,
            weather: DEFAULT_WEATHER_SETTINGS,
        };
        setCustomSettings(initialDefaults);
        localStorage.setItem(LOCAL_STORAGE_WIDGET_CUSTOM_SETTINGS_KEY, JSON.stringify(initialDefaults));
      }
    } catch (error) {
      console.error("Error loading widget custom settings from localStorage:", error);
      // Fallback to default state which is already set
       setCustomSettings({
        clock: DEFAULT_CLOCK_SETTINGS,
        calendar: DEFAULT_CALENDAR_SETTINGS,
        weather: DEFAULT_WEATHER_SETTINGS,
      });
    }
    setIsLoadingCustomSettings(false);
  }, []);

  const saveSettings = useCallback((newSettings: AllWidgetCustomizationSettings) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_WIDGET_CUSTOM_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving widget custom settings to localStorage:", error);
    }
  }, []);

  const updateClockSettings = useCallback((newClockSettings: Partial<ClockWidgetSettings>) => {
    setCustomSettings(prev => {
      const updated = { ...prev, clock: { ...prev.clock!, ...newClockSettings } };
      saveSettings(updated);
      return updated;
    });
  }, [saveSettings]);

  const updateCalendarSettings = useCallback((newCalendarSettings: Partial<CalendarWidgetSettings>) => {
    setCustomSettings(prev => {
      const updated = { ...prev, calendar: { ...prev.calendar!, ...newCalendarSettings } };
      saveSettings(updated);
      return updated;
    });
  }, [saveSettings]);

  const updateWeatherSettings = useCallback((newWeatherSettings: Partial<WeatherWidgetSettings>) => {
    setCustomSettings(prev => {
      const updatedSettings = { ...prev.weather!, ...newWeatherSettings };
      // Ensure apiKey is always a string, even if undefined is passed
      if (typeof updatedSettings.apiKey === 'undefined') {
          updatedSettings.apiKey = prev.weather?.apiKey || '';
      }
      const updated = { ...prev, weather: updatedSettings };
      saveSettings(updated);
      return updated;
    });
  }, [saveSettings]);

  return (
    <WidgetCustomizationContext.Provider value={{ 
        customSettings, 
        updateClockSettings, 
        updateCalendarSettings,
        updateWeatherSettings,
        isLoadingCustomSettings 
    }}>
      {children}
    </WidgetCustomizationContext.Provider>
  );
};

export const useWidgetCustomization = (): WidgetCustomizationContextType => {
  const context = useContext(WidgetCustomizationContext);
  if (context === undefined) {
    throw new Error('useWidgetCustomization must be used within a WidgetCustomizationProvider');
  }
  return context;
};