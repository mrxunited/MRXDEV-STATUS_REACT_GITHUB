
import { ID, Query, Models } from 'appwrite';
import { SiteIdentitySettings } from '../../types';
import { APPWRITE_CONFIG, SITE_IDENTITY_DOCUMENT_ID, DEFAULT_SITE_IDENTITY } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';

const mapDocumentToSiteIdentity = (doc: Models.Document): SiteIdentitySettings => ({
  $id: doc.$id,
  siteName: doc.siteName || DEFAULT_SITE_IDENTITY.siteName,
  logoUrl: doc.logoUrl,
  faviconUrl: doc.faviconUrl,
  footerText: doc.footerText || DEFAULT_SITE_IDENTITY.footerText,
  metaDescription: doc.metaDescription || DEFAULT_SITE_IDENTITY.metaDescription,
  updatedAt: doc.$updatedAt,
});

export const adminGetSiteIdentitySettings = async (): Promise<SiteIdentitySettings | null> => {
  const operationName = 'adminGetSiteIdentitySettings';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK (localStorage/default) data for ${operationName}.`);
    const stored = localStorage.getItem('mrx-site-identity-mock'); // Use a distinct key for mock
    return simulateApiCall(stored ? JSON.parse(stored) : DEFAULT_SITE_IDENTITY);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.siteIdentityCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.siteIdentityCollectionId ? "Site Identity Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    // Fallback to default if not configured or SDK init failed, to allow app to run with defaults
    return DEFAULT_SITE_IDENTITY; 
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const document = await databases.getDocument(
        APPWRITE_CONFIG.databaseId!, 
        APPWRITE_CONFIG.siteIdentityCollectionId!,
        SITE_IDENTITY_DOCUMENT_ID 
    );
    return mapDocumentToSiteIdentity(document);
  } catch (error: any) {
    if (error.code === 404) { // Document not found, return defaults (first time setup)
        console.warn(`Site identity settings document ('${SITE_IDENTITY_DOCUMENT_ID}') not found. Returning defaults.`);
        return DEFAULT_SITE_IDENTITY;
    }
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    // Fallback to default on error to keep app functional
    return DEFAULT_SITE_IDENTITY;
  }
};

export const adminUpdateSiteIdentitySettings = async (settings: Omit<SiteIdentitySettings, '$id' | 'updatedAt'>): Promise<SiteIdentitySettings> => {
  const operationName = 'adminUpdateSiteIdentitySettings';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update (localStorage) for ${operationName}.`);
    const updatedSettings = { ...DEFAULT_SITE_IDENTITY, ...settings, $id: SITE_IDENTITY_DOCUMENT_ID, updatedAt: new Date().toISOString() };
    localStorage.setItem('mrx-site-identity-mock', JSON.stringify(updatedSettings));
    return simulateApiCall(updatedSettings);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.siteIdentityCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.siteIdentityCollectionId ? "Site Identity Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload = { ...settings };
    // Ensure undefined fields are not sent if they are optional and empty
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);

    const document = await databases.updateDocument(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.siteIdentityCollectionId!,
        SITE_IDENTITY_DOCUMENT_ID,
        payload
    );
    return mapDocumentToSiteIdentity(document);
  } catch (error: any) {
    if (error.code === 404) { // Document not found, create it
      try {
        const document = await databases.createDocument(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.siteIdentityCollectionId!,
            SITE_IDENTITY_DOCUMENT_ID,
            settings
        );
        return mapDocumentToSiteIdentity(document);
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
