import { AppwriteConfig, SiteIdentitySettings, DiscordSettings } from './types'; // WidgetConfig removed as WIDGET_REGISTRY is moved

// Widget Component imports are removed from here. They are now in config/widgetRegistry.ts

export const APPWRITE_CONFIG: AppwriteConfig = {
  endpoint: 'YOUR_APPWRITE_ENDPOINT', // e.g., 'https://cloud.appwrite.io/v1'
  projectId: 'YOUR_APPWRITE_PROJECT_ID',
  databaseId: 'YOUR_APPWRITE_DATABASE_ID',

  // Admin dashboard internal collections
  systemStatusCollectionId: 'internal_system_status',
  userActivityCollectionId: 'user_activity', // For existing widget
  activityLogsCollectionId: 'app_activity_logs', // New comprehensive logging
  serviceUptimeCollectionId: 'internal_service_uptime',
  errorReportsCollectionId: 'error_reports',

  // Public status page content collections
  publicServicesCollectionId: 'public_services',
  publicIncidentsCollectionId: 'public_incidents',
  incidentReviewsCollectionId: 'incident_reviews', 
  serviceGroupsCollectionId: 'service_groups', 
  severityLevelsCollectionId: 'severity_levels', 
  incidentStatusTypesCollectionId: 'incident_status_types', 
  siteIdentityCollectionId: 'site_identity_settings', 
  decisionFlowsCollectionId: 'decision_flows', 
  activeIncidentFlowsCollectionId: 'active_incident_flows', 
  discordSettingsCollectionId: 'discord_settings', // Added


  // Admin user management (if storing roles/details beyond Appwrite auth users)
  adminUsersCollectionId: 'admin_users',

  // API Key Management (conceptual collection ID)
  apiKeysCollectionId: 'api_keys',

  // Guest-submitted incident reports
  guestIncidentReportsCollectionId: 'guest_incident_reports',
};

// Example model names (not used in this app, but for reference per guidelines)
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
export const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002';

export const MOCK_USER_ID_ADMIN = 'admin_user_id'; // This is an ID for the User object from auth
export const MOCK_USER_ID_SUPPORT = 'support_user_id'; // This is an ID for the User object from auth

export const API_KEY_PREFIX = 'mrx_pk_';
export const LOCAL_STORAGE_API_KEYS_KEY = 'mrx-api-keys';
export const LOCAL_STORAGE_WIDGET_SETTINGS_KEY = 'mrx-widget-settings'; // For visibility
export const LOCAL_STORAGE_WIDGET_CUSTOM_SETTINGS_KEY = 'mrx-widget-custom-settings'; // For individual widget options
export const LOCAL_STORAGE_QUICK_NOTES_KEY = 'mrx-quick-notes';
export const LOCAL_STORAGE_SITE_IDENTITY_KEY = 'mrx-site-identity'; 
export const LOCAL_STORAGE_DISCORD_SETTINGS_KEY = 'mrx-discord-settings'; // Added

// WIDGET_REGISTRY is removed from here. It's now in config/widgetRegistry.ts

export const DEFAULT_SITE_IDENTITY: SiteIdentitySettings = {
  siteName: 'MRX United Status',
  logoUrl: '/assets/default-logo.png', // Provide a default logo in public/assets
  faviconUrl: '/favicon.ico', // Default favicon
  footerText: `© ${new Date().getFullYear()} MRX United. All rights reserved.`,
  metaDescription: 'Check the system status of MRX United services.',
};

// Site Identity document ID in Appwrite (single document for all settings)
export const SITE_IDENTITY_DOCUMENT_ID = 'default_settings';

// Discord Settings document ID in Appwrite
export const DISCORD_SETTINGS_DOCUMENT_ID = 'default_discord_config'; // Added

export const DEFAULT_DISCORD_SETTINGS: DiscordSettings = { // Added
  botToken: '',
  clientId: '',
  clientSecret: '',
  mainWebhookUrl: '',
  incidentAlertChannelId: '',
  maintenanceAlertChannelId: '',
  guestReportAlertChannelId: '',
  adminActivityAlertChannelId: '',
  enableIncidentAlerts: false,
  enableMaintenanceAlerts: false,
  enableGuestReportAlerts: false,
  enableAdminActivityAlerts: false,
  enableRichPresence: false,
  defaultRichPresenceDetails: 'Managing Status Platform',
  defaultRichPresenceState: 'MRX United',
  showSectionInPresence: true,
  showTimestampInPresence: true,
};
