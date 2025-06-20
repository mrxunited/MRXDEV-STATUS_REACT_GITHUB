
import { Models } from 'appwrite';
import { DiscordSettings } from '../../types';
import { APPWRITE_CONFIG, DISCORD_SETTINGS_DOCUMENT_ID, DEFAULT_DISCORD_SETTINGS } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService';

const mapDocumentToDiscordSettings = (doc: Models.Document): DiscordSettings => ({
  $id: doc.$id,
  botToken: doc.botToken,
  clientId: doc.clientId,
  clientSecret: doc.clientSecret,
  mainWebhookUrl: doc.mainWebhookUrl,
  incidentAlertChannelId: doc.incidentAlertChannelId,
  maintenanceAlertChannelId: doc.maintenanceAlertChannelId,
  guestReportAlertChannelId: doc.guestReportAlertChannelId,
  adminActivityAlertChannelId: doc.adminActivityAlertChannelId,
  enableIncidentAlerts: typeof doc.enableIncidentAlerts === 'boolean' ? doc.enableIncidentAlerts : DEFAULT_DISCORD_SETTINGS.enableIncidentAlerts,
  enableMaintenanceAlerts: typeof doc.enableMaintenanceAlerts === 'boolean' ? doc.enableMaintenanceAlerts : DEFAULT_DISCORD_SETTINGS.enableMaintenanceAlerts,
  enableGuestReportAlerts: typeof doc.enableGuestReportAlerts === 'boolean' ? doc.enableGuestReportAlerts : DEFAULT_DISCORD_SETTINGS.enableGuestReportAlerts,
  enableAdminActivityAlerts: typeof doc.enableAdminActivityAlerts === 'boolean' ? doc.enableAdminActivityAlerts : DEFAULT_DISCORD_SETTINGS.enableAdminActivityAlerts,
  enableRichPresence: typeof doc.enableRichPresence === 'boolean' ? doc.enableRichPresence : DEFAULT_DISCORD_SETTINGS.enableRichPresence,
  defaultRichPresenceDetails: doc.defaultRichPresenceDetails || DEFAULT_DISCORD_SETTINGS.defaultRichPresenceDetails,
  defaultRichPresenceState: doc.defaultRichPresenceState || DEFAULT_DISCORD_SETTINGS.defaultRichPresenceState,
  showSectionInPresence: typeof doc.showSectionInPresence === 'boolean' ? doc.showSectionInPresence : DEFAULT_DISCORD_SETTINGS.showSectionInPresence,
  showTimestampInPresence: typeof doc.showTimestampInPresence === 'boolean' ? doc.showTimestampInPresence : DEFAULT_DISCORD_SETTINGS.showTimestampInPresence,
  updatedAt: doc.$updatedAt,
});

export const adminGetDiscordSettings = async (): Promise<DiscordSettings | null> => {
  const operationName = 'adminGetDiscordSettings';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK (localStorage/default) data for ${operationName}.`);
    const stored = localStorage.getItem('mrx-discord-settings-mock'); 
    return simulateApiCall(stored ? JSON.parse(stored) : DEFAULT_DISCORD_SETTINGS);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.discordSettingsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.discordSettingsCollectionId ? "Discord Settings Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    return DEFAULT_DISCORD_SETTINGS; 
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const document = await databases.getDocument(
        APPWRITE_CONFIG.databaseId!, 
        APPWRITE_CONFIG.discordSettingsCollectionId!,
        DISCORD_SETTINGS_DOCUMENT_ID 
    );
    return mapDocumentToDiscordSettings(document);
  } catch (error: any) {
    if (error.code === 404) { 
        console.warn(`Discord settings document ('${DISCORD_SETTINGS_DOCUMENT_ID}') not found. Returning defaults.`);
        return DEFAULT_DISCORD_SETTINGS;
    }
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    return DEFAULT_DISCORD_SETTINGS;
  }
};

export const adminUpdateDiscordSettings = async (settings: Omit<DiscordSettings, '$id' | 'updatedAt'>): Promise<DiscordSettings> => {
  const operationName = 'adminUpdateDiscordSettings';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update (localStorage) for ${operationName}.`);
    const updatedSettings = { ...DEFAULT_DISCORD_SETTINGS, ...settings, $id: DISCORD_SETTINGS_DOCUMENT_ID, updatedAt: new Date().toISOString() };
    localStorage.setItem('mrx-discord-settings-mock', JSON.stringify(updatedSettings));
    return simulateApiCall(updatedSettings);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.discordSettingsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.discordSettingsCollectionId ? "Discord Settings Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload = { ...settings };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);

    const document = await databases.updateDocument(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.discordSettingsCollectionId!,
        DISCORD_SETTINGS_DOCUMENT_ID,
        payload
    );
    return mapDocumentToDiscordSettings(document);
  } catch (error: any) {
    if (error.code === 404) { 
      try {
        const document = await databases.createDocument(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.discordSettingsCollectionId!,
            DISCORD_SETTINGS_DOCUMENT_ID,
            settings
        );
        return mapDocumentToDiscordSettings(document);
      } catch (createError) {
        const createErrMsg = (createError instanceof Error) ? createError.message : String(createError);
        console.error(`Appwrite Call FAILED for ${operationName} (create attempt). Error: ${createErrMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${createErrMsg}`);
      }
    }
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
  }
};
