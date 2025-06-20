
import { ID, Query, Models } from 'appwrite';
import { ActivityLog, ActivityLogFilters, ActivityTargetType, ActivityStatus, User } from '../../types';
import { APPWRITE_CONFIG } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService';
import { formatISO, parseISO, subDays } from 'date-fns';

// --- Data Mapping Helper ---
const mapDocumentToActivityLog = (doc: Models.Document): ActivityLog => ({
  $id: doc.$id,
  userId: doc.userId,
  userName: doc.userName,
  userRole: doc.userRole as User['role'] | 'Guest' | 'System',
  action: doc.action,
  targetType: doc.targetType as ActivityTargetType,
  targetId: doc.targetId,
  targetName: doc.targetName,
  timestamp: doc.timestamp, // This should be the custom field, not $createdAt for event time
  ipAddress: doc.ipAddress,
  userAgent: doc.userAgent,
  details: doc.details,
  status: doc.status as ActivityStatus,
});

// --- Activity Log Services ---
export const addActivityLog = async (
  logData: Omit<ActivityLog, '$id' | 'timestamp'> & { timestamp?: string } // Allow optional timestamp override
): Promise<ActivityLog> => {
  const operationName = 'addActivityLog';
  const finalLogData = {
    ...logData,
    timestamp: logData.timestamp || new Date().toISOString(), // Use provided or generate new
  };

  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Adding MOCK activity log for action: ${finalLogData.action}`);
    // Use the new addMockActivityLog function for the comprehensive ActivityLog type
    return simulateApiCall(mockService.addMockActivityLog(finalLogData as Omit<ActivityLog, '$id'>));
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.activityLogsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.activityLogsCollectionId ? "Activity Logs Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}. Log data: `, finalLogData);
    // Optionally, we could try to store this log locally if Appwrite is down for later sync
    // For now, just fail silently or throw if critical
    // throw new Error(errorMsg); 
    return { // Return a dummy log or throw error
        ...finalLogData,
        $id: ID.unique(),
        status: ActivityStatus.FAILURE, // Indicate it wasn't logged to DB
        details: `Failed to log to DB: ${errorMsg}`
    };
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName} - ${finalLogData.action}`);
    const payload: any = { ...finalLogData };
    // Ensure undefined fields are not sent if they are optional and empty
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    
    const document = await databases.createDocument(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.activityLogsCollectionId!,
      ID.unique(),
      payload
    );
    return mapDocumentToActivityLog(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}. Log data: `, finalLogData);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Adding activity log): ${errMsg}`);
  }
};

export const adminGetActivityLogs = async (
  filters?: ActivityLogFilters,
  limit: number = 25,
  offset: number = 0
): Promise<{ logs: ActivityLog[]; total: number }> => {
  const operationName = 'adminGetActivityLogs';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    // Use the new getMockActivityLogs function for the comprehensive ActivityLog type
    return simulateApiCall(mockService.getMockActivityLogs(filters, limit, offset));
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.activityLogsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.activityLogsCollectionId ? "Activity Logs Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    console.info(`LIVE Appwrite Call: ${operationName} with filters: ${JSON.stringify(filters)}`);
    const queries: string[] = [Query.orderDesc('timestamp'), Query.limit(limit), Query.offset(offset)];

    if (filters) {
      if (filters.predefinedRange && filters.predefinedRange !== 'allTime') {
        const now = new Date();
        let startDate: Date;
        if (filters.predefinedRange === 'last7days') startDate = subDays(now, 7);
        else startDate = subDays(now, 30); // Assuming 'last30days'
        queries.push(Query.greaterThanEqual('timestamp', formatISO(startDate)));
      } else if (filters.dateRange?.start && filters.dateRange?.end) {
        queries.push(Query.greaterThanEqual('timestamp', formatISO(parseISO(filters.dateRange.start))));
        queries.push(Query.lessThanEqual('timestamp', formatISO(parseISO(filters.dateRange.end))));
      }

      if (filters.userId) queries.push(Query.search('userName', filters.userId)); // Search userName or userId
      if (filters.action) queries.push(Query.search('action', filters.action));
      if (filters.targetType) queries.push(Query.equal('targetType', filters.targetType));
      if (filters.targetId) queries.push(Query.equal('targetId', filters.targetId));
      if (filters.status) queries.push(Query.equal('status', filters.status));
      if (filters.role) queries.push(Query.equal('userRole', filters.role));
    }

    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.activityLogsCollectionId!,
      queries
    );
    return {
      logs: response.documents.map(mapDocumentToActivityLog),
      total: response.total,
    };
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching activity logs): ${errMsg}`);
  }
};
