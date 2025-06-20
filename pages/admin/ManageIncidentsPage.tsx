

import React, { useState, useEffect, useCallback } from 'react';
import { Incident, SystemService, FormMode, IncidentType, IncidentFilters, IncidentLifecycleStatus, IncidentImpact, DecisionFlow, ActiveIncidentFlow, ActiveFlowStatus } from '../../types'; // Updated IncidentUpdateStatus to IncidentLifecycleStatus
import { adminGetAllIncidents, adminCreateIncident, adminUpdateIncident, adminAddIncidentMessage, adminDeleteIncident, adminGetAllServices, adminGetAllDecisionFlows, adminGetActiveFlowForIncident, adminAttachFlowToIncident, adminUpdateActiveIncidentFlow } from '../../services/appwrite'; 
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusPill from '../../components/ui/StatusPill';
import Modal from '../../components/ui/Modal';
import IncidentForm from '../../components/admin/forms/IncidentForm';
import IncidentUpdateForm from '../../components/admin/forms/IncidentUpdateForm';
import { useAuth } from '../../contexts/AuthContext'; 
import HistoryFilterBar from '../../components/shared/HistoryFilterBar'; 
import { useNotification } from '../../contexts/NotificationContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';
import { useLocation } from 'react-router-dom'; 
import { formatDistanceToNowStrict, parseISO } from 'date-fns';


const defaultIncidentFilters: IncidentFilters = {
  predefinedRange: 'allTime',
  serviceId: '',
  type: null,
  status: null, // Will use IncidentLifecycleStatus
};

