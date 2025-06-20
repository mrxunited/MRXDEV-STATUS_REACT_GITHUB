

import { ID, Query, Models } from 'appwrite';
import { SystemService, ServiceGroup, SystemStatusLevel, PingStatus, PingResult, OverallPublicStatus, IncidentImpact, IncidentType, IncidentLifecycleStatus, ServiceComponent } from '../../types';
import { APPWRITE_CONFIG } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService'; // Corrected import path
import { getActivePublicIncidents } from './incidentService'; // For OverallPublicStatus

// --- Data Mapping Helpers ---
const mapDocumentToServiceGroup = (doc: Models.Document): ServiceGroup => ({
  id: doc.$id,
  $id: doc.$id,
  name: doc.name,
  displayOrder: doc.displayOrder,
});

const mapDocumentToSystemService = (doc: Models.Document): SystemService => {
  let parsedComponents: ServiceComponent[] | undefined = undefined;
  if (typeof doc.components === 'string' && doc.components.startsWith('[')) {
      try {
          parsedComponents = JSON.parse(doc.components);
      } catch (e) {
          console.warn(`Failed to parse components for service ${doc.$id}:`, e, `Value: ${doc.components}`);
          parsedComponents = []; 
      }
  } else if (Array.isArray(doc.components)) {
      parsedComponents = doc.components;
  }

  let parsedLastPingResult: PingResult | undefined = undefined;
  if (typeof doc.lastPingResult === 'string' && doc.lastPingResult.startsWith('{')) {
      try {
          parsedLastPingResult = JSON.parse(doc.lastPingResult);
      } catch (e) {
          console.warn(`Failed to parse lastPingResult for service ${doc.$id}:`, e, `Value: ${doc.lastPingResult}`);
      }
  } else if (typeof doc.lastPingResult === 'object' && doc.lastPingResult !== null) {
      parsedLastPingResult = doc.lastPingResult as PingResult;
  }


  return {
    id: doc.$id,
    $id: doc.$id,
    name: doc.name,
    status: doc.status as SystemStatusLevel,
    description: doc.description,
    publicDescription: doc.publicDescription,
    lastCheckedAutomated: doc.lastCheckedAutomated,
    uptime7Days: doc.uptime7Days,
    uptime30Days: doc.uptime30Days,
    isMonitoredPublicly: doc.isMonitoredPublicly,
    displayOrder: doc.displayOrder,
    groupId: doc.groupId,
    components: parsedComponents, 
    pingUrl: doc.pingUrl,
    lastPingResult: parsedLastPingResult,
    pingEnabled: typeof doc.pingEnabled === 'boolean' ? doc.pingEnabled : false,
    pingIntervalMinutes: doc.pingIntervalMinutes as (2 | 5 | 10 | 15) || 5,
    pingAlertsMuted: typeof doc.pingAlertsMuted === 'boolean' ? doc.pingAlertsMuted : false,
    updatedAt: doc.$updatedAt,
  };
};

// --- Public Service and Group Fetching ---
export const getPublicServices = async (): Promise<SystemService[]> => {
  const operationName = 'getPublicServices';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockPublicServices().filter(s => s.isMonitoredPublicly).sort((a, b) => a.displayOrder - b.displayOrder));
  }
  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicServicesCollectionId ? "Public Services Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicServicesCollectionId!,
        [Query.equal('isMonitoredPublicly', true), Query.orderAsc('displayOrder')]
    );
    return response.documents.map(mapDocumentToSystemService);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

// --- Overall Status Calculation Logic (Example) ---
const severityOrder: SystemStatusLevel[] = [
  SystemStatusLevel.MAJOR_OUTAGE, SystemStatusLevel.PARTIAL_OUTAGE, SystemStatusLevel.DEGRADED,
  SystemStatusLevel.MAINTENANCE, SystemStatusLevel.OPERATIONAL, SystemStatusLevel.UNKNOWN,
];
const getSeverityIndex = (status: SystemStatusLevel): number => {
  const index = severityOrder.indexOf(status);
  return index === -1 ? severityOrder.length - 1 : index;
};

