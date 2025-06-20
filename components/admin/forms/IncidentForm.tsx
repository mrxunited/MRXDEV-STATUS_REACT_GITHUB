
import React, { useState, useEffect } from 'react';
import { 
    Incident, IncidentType, IncidentImpact, IncidentLifecycleStatus, SystemService, FormMode, 
    PIRStatus, IncidentReview, SeverityLevel, IncidentMessage, DecisionFlow, ActiveIncidentFlow, DecisionFlowStep, DecisionFlowStepState, ActiveFlowStatus 
} from '../../../types';
import PIRForm from './PIRForm'; 
import { useAuth } from '../../../contexts/AuthContext'; 
import { adminGetIncidentReviewByIncidentId, adminCreateIncidentReview, adminUpdateIncidentReview, adminGetAllSeverityLevels, adminUpdateActiveIncidentFlow, adminGetActiveFlowForIncident } from '../../../services/appwrite'; 
import LoadingSpinner from '../../ui/LoadingSpinner'; 
import { useNotification } from '../../../contexts/NotificationContext'; 
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import StatusPill from '../../ui/StatusPill';


interface IncidentFormProps {
  mode: FormMode;
  initialData?: Incident | null;
  services: SystemService[];
  onSave: (data: Incident | Omit<Incident, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string, initialStatus: IncidentLifecycleStatus }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  initialActiveTab?: 'details' | 'flow' | 'pir' | 'history'; 
  availableDecisionFlows?: DecisionFlow[]; 
  activeIncidentFlow?: ActiveIncidentFlow | null; 
  onAttachFlow?: (incidentId: string, flowId: string) => Promise<void>; 
  // Removed onUpdateStepState as it will be handled internally here
}

