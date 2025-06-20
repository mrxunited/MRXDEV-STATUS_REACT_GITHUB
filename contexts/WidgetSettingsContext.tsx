
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { LOCAL_STORAGE_WIDGET_SETTINGS_KEY } from '../constants';
import { WIDGET_REGISTRY } from '../config/widgetRegistry'; 
import { WidgetConfig } from '../types';
import { useNotification } from './NotificationContext'; // Import useNotification

interface WidgetSettingsContextType {
  widgetSettings: Record<string, boolean>;
  toggleWidgetVisibility: (widgetId: string) => void;
  isLoadingSettings: boolean;
  getAllWidgetConfigs: () => WidgetConfig[];
}

const WidgetSettingsContext = createContext<WidgetSettingsContextType | undefined>(undefined);

export const WidgetSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [widgetSettings, setWidgetSettings] = useState<Record<string, boolean>>({});
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const { addNotification } = useNotification(); // Use notification context

  useEffect(() => {
    setIsLoadingSettings(true);
    try {
      const storedSettingsRaw = localStorage.getItem(LOCAL_STORAGE_WIDGET_SETTINGS_KEY);
      const storedSettings = storedSettingsRaw ? JSON.parse(storedSettingsRaw) : {};
      
      const initialSettings: Record<string, boolean> = {};
      WIDGET_REGISTRY.forEach(widget => {
        initialSettings[widget.id] = storedSettings[widget.id] !== undefined ? storedSettings[widget.id] : widget.defaultEnabled;
      });
      setWidgetSettings(initialSettings);

    } catch (error) {
      console.error("Error loading widget settings from localStorage:", error);
      const defaultSettings: Record<string, boolean> = {};
      WIDGET_REGISTRY.forEach(widget => {
        defaultSettings[widget.id] = widget.defaultEnabled;
      });
      setWidgetSettings(defaultSettings);
    }
    setIsLoadingSettings(false);
  }, []);

  const toggleWidgetVisibility = useCallback((widgetId: string) => {
    // Determine the new visibility based on the current state
    const newVisibility = !widgetSettings[widgetId];
    const newSettings = { ...widgetSettings, [widgetId]: newVisibility };

    // Update localStorage (side effect)
    try {
      localStorage.setItem(LOCAL_STORAGE_WIDGET_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving widget settings to localStorage:", error);
      // Optionally, notify user of save failure, though it's a local operation
    }

    // Update React state
    setWidgetSettings(newSettings);

    // Add notification (side effect)
    const widget = WIDGET_REGISTRY.find(w => w.id === widgetId);
    const widgetTitle = widget ? widget.title : widgetId;
    
    addNotification({
      type: newVisibility ? 'success' : 'info',
      title: `Widget ${newVisibility ? 'Enabled' : 'Disabled'}`,
      message: `Widget "${widgetTitle}" has been ${newVisibility ? 'added to' : 'removed from'} your dashboard.`
    });
  }, [widgetSettings, addNotification]); // Added widgetSettings to dependencies
  
  const getAllWidgetConfigs = useCallback((): WidgetConfig[] => {
    return WIDGET_REGISTRY;
  }, []);

  return (
    <WidgetSettingsContext.Provider value={{ widgetSettings, toggleWidgetVisibility, isLoadingSettings, getAllWidgetConfigs }}>
      {children}
    </WidgetSettingsContext.Provider>
  );
};

export const useWidgetSettings = (): WidgetSettingsContextType => {
  const context = useContext(WidgetSettingsContext);
  if (context === undefined) {
    throw new Error('useWidgetSettings must be used within a WidgetSettingsProvider');
  }
  return context;
};