export const getOverallPublicStatus = async (): Promise<OverallPublicStatus> => {
  const operationName = 'getOverallPublicStatus';
  const messages: Record<SystemStatusLevel, string> = {
    [SystemStatusLevel.OPERATIONAL]: "All systems operational.",
    [SystemStatusLevel.DEGRADED]: "Some services are experiencing degraded performance.",
    [SystemStatusLevel.PARTIAL_OUTAGE]: "Some services are experiencing a partial outage.",
    [SystemStatusLevel.MAJOR_OUTAGE]: "Major service outage impacting multiple systems.",
    [SystemStatusLevel.MAINTENANCE]: "Services are currently undergoing scheduled maintenance.",
    [SystemStatusLevel.UNKNOWN]: "System status is currently unknown."
  };

  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK derivation for ${operationName}.`);
    const services = mockService.getMockPublicServices().filter(s => s.isMonitoredPublicly);
    const activeIncidents = mockService.getMockPublicIncidents().filter(inc =>
        inc.isPubliclyVisible &&
        inc.currentLifecycleStatus !== IncidentLifecycleStatus.RESOLVED &&
        inc.currentLifecycleStatus !== IncidentLifecycleStatus.COMPLETED &&
        inc.currentLifecycleStatus !== IncidentLifecycleStatus.DISMISSED
    );
    
    const derivedServices = services.map(originalService => {
        let service = { ...originalService };
        let internalStatus = service.status;
        if (service.components && service.components.length > 0) {
            const worstSub = service.components.reduce((worst, comp) => getSeverityIndex(comp.status) < getSeverityIndex(worst) ? comp.status : worst, SystemStatusLevel.OPERATIONAL);
            if (getSeverityIndex(worstSub) < getSeverityIndex(internalStatus)) internalStatus = worstSub;
        }
        service.status = internalStatus;
        const affectingIncidents = activeIncidents.filter(inc => inc.affectedServiceIds.includes(service.id));
        let finalStatus = service.status;
        for (const incident of affectingIncidents) { 
            let incidentImpactStatus: SystemStatusLevel | null = null;
            if (incident.type === IncidentType.MAINTENANCE) incidentImpactStatus = SystemStatusLevel.MAINTENANCE;
            else if (incident.type === IncidentType.INCIDENT) {
                if (incident.impact === IncidentImpact.CRITICAL) incidentImpactStatus = SystemStatusLevel.MAJOR_OUTAGE;
                else if (incident.impact === IncidentImpact.SIGNIFICANT) incidentImpactStatus = SystemStatusLevel.PARTIAL_OUTAGE;
                else if (incident.impact === IncidentImpact.MINOR) incidentImpactStatus = SystemStatusLevel.DEGRADED;
            }
            if (incidentImpactStatus && getSeverityIndex(incidentImpactStatus) < getSeverityIndex(finalStatus)) {
                finalStatus = incidentImpactStatus;
            }
        }
        service.status = finalStatus;
        return service;
    });

    if (derivedServices.length === 0) return { level: SystemStatusLevel.UNKNOWN, message: "No services monitored." };
    const worstStatus = derivedServices.reduce((worst, srv) => getSeverityIndex(srv.status) < getSeverityIndex(worst) ? srv.status : worst, SystemStatusLevel.OPERATIONAL);
    return { level: worstStatus, message: messages[worstStatus] || "Status assessment ongoing." };
  }

  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = !APPWRITE_CONFIG.publicServicesCollectionId ? "Public Services Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    return { level: SystemStatusLevel.UNKNOWN, message: "Status temporarily unavailable: configuration error." };
  }

  try {
    console.info(`LIVE Appwrite Call: ${operationName} (deriving from live data)`);
    const services = await getPublicServices(); // Fetches public services
    const activeIncidents = await getActivePublicIncidents(); // Fetches active incidents

    if (services.length === 0) {
      return { level: SystemStatusLevel.OPERATIONAL, message: "No services are currently monitored." };
    }

    let overallLevel = SystemStatusLevel.OPERATIONAL;
    
    const derivedServices = services.map(originalService => {
        let service = { ...originalService };
        let internalStatus = service.status;
        if (service.components && service.components.length > 0) {
            const worstSub = service.components.reduce((worst, comp) => getSeverityIndex(comp.status) < getSeverityIndex(worst) ? comp.status : worst, SystemStatusLevel.OPERATIONAL);
            if (getSeverityIndex(worstSub) < getSeverityIndex(internalStatus)) internalStatus = worstSub;
        }
        service.status = internalStatus;

        const affectingIncidents = activeIncidents.filter(inc => inc.affectedServiceIds.includes(service.id));
        let finalStatus = service.status;
        for (const incident of affectingIncidents) {
            let incidentImpactStatus: SystemStatusLevel | null = null;
            if (incident.type === IncidentType.MAINTENANCE) incidentImpactStatus = SystemStatusLevel.MAINTENANCE;
            else if (incident.type === IncidentType.INCIDENT) {
                if (incident.impact === IncidentImpact.CRITICAL) incidentImpactStatus = SystemStatusLevel.MAJOR_OUTAGE;
                else if (incident.impact === IncidentImpact.SIGNIFICANT) incidentImpactStatus = SystemStatusLevel.PARTIAL_OUTAGE;
                else if (incident.impact === IncidentImpact.MINOR) incidentImpactStatus = SystemStatusLevel.DEGRADED;
            }
            if (incidentImpactStatus && getSeverityIndex(incidentImpactStatus) < getSeverityIndex(finalStatus)) {
                finalStatus = incidentImpactStatus;
            }
        }
        service.status = finalStatus;
        return service;
    });


    overallLevel = derivedServices.reduce((worst, srv) => {
        return getSeverityIndex(srv.status) < getSeverityIndex(worst) ? srv.status : worst;
    }, SystemStatusLevel.OPERATIONAL);
    

    return { level: overallLevel, message: messages[overallLevel] || "Status assessment ongoing." };

  } catch (error) {
    console.error(`Failed to determine overall status:`, error);
    return { level: SystemStatusLevel.UNKNOWN, message: "Could not determine system status." };
  }
};

// --- Admin Management of Public Content (Services & Groups) ---
export const adminGetAllServices = async (): Promise<SystemService[]> => {
  const operationName = 'adminGetAllServices';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockPublicServices().sort((a, b) => a.displayOrder - b.displayOrder));
  }
  if (!isAppwriteEffectivelyConfigured()) {
     const errorMsg = !APPWRITE_CONFIG.publicServicesCollectionId ? "Public Services Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const response = await databases.listDocuments( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicServicesCollectionId!, [Query.orderAsc('displayOrder')] );
    return response.documents.map(mapDocumentToSystemService);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const adminCreateService = async (serviceData: Omit<SystemService, 'id' | '$id' | 'lastCheckedAutomated' | 'lastPingResult' | 'updatedAt'>): Promise<SystemService> => {
  const operationName = 'adminCreateService';
   if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
    return simulateApiCall(mockService.createMockPublicService(serviceData));
  }
  if (!isAppwriteEffectivelyConfigured()) {
     const errorMsg = !APPWRITE_CONFIG.publicServicesCollectionId ? "Public Services Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload = {
        ...serviceData,
        lastCheckedAutomated: new Date().toISOString(),
        components: serviceData.components ? JSON.stringify(serviceData.components) : JSON.stringify([]),
        lastPingResult: serviceData.pingUrl ? JSON.stringify({ status: PingStatus.UNKNOWN, checkedAt: new Date().toISOString() }) : undefined,
    };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    const document = await databases.createDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicServicesCollectionId!, ID.unique(), payload );
    return mapDocumentToSystemService(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
  }
};

export const adminUpdateService = async (appwriteServiceId: string, updates: Partial<Omit<SystemService, 'id' | '$id' | 'updatedAt'>>): Promise<SystemService> => {
  const operationName = 'adminUpdateService';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update for ${operationName}.`);
    const updatedService = mockService.updateMockPublicService(appwriteServiceId, updates);
    if (!updatedService) throw new Error("Service not found in mock data for update.");
    return simulateApiCall(updatedService);
  }
  if (!isAppwriteEffectivelyConfigured()) {
     const errorMsg = !APPWRITE_CONFIG.publicServicesCollectionId ? "Public Services Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload: any = { ...updates };
    if (payload.components) {
        payload.components = JSON.stringify(payload.components);
    }
    if (payload.lastPingResult) {
        payload.lastPingResult = JSON.stringify(payload.lastPingResult);
    }
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const document = await databases.updateDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicServicesCollectionId!, appwriteServiceId, payload );
    return mapDocumentToSystemService(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
  }
};