const ManageIncidentsPage: React.FC = () => {
  const { user: authUser } = useAuth();
  const { addNotification } = useNotification();
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();
  const location = useLocation(); 
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<SystemService[]>([]); 
  const [decisionFlows, setDecisionFlows] = useState<DecisionFlow[]>([]); // For attaching flows
  const [activeIncidentFlow, setActiveIncidentFlow] = useState<ActiveIncidentFlow | null>(null); // For displaying attached flow

  const [loading, setLoading] = useState(true);
  
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [incidentFormMode, setIncidentFormMode] = useState<FormMode>(FormMode.ADD);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [incidentForUpdate, setIncidentForUpdate] = useState<Incident | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentFilters, setCurrentFilters] = useState<IncidentFilters>(defaultIncidentFilters);
  const [activeTabForModal, setActiveTabForModal] = useState<'details' | 'flow' | 'pir' | 'history'>('details');


  const fetchData = useCallback(async (filtersToApply: IncidentFilters) => {
    setLoading(true);
    try {
      const [incidentsData, servicesData, flowsData] = await Promise.all([
        adminGetAllIncidents(filtersToApply),
        adminGetAllServices(),
        adminGetAllDecisionFlows() // Fetch available decision flows
      ]);
      setIncidents(incidentsData);
      setServices(servicesData); 
      setDecisionFlows(flowsData);
      setDbAvailable();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load incidents or services. Please try again.';
      addNotification({ type: 'error', title: 'Loading Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [addNotification, setDbAvailable, setDbUnavailable]); 

  useEffect(() => {
    fetchData(currentFilters);
  }, [fetchData, currentFilters]);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openPIRIncidentId = params.get('openPIR');
    const source = params.get('source');

    if (openPIRIncidentId) {
      const incidentToEdit = incidents.find(inc => inc.id === openPIRIncidentId);
      if (incidentToEdit) {
        setIncidentFormMode(FormMode.EDIT);
        setEditingIncident(incidentToEdit);
        setIsIncidentModalOpen(true);
        if (source === 'reviews') {
          setActiveTabForModal('pir');
        } else {
          setActiveTabForModal('details');
        }
      } else if (!loading) { 
        addNotification({type: 'warning', title: 'Incident Not Found', message: `Could not open PIR for incident ID ${openPIRIncidentId}. It might have been removed or filtered out.`});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, incidents, loading]); 

  const handleOpenIncidentModal = async (mode: FormMode, incident?: Incident, defaultTab: 'details' | 'flow' | 'pir' | 'history' = 'details') => {
    setIncidentFormMode(mode);
    setEditingIncident(incident || null);
    setActiveTabForModal(defaultTab);
    setActiveIncidentFlow(null); // Reset active flow when opening modal

    if (mode === FormMode.EDIT && incident?.id) {
        try {
            const flow = await adminGetActiveFlowForIncident(incident.id);
            setActiveIncidentFlow(flow);
        } catch (err) {
            console.error("Failed to fetch active flow for incident:", err);
            // Potentially notify user, but not critical for modal opening
        }
    }
    setIsIncidentModalOpen(true);
  };

  const handleOpenUpdateModal = (incident: Incident) => {
    setIncidentForUpdate(incident);
    setIsUpdateModalOpen(true);
  };

  const handleCloseModals = () => {
    if (isSubmitting) return;
    setIsIncidentModalOpen(false);
    setIsUpdateModalOpen(false);
    setEditingIncident(null);
    setIncidentForUpdate(null);
    setActiveIncidentFlow(null);
    if (new URLSearchParams(location.search).has('openPIR')) {
        const params = new URLSearchParams(location.search);
        params.delete('openPIR');
        params.delete('source');
        // Consider using navigate to clean URL without reload if needed
    }
  };

  const handleSaveIncident = async (data: Incident | Omit<Incident, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string, initialStatus: IncidentLifecycleStatus }) => {
    setIsSubmitting(true);
    const incidentTitle = data.title || editingIncident?.title || 'Untitled Event';
    const incidentType = (data as Incident).type || editingIncident?.type || IncidentType.INCIDENT;

    try {
      if (incidentFormMode === FormMode.EDIT && editingIncident?.id) {
        const incidentDataFromForm = data as Incident; 
        const payloadForUpdate: Partial<Omit<Incident, 'id' | '$id' | 'messages' | 'createdAt' | 'updatedAt'>> = {
            title: incidentDataFromForm.title, type: incidentDataFromForm.type, impact: incidentDataFromForm.impact,
            currentLifecycleStatus: incidentDataFromForm.currentLifecycleStatus, affectedServiceIds: incidentDataFromForm.affectedServiceIds,
            isPubliclyVisible: incidentDataFromForm.isPubliclyVisible,
            scheduledStartTime: incidentDataFromForm.scheduledStartTime, scheduledEndTime: incidentDataFromForm.scheduledEndTime,
            severityLevelId: incidentDataFromForm.severityLevelId, 
            debriefRequired: incidentDataFromForm.debriefRequired, // Ensure this is passed
        };
        if (
            ((payloadForUpdate.currentLifecycleStatus === IncidentLifecycleStatus.RESOLVED && payloadForUpdate.type === IncidentType.INCIDENT) ||
            (payloadForUpdate.currentLifecycleStatus === IncidentLifecycleStatus.COMPLETED && payloadForUpdate.type === IncidentType.MAINTENANCE)) &&
            !editingIncident.resolvedAt 
        ) {
            payloadForUpdate.resolvedAt = new Date().toISOString();
        }
        await adminUpdateIncident(editingIncident.id, payloadForUpdate);
        addNotification({ type: 'success', title: `${incidentType} Updated`, message: `${incidentType} "${incidentTitle}" has been updated.` });
         if (payloadForUpdate.currentLifecycleStatus === IncidentLifecycleStatus.RESOLVED && incidentType === IncidentType.INCIDENT) {
            addNotification({ type: 'success', title: 'Incident Resolved', message: `Incident "${incidentTitle}" marked as resolved.` });
        } else if (payloadForUpdate.currentLifecycleStatus === IncidentLifecycleStatus.COMPLETED && incidentType === IncidentType.MAINTENANCE) {
            addNotification({ type: 'success', title: 'Maintenance Completed', message: `Maintenance task "${incidentTitle}" marked complete.` });
        }
      } else { 
        const createData = data as Omit<Incident, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string, initialStatus: IncidentLifecycleStatus };
        await adminCreateIncident({...createData, postedBy: authUser?.name || "Admin"});
        const titleForNotification = createData.title;
        const typeForNotification = createData.type === IncidentType.INCIDENT ? 'Incident' : 'Maintenance';
        addNotification({ type: 'success', title: `${typeForNotification} Reported`, message: `New ${typeForNotification.toLowerCase()} reported: "${titleForNotification}".` });
      }
      await fetchData(currentFilters); 
      handleCloseModals(); // Close modal on successful save
    } catch (err) {
      console.error("Failed to save incident:", err);
      const errorMsg = (err as Error).message || `Failed to ${incidentFormMode === FormMode.ADD ? 'create' : 'update'} ${incidentType.toLowerCase()}.`;
      addNotification({ type: 'error', title: 'Save Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUpdateMessage = async (incidentId: string, updateData: { status: IncidentLifecycleStatus, message: string }) => {
    setIsSubmitting(true);
    const incidentToUpdate = incidents.find(inc => inc.id === incidentId);
    const incidentTitle = incidentToUpdate?.title || 'Event';
    const incidentType = incidentToUpdate?.type || IncidentType.INCIDENT;
    try {
      await adminAddIncidentMessage(incidentId, {...updateData, postedBy: authUser?.name || "Admin"});
      addNotification({ type: 'success', title: 'Update Added', message: `Update added to ${incidentType.toLowerCase()} "${incidentTitle}".`});
      if (updateData.status === IncidentLifecycleStatus.RESOLVED && incidentType === IncidentType.INCIDENT) {
          addNotification({ type: 'success', title: 'Incident Resolved', message: `Incident "${incidentTitle}" marked as resolved.` });
      } else if (updateData.status === IncidentLifecycleStatus.COMPLETED && incidentType === IncidentType.MAINTENANCE) {
          addNotification({ type: 'success', title: 'Maintenance Completed', message: `Maintenance task "${incidentTitle}" marked complete.` });
      }
      await fetchData(currentFilters); 
      handleCloseModals();
    } catch (err) {
      console.error("Failed to add update message:", err);
      const errorMsg = (err as Error).message || "Failed to add update message.";
      addNotification({ type: 'error', title: 'Update Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIncident = async (incidentId: string, incidentTitle: string) => {
    const incidentToDelete = incidents.find(inc => inc.id === incidentId);
    if (!incidentToDelete) return;

    if (window.confirm(`Are you sure you want to delete "${incidentTitle}" (${incidentToDelete.type})? This cannot be undone.`)) {
      setLoading(true); 
      try {
        await adminDeleteIncident(incidentId);
        addNotification({ type: 'success', title: `${incidentToDelete.type} Deleted`, message: `${incidentToDelete.type} "${incidentTitle}" was deleted.` });
        await fetchData(currentFilters); 
      } catch (err) {
        console.error("Failed to delete incident:", err);
        const errorMsg = (err as Error).message || "Failed to delete incident.";
        addNotification({ type: 'error', title: 'Delete Error', message: errorMsg, persistent: true });
        setDbUnavailable(errorMsg); 
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleApplyFilters = (newFilters: IncidentFilters) => {
    setCurrentFilters(newFilters); 
  };

  const handleAttachFlow = async (incidentId: string, flowId: string) => {
      if (!flowId) {
          addNotification({ type: 'warning', title: 'No Flow Selected', message: 'Please select a decision flow to attach.' });
          return;
      }
      const selectedFlowDefinition = decisionFlows.find(df => df.id === flowId);
      if (!selectedFlowDefinition) {
          addNotification({ type: 'error', title: 'Flow Not Found', message: 'The selected decision flow could not be found.' });
          return;
      }
      
      setIsSubmitting(true);
      try {
          const attachedFlow = await adminAttachFlowToIncident(incidentId, flowId, selectedFlowDefinition.name);
          setActiveIncidentFlow(attachedFlow); // Update local state for the modal
          addNotification({ type: 'success', title: 'Flow Attached', message: `Flow "${selectedFlowDefinition.name}" attached to incident.` });
      } catch (err) {
          addNotification({ type: 'error', title: 'Failed to Attach Flow', message: (err as Error).message });
      } finally {
          setIsSubmitting(false);
      }
  };


  if (loading && incidents.length === 0 && services.length === 0) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <Card 
        title="Manage Public Incidents & Maintenance" 
        titleIcon="fa-bolt"
        actions={
          <button 
            onClick={() => handleOpenIncidentModal(FormMode.ADD)}
            className="px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Create New
          </button>
        }
      >
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Report new incidents, schedule maintenance, post updates, and resolve issues. These will be reflected on the public status page.
        </p>
        
        <HistoryFilterBar
            services={services} 
            initialFilters={currentFilters}
            onApplyFilters={handleApplyFilters}
            isLoading={loading}
        />

        {loading && <div className="py-4"><LoadingSpinner /></div>}
        
        {!loading && incidents.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No incidents or maintenance events match the current filters. Click "Create New" or adjust filters.</p>
        )}

        {incidents.length > 0 && !loading && (
          <div className="space-y-4">
            {incidents.map(incident => (
              <div key={incident.id} className="p-4 border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] rounded-lg bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{incident.title}</h3>
                    <div className="flex items-center space-x-2 mt-1 flex-wrap">
                      <StatusPill status={incident.type} subtle />
                      <StatusPill status={incident.currentLifecycleStatus} subtle />
                      {incident.type === IncidentType.INCIDENT && <StatusPill status={incident.impact} subtle />}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${incident.isPubliclyVisible ? 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300'}`}>
                        <i className={`fas ${incident.isPubliclyVisible ? 'fa-eye' : 'fa-eye-slash'} mr-1`}></i>
                        {incident.isPubliclyVisible ? 'Public' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 space-x-2 flex-shrink-0 flex items-center">
                    <button 
                      onClick={() => handleOpenUpdateModal(incident)}
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 text-xs px-2 py-1 border border-green-500 dark:border-green-600 rounded hover:bg-green-50 dark:hover:bg-green-700/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={incident.currentLifecycleStatus === IncidentLifecycleStatus.RESOLVED || incident.currentLifecycleStatus === IncidentLifecycleStatus.COMPLETED || incident.currentLifecycleStatus === IncidentLifecycleStatus.DISMISSED || isSubmitting}
                      aria-label={`Add update to ${incident.title}`}
                    >
                      <i className="fas fa-plus-circle mr-1"></i>Update
                    </button>
                    <button 
                      onClick={() => handleOpenIncidentModal(FormMode.EDIT, incident)}
                      className="text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] text-xs px-2 py-1 border border-[var(--color-primary-blue)] rounded hover:bg-blue-50 dark:hover:bg-blue-700/30 disabled:opacity-50"
                      disabled={isSubmitting}
                      aria-label={`Edit ${incident.title}`}
                    >
                      <i className="fas fa-edit mr-1"></i>Edit
                    </button>
                     <button 
                        onClick={() => handleDeleteIncident(incident.id, incident.title)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 text-xs px-2 py-1 border border-red-500 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-700/30 disabled:opacity-50"
                        disabled={isSubmitting}
                        aria-label={`Delete ${incident.title}`}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    Last update: {formatDistanceToNowStrict(parseISO(incident.updatedAt), {addSuffix: true})} | Created: {formatDistanceToNowStrict(parseISO(incident.createdAt), {addSuffix: true})}
                     {incident.resolvedAt && (incident.type === IncidentType.INCIDENT || incident.type === IncidentType.MAINTENANCE) && ` | ${incident.type === IncidentType.INCIDENT ? 'Resolved' : 'Completed'}: ${formatDistanceToNowStrict(parseISO(incident.resolvedAt), {addSuffix: true})}`}
                  </p>
                  {incident.messages.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNowStrict(parseISO(incident.messages[0].timestamp), {addSuffix: true})} by {incident.messages[0].postedBy || 'N/A'}
                            <StatusPill status={incident.messages[0].status} subtle className="ml-2"/>
                        </p>
                        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] text-sm">{incident.messages[0].message}</p>
                    </div>
                  )}
                   {incident.messages.length > 1 && <span className="text-xs text-gray-400 dark:text-gray-500">({incident.messages.length -1} more update(s))</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <Modal 
        title={incidentFormMode === FormMode.EDIT ? `Edit ${editingIncident?.type || 'Event'}` : `Create New ${editingIncident?.type || 'Event'}`}
        isOpen={isIncidentModalOpen} 
        onClose={handleCloseModals}
        size="xl"
        footer={ activeTabForModal === 'details' || (activeTabForModal === 'history' && incidentFormMode === FormMode.ADD) ? 
          (<>
            <button type="button" onClick={handleCloseModals} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] disabled:opacity-50">Cancel</button>
            <button type="submit" form="incident-form-id" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] disabled:opacity-70 flex items-center">
              {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
              {isSubmitting ? 'Saving...' : (incidentFormMode === FormMode.EDIT ? 'Save Changes' : 'Create')}
            </button>
          </>) : (
            <button type="button" onClick={handleCloseModals} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] disabled:opacity-50">Close</button>
          )
        }
      >
        <IncidentForm 
            mode={incidentFormMode} 
            initialData={editingIncident} 
            services={services.filter(s => s.isMonitoredPublicly)} 
            onSave={handleSaveIncident} 
            onCancel={handleCloseModals} 
            isSubmitting={isSubmitting}
            initialActiveTab={activeTabForModal}
            availableDecisionFlows={decisionFlows} // Pass available flows
            activeIncidentFlow={activeIncidentFlow} // Pass current attached flow
            onAttachFlow={handleAttachFlow} // Pass handler
            // onUpdateStepState will be added later
        />
      </Modal>

      {incidentForUpdate && (
        <Modal 
            title={`Add Update to "${incidentForUpdate.title}"`} 
            isOpen={isUpdateModalOpen} 
            onClose={handleCloseModals}
            size="md"
            footer={
                <>
                    <button type="button" onClick={handleCloseModals} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] disabled:opacity-50">Cancel</button>
                    <button type="submit" form="incident-update-form-id" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 disabled:bg-green-400 flex items-center">
                    {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
                    {isSubmitting ? 'Posting...' : 'Post Update'}
                    </button>
                </>
            }
        >
            <IncidentUpdateForm 
                incident={incidentForUpdate}
                onSave={handleAddUpdateMessage} 
                onCancel={handleCloseModals} 
                isSubmitting={isSubmitting}
            />
        </Modal>
      )}
    </div>
  );
};

export default ManageIncidentsPage;