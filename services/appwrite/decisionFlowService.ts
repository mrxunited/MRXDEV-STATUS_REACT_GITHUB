
import { ID, Query, Models } from 'appwrite';
import { DecisionFlow, DecisionFlowStep, ActiveIncidentFlow, ActiveFlowStatus, DecisionFlowStepState } from '../../types';
import { APPWRITE_CONFIG } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService';

// --- Data Mapping Helpers ---
const mapDocumentToDecisionFlow = (doc: Models.Document): DecisionFlow => {
  let parsedSteps: DecisionFlowStep[] = [];
  if (typeof doc.steps === 'string' && doc.steps.startsWith('[')) {
    try { parsedSteps = JSON.parse(doc.steps); } catch (e) { console.warn(`Failed to parse steps for flow ${doc.$id}: ${doc.steps}`); }
  } else if (Array.isArray(doc.steps)) {
    parsedSteps = doc.steps;
  }

  let parsedAssociatedIncidentTypes: any[] = [];
   if (typeof doc.associatedIncidentTypes === 'string' && doc.associatedIncidentTypes.startsWith('[')) {
    try { parsedAssociatedIncidentTypes = JSON.parse(doc.associatedIncidentTypes); } catch (e) { console.warn(`Failed to parse associatedIncidentTypes for flow ${doc.$id}`); }
  } else if (Array.isArray(doc.associatedIncidentTypes)) {
    parsedAssociatedIncidentTypes = doc.associatedIncidentTypes;
  }
  
  let parsedAssociatedSeverityLevelIds: string[] = [];
  if (typeof doc.associatedSeverityLevelIds === 'string' && doc.associatedSeverityLevelIds.startsWith('[')) {
    try { parsedAssociatedSeverityLevelIds = JSON.parse(doc.associatedSeverityLevelIds); } catch (e) { console.warn(`Failed to parse associatedSeverityLevelIds for flow ${doc.$id}`); }
  } else if (Array.isArray(doc.associatedSeverityLevelIds)) {
    parsedAssociatedSeverityLevelIds = doc.associatedSeverityLevelIds;
  }


  return {
    id: doc.$id,
    $id: doc.$id,
    name: doc.name,
    description: doc.description,
    associatedIncidentTypes: parsedAssociatedIncidentTypes,
    associatedSeverityLevelIds: parsedAssociatedSeverityLevelIds,
    steps: parsedSteps.map((step, index) => ({...step, displayOrder: index})), // Ensure displayOrder
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
  };
};

const mapDocumentToActiveIncidentFlow = (doc: Models.Document): ActiveIncidentFlow => {
  let parsedStepStates: Record<string, DecisionFlowStepState> = {};
  if (typeof doc.stepStates === 'string' && doc.stepStates.startsWith('{')) {
    try { parsedStepStates = JSON.parse(doc.stepStates); } catch (e) { console.warn(`Failed to parse stepStates for active flow ${doc.$id}: ${doc.stepStates}`); }
  } else if (typeof doc.stepStates === 'object' && doc.stepStates !== null) {
    parsedStepStates = doc.stepStates as Record<string, DecisionFlowStepState>;
  }
  return {
    id: doc.$id,
    $id: doc.$id,
    incidentId: doc.incidentId,
    flowId: doc.flowId,
    flowNameSnapshot: doc.flowNameSnapshot,
    stepStates: parsedStepStates,
    status: doc.status as ActiveFlowStatus,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    notes: doc.notes,
  };
};

// --- Decision Flow Definitions Management ---
export const adminGetAllDecisionFlows = async (): Promise<DecisionFlow[]> => {
  const operationName = 'adminGetAllDecisionFlows';
  if (isUserExplicitlyInMockMode()) {
    return simulateApiCall(mockService.getMockDecisionFlows());
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.decisionFlowsCollectionId) {
    throw new Error(ERROR_MSG_NOT_CONFIGURED + " (Decision Flows Collection)");
  }
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.decisionFlowsCollectionId!,
      [Query.orderDesc('$createdAt')]
    );
    return response.documents.map(mapDocumentToDecisionFlow);
  } catch (error) {
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching Decision Flows): ${(error as Error).message}`);
  }
};

export const adminCreateDecisionFlow = async (flowData: Omit<DecisionFlow, 'id' | '$id' | 'createdAt' | 'updatedAt'>): Promise<DecisionFlow> => {
  const operationName = 'adminCreateDecisionFlow';
  if (isUserExplicitlyInMockMode()) {
    return simulateApiCall(mockService.createMockDecisionFlow(flowData));
  }
   if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.decisionFlowsCollectionId) {
    throw new Error(ERROR_MSG_NOT_CONFIGURED + " (Decision Flows Collection)");
  }
  try {
    const payload = {
      ...flowData,
      steps: JSON.stringify(flowData.steps.map((s, i) => ({...s, id: s.id || ID.unique(), displayOrder: i })) || []),
      associatedIncidentTypes: JSON.stringify(flowData.associatedIncidentTypes || []),
      associatedSeverityLevelIds: JSON.stringify(flowData.associatedSeverityLevelIds || []),
    };
    const document = await databases.createDocument(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.decisionFlowsCollectionId!,
      ID.unique(),
      payload
    );
    return mapDocumentToDecisionFlow(document);
  } catch (error) {
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating Decision Flow): ${(error as Error).message}`);
  }
};

