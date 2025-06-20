
import { Query, Models, ID } from 'appwrite';
import { SystemService, UserActivityLog, ServiceUptime, ErrorReport, SystemStatusLevel, ActivityStatus, ErrorSeverity } from '../../types';
import { APPWRITE_CONFIG } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService'; 

// --- Data Mapping Helpers ---
const mapDocumentToSystemService = (doc: Models.Document): SystemService => ({
    id: doc.$id, $id: doc.$id, name: doc.name, status: doc.status as SystemStatusLevel,
    description: doc.description, publicDescription: doc.publicDescription,
    lastCheckedAutomated: doc.lastCheckedAutomated, uptime7Days: doc.uptime7Days,
    uptime30Days: doc.uptime30Days, isMonitoredPublicly: doc.isMonitoredPublicly,
    displayOrder: doc.displayOrder, groupId: doc.groupId,
    components: typeof doc.components === 'string' && doc.components ? JSON.parse(doc.components) : (Array.isArray(doc.components) ? doc.components : undefined),
    pingUrl: doc.pingUrl,
    lastPingResult: typeof doc.lastPingResult === 'string' && doc.lastPingResult ? JSON.parse(doc.lastPingResult) : (typeof doc.lastPingResult === 'object' ? doc.lastPingResult : undefined),
    pingEnabled: typeof doc.pingEnabled === 'boolean' ? doc.pingEnabled : false,
    pingIntervalMinutes: doc.pingIntervalMinutes as (2 | 5 | 10 | 15) || 5,
    pingAlertsMuted: typeof doc.pingAlertsMuted === 'boolean' ? doc.pingAlertsMuted : false,
});

const mapDocumentToUserActivityLog = (doc: Models.Document): UserActivityLog => ({
    id: doc.$id, timestamp: doc.timestamp, userId: doc.userId, userName: doc.userName,
    action: doc.action, details: doc.details, status: doc.status as ActivityStatus,
});

const mapDocumentToServiceUptime = (doc: Models.Document): ServiceUptime => ({
    id: doc.$id, serviceName: doc.serviceName, uptimePercentage: doc.uptimePercentage,
    lastIncident: typeof doc.lastIncident === 'string' && doc.lastIncident ? JSON.parse(doc.lastIncident) : undefined,
    historicalData: typeof doc.historicalData === 'string' && doc.historicalData ? JSON.parse(doc.historicalData) : undefined,
});

const mapDocumentToErrorReport = (doc: Models.Document): ErrorReport => ({
    id: doc.$id, timestamp: doc.timestamp, service: doc.service, errorCode: doc.errorCode,
    message: doc.message, severity: doc.severity as ErrorSeverity, details: doc.details,
});


// --- Internal Admin Dashboard Services ---
export const getInternalSystemStatus = async (): Promise<SystemService[]> => {
  const operationName = 'getInternalSystemStatus';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    // Mock service will now filter from the main list
    return simulateApiCall(mockService.getMockInternalSystemStatus());
  }
  // Use publicServicesCollectionId as the source of truth, filtered by isMonitoredPublicly = false
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.publicServicesCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.publicServicesCollectionId ? "Public Services Collection ID (for internal status) not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName} (from publicServicesCollection, filtered for internal)`);
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!, 
        APPWRITE_CONFIG.publicServicesCollectionId!, // Querying the main services collection
        [
            Query.equal('isMonitoredPublicly', false), // Filter for internal services
            Query.orderAsc('displayOrder')
        ]
    );
    return response.documents.map(mapDocumentToSystemService);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const getUserActivity = async (limit: number = 10): Promise<UserActivityLog[]> => {
  const operationName = 'getUserActivity';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockUserActivity(limit));
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.userActivityCollectionId ? "User Activity Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
   try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.userActivityCollectionId!, [Query.orderDesc('timestamp'), Query.limit(limit)] 
    );
    return response.documents.map(mapDocumentToUserActivityLog);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const getInternalServiceUptime = async (): Promise<ServiceUptime[]> => {
  const operationName = 'getInternalServiceUptime';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockInternalServiceUptime());
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.serviceUptimeCollectionId ? "Service Uptime Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
     const response = await databases.listDocuments( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.serviceUptimeCollectionId! );
    return response.documents.map(mapDocumentToServiceUptime);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const getErrorReports = async (limit: number = 10): Promise<ErrorReport[]> => {
  const operationName = 'getErrorReports';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockErrorReports(limit));
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.errorReportsCollectionId ? "Error Reports Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.errorReportsCollectionId!, [Query.orderDesc('timestamp'), Query.limit(limit)] 
    );
    return response.documents.map(mapDocumentToErrorReport);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const addErrorReport = async (reportData: Omit<ErrorReport, 'id' | 'timestamp'>): Promise<ErrorReport> => {
  const operationName = 'addErrorReport';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
    return simulateApiCall(mockService.addMockErrorReport(reportData));
  }
   if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.errorReportsCollectionId ? "Error Reports Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
   try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload = { ...reportData, timestamp: new Date().toISOString() };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    const document = await databases.createDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.errorReportsCollectionId!, ID.unique(), payload );
    return mapDocumentToErrorReport(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
  }
};
