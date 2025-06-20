
import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DiscordSettingsForm from '../../components/admin/forms/DiscordSettingsForm';
import { useDiscordSettings } from '../../contexts/DiscordSettingsContext';
import { useNotification } from '../../contexts/NotificationContext';
import { DiscordSettings, DiscordRichPresenceActivity } from '../../types';
import { discordSendTestWebhook, updateDiscordRichPresence } from '../../services/appwrite/discordService'; // Updated import path
import { useAuth } from '../../contexts/AuthContext'; // For admin name in Rich Presence test

const DiscordIntegrationPage: React.FC = () => {
  const { discordSettings, isLoadingDiscordSettings, updateDiscordSettings } = useDiscordSettings();
  const { addNotification } = useNotification();
  const { user } = useAuth(); // Get current user
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const handleSave = async (settingsUpdate: Partial<Omit<DiscordSettings, '$id' | 'updatedAt'>>) => {
    setIsSubmitting(true);
    try {
      await updateDiscordSettings(settingsUpdate);
      addNotification({ type: 'success', title: 'Settings Updated', message: 'Discord integration settings saved successfully.' });
    } catch (error) {
      const errorMsg = (error instanceof Error) ? error.message : 'Failed to save Discord settings.';
      addNotification({ type: 'error', title: 'Save Failed', message: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!discordSettings.mainWebhookUrl) {
        addNotification({type: 'warning', title: 'Webhook URL Missing', message: 'Please configure and save a Main Webhook URL first.'});
        return;
    }
    setIsTestingWebhook(true);
    try {
        await discordSendTestWebhook(discordSettings.mainWebhookUrl);
        addNotification({type: 'success', title: 'Test Sent', message: 'Test webhook message sent successfully! Check your Discord channel.'});
    } catch (error) {
        addNotification({type: 'error', title: 'Webhook Test Failed', message: (error as Error).message || 'Could not send test message.'});
    } finally {
        setIsTestingWebhook(false);
    }
  };
  
  const handleTestRichPresence = () => {
    const activity: DiscordRichPresenceActivity = {
      details: discordSettings.defaultRichPresenceDetails || 'Managing Status Platform',
      state: discordSettings.defaultRichPresenceState || 'MRX United Admin',
    };
    if (discordSettings.showTimestampInPresence) {
      activity.startTimestamp = Date.now();
    }
    // Example: Dynamically set state based on current page (conceptual)
    // if (discordSettings.showSectionInPresence) {
    //   activity.state = `Viewing: Discord Settings`; 
    // }
    updateDiscordRichPresence(activity); // This logs to console
    addNotification({type: 'info', title: 'Rich Presence Test', message: 'Rich Presence data logged to console. True RPC requires a local client.'});
  };


  if (isLoadingDiscordSettings && !discordSettings.botToken) { 
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">Loading Discord settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Discord Integration Settings" titleIcon="fab fa-discord">
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-6 text-sm">
          Configure how the status platform interacts with your Discord server.
        </p>
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-500">
            <h4 className="font-semibold text-yellow-700 dark:text-yellow-200 mb-1">Security Warning</h4>
            <p className="text-xs text-yellow-600 dark:text-yellow-300">
                Storing Bot Tokens or Client Secrets directly is not recommended for production environments.
                For enhanced security, consider using Appwrite Functions as an intermediary to handle Discord API interactions.
                Treat these credentials with extreme care.
            </p>
        </div>
        
        {discordSettings ? (
          <DiscordSettingsForm
            initialSettings={discordSettings}
            onSave={handleSave}
            isSubmitting={isSubmitting}
            onTestWebhook={handleTestWebhook}
            isTestingWebhook={isTestingWebhook}
            onTestRichPresence={handleTestRichPresence}
          />
        ) : (
          <p className="text-red-500">Could not load Discord settings. Please try refreshing.</p>
        )}
      </Card>
    </div>
  );
};

export default DiscordIntegrationPage;