export const adminUpdateDecisionFlow = async (flowId: string, updates: Partial<Omit<DecisionFlow, 'id' | '$id' | 'createdAt' | 'updatedAt'>>): Promise<DecisionFlow> => {
  const operationName = 'adminUpdateDecisionFlow';
  if (isUserExplicitlyInMockMode()) {
    const updated = mockService.updateMockDecisionFlow(flowId, updates);
    if (!updated) throw new Error("Mock flow not found for update.");
    return simulateApiCall(updated);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.decisionFlowsCollectionId) {
    throw new Error(ERROR_MSG_NOT_CONFIGURED + " (Decision Flows Collection)");
  }
  try {
    const payload: any = { ...updates };
    if (updates.steps) payload.steps = JSON.stringify(updates.steps.map((s,i) => ({...s, id: s.id || ID.unique(), displayOrder: i})));
    if (updates.associatedIncidentTypes) payload.associatedIncidentTypes = JSON.stringify(updates.associatedIncidentTypes);
    if (updates.associatedSeverityLevelIds) payload.associatedSeverityLevelIds = JSON.stringify(updates.associatedSeverityLevelIds);
    
    const document = await databases.updateDocument(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.decisionFlowsCollectionId!,
      flowId,
      payload
    );
    return mapDocumentToDecisionFlow(document);
  } catch (error) {
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating Decision Flow): ${(error as Error).message}`);
  }
};

export const adminDeleteDecisionFlow = async (flowId: string): Promise<void> => {
  const operationName = 'adminDeleteDecisionFlow';
  if (isUserExplicitlyInMockMode()) {
    mockService.deleteMockDecisionFlow(flowId);
    return simulateApiCall(undefined);
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.decisionFlowsCollectionId) {
    throw new Error(ERROR_MSG_NOT_CONFIGURED + " (Decision Flows Collection)");
  }
  try {
    // Check if flow is used in active_incident_flows before deleting
    if (APPWRITE_CONFIG.activeIncidentFlowsCollectionId) {
        const usageCheck = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.activeIncidentFlowsCollectionId,
            [Query.equal('flowId', flowId), Query.limit(1)]
        );
        if (usageCheck.total > 0) {
            throw new Error(`Decision flow is currently attached to ${usageCheck.total} incident(s) and cannot be deleted.`);
        }
    }
    await databases.deleteDocument(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.decisionFlowsCollectionId!,
      flowId
    );
  } catch (error) {
    const errMsg = (error as Error).message;
    if (errMsg.includes("is currently attached to")) {
        throw error; // Re-throw specific error
    }
    throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting Decision Flow): ${errMsg}`);
  }
};


// --- Active Incident Flow Management ---
export const adminGetActiveFlowForIncident = async (incidentId: string): Promise<ActiveIncidentFlow | null> => {
  const operationName = 'adminGetActiveFlowForIncident';
  if (isUserExplicitlyInMockMode()) {
    return simulateApiCall(mockService.getMockActiveIncidentFlowByIncidentId(incidentId));
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.activeIncidentFlowsCollectionId) {
    console.warn(ERROR_MSG_NOT_CONFIGURED + " (Active Incident Flows Collection). Returning null.");
    return null;
  }
  try {
    const response = await databases.listDocuments(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.activeIncidentFlowsCollectionId!,
      [Query.equal('incidentId', incidentId), Query.limit(1)]
    );
    return response.documents.length > 0 ? mapDocumentToActiveIncidentFlow(response.documents[0]) : null;
  } catch (error) {
    console.warn(`Failed to fetch active flow for incident ${incidentId}: ${(error as Error).message}`);
    return null; 
  }
};