const IncidentForm: React.FC<IncidentFormProps> = ({ 
    mode, initialData, services, onSave, isSubmitting: isMainFormSubmitting, onCancel, 
    initialActiveTab = 'details',
    availableDecisionFlows = [], 
    activeIncidentFlow: initialActiveFlow, // Renamed prop for clarity
    onAttachFlow
}) => {
  const { user: authUser } = useAuth();
  const { addNotification } = useNotification();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IncidentType>(IncidentType.INCIDENT);
  const [impact, setImpact] = useState<IncidentImpact>(IncidentImpact.MINOR);
  const [currentLifecycleStatus, setCurrentLifecycleStatus] = useState<IncidentLifecycleStatus>(IncidentLifecycleStatus.DETECTED);
  const [affectedServiceIds, setAffectedServiceIds] = useState<string[]>([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [isPubliclyVisible, setIsPubliclyVisible] = useState(true);
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [scheduledEndTime, setScheduledEndTime] = useState('');
  const [severityLevelId, setSeverityLevelId] = useState<string | undefined>(undefined); 
  const [availableSeverityLevels, setAvailableSeverityLevels] = useState<SeverityLevel[]>([]); 
  const [debriefRequired, setDebriefRequired] = useState(false); 

  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'flow' | 'pir' | 'history'>(initialActiveTab);

  const [incidentReview, setIncidentReview] = useState<IncidentReview | null>(null);
  const [pirData, setPirData] = useState<Partial<Omit<IncidentReview, 'id'|'$id'|'incidentId'|'createdAt'|'updatedAt'>>>({ status: PIRStatus.PENDING });
  const [isLoadingPIR, setIsLoadingPIR] = useState(false);
  const [isPIRSubmitting, setIsPIRSubmitting] = useState(false);

  const [selectedFlowToAttach, setSelectedFlowToAttach] = useState<string>('');
  const [currentActiveFlow, setCurrentActiveFlow] = useState<ActiveIncidentFlow | null>(initialActiveFlow || null); // Local state for active flow
  const [currentFlowDefinition, setCurrentFlowDefinition] = useState<DecisionFlow | null>(null);
  const [stepNotesInput, setStepNotesInput] = useState<Record<string, string>>({}); // For individual step notes during editing


  const isIncidentResolvedOrCompleted = initialData?.currentLifecycleStatus === IncidentLifecycleStatus.RESOLVED || initialData?.currentLifecycleStatus === IncidentLifecycleStatus.COMPLETED;
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";
  const tabBaseClass = "px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none transition-colors";
  const tabActiveClass = "bg-[var(--color-primary-blue)] text-white";
  const tabInactiveClass = "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] border-b-2 border-transparent";

  useEffect(() => {
    setCurrentActiveFlow(initialActiveFlow || null);
    if (initialActiveFlow && availableDecisionFlows) {
        const def = availableDecisionFlows.find(df => df.id === initialActiveFlow.flowId);
        setCurrentFlowDefinition(def || null);
        // Initialize stepNotesInput from activeIncidentFlow.stepStates
        const initialNotes: Record<string, string> = {};
        if (def) {
            def.steps.forEach(step => {
                initialNotes[step.id] = initialActiveFlow.stepStates[step.id]?.notes || '';
            });
        }
        setStepNotesInput(initialNotes);
    } else {
        setCurrentFlowDefinition(null);
        setStepNotesInput({});
    }
  }, [initialActiveFlow, availableDecisionFlows]);


  useEffect(() => {
    adminGetAllSeverityLevels()
        .then(levels => setAvailableSeverityLevels(levels))
        .catch(err => {
            console.error("Failed to fetch severity levels:", err);
            addNotification({ type: 'error', title: 'Error', message: 'Could not load severity levels for form.' });
        });

    if (mode === FormMode.EDIT && initialData) {
      setTitle(initialData.title);
      setType(initialData.type);
      setImpact(initialData.impact);
      setCurrentLifecycleStatus(initialData.currentLifecycleStatus);
      setAffectedServiceIds(initialData.affectedServiceIds);
      setInitialMessage(initialData.messages[0]?.message || ''); 
      setIsPubliclyVisible(initialData.isPubliclyVisible);
      setScheduledStartTime(initialData.scheduledStartTime ? new Date(initialData.scheduledStartTime).toISOString().substring(0, 16) : '');
      setScheduledEndTime(initialData.scheduledEndTime ? new Date(initialData.scheduledEndTime).toISOString().substring(0, 16) : '');
      setSeverityLevelId(initialData.severityLevelId || undefined); 
      setDebriefRequired(initialData.debriefRequired || false); 
      setActiveTab(initialActiveTab); 

      if (isIncidentResolvedOrCompleted && initialData.id) {
        setIsLoadingPIR(true);
        adminGetIncidentReviewByIncidentId(initialData.id)
          .then(review => {
            setIncidentReview(review);
            if (review) {
              setPirData({
                incidentSummaryText: review.incidentSummaryText, rootCauseSummary: review.rootCauseSummary, timelineOfEvents: review.timelineOfEvents,
                impactedSystemsText: review.impactedSystemsText, communicationSent: review.communicationSent, resolutionSteps: review.resolutionSteps,
                whatWentWell: review.whatWentWell, whatWentWrong: review.whatWentWrong, actionItems: review.actionItems, followUpActions: review.followUpActions,
                lessonsLearned: review.lessonsLearned, severityLevel: review.severityLevel, isPreventable: review.isPreventable,
                preventableReasoning: review.preventableReasoning, status: review.status, participants: review.participants, reviewedAt: review.reviewedAt,
              });
            } else {
              setPirData({ status: PIRStatus.PENDING }); 
            }
          })
          .catch(err => {
            console.error("Failed to fetch incident review:", err);
            addNotification({type: 'error', title: 'PIR Load Error', message: 'Could not load post-incident review data.'});
            setPirData({ status: PIRStatus.PENDING });
          })
          .finally(() => setIsLoadingPIR(false));
      }

    } else { 
      setTitle(''); setType(IncidentType.INCIDENT); setImpact(IncidentImpact.MINOR); setCurrentLifecycleStatus(IncidentLifecycleStatus.DETECTED);
      setAffectedServiceIds([]); setInitialMessage(''); setIsPubliclyVisible(true); setScheduledStartTime(''); setScheduledEndTime('');
      setSeverityLevelId(undefined); setDebriefRequired(false); setPirData({ status: PIRStatus.PENDING }); setIncidentReview(null);
      setActiveTab('details'); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData, isIncidentResolvedOrCompleted, addNotification, initialActiveTab]); 


  useEffect(() => {
    if (mode === FormMode.ADD) {
      if (type === IncidentType.MAINTENANCE) {
        setCurrentLifecycleStatus(IncidentLifecycleStatus.SCHEDULED);
      } else {
        setCurrentLifecycleStatus(IncidentLifecycleStatus.DETECTED);
      }
    }
  }, [type, mode]);

  const handlePIRDataChange = (fieldName: keyof Omit<IncidentReview, 'id'|'$id'|'incidentId'|'createdAt'|'updatedAt'>, value: any) => {
    setPirData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSavePIR = async () => {
    if (!initialData || !initialData.id) {
        addNotification({type: 'error', title: 'PIR Save Error', message: 'Incident ID is missing.'});
        return;
    }
    setIsPIRSubmitting(true);
    setFormError(null); 
    try {
        const reviewPayload = { ...pirData, incidentId: initialData.id, status: pirData.status || PIRStatus.PENDING };
        if (incidentReview && incidentReview.id) { 
            const { incidentId, createdAt, updatedAt, ...updateData } = reviewPayload as any;
            if (updateData.participants && !Array.isArray(updateData.participants)) updateData.participants = (updateData.participants as string).split(',').map(p => p.trim()).filter(p => p);
            const updatedReview = await adminUpdateIncidentReview(incidentReview.id, updateData);
            setIncidentReview(updatedReview);
            addNotification({type: 'success', title: 'PIR Updated', message: 'Post-Incident Review saved successfully.'});
        } else { 
             const { createdAt, updatedAt, ...createData } = reviewPayload as any;
             if (createData.participants && !Array.isArray(createData.participants)) createData.participants = (createData.participants as string).split(',').map(p => p.trim()).filter(p => p);
            const newReview = await adminCreateIncidentReview(createData);
            setIncidentReview(newReview);
            addNotification({type: 'success', title: 'PIR Created', message: 'Post-Incident Review created successfully.'});
        }
    } catch (error) {
        const errMsg = (error as Error).message || 'Failed to save PIR.';
        setFormError(errMsg); 
        addNotification({type: 'error', title: 'PIR Save Error', message: errMsg});
    } finally {
        setIsPIRSubmitting(false);
    }
  };


  const handleSubmitIncidentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) { setFormError('Title is required.'); return; }
    if (mode === FormMode.ADD && !initialMessage.trim()) { setFormError('An initial update message is required for new incidents.'); return; }
    if (affectedServiceIds.length === 0) { setFormError('At least one affected service must be selected.'); return; }
    if (type === IncidentType.MAINTENANCE && !scheduledStartTime) { setFormError('Scheduled start time is required for maintenance.'); return; }

    const incidentDetailsPayload: Partial<Incident> = {
      title, type, impact: type === IncidentType.MAINTENANCE ? IncidentImpact.NONE : impact, currentLifecycleStatus, 
      affectedServiceIds, isPubliclyVisible,
      scheduledStartTime: type === IncidentType.MAINTENANCE && scheduledStartTime ? new Date(scheduledStartTime).toISOString() : undefined,
      scheduledEndTime: type === IncidentType.MAINTENANCE && scheduledEndTime ? new Date(scheduledEndTime).toISOString() : undefined,
      severityLevelId: severityLevelId || undefined, debriefRequired, 
    };

    if (mode === FormMode.EDIT && initialData) {
      await onSave({ ...initialData, ...incidentDetailsPayload });
    } else { 
      await onSave({ 
        ...incidentDetailsPayload, initialMessage, initialStatus: currentLifecycleStatus 
      } as Omit<Incident, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string, initialStatus: IncidentLifecycleStatus });
    }
  };

  const handleServiceSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const value: string[] = [];
    for (let i = 0, l = options.length; i < l; i++) if (options[i].selected) value.push(options[i].value);
    setAffectedServiceIds(value);
  };
  
  const handleInternalAttachFlow = async () => {
    if (initialData?.id && selectedFlowToAttach && onAttachFlow) {
        try {
            await onAttachFlow(initialData.id, selectedFlowToAttach);
            // Refetch the active flow to update UI
            const flow = await adminGetActiveFlowForIncident(initialData.id);
            setCurrentActiveFlow(flow);
             if (flow) {
                const def = availableDecisionFlows?.find(df => df.id === flow.flowId);
                setCurrentFlowDefinition(def || null);
            }
        } catch (error) {
            // Notification is handled by parent usually
        }
    } else if (!selectedFlowToAttach) {
        addNotification({type: 'warning', title: 'Select Flow', message: 'Please select a decision flow to attach.'});
    }
  };

  const handleUpdateStepState = async (stepId: string, newState: Partial<DecisionFlowStepState>) => {
    if (!currentActiveFlow || !currentFlowDefinition) return;
    
    const updatedStepStates = {
        ...currentActiveFlow.stepStates,
        [stepId]: {
            ...(currentActiveFlow.stepStates[stepId] || { completed: false, skipped: false }), // Ensure base state exists
            ...newState,
            completedBy: authUser?.name || 'System', // Set completer
            completedAt: (newState.completed || newState.skipped) ? new Date().toISOString() : undefined, // Set completion/skip time
        }
    };

    // Determine overall flow status
    const allRequiredStepsCompleted = currentFlowDefinition.steps
        .filter(step => step.required)
        .every(step => updatedStepStates[step.id]?.completed);
    
    let newOverallStatus = currentActiveFlow.status;
    if (allRequiredStepsCompleted) {
        newOverallStatus = ActiveFlowStatus.COMPLETED;
    } else {
        // Check if any step is still actively pending (not completed and not skipped)
        const anyInProgress = currentFlowDefinition.steps.some(step => 
            step.required && // Only consider required steps for "in progress" status
            !updatedStepStates[step.id]?.completed && 
            !updatedStepStates[step.id]?.skipped
        );
        newOverallStatus = anyInProgress ? ActiveFlowStatus.IN_PROGRESS : ActiveFlowStatus.COMPLETED;
    }


    try {
        const updatedActiveFlow = await adminUpdateActiveIncidentFlow(currentActiveFlow.id, { 
            stepStates: updatedStepStates,
            status: newOverallStatus
        });
        setCurrentActiveFlow(updatedActiveFlow); // Update local state
        addNotification({ type: 'success', title: 'Flow Step Updated', message: 'Step progress saved.' });
    } catch (error) {
        addNotification({ type: 'error', title: 'Update Failed', message: (error as Error).message });
    }
  };


  const renderDetailsTab = () => (
    <form onSubmit={handleSubmitIncidentDetails} id="incident-form-id" className="space-y-4 pt-4">
      {formError && <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
      <div>
        <label htmlFor="incident-title" className={labelClass}>Title <span className="text-red-500">*</span></label>
        <input type="text" id="incident-title" value={title} onChange={(e) => setTitle(e.target.value)}
               className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} required disabled={isMainFormSubmitting} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="incident-type" className={labelClass}>Type</label>
            <select id="incident-type" value={type} onChange={(e) => setType(e.target.value as IncidentType)}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isMainFormSubmitting}>
            {Object.values(IncidentType).map(it => (<option key={it} value={it}>{it}</option>))}
            </select>
        </div>
        {type === IncidentType.INCIDENT && (
            <div>
                <label htmlFor="incident-impact" className={labelClass}>Impact</label>
                <select id="incident-impact" value={impact} onChange={(e) => setImpact(e.target.value as IncidentImpact)}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isMainFormSubmitting}>
                {Object.values(IncidentImpact).map(imp => (<option key={imp} value={imp}>{imp}</option>))}
                </select>
            </div>
        )}
         {type === IncidentType.INCIDENT && (
            <div>
                <label htmlFor="incident-severity" className={labelClass}>Severity Level</label>
                <select id="incident-severity" value={severityLevelId || ''} onChange={(e) => setSeverityLevelId(e.target.value || undefined)}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isMainFormSubmitting || availableSeverityLevels.length === 0}>
                    <option value="">None</option>
                    {availableSeverityLevels.sort((a,b) => a.priority - b.priority).map(level => (
                        <option key={level.id} value={level.id} style={{ color: level.color }}>{level.name}</option>
                    ))}
                </select>
                 {availableSeverityLevels.length === 0 && <p className="text-xs text-gray-400 mt-1">No severity levels defined. <a href="#/admin/field-customization/severity-levels" className="text-[var(--color-primary-blue)] hover:underline">Define Severities</a></p>}
            </div>
        )}
      </div>
      
      <div>
        <label htmlFor="incident-affected-services" className={labelClass}>Affected Services <span className="text-red-500">*</span></label>
        <select id="incident-affected-services" multiple value={affectedServiceIds} onChange={handleServiceSelection}
                className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} h-32`} required disabled={isMainFormSubmitting}>
          {services.map(service => (<option key={service.id} value={service.id}>{service.name}</option>))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple services.</p>
      </div>

      <div>
        <label htmlFor="incident-status" className={labelClass}>{mode === FormMode.ADD ? 'Initial Lifecycle Status' : 'Current Lifecycle Status'}</label>
        <select id="incident-status" value={currentLifecycleStatus} onChange={(e) => setCurrentLifecycleStatus(e.target.value as IncidentLifecycleStatus)}
                className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isMainFormSubmitting}>
          {Object.values(IncidentLifecycleStatus).filter(s => s !== IncidentLifecycleStatus.UPDATE).map(ius => (<option key={ius} value={ius}>{ius}</option>))}
        </select>
      </div>
      
      {mode === FormMode.ADD && (
        <div>
          <label htmlFor="incident-initial-message" className={labelClass}>Initial Update Message <span className="text-red-500">*</span></label>
          <textarea id="incident-initial-message" rows={3} value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                    placeholder="Describe the current situation or initial findings." required disabled={isMainFormSubmitting} />
        </div>
      )}

      {type === IncidentType.MAINTENANCE && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="incident-start-time" className={labelClass}>Scheduled Start Time {type === IncidentType.MAINTENANCE && <span className="text-red-500">*</span>}</label>
            <input type="datetime-local" id="incident-start-time" value={scheduledStartTime} onChange={(e) => setScheduledStartTime(e.target.value)}
                   className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} required={type === IncidentType.MAINTENANCE} disabled={isMainFormSubmitting} />
          </div>
          <div>
            <label htmlFor="incident-end-time" className={labelClass}>Scheduled End Time</label>
            <input type="datetime-local" id="incident-end-time" value={scheduledEndTime} min={scheduledStartTime} onChange={(e) => setScheduledEndTime(e.target.value)}
                   className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isMainFormSubmitting} />
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
        <div className="flex items-center">
            <input id="incident-is-public" type="checkbox" checked={isPubliclyVisible} onChange={(e) => setIsPubliclyVisible(e.target.checked)}
                   className="h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700" disabled={isMainFormSubmitting} />
            <label htmlFor="incident-is-public" className={`ml-2 block text-sm ${labelClass}`}>Make this visible on the public status page?</label>
        </div>
        <div className="flex items-center">
            <input id="incident-debrief-required" type="checkbox" checked={debriefRequired} onChange={(e) => setDebriefRequired(e.target.checked)}
                   className="h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700" disabled={isMainFormSubmitting} />
            <label htmlFor="incident-debrief-required" className={`ml-2 block text-sm ${labelClass}`}>Debrief/PIR Required for this incident?</label>
        </div>
      </div>
    </form>
  );

  const renderFlowTab = () => {
    if (mode === FormMode.ADD || !initialData || !initialData.id) {
        return <p className="p-4 text-sm text-gray-500 dark:text-gray-400">Decision flow can be attached after the incident is created.</p>;
    }

    return (
        <div className="pt-4 space-y-4">
            {!currentActiveFlow && (
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label htmlFor="decision-flow-select" className={labelClass}>Select Flow to Attach</label>
                        <select id="decision-flow-select" value={selectedFlowToAttach} onChange={(e) => setSelectedFlowToAttach(e.target.value)}
                            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                            disabled={isMainFormSubmitting}>
                            <option value="">-- Select a Decision Flow --</option>
                            {availableDecisionFlows?.map(df => <option key={df.id} value={df.id}>{df.name}</option>)}
                        </select>
                    </div>
                    <button type="button" onClick={handleInternalAttachFlow}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 disabled:opacity-70"
                        disabled={!selectedFlowToAttach || isMainFormSubmitting || !onAttachFlow}>
                        Attach Flow
                    </button>
                </div>
            )}

            {currentActiveFlow && currentFlowDefinition && (
                <div>
                    <h4 className="text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1">
                        Attached Flow: {currentActiveFlow.flowNameSnapshot}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Status: <StatusPill status={currentActiveFlow.status as any} subtle/> | Started: {new Date(currentActiveFlow.startedAt).toLocaleString()}
                        {currentActiveFlow.completedAt && ` | Completed: ${new Date(currentActiveFlow.completedAt).toLocaleString()}`}
                    </p>
                    <div className="space-y-3 max-h-96 overflow-y-auto border p-3 rounded-md bg-gray-50 dark:bg-slate-800/50">
                        {currentFlowDefinition.steps.map((step: DecisionFlowStep, index: number) => {
                            const stepState = currentActiveFlow.stepStates[step.id] || { completed: false, skipped: false, notes: '' };
                            return (
                            <div key={step.id} className="p-3 border rounded-md bg-white dark:bg-slate-700 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
                                        {index + 1}. {step.title} {step.required && <span className="text-red-500 ml-1">*</span>}
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => handleUpdateStepState(step.id, { completed: !stepState.completed, skipped: false })}
                                            className={`px-2 py-0.5 text-xs rounded ${stepState.completed ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300'}`}
                                            disabled={isMainFormSubmitting}>
                                            <i className={`fas ${stepState.completed ? 'fa-check-square' : 'fa-square'} mr-1`}></i> {stepState.completed ? 'Completed' : 'Complete'}
                                        </button>
                                        <button onClick={() => handleUpdateStepState(step.id, { skipped: !stepState.skipped, completed: false })}
                                             className={`px-2 py-0.5 text-xs rounded ${stepState.skipped ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300'}`}
                                             disabled={isMainFormSubmitting}>
                                            <i className={`fas ${stepState.skipped ? 'fa-forward' : 'fa-minus-square'} mr-1`}></i> {stepState.skipped ? 'Skipped' : 'Skip'}
                                        </button>
                                    </div>
                                </div>
                                {step.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-pre-wrap">{step.description}</p>}
                                {step.instructions && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 p-2 bg-gray-100 dark:bg-slate-600 rounded whitespace-pre-wrap">{step.instructions}</p>}
                                
                                {step.attachments && step.attachments.length > 0 && (
                                    <div className="mt-1.5">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Attachments:</p>
                                        <ul className="list-disc list-inside ml-2 text-xs">
                                            {step.attachments.map(att => <li key={att.id}><a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{att.name}</a></li>)}
                                        </ul>
                                    </div>
                                )}
                                {step.links && step.links.length > 0 && (
                                    <div className="mt-1.5">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Links:</p>
                                        <ul className="list-disc list-inside ml-2 text-xs">
                                            {step.links.map(link => <li key={link.id}><a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{link.label}</a></li>)}
                                        </ul>
                                    </div>
                                )}

                                <div className="mt-2">
                                    <textarea value={stepNotesInput[step.id] || ''}
                                        onChange={(e) => setStepNotesInput(prev => ({...prev, [step.id]: e.target.value}))}
                                        onBlur={() => handleUpdateStepState(step.id, { notes: stepNotesInput[step.id] || '' })}
                                        rows={1} placeholder="Add notes for this step..."
                                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} text-xs py-1`}
                                        disabled={isMainFormSubmitting}
                                    />
                                </div>
                                {stepState.completedBy && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {stepState.completed ? 'Completed' : (stepState.skipped ? 'Skipped' : 'Last updated')} by {stepState.completedBy} 
                                        {stepState.completedAt ? ` on ${new Date(stepState.completedAt).toLocaleString()}` : ''}
                                    </p>
                                )}
                            </div>
                        )})}
                    </div>
                </div>
            )}
             {!currentActiveFlow && availableDecisionFlows?.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No decision flows have been created yet. <a href="#/admin/decision-flows" className="text-[var(--color-primary-blue)] hover:underline">Create a flow</a>.</p>
            )}
        </div>
    );
  };


  const renderPIRTab = () => {
    if (!initialData || !initialData.id) return <p className="text-sm text-gray-500 dark:text-gray-400 p-4">Cannot load PIR form without a saved incident.</p>;
    if (isLoadingPIR) return <div className="flex justify-center items-center h-48"><LoadingSpinner /></div>;
    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSavePIR(); }} id="pir-form-id" className="space-y-0 pt-4">
            {formError && <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
            <PIRForm pirData={pirData} onPIRChange={handlePIRDataChange} isSubmitting={isPIRSubmitting} currentUserName={authUser?.name} incidentId={initialData.id} />
            <div className="mt-6 pt-4 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] flex justify-end">
                 <button type="submit" form="pir-form-id" disabled={isPIRSubmitting || isMainFormSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 disabled:opacity-70 flex items-center">
                    {isPIRSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null} Save PIR
                </button>
            </div>
        </form>
    );
  };
  
  const renderHistoryTab = () => {
    if (mode === FormMode.ADD || !initialData || initialData.messages.length === 0) {
        return <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No history available for new incidents or incidents without updates.</p>;
    }
    const sortedMessagesForDisplay = [...initialData.messages].reverse();

    return (
        <div className="pt-4 space-y-3 max-h-96 overflow-y-auto">
            {sortedMessagesForDisplay.map((msg: IncidentMessage) => (
                <div key={msg.id} className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
                    <div className="flex justify-between items-center mb-1">
                        <StatusPill status={msg.status} subtle />
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDistanceToNowStrict(parseISO(msg.timestamp), { addSuffix: true })} by {msg.postedBy || 'System'}
                        </span>
                    </div>
                    <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] whitespace-pre-wrap">{msg.message}</p>
                </div>
            ))}
        </div>
    );
  };


  return (
    <div className="space-y-0"> 
      <div className="mb-4 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
          <nav className="flex space-x-1" aria-label="Tabs">
            <button type="button" onClick={() => setActiveTab('details')}
              className={`${tabBaseClass} ${activeTab === 'details' ? tabActiveClass : tabInactiveClass}`}
              aria-current={activeTab === 'details' ? 'page' : undefined}>Incident Details</button>
             {mode === FormMode.EDIT && (
                 <button type="button" onClick={() => setActiveTab('flow')}
                    className={`${tabBaseClass} ${activeTab === 'flow' ? tabActiveClass : tabInactiveClass}`}
                    aria-current={activeTab === 'flow' ? 'page' : undefined}>
                    <i className="fas fa-project-diagram mr-1.5"></i>Attached Flow</button>)}
            {mode === FormMode.EDIT && (
                 <button type="button" onClick={() => setActiveTab('history')}
                    className={`${tabBaseClass} ${activeTab === 'history' ? tabActiveClass : tabInactiveClass}`}
                    aria-current={activeTab === 'history' ? 'page' : undefined}>Lifecycle History</button>)}
            {mode === FormMode.EDIT && isIncidentResolvedOrCompleted && (
                <button type="button" onClick={() => setActiveTab('pir')}
                    className={`${tabBaseClass} ${activeTab === 'pir' ? tabActiveClass : tabInactiveClass}`}
                    aria-current={activeTab === 'pir' ? 'page' : undefined}>Post-Incident Review / De-Brief</button>)}
          </nav>
        </div>

      {activeTab === 'details' && renderDetailsTab()}
      {activeTab === 'flow' && mode === FormMode.EDIT && renderFlowTab()}
      {activeTab === 'history' && mode === FormMode.EDIT && renderHistoryTab()}
      {activeTab === 'pir' && mode === FormMode.EDIT && isIncidentResolvedOrCompleted && renderPIRTab()}
    </div>
  );
};

export default IncidentForm;
