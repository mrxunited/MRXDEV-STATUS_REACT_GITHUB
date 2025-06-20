
import { ID, Query, Models, AppwriteException } from 'appwrite';
import { Incident, IncidentType, IncidentImpact, IncidentLifecycleStatus, IncidentMessage, IncidentFilters, IncidentReview, PIRStatus, PIRSeverityLevel, IncidentReviewFilters } from '../../types'; 
import { APPWRITE_CONFIG } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService'; 
import { subDays, parseISO, formatISO } from 'date-fns';

// --- Data Mapping Helpers ---
const mapDocumentToIncident = (doc: Models.Document): Incident => {
  let parsedAffectedServiceIds: string[] = [];
  if (typeof doc.affectedServiceIds === 'string' && doc.affectedServiceIds.startsWith('[')) { 
    try {
      const temp = JSON.parse(doc.affectedServiceIds);
      if (Array.isArray(temp) && temp.every(s => typeof s === 'string')) {
        parsedAffectedServiceIds = temp;
      }
    } catch (e) {
      console.warn(`Failed to parse stringified affectedServiceIds for incident ${doc.$id}:`, e, `Value: ${doc.affectedServiceIds}`);
    }
  } else if (Array.isArray(doc.affectedServiceIds) && doc.affectedServiceIds.every(s => typeof s === 'string')) {
    parsedAffectedServiceIds = doc.affectedServiceIds;
  } else if (typeof doc.affectedServiceIds === 'string' && doc.affectedServiceIds) {
     parsedAffectedServiceIds = [doc.affectedServiceIds];
  }

  let parsedMessages: IncidentMessage[] = [];
    if (typeof doc.messages === 'string' && doc.messages.startsWith('[')) { 
        try {
            const tempMessages = JSON.parse(doc.messages);
            if (Array.isArray(tempMessages)) { 
                parsedMessages = tempMessages;
            }
        } catch (e) {
            console.warn(`Failed to parse stringified messages for incident ${doc.$id}:`, e, `Value: ${doc.messages}`);
        }
    } else if (Array.isArray(doc.messages)) {
        parsedMessages = doc.messages; 
    }

  return {
    id: doc.$id,
    $id: doc.$id,
    title: doc.title,
    type: doc.type as IncidentType,
    impact: doc.impact as IncidentImpact,
    currentLifecycleStatus: doc.currentLifecycleStatus as IncidentLifecycleStatus, 
    affectedServiceIds: parsedAffectedServiceIds,
    messages: parsedMessages,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
    resolvedAt: doc.resolvedAt,
    detectedAt: doc.detectedAt,
    acknowledgedAt: doc.acknowledgedAt,
    scheduledStartTime: doc.scheduledStartTime,
    scheduledEndTime: doc.scheduledEndTime,
    isPubliclyVisible: doc.isPubliclyVisible,
    severityLevelId: doc.severityLevelId,
    incidentStatusId: doc.incidentStatusId,
    debriefRequired: typeof doc.debriefRequired === 'boolean' ? doc.debriefRequired : false,
  };
};

