
import { ID, Query, Models } from 'appwrite';
import { SeverityLevel } from '../../types';
import { APPWRITE_CONFIG } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService'; // Corrected import path

// --- Data Mapping Helper ---
const mapDocumentToSeverityLevel = (doc: Models.Document): SeverityLevel => ({
  id: doc.$id,
  $id: doc.$id,
  name: doc.name,
  color: doc.color,
  priority: doc.priority,
  description: doc.description,
  createdAt: doc.$createdAt,
  updatedAt: doc.$updatedAt,
});

// --- Severity Level Management ---
export const adminGetAllSeverityLevels = async (): Promise<SeverityLevel[]> => {
  const operationName = 'adminGetAllSeverityLevels';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockSeverityLevels());
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.severityLevelsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.severityLevelsCollectionId ? "Severity Levels Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.severityLevelsCollectionId!, [Query.orderAsc('priority')]
    );
    return response.documents.map(mapDocumentToSeverityLevel);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const adminCreateSeverityLevel = async (data: Omit<SeverityLevel, 'id' | '$id' | 'createdAt' | 'updatedAt'>): Promise<SeverityLevel> => {
  const operationName = 'adminCreateSeverityLevel';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
    return simulateApiCall(mockService.createMockSeverityLevel(data));
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.severityLevelsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.severityLevelsCollectionId ? "Severity Levels Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const document = await databases.createDocument(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.severityLevelsCollectionId!, ID.unique(), data
    );
    return mapDocumentToSeverityLevel(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
  }
};

export const adminUpdateSeverityLevel = async (id: string, updates: Partial<Omit<SeverityLevel, 'id' | '$id' | 'createdAt' | 'updatedAt'>>): Promise<SeverityLevel> => {
  const operationName = 'adminUpdateSeverityLevel';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update for ${operationName}.`);
    const updatedLevel = mockService.updateMockSeverityLevel(id, updates);
    if (!updatedLevel) throw new Error("Severity level not found for update.");
    return simulateApiCall(updatedLevel);
  }
   if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.severityLevelsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.severityLevelsCollectionId ? "Severity Levels Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const document = await databases.updateDocument(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.severityLevelsCollectionId!, id, updates
    );
    return mapDocumentToSeverityLevel(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
  }
};

export const adminDeleteSeverityLevel = async (id: string): Promise<void> => {
  const operationName = 'adminDeleteSeverityLevel';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating delete for ${operationName}.`);
    mockService.deleteMockSeverityLevel(id); // This mock function needs to be updated to throw error if in use
    return simulateApiCall(undefined);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.severityLevelsCollectionId || !APPWRITE_CONFIG.publicIncidentsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.severityLevelsCollectionId ? "Severity Levels Collection ID not configured." : !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured for usage check." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName} (Checking usage for ID: ${id})`);
    // Check if any incident uses this severity level
    const usageCheckResponse = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.publicIncidentsCollectionId!,
      [Query.equal('severityLevelId', id), Query.limit(1)]
    );

    if (usageCheckResponse.total > 0) {
      throw new Error(`Severity level is currently in use by ${usageCheckResponse.total} incident(s) and cannot be deleted. Please reassign incidents to other severity levels first.`);
    }

    // If not in use, proceed with deletion
    await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.severityLevelsCollectionId!, id
    );
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    // Don't re-wrap if it's our custom "in use" error.
    if (errMsg.includes("Severity level is currently in use")) {
        console.error(`Appwrite Call Info for ${operationName}: ${errMsg}.`);
        throw error;
    }
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting ${operationName}): ${errMsg}`);
  }
};