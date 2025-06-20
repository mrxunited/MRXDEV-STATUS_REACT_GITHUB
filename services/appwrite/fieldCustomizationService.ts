
import { ID, Query, Models } from 'appwrite';
import { IncidentStatusDefinition } from '../../types';
import { APPWRITE_CONFIG } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService';

// --- Data Mapping Helper ---
const mapDocumentToIncidentStatusDefinition = (doc: Models.Document): IncidentStatusDefinition => ({
  id: doc.$id,
  $id: doc.$id,
  name: doc.name,
  description: doc.description,
  color: doc.color,
  displayOrder: doc.displayOrder,
  isEnabled: typeof doc.isEnabled === 'boolean' ? doc.isEnabled : true, // Default to true if not set
  isDefault: typeof doc.isDefault === 'boolean' ? doc.isDefault : false, // Default to false
  createdAt: doc.$createdAt,
  updatedAt: doc.$updatedAt,
});

// --- Incident Status Definition Management ---
export const adminGetAllIncidentStatusDefinitions = async (): Promise<IncidentStatusDefinition[]> => {
  const operationName = 'adminGetAllIncidentStatusDefinitions';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockIncidentStatusDefinitions());
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentStatusTypesCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.incidentStatusTypesCollectionId ? "Incident Status Types Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentStatusTypesCollectionId!, [Query.orderAsc('displayOrder')]
    );
    return response.documents.map(mapDocumentToIncidentStatusDefinition);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const adminCreateIncidentStatusDefinition = async (data: Omit<IncidentStatusDefinition, 'id' | '$id' | 'createdAt' | 'updatedAt'>): Promise<IncidentStatusDefinition> => {
  const operationName = 'adminCreateIncidentStatusDefinition';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
    return simulateApiCall(mockService.createMockIncidentStatusDefinition(data));
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentStatusTypesCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.incidentStatusTypesCollectionId ? "Incident Status Types Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload = {
        ...data,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        isDefault: data.isDefault !== undefined ? data.isDefault : false,
    };
    const document = await databases.createDocument(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentStatusTypesCollectionId!, ID.unique(), payload
    );
    return mapDocumentToIncidentStatusDefinition(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
  }
};

export const adminUpdateIncidentStatusDefinition = async (id: string, updates: Partial<Omit<IncidentStatusDefinition, 'id' | '$id' | 'createdAt' | 'updatedAt'>>): Promise<IncidentStatusDefinition> => {
  const operationName = 'adminUpdateIncidentStatusDefinition';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update for ${operationName}.`);
    const updatedStatus = mockService.updateMockIncidentStatusDefinition(id, updates);
    if (!updatedStatus) throw new Error("Incident status definition not found for update.");
    return simulateApiCall(updatedStatus);
  }
   if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentStatusTypesCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.incidentStatusTypesCollectionId ? "Incident Status Types Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const document = await databases.updateDocument(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentStatusTypesCollectionId!, id, updates
    );
    return mapDocumentToIncidentStatusDefinition(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
  }
};

export const adminDeleteIncidentStatusDefinition = async (id: string): Promise<void> => {
  const operationName = 'adminDeleteIncidentStatusDefinition';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating delete for ${operationName}.`);
    mockService.deleteMockIncidentStatusDefinition(id);
    return simulateApiCall(undefined);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentStatusTypesCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.incidentStatusTypesCollectionId ? "Incident Status Types Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    // TODO: Add check if status is in use by incidents before deleting, or handle reassignment.
    await databases.deleteDocument(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentStatusTypesCollectionId!, id
    );
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting ${operationName}): ${errMsg}`);
  }
};