const mapDocumentToIncidentReview = (doc: Models.Document): IncidentReview => {
  let parsedParticipants: string[] = [];
  if (typeof doc.participants === 'string' && doc.participants.startsWith('[')) {
    try {
      const temp = JSON.parse(doc.participants);
      if (Array.isArray(temp) && temp.every(p => typeof p === 'string')) {
        parsedParticipants = temp;
      }
    } catch (e) { console.warn(`Failed to parse participants for review ${doc.$id}`); }
  } else if (Array.isArray(doc.participants)) {
    parsedParticipants = doc.participants;
  }

  return {
    id: doc.$id,
    $id: doc.$id,
    incidentId: doc.incidentId,
    incidentSummaryText: doc.incidentSummaryText,
    rootCauseSummary: doc.rootCauseSummary,
    timelineOfEvents: doc.timelineOfEvents,
    impactedSystemsText: doc.impactedSystemsText,
    communicationSent: doc.communicationSent,
    resolutionSteps: doc.resolutionSteps,
    whatWentWell: doc.whatWentWell,
    whatWentWrong: doc.whatWentWrong,
    actionItems: doc.actionItems,
    followUpActions: doc.followUpActions, // Renamed from preventiveActions
    lessonsLearned: doc.lessonsLearned,
    severityLevel: doc.severityLevel as PIRSeverityLevel,
    isPreventable: doc.isPreventable,
    preventableReasoning: doc.preventableReasoning,
    status: doc.status as PIRStatus || PIRStatus.PENDING,
    participants: parsedParticipants, // Use parsed
    reviewedAt: doc.reviewedAt,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
};

// --- Helper for Appwrite Queries ---
const applyIncidentFiltersToAppwriteQuery = (baseQueries: string[], filters?: IncidentFilters | IncidentReviewFilters): string[] => {
  const queries = [...baseQueries];
  if (filters) {
    const isReviewFilter = 'pirStatus' in filters || 'pirSeverity' in filters;
    const dateField = ('status' in filters && (filters.status === IncidentLifecycleStatus.RESOLVED || filters.status === IncidentLifecycleStatus.COMPLETED)) ? 'resolvedAt' : '$updatedAt'; 


    if (filters.predefinedRange && filters.predefinedRange !== 'allTime') {
      const now = new Date();
      let startDate: Date;
      if (filters.predefinedRange === 'last7days') startDate = subDays(now, 7);
      else startDate = subDays(now, 30);
      queries.push(Query.greaterThanEqual(dateField, formatISO(startDate)));
    } else if (filters.dateRange?.start && filters.dateRange?.end) {
      queries.push(Query.greaterThanEqual(dateField, formatISO(parseISO(filters.dateRange.start))));
      queries.push(Query.lessThanEqual(dateField, formatISO(parseISO(filters.dateRange.end))));
    }
    
    if (filters.serviceId) queries.push(Query.search('affectedServiceIds', filters.serviceId)); 
    
    if ('type' in filters && filters.type) { 
        queries.push(Query.equal('type', filters.type));
    }
    if ('incidentType' in filters && filters.incidentType) { 
        queries.push(Query.equal('type', filters.incidentType));
    }

    if ('status' in filters && filters.status && !isReviewFilter) { 
        queries.push(Query.equal('currentLifecycleStatus', filters.status));
    }

    if (isReviewFilter) {
        if ((filters as IncidentReviewFilters).pirStatus) queries.push(Query.equal('status', (filters as IncidentReviewFilters).pirStatus!));
        if ((filters as IncidentReviewFilters).pirSeverity) queries.push(Query.equal('severityLevel', (filters as IncidentReviewFilters).pirSeverity!));
    }
  }
  return queries;
};


// --- Public Incident Services ---
export const getActivePublicIncidents = async (): Promise<Incident[]> => {
  const operationName = 'getActivePublicIncidents';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    const incidents = mockService.getMockPublicIncidents();
    return simulateApiCall(incidents.filter(inc =>
        inc.isPubliclyVisible &&
        inc.currentLifecycleStatus !== IncidentLifecycleStatus.RESOLVED &&
        inc.currentLifecycleStatus !== IncidentLifecycleStatus.COMPLETED &&
        inc.currentLifecycleStatus !== IncidentLifecycleStatus.DISMISSED
      ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.publicIncidentsCollectionId!,
        [
            Query.equal('isPubliclyVisible', true),
            Query.notEqual('currentLifecycleStatus', IncidentLifecycleStatus.RESOLVED),
            Query.notEqual('currentLifecycleStatus', IncidentLifecycleStatus.COMPLETED),
            Query.notEqual('currentLifecycleStatus', IncidentLifecycleStatus.DISMISSED),
            Query.orderDesc('$updatedAt') 
        ]
    );
    return response.documents.map(mapDocumentToIncident);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const getPastPublicIncidents = async (limit: number = 10, offset: number = 0, filters?: IncidentFilters): Promise<Incident[]> => {
  const operationName = 'getPastPublicIncidents';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    const allPastIncidents = mockService.getMockPublicIncidents().filter(inc =>
      inc.isPubliclyVisible &&
      (inc.currentLifecycleStatus === IncidentLifecycleStatus.RESOLVED || inc.currentLifecycleStatus === IncidentLifecycleStatus.COMPLETED || inc.currentLifecycleStatus === IncidentLifecycleStatus.DISMISSED)
    );
    const customFilteredIncidents = mockService.applyMockIncidentFilters(allPastIncidents, filters); 
    const sortedAndPaginatedIncidents = customFilteredIncidents
      .sort((a, b) => new Date(b.resolvedAt || b.updatedAt).getTime() - new Date(a.resolvedAt || a.updatedAt).getTime())
      .slice(offset, offset + limit);
    return simulateApiCall(sortedAndPaginatedIncidents);
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  try {
    console.info(`LIVE Appwrite Call: ${operationName} with filters: ${JSON.stringify(filters)}`);
    let baseQueries: string[] = [
        Query.equal('isPubliclyVisible', true),
        Query.or([ 
            Query.equal('currentLifecycleStatus', IncidentLifecycleStatus.RESOLVED),
            Query.equal('currentLifecycleStatus', IncidentLifecycleStatus.COMPLETED),
            Query.equal('currentLifecycleStatus', IncidentLifecycleStatus.DISMISSED)
        ]),
        Query.orderDesc('resolvedAt'), 
        Query.orderDesc('$updatedAt'), 
        Query.limit(limit),
        Query.offset(offset)
    ];
    const finalQueries = applyIncidentFiltersToAppwriteQuery(baseQueries, filters);
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.publicIncidentsCollectionId!,
        finalQueries
    );
    let incidents = response.documents.map(mapDocumentToIncident);
    if(filters?.serviceId) incidents = incidents.filter(inc => inc.affectedServiceIds.includes(filters.serviceId!));
    return incidents;
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};


// --- Admin Management of Public Content (Incidents) ---
export const adminGetAllIncidents = async (filters?: IncidentFilters): Promise<Incident[]> => {
  const operationName = 'adminGetAllIncidents';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    const allIncidents = mockService.getMockPublicIncidents();
    const filteredIncidents = mockService.applyMockIncidentFilters(allIncidents, filters) 
                            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return simulateApiCall(filteredIncidents);
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  try {
    console.info(`LIVE Appwrite Call: ${operationName} with filters: ${JSON.stringify(filters)}`);
    const sortOrder = Query.orderDesc('$updatedAt');
    const finalQueries = applyIncidentFiltersToAppwriteQuery([sortOrder], filters); 
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.publicIncidentsCollectionId!,
        finalQueries
    );
    let incidents = response.documents.map(mapDocumentToIncident);
    if(filters?.serviceId) incidents = incidents.filter(inc => inc.affectedServiceIds.includes(filters.serviceId!));
    return incidents;
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const adminGetIncidentById = async (appwriteIncidentId: string): Promise<Incident | undefined> => {
  const operationName = 'adminGetIncidentById';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockPublicIncidentById(appwriteIncidentId));
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const document = await databases.getDocument(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.publicIncidentsCollectionId!,
        appwriteIncidentId 
    );
    return mapDocumentToIncident(document);
  } catch (error) {
    const appwriteError = error as AppwriteException;
    if (appwriteError.code === 404) return undefined; 
    const errMsg = appwriteError.message || String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const adminCreateIncident = async (incidentData: Omit<Incident, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string, initialStatus: IncidentLifecycleStatus, postedBy?: string }): Promise<Incident> => {
  const operationName = 'adminCreateIncident';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
    return simulateApiCall(mockService.createMockPublicIncident(incidentData));
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const now = new Date().toISOString();
    const firstMessage: IncidentMessage = {
      id: ID.unique(), timestamp: now, status: incidentData.initialStatus, message: incidentData.initialMessage, postedBy: incidentData.postedBy || "System Admin"
    };
    const payload: any = {
      title: incidentData.title, type: incidentData.type, impact: incidentData.impact,
      currentLifecycleStatus: incidentData.initialStatus, 
      affectedServiceIds: JSON.stringify(incidentData.affectedServiceIds), 
      isPubliclyVisible: incidentData.isPubliclyVisible, scheduledStartTime: incidentData.scheduledStartTime,
      scheduledEndTime: incidentData.scheduledEndTime, messages: JSON.stringify([firstMessage]),
      severityLevelId: incidentData.severityLevelId,
      incidentStatusId: incidentData.incidentStatusId,
      debriefRequired: incidentData.debriefRequired || false,
      detectedAt: now, 
    };
     if ( (payload.currentLifecycleStatus === IncidentLifecycleStatus.RESOLVED && payload.type === IncidentType.INCIDENT) ||
       (payload.currentLifecycleStatus === IncidentLifecycleStatus.COMPLETED && payload.type === IncidentType.MAINTENANCE) ) {
        payload.resolvedAt = now;
    }
    if (payload.currentLifecycleStatus === IncidentLifecycleStatus.ACKNOWLEDGED) payload.acknowledgedAt = now;
    
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const document = await databases.createDocument(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.publicIncidentsCollectionId!,
        ID.unique(),
        payload
    );
    if (document.resolvedAt && APPWRITE_CONFIG.incidentReviewsCollectionId) {
        const existingReview = await adminGetIncidentReviewByIncidentId(document.$id);
        if(!existingReview) {
            await adminCreateIncidentReview({ incidentId: document.$id, status: PIRStatus.PENDING });
        }
    }
    return mapDocumentToIncident(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
  }
};

export const adminUpdateIncident = async (appwriteIncidentId: string, updates: Partial<Omit<Incident, 'id' | '$id' | 'messages' | 'createdAt' | 'updatedAt'>>): Promise<Incident> => {
  const operationName = 'adminUpdateIncident';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update for ${operationName}.`);
    const updatedIncident = mockService.updateMockPublicIncident(appwriteIncidentId, updates);
    if (!updatedIncident) throw new Error("Incident not found in mock data for update.");
    return simulateApiCall(updatedIncident);
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload: any = { ...updates };
    const existingDoc = await databases.getDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicIncidentsCollectionId!, appwriteIncidentId);
    const existingIncident = mapDocumentToIncident(existingDoc);
    let existingMessages = existingIncident.messages || [];

    if (payload.currentLifecycleStatus && payload.currentLifecycleStatus !== existingIncident.currentLifecycleStatus) {
        const statusChangeMessage: IncidentMessage = {
            id: ID.unique(),
            timestamp: new Date().toISOString(),
            status: payload.currentLifecycleStatus,
            message: `Incident status changed to ${payload.currentLifecycleStatus}.`,
            postedBy: "System" 
        };
        existingMessages = [statusChangeMessage, ...existingMessages];
        payload.messages = JSON.stringify(existingMessages);
    }

    if (payload.affectedServiceIds && Array.isArray(payload.affectedServiceIds)) {
        payload.affectedServiceIds = JSON.stringify(payload.affectedServiceIds); 
    }
     if ( (payload.currentLifecycleStatus === IncidentLifecycleStatus.RESOLVED || payload.currentLifecycleStatus === IncidentLifecycleStatus.COMPLETED) && !payload.resolvedAt ) {
        if (!existingDoc.resolvedAt) { payload.resolvedAt = new Date().toISOString(); }
    }
    if (payload.currentLifecycleStatus === IncidentLifecycleStatus.ACKNOWLEDGED && !existingDoc.acknowledgedAt) {
        payload.acknowledgedAt = new Date().toISOString();
    }

    if (updates.hasOwnProperty('severityLevelId')) {
        payload.severityLevelId = updates.severityLevelId === '' ? null : updates.severityLevelId;
    }
    if (updates.hasOwnProperty('incidentStatusId')) {
        payload.incidentStatusId = updates.incidentStatusId === '' ? null : updates.incidentStatusId;
    }
    if (updates.hasOwnProperty('debriefRequired')) {
        payload.debriefRequired = typeof updates.debriefRequired === 'boolean' ? updates.debriefRequired : false;
    }

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    
    const document = await databases.updateDocument(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.publicIncidentsCollectionId!,
        appwriteIncidentId, payload
    );
    if (document.resolvedAt && APPWRITE_CONFIG.incidentReviewsCollectionId) {
        const existingReview = await adminGetIncidentReviewByIncidentId(document.$id);
        if(!existingReview) {
             await adminCreateIncidentReview({ incidentId: document.$id, status: PIRStatus.PENDING });
        }
    }
    return mapDocumentToIncident(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
  }
};

export const adminAddIncidentMessage = async (appwriteIncidentId: string, messageData: { status: IncidentLifecycleStatus, message: string, postedBy?: string }): Promise<Incident> => {
  const operationName = 'adminAddIncidentMessage';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating add message for ${operationName}.`);
    const incidentWithMessage = mockService.addMockIncidentMessage(appwriteIncidentId, messageData);
    if (!incidentWithMessage) throw new Error("Incident not found in mock data for adding message.");
    return simulateApiCall(incidentWithMessage);
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const existingDoc = await databases.getDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicIncidentsCollectionId!, appwriteIncidentId);
    const existingIncident = mapDocumentToIncident(existingDoc);
    const now = new Date().toISOString();
    const newMessage: IncidentMessage = { id: ID.unique(), timestamp: now, status: messageData.status, message: messageData.message, postedBy: messageData.postedBy || "System Admin" };
    const updatedMessages = [newMessage, ...existingIncident.messages]; 
    const updatePayload: any = { messages: JSON.stringify(updatedMessages), currentLifecycleStatus: messageData.status };

    if(((messageData.status === IncidentLifecycleStatus.RESOLVED && existingIncident.type === IncidentType.INCIDENT) || (messageData.status === IncidentLifecycleStatus.COMPLETED && existingIncident.type === IncidentType.MAINTENANCE)) && !existingIncident.resolvedAt) { 
        updatePayload.resolvedAt = now;
    }
    if (messageData.status === IncidentLifecycleStatus.ACKNOWLEDGED && !existingIncident.acknowledgedAt) {
        updatePayload.acknowledgedAt = now;
    }
    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    const document = await databases.updateDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicIncidentsCollectionId!, appwriteIncidentId, updatePayload );
    if (document.resolvedAt && APPWRITE_CONFIG.incidentReviewsCollectionId) {
        const existingReview = await adminGetIncidentReviewByIncidentId(document.$id);
        if(!existingReview) {
             await adminCreateIncidentReview({ incidentId: document.$id, status: PIRStatus.PENDING });
        }
    }
    return mapDocumentToIncident(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Adding message for ${operationName}): ${errMsg}`);
  }
};

export const adminDeleteIncident = async (appwriteIncidentId: string): Promise<void> => {
  const operationName = 'adminDeleteIncident';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating delete for ${operationName}.`);
    mockService.deleteMockPublicIncident(appwriteIncidentId);
    return simulateApiCall(undefined);
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicIncidentsCollectionId ? "Public Incidents Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const reviews = await adminGetIncidentReviewsByIncidentId(appwriteIncidentId);
    for (const review of reviews) {
        if (review.$id) await adminDeleteIncidentReview(review.$id);
    }
    await databases.deleteDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicIncidentsCollectionId!, appwriteIncidentId );
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting ${operationName}): ${errMsg}`);
  }
};


// --- Admin Incident Review Management ---
export const adminGetAllIncidentReviews = async (filters?: IncidentReviewFilters): Promise<IncidentReview[]> => {
  const operationName = 'adminGetAllIncidentReviews';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockIncidentReviews(filters)); 
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentReviewsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.incidentReviewsCollectionId ? "Incident Reviews Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  
  try {
    console.info(`LIVE Appwrite Call: ${operationName} with filters: ${JSON.stringify(filters)}`);
    let appwriteQueries: string[] = [Query.orderDesc('$updatedAt')];
    if (filters) {
        if (filters.pirStatus) appwriteQueries.push(Query.equal('status', filters.pirStatus));
        if (filters.pirSeverity) appwriteQueries.push(Query.equal('severityLevel', filters.pirSeverity));
        if (filters.incidentId) appwriteQueries.push(Query.equal('incidentId', filters.incidentId));
        
        if (filters.dateRange?.start && filters.dateRange?.end) {
            appwriteQueries.push(Query.greaterThanEqual('$updatedAt', formatISO(parseISO(filters.dateRange.start))));
            appwriteQueries.push(Query.lessThanEqual('$updatedAt', formatISO(parseISO(filters.dateRange.end))));
        } else if (filters.predefinedRange && filters.predefinedRange !== 'allTime') {
            const now = new Date();
            let startDate: Date;
            if (filters.predefinedRange === 'last7days') startDate = subDays(now, 7);
            else startDate = subDays(now, 30);
            appwriteQueries.push(Query.greaterThanEqual('$updatedAt', formatISO(startDate)));
        }
    }
    const response = await databases.listDocuments( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentReviewsCollectionId!, appwriteQueries );
    return response.documents.map(mapDocumentToIncidentReview);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const adminGetIncidentReviewByIncidentId = async (incidentId: string): Promise<IncidentReview | null> => {
  const operationName = 'adminGetIncidentReviewByIncidentId';
   if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockIncidentReviewByIncidentId(incidentId)); 
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentReviewsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.incidentReviewsCollectionId ? "Incident Reviews Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    return null;
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName} for incidentId: ${incidentId}`);
    const response = await databases.listDocuments( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentReviewsCollectionId!, [Query.equal('incidentId', incidentId), Query.limit(1)] );
    if (response.documents.length > 0) return mapDocumentToIncidentReview(response.documents[0]);
    return null;
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    return null;
  }
};

