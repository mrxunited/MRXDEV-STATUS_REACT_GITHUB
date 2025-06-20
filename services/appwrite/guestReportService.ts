
import { ID, Query, Models } from 'appwrite';
import { GuestIncidentReport, GuestIncidentReportStatus } from '../../types';
import { APPWRITE_CONFIG } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService'; // Corrected import path

// --- Data Mapping Helper ---
const mapDocumentToGuestIncidentReport = (doc: Models.Document): GuestIncidentReport => ({
  $id: doc.$id,
  id: doc.$id,
  serviceId: doc.serviceId,
  description: doc.description,
  email: doc.email,
  submittedAt: doc.submittedAt,
  status: doc.status as GuestIncidentReportStatus,
  userAgent: doc.userAgent,
  notes: doc.notes,
  officialIncidentId: doc.officialIncidentId,
});

// --- Guest Incident Reports ---
export const createGuestIncidentReport = async (
  reportData: Omit<GuestIncidentReport, '$id' | 'id' | 'submittedAt' | 'status' | 'userAgent' | 'notes' | 'officialIncidentId'>
): Promise<GuestIncidentReport> => {
  const operationName = 'createGuestIncidentReport';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
    return simulateApiCall(mockService.createMockGuestIncidentReport(reportData));
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.guestIncidentReportsCollectionId ? "Guest Reports Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload: Partial<GuestIncidentReport> = {
      ...reportData,
      submittedAt: new Date().toISOString(),
      status: GuestIncidentReportStatus.NEW,
      userAgent: navigator.userAgent,
    };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    const document = await databases.createDocument(
      APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.guestIncidentReportsCollectionId!, ID.unique(), payload
    );
    return mapDocumentToGuestIncidentReport(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
  }
};

export const adminGetAllGuestIncidentReports = async (filters?: any): Promise<GuestIncidentReport[]> => {
  const operationName = 'adminGetAllGuestIncidentReports';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockGuestIncidentReports().sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.guestIncidentReportsCollectionId ? "Guest Reports Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const queries = [Query.orderDesc('submittedAt')];
    if (filters?.status) queries.push(Query.equal('status', filters.status));
    if (filters?.serviceId) queries.push(Query.equal('serviceId', filters.serviceId));
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.guestIncidentReportsCollectionId!, queries
    );
    return response.documents.map(mapDocumentToGuestIncidentReport);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const adminUpdateGuestIncidentReport = async (
  reportId: string,
  updates: Partial<Omit<GuestIncidentReport, '$id' | 'id' | 'serviceId' | 'description' | 'email' | 'submittedAt' | 'userAgent'>>
): Promise<GuestIncidentReport> => {
  const operationName = 'adminUpdateGuestIncidentReport';
   if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update for ${operationName}.`);
    const updatedReport = mockService.updateMockGuestIncidentReport(reportId, updates);
    if (!updatedReport) throw new Error("Guest report not found for update in mock data.");
    return simulateApiCall(updatedReport);
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.guestIncidentReportsCollectionId ? "Guest Reports Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload: any = { ...updates };
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    const document = await databases.updateDocument(
      APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.guestIncidentReportsCollectionId!, reportId, payload
    );
    return mapDocumentToGuestIncidentReport(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
  }
};

export const adminDeleteGuestIncidentReport = async (reportId: string): Promise<void> => {
  const operationName = 'adminDeleteGuestIncidentReport';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating delete for ${operationName}.`);
    mockService.deleteMockGuestIncidentReport(reportId);
    return simulateApiCall(undefined);
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.guestIncidentReportsCollectionId ? "Guest Reports Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    await databases.deleteDocument(
      APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.guestIncidentReportsCollectionId!, reportId
    );
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting ${operationName}): ${errMsg}`);
  }
};