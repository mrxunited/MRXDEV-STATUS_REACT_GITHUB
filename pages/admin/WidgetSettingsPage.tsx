
import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useWidgetSettings } from '../../contexts/WidgetSettingsContext';
import { useWidgetCustomization } from '../../contexts/WidgetCustomizationContext';
import { WidgetConfig, ClockFormat, CalendarStartDay, WeatherUnit, WeatherLocationMode } from '../../types';

const WidgetSettingsPage: React.FC = () => {
  const { widgetSettings, toggleWidgetVisibility, isLoadingSettings: isLoadingVisibility, getAllWidgetConfigs } = useWidgetSettings();
  const { customSettings, updateClockSettings, updateCalendarSettings, updateWeatherSettings, isLoadingCustomSettings } = useWidgetCustomization();

  const allWidgets = getAllWidgetConfigs();
  const isLoading = isLoadingVisibility || isLoadingCustomSettings;

  // Local state for weather manual location input and API key to avoid updating context on every keystroke
  const [manualWeatherLocationInput, setManualWeatherLocationInput] = useState(customSettings.weather?.manualLocation || '');
  const [weatherApiKeyInput, setWeatherApiKeyInput] = useState(customSettings.weather?.apiKey || '');

  useEffect(() => {
    if (!isLoadingCustomSettings) {
      setManualWeatherLocationInput(customSettings.weather?.manualLocation || '');
      setWeatherApiKeyInput(customSettings.weather?.apiKey || '');
    }
  }, [customSettings.weather?.manualLocation, customSettings.weather?.apiKey, isLoadingCustomSettings]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">Loading widget settings...</p>
      </div>
    );
  }
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  // const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";
  const smallLabelClass = "block text-xs font-medium text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-0.5";
  const buttonGroupBase = "px-3 py-1.5 text-xs rounded-md transition-colors";
  const buttonGroupActive = "bg-[var(--color-primary-blue)] text-white";
  const buttonGroupInactive = "bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]";


  return (
    <div className="space-y-6">
      <Card title="Customize Dashboard Widgets" titleIcon="fa-puzzle-piece">
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-6 text-sm">
          Enable, disable, and configure the widgets displayed on your admin dashboard's side panel.
          Changes are saved automatically when you leave an input field or click a button.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allWidgets.map((widget: WidgetConfig) => (
            <Card key={widget.id} title={widget.title} titleIcon={widget.icon} className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
                  Display this widget
                </span>
                <label htmlFor={`widget-toggle-${widget.id}`} className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id={`widget-toggle-${widget.id}`}
                    className="sr-only peer"
                    checked={widgetSettings[widget.id] || false}
                    onChange={() => toggleWidgetVisibility(widget.id)}
                  />
                  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-primary-blue)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-500 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary-blue)]"></div>
                </label>
              </div>

              {/* Specific configurations */}
              {widgetSettings[widget.id] && (
                <>
                  {widget.id === 'clock' && customSettings.clock && (
                    <div className="space-y-2 pt-3 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
                      <label className={smallLabelClass}>Time Format</label>
                      <div className="flex space-x-2">
                        {(['12h', '24h'] as ClockFormat[]).map(format => (
                          <button
                            key={format}
                            onClick={() => updateClockSettings({ format })}
                            className={`${buttonGroupBase} ${customSettings.clock?.format === format ? buttonGroupActive : buttonGroupInactive}`}
                          >
                            {format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {widget.id === 'calendar' && customSettings.calendar && (
                     <div className="space-y-2 pt-3 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
                      <label className={smallLabelClass}>Start Week On</label>
                      <div className="flex space-x-2">
                        {(['sunday', 'monday'] as CalendarStartDay[]).map(day => (
                          <button
                            key={day}
                            onClick={() => updateCalendarSettings({ startDay: day })}
                            className={`${buttonGroupBase} ${customSettings.calendar?.startDay === day ? buttonGroupActive : buttonGroupInactive}`}
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {widget.id === 'weather' && customSettings.weather && (
                    <div className="space-y-3 pt-3 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
                      <div>
                        <label className={smallLabelClass}>Temperature Unit</label>
                        <div className="flex space-x-2">
                          {(['C', 'F'] as WeatherUnit[]).map(unit => (
                            <button
                              key={unit}
                              onClick={() => updateWeatherSettings({ unit })}
                              className={`${buttonGroupBase} ${customSettings.weather?.unit === unit ? buttonGroupActive : buttonGroupInactive}`}
                            >
                              °{unit}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={smallLabelClass}>Location Mode</label>
                        <div className="flex space-x-2">
                          {(['auto', 'manual'] as WeatherLocationMode[]).map(mode => (
                            <button
                              key={mode}
                              onClick={() => updateWeatherSettings({ locationMode: mode })}
                              className={`${buttonGroupBase} ${customSettings.weather?.locationMode === mode ? buttonGroupActive : buttonGroupInactive}`}
                            >
                              {mode === 'auto' ? 'Automatic' : 'Manual'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {customSettings.weather.locationMode === 'manual' && (
                        <div>
                          <label htmlFor={`manual-weather-location-${widget.id}`} className={smallLabelClass}>Manual Location</label>
                          <input
                            type="text"
                            id={`manual-weather-location-${widget.id}`}
                            value={manualWeatherLocationInput}
                            onChange={(e) => setManualWeatherLocationInput(e.target.value)}
                            onBlur={() => updateWeatherSettings({ manualLocation: manualWeatherLocationInput })}
                            placeholder="Enter city name"
                            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} text-xs py-1.5`}
                          />
                        </div>
                      )}
                       <div>
                          <label htmlFor={`weather-api-key-${widget.id}`} className={smallLabelClass}>Weather API Key</label>
                          <input
                            type="text" 
                            id={`weather-api-key-${widget.id}`}
                            value={weatherApiKeyInput}
                            onChange={(e) => setWeatherApiKeyInput(e.target.value)}
                            onBlur={() => updateWeatherSettings({ apiKey: weatherApiKeyInput })}
                            placeholder="Enter your weather API key"
                            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} text-xs py-1.5`}
                          />
                           <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Example: <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary-blue)] hover:underline">OpenWeatherMap API Key</a>
                          </p>
                        </div>
                    </div>
                  )}
                  
                  {/* Placeholder for widgets without specific settings */}
                  {widget.id !== 'clock' && widget.id !== 'calendar' && widget.id !== 'weather' && (
                    <div className="pt-3 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">No specific settings for this widget.</p>
                    </div>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default WidgetSettingsPage;