export const adminDeleteService = async (appwriteServiceId: string): Promise<void> => {
  const operationName = 'adminDeleteService';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating delete for ${operationName}.`);
    mockService.deleteMockPublicService(appwriteServiceId);
    return simulateApiCall(undefined);
  }
  if (!isAppwriteEffectivelyConfigured()) {
     const errorMsg = !APPWRITE_CONFIG.publicServicesCollectionId ? "Public Services Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    await databases.deleteDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicServicesCollectionId!, appwriteServiceId );
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting ${operationName}): ${errMsg}`);
  }
};

export const adminPingService = async (appwriteServiceId: string): Promise<PingResult> => {
    const operationName = 'adminPingService';
    if (isUserExplicitlyInMockMode()) {
        console.warn(`MOCK MODE (User Choice): Simulating ping for ${operationName}.`);
        return simulateApiCall(mockService.pingMockService(appwriteServiceId));
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.publicServicesCollectionId ? "Public Services Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
        return { status: PingStatus.ERROR, checkedAt: new Date().toISOString(), error: errorMsg };
    }

    const serviceDoc = await databases.getDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicServicesCollectionId!, appwriteServiceId);
    const service = mapDocumentToSystemService(serviceDoc);

    if (!service.pingEnabled || !service.pingUrl) {
        const result = { status: PingStatus.UNKNOWN, checkedAt: new Date().toISOString(), error: "Ping not enabled or URL not set." };
        await adminUpdateService(appwriteServiceId, { lastPingResult: result });
        return result;
    }
    
    console.info(`LIVE PING: ${operationName} for ${service.name} (${service.pingUrl})`);
    const startTime = Date.now();
    try {
        const response = await fetch(service.pingUrl, { method: 'GET', mode: 'no-cors' }); // No-cors for external, may not get real status
        const endTime = Date.now();
        const responseTimeMs = endTime - startTime;

        // 'no-cors' responses will have status 0 and ok=false, but don't indicate network error.
        // This is a very basic check. Real checks often need a server-side proxy.
        let status: PingStatus;
        if (response.type === 'opaque' || response.ok) { // Opaque means request went through but we can't read response
            status = responseTimeMs > 1000 ? PingStatus.SLOW : PingStatus.ONLINE;
        } else {
            status = PingStatus.OFFLINE;
        }
        const pingResult: PingResult = { status, statusCode: response.status, responseTimeMs, checkedAt: new Date().toISOString() };
        await adminUpdateService(appwriteServiceId, { lastPingResult: pingResult, lastCheckedAutomated: new Date().toISOString() });
        return pingResult;
    } catch (error) {
        console.error(`Ping failed for ${service.name}:`, error);
        const pingResult: PingResult = { status: PingStatus.ERROR, checkedAt: new Date().toISOString(), error: (error as Error).message };
        await adminUpdateService(appwriteServiceId, { lastPingResult: pingResult, lastCheckedAutomated: new Date().toISOString() });
        return pingResult;
    }
};


export const adminGetAllServiceGroups = async (): Promise<ServiceGroup[]> => {
  const operationName = 'adminGetAllServiceGroups';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
    return simulateApiCall(mockService.getMockServiceGroups());
  }
  if (!isAppwriteEffectivelyConfigured()) {
     const errorMsg = !APPWRITE_CONFIG.serviceGroupsCollectionId ? "Service Groups Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const response = await databases.listDocuments( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.serviceGroupsCollectionId!, [Query.orderAsc('displayOrder')] );
    return response.documents.map(mapDocumentToServiceGroup);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
  }
};

export const adminCreateServiceGroup = async (groupData: Omit<ServiceGroup, 'id' | '$id'>): Promise<ServiceGroup> => {
  const operationName = 'adminCreateServiceGroup';
   if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
    return simulateApiCall(mockService.createMockServiceGroup(groupData));
  }
  if (!isAppwriteEffectivelyConfigured()) {
     const errorMsg = !APPWRITE_CONFIG.serviceGroupsCollectionId ? "Service Groups Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload = { ...groupData };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    const document = await databases.createDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.serviceGroupsCollectionId!, ID.unique(), payload );
    return mapDocumentToServiceGroup(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
  }
};

export const adminUpdateServiceGroup = async (appwriteGroupId: string, updates: Partial<Omit<ServiceGroup, 'id' | '$id'>>): Promise<ServiceGroup> => {
  const operationName = 'adminUpdateServiceGroup';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating update for ${operationName}.`);
    const updatedGroup = mockService.updateMockServiceGroup(appwriteGroupId, updates);
    if (!updatedGroup) throw new Error("Service group not found in mock data for update.");
    return simulateApiCall(updatedGroup);
  }
  if (!isAppwriteEffectivelyConfigured()) {
     const errorMsg = !APPWRITE_CONFIG.serviceGroupsCollectionId ? "Service Groups Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName}`);
    const payload = { ...updates };
    Object.keys(payload).forEach(key => (payload as any)[key] === undefined && delete (payload as any)[key]);
    const document = await databases.updateDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.serviceGroupsCollectionId!, appwriteGroupId, payload );
    return mapDocumentToServiceGroup(document);
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
  }
};

export const adminDeleteServiceGroup = async (appwriteGroupId: string): Promise<void> => {
  const operationName = 'adminDeleteServiceGroup';
  if (isUserExplicitlyInMockMode()) {
    console.warn(`MOCK MODE (User Choice): Simulating delete for ${operationName}.`);
    mockService.deleteMockServiceGroup(appwriteGroupId);
    return simulateApiCall(undefined);
  }
  if (!isAppwriteEffectivelyConfigured()) {
     const errorMsg = !APPWRITE_CONFIG.serviceGroupsCollectionId ? "Service Groups Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
    console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
    throw new Error(errorMsg);
  }
  try {
    console.info(`LIVE Appwrite Call: ${operationName} (and ungrouping services)`);
    // Ungroup services first
    const servicesToUpdate = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicServicesCollectionId!, [Query.equal('groupId', appwriteGroupId)]
    );
    for (const serviceDoc of servicesToUpdate.documents) {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.publicServicesCollectionId!, serviceDoc.$id, { groupId: null }
      );
    }
    // Then delete the group
    await databases.deleteDocument( APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.serviceGroupsCollectionId!, appwriteGroupId );
  } catch (error) {
    const errMsg = (error instanceof Error) ? error.message : String(error);
    console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting ${operationName}): ${errMsg}`);
  }
};