const adminGetIncidentReviewsByIncidentId = async (incidentId: string): Promise<IncidentReview[]> => {
  const operationName = 'adminGetIncidentReviewsByIncidentId (internal)';
  if (isUserExplicitlyInMockMode()) { return mockService.getMockIncidentReviews({ incidentId } as any); }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentReviewsCollectionId) return [];
  try {
    const response = await databases.listDocuments( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentReviewsCollectionId!, [Query.equal('incidentId', incidentId)] );
    return response.documents.map(mapDocumentToIncidentReview);
  } catch (error) { console.warn(`Failed to fetch reviews for incident ${incidentId}: ${error}`); return []; }
};

export const adminCreateIncidentReview = async (reviewData: Omit<IncidentReview, 'id' | '$id' | 'createdAt' | 'updatedAt'>): Promise<IncidentReview> => {
  const operationName = 'adminCreateIncidentReview';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
    return simulateApiCall(mockService.createMockIncidentReview(reviewData)); 
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentReviewsCollectionId) {
     const errorMsg = !APPWRITE_CONFIG.incidentReviewsCollectionId ? "Incident Reviews Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload: any = { ...reviewData };
    if (payload.status === PIRStatus.COMPLETED && !payload.reviewedAt) {
        payload.reviewedAt = new Date().toISOString();
    }
    if (payload.participants && Array.isArray(payload.participants)) {
        payload.participants = JSON.stringify(payload.participants);
    }
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    const document = await databases.createDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentReviewsCollectionId!, ID.unique(), payload );
    return mapDocumentToIncidentReview(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
  }
};