export const adminAttachFlowToIncident = async (incidentId: string, flowId: string, flowNameSnapshot: string): Promise<ActiveIncidentFlow> => {
  const operationName = 'adminAttachFlowToIncident';
  if (isUserExplicitlyInMockMode()) {
    return simulateApiCall(mockService.attachMockFlowToIncident(incidentId, flowId, flowNameSnapshot));
  }
  if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.activeIncidentFlowsCollectionId) {
    throw new Error(ERROR_MSG_NOT_CONFIGURED + " (Active Incident Flows Collection)");
  }
  try {
     // Ensure only one active flow per incident by deleting existing ones first
    const existingFlows = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId!,
        APPWRITE_CONFIG.activeIncidentFlowsCollectionId!,
        [Query.equal('incidentId', incidentId)]
    );
    for (const doc of existingFlows.documents) {
        await databases.deleteDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.activeIncidentFlowsCollectionId!, doc.$id);
    }

    const flowDefinition = await databases.getDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.decisionFlowsCollectionId!, flowId);
    const mappedFlow = mapDocumentToDecisionFlow(flowDefinition);
    const initialStepStates: Record<string, DecisionFlowStepState> = {};
    mappedFlow.steps.forEach(step => {
        initialStepStates[step.id] = { completed: false, skipped: false, notes: '' };
    });


    const payload = {
      incidentId,
      flowId,
      flowNameSnapshot,
      stepStates: JSON.stringify(initialStepStates),
      status: ActiveFlowStatus.IN_PROGRESS,
      startedAt: new Date().toISOString(),
    };
    const document = await databases.createDocument(
      APPWRITE_CONFIG.databaseId!,
      APPWRITE_CONFIG.activeIncidentFlowsCollectionId!,
      ID.unique(),
      payload
    );
    return mapDocumentToActiveIncidentFlow(document);
  } catch (error) {
     throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Attaching Flow): ${(error as Error).message}`);
  }
};

export const adminUpdateActiveIncidentFlow = async (activeFlowId: string, updates: Partial<Omit<ActiveIncidentFlow, 'id' | '$id' | 'incidentId' | 'flowId' | 'flowNameSnapshot' | 'startedAt'>>): Promise<ActiveIncidentFlow> => {
    const operationName = 'adminUpdateActiveIncidentFlow';
    if (isUserExplicitlyInMockMode()) {
        const updated = mockService.updateMockActiveIncidentFlow(activeFlowId, updates);
        if (!updated) throw new Error("Mock active flow not found for update.");
        return simulateApiCall(updated);
    }
    if (!isAppwriteEffectivelyConfigured() || !APPWRITE_CONFIG.activeIncidentFlowsCollectionId) {
        throw new Error(ERROR_MSG_NOT_CONFIGURED + " (Active Incident Flows Collection)");
    }
    try {
        const payload: any = { ...updates };
        if (updates.stepStates) payload.stepStates = JSON.stringify(updates.stepStates);
        
        // Determine overall status based on stepStates if not explicitly provided
        if (updates.stepStates && !updates.status) {
            const flowDefinitionDoc = await databases.getDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.decisionFlowsCollectionId!, payload.flowId || (await databases.getDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.activeIncidentFlowsCollectionId!, activeFlowId)).flowId);
            const flowDefinition = mapDocumentToDecisionFlow(flowDefinitionDoc);
            const allRequiredStepsCompleted = flowDefinition.steps
                .filter(step => step.required)
                .every(step => updates.stepStates![step.id]?.completed);

            if (allRequiredStepsCompleted) {
                payload.status = ActiveFlowStatus.COMPLETED;
            } else {
                 // Check if any step is still in progress (not completed and not skipped)
                const anyInProgress = flowDefinition.steps.some(step => 
                    !updates.stepStates![step.id]?.completed && !updates.stepStates![step.id]?.skipped
                );
                payload.status = anyInProgress ? ActiveFlowStatus.IN_PROGRESS : ActiveFlowStatus.COMPLETED; // If no steps are in progress, but not all required are complete, it might still be considered completed if all skippable are skipped. Or maintain IN_PROGRESS.
            }
        }

        if (payload.status === ActiveFlowStatus.COMPLETED && !payload.completedAt) {
            const existingDoc = await databases.getDocument(APPWRITE_CONFIG.databaseId!, APPWRITE_CONFIG.activeIncidentFlowsCollectionId!, activeFlowId);
            if (!existingDoc.completedAt) {
                payload.completedAt = new Date().toISOString();
            }
        }

        const document = await databases.updateDocument(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.activeIncidentFlowsCollectionId!,
            activeFlowId,
            payload
        );
        return mapDocumentToActiveIncidentFlow(document);
    } catch (error) {
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating Active Flow): ${(error as Error).message}`);
    }
};

