
import React, { useState, useEffect } from 'react';
import { DiscordSettings } from '../../../types';
import LoadingSpinner from '../../ui/LoadingSpinner';

interface DiscordSettingsFormProps {
  initialSettings: DiscordSettings;
  onSave: (settings: Partial<Omit<DiscordSettings, '$id' | 'updatedAt'>>) => Promise<void>;
  isSubmitting: boolean;
  onTestWebhook: () => Promise<void>;
  isTestingWebhook: boolean;
  onTestRichPresence: () => void;
}

const DiscordSettingsForm: React.FC<DiscordSettingsFormProps> = ({ 
    initialSettings, onSave, isSubmitting, 
    onTestWebhook, isTestingWebhook, onTestRichPresence 
}) => {
  const [settings, setSettings] = useState<DiscordSettings>(initialSettings);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Basic validation (more can be added)
    if (settings.mainWebhookUrl && !settings.mainWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        setFormError('Main Webhook URL appears to be invalid.');
        return;
    }

    // Remove $id and updatedAt before saving if they exist
    const { $id, updatedAt, ...settingsToSave } = settings;
    await onSave(settingsToSave);
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";
  const checkboxLabelClass = `ml-2 text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]`;
  const checkboxClass = "h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700";

  return (
    <form onSubmit={handleSubmit} id="discord-settings-form" className="space-y-6">
      {formError && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm">
            <i className="fas fa-exclamation-circle mr-2"></i>{formError}
        </div>
      )}

      {/* Credentials Section */}
      <fieldset className="border p-4 rounded-md border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
        <legend className="px-2 text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Credentials (Handle with Care)</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
                <label htmlFor="botToken" className={labelClass}>Bot Token</label>
                <input type="password" id="botToken" name="botToken" value={settings.botToken || ''} onChange={handleInputChange}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="Discord Bot Token"/>
            </div>
            <div>
                <label htmlFor="clientId" className={labelClass}>Client ID</label>
                <input type="text" id="clientId" name="clientId" value={settings.clientId || ''} onChange={handleInputChange}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="Discord Application Client ID"/>
            </div>
            {/* Client Secret might not be needed for bot token auth, but included per prompt */}
            <div>
                <label htmlFor="clientSecret" className={labelClass}>Client Secret</label>
                <input type="password" id="clientSecret" name="clientSecret" value={settings.clientSecret || ''} onChange={handleInputChange}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="Discord Application Client Secret"/>
            </div>
        </div>
      </fieldset>

      {/* Webhook Section */}
      <fieldset className="border p-4 rounded-md border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
        <legend className="px-2 text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Webhook Configuration</legend>
        <div className="space-y-4 mt-2">
            <div>
                <label htmlFor="mainWebhookUrl" className={labelClass}>Main Webhook URL</label>
                <div className="flex items-center space-x-2">
                    <input type="url" id="mainWebhookUrl" name="mainWebhookUrl" value={settings.mainWebhookUrl || ''} onChange={handleInputChange}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} flex-grow`} disabled={isSubmitting} placeholder="General Discord Webhook URL"/>
                    <button type="button" onClick={onTestWebhook} disabled={isSubmitting || isTestingWebhook || !settings.mainWebhookUrl}
                            className="px-3 py-2 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 flex items-center">
                        {isTestingWebhook ? <LoadingSpinner size="sm" color="text-white" className="mr-1.5"/> : <i className="fas fa-paper-plane mr-1.5"></i>} Test
                    </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Used for general status updates if specific channels aren't set.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="incidentAlertChannelId" className={labelClass}>Incident Alert Channel ID</label>
                    <input type="text" id="incidentAlertChannelId" name="incidentAlertChannelId" value={settings.incidentAlertChannelId || ''} onChange={handleInputChange}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="Optional: Specific Channel ID"/>
                </div>
                 <div>
                    <label htmlFor="maintenanceAlertChannelId" className={labelClass}>Maintenance Alert Channel ID</label>
                    <input type="text" id="maintenanceAlertChannelId" name="maintenanceAlertChannelId" value={settings.maintenanceAlertChannelId || ''} onChange={handleInputChange}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="Optional: Specific Channel ID"/>
                </div>
                <div>
                    <label htmlFor="guestReportAlertChannelId" className={labelClass}>Guest Report Channel ID</label>
                    <input type="text" id="guestReportAlertChannelId" name="guestReportAlertChannelId" value={settings.guestReportAlertChannelId || ''} onChange={handleInputChange}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="Optional: Specific Channel ID"/>
                </div>
                <div>
                    <label htmlFor="adminActivityAlertChannelId" className={labelClass}>Admin Activity Channel ID</label>
                    <input type="text" id="adminActivityAlertChannelId" name="adminActivityAlertChannelId" value={settings.adminActivityAlertChannelId || ''} onChange={handleInputChange}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="Optional: Specific Channel ID"/>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2">
                <div className="flex items-center"><input type="checkbox" id="enableIncidentAlerts" name="enableIncidentAlerts" checked={settings.enableIncidentAlerts || false} onChange={handleInputChange} className={checkboxClass} disabled={isSubmitting}/><label htmlFor="enableIncidentAlerts" className={checkboxLabelClass}>Enable Incident Alerts</label></div>
                <div className="flex items-center"><input type="checkbox" id="enableMaintenanceAlerts" name="enableMaintenanceAlerts" checked={settings.enableMaintenanceAlerts || false} onChange={handleInputChange} className={checkboxClass} disabled={isSubmitting}/><label htmlFor="enableMaintenanceAlerts" className={checkboxLabelClass}>Enable Maintenance Alerts</label></div>
                <div className="flex items-center"><input type="checkbox" id="enableGuestReportAlerts" name="enableGuestReportAlerts" checked={settings.enableGuestReportAlerts || false} onChange={handleInputChange} className={checkboxClass} disabled={isSubmitting}/><label htmlFor="enableGuestReportAlerts" className={checkboxLabelClass}>Enable Guest Report Alerts</label></div>
                <div className="flex items-center"><input type="checkbox" id="enableAdminActivityAlerts" name="enableAdminActivityAlerts" checked={settings.enableAdminActivityAlerts || false} onChange={handleInputChange} className={checkboxClass} disabled={isSubmitting}/><label htmlFor="enableAdminActivityAlerts" className={checkboxLabelClass}>Enable Admin Activity Alerts</label></div>
            </div>
        </div>
      </fieldset>

      {/* Rich Presence Section */}
      <fieldset className="border p-4 rounded-md border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
        <legend className="px-2 text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Admin Rich Presence (Conceptual)</legend>
         <div className="space-y-4 mt-2">
            <div className="flex items-center"><input type="checkbox" id="enableRichPresence" name="enableRichPresence" checked={settings.enableRichPresence || false} onChange={handleInputChange} className={checkboxClass} disabled={isSubmitting}/><label htmlFor="enableRichPresence" className={checkboxLabelClass}>Enable Rich Presence for My Account</label></div>
            {settings.enableRichPresence && (
                <>
                    <div>
                        <label htmlFor="defaultRichPresenceDetails" className={labelClass}>Default "Details" Text</label>
                        <input type="text" id="defaultRichPresenceDetails" name="defaultRichPresenceDetails" value={settings.defaultRichPresenceDetails || ''} onChange={handleInputChange}
                            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="e.g., Managing Status"/>
                    </div>
                    <div>
                        <label htmlFor="defaultRichPresenceState" className={labelClass}>Default "State" Text</label>
                        <input type="text" id="defaultRichPresenceState" name="defaultRichPresenceState" value={settings.defaultRichPresenceState || ''} onChange={handleInputChange}
                            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting} placeholder="e.g., MRX United Platform"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2">
                       <div className="flex items-center"><input type="checkbox" id="showSectionInPresence" name="showSectionInPresence" checked={settings.showSectionInPresence || false} onChange={handleInputChange} className={checkboxClass} disabled={isSubmitting}/><label htmlFor="showSectionInPresence" className={checkboxLabelClass}>Show Current Dashboard Section</label></div>
                       <div className="flex items-center"><input type="checkbox" id="showTimestampInPresence" name="showTimestampInPresence" checked={settings.showTimestampInPresence || false} onChange={handleInputChange} className={checkboxClass} disabled={isSubmitting}/><label htmlFor="showTimestampInPresence" className={checkboxLabelClass}>Show "Since [Time]"</label></div>
                    </div>
                    <button type="button" onClick={onTestRichPresence} disabled={isSubmitting}
                            className="px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50">
                        <i className="fab fa-discord mr-1.5"></i>Test Rich Presence (Log to Console)
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Note: Full Rich Presence requires a local Discord client and specific setup not directly manageable via this web UI.</p>
                </>
            )}
        </div>
      </fieldset>

      <div className="pt-5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] disabled:opacity-70 flex items-center justify-center"
        >
          {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : <i className="fas fa-save mr-2"></i>}
          {isSubmitting ? 'Saving...' : 'Save Discord Settings'}
        </button>
      </div>
    </form>
  );
};

export default DiscordSettingsForm;