export const adminUpdateIncidentReview = async (reviewId: string, updates: Partial<Omit<IncidentReview, 'id' | '$id' | 'incidentId' | 'createdAt' | 'updatedAt'>>): Promise<IncidentReview> => {
  const operationName = 'adminUpdateIncidentReview';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update for ${operationName}.`);
    const updatedReview = mockService.updateMockIncidentReview(reviewId, updates); 
    if (!updatedReview) throw new Error("Incident review not found for update.");
    return simulateApiCall(updatedReview);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentReviewsCollectionId) {
     const errorMsg = !APPWRITE_CONFIG.incidentReviewsCollectionId ? "Incident Reviews Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload: any = { ...updates };
     if (payload.status === PIRStatus.COMPLETED && !payload.reviewedAt) {
        const existingDoc = await databases.getDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentReviewsCollectionId!, reviewId);
        if(!existingDoc.reviewedAt) { payload.reviewedAt = new Date().toISOString(); }
    }
    if (payload.participants && Array.isArray(payload.participants)) {
        payload.participants = JSON.stringify(payload.participants);
    } else if (payload.participants === undefined) { // Ensure if undefined it's not sent, or handled as null if DB expects string
        // If your DB requires a string (e.g. empty array '[]'), handle here.
        // Otherwise, Appwrite SDK might omit it which is fine.
    }
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    const document = await databases.updateDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentReviewsCollectionId!, reviewId, payload );
    return mapDocumentToIncidentReview(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
  }
};

export const adminDeleteIncidentReview = async (reviewId: string): Promise<void> => {
  const operationName = 'adminDeleteIncidentReview';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating delete for ${operationName}.`);
    mockService.deleteMockIncidentReview(reviewId); 
    return simulateApiCall(undefined);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.incidentReviewsCollectionId) {
    const errorMsg = !APPWRITE_CONFIG.incidentReviewsCollectionId ? "Incident Reviews Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    await databases.deleteDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.incidentReviewsCollectionId!, reviewId );
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting ${operationName}): ${errMsg}`);
  }
};
