

import React, { useState, useEffect, useCallback } from 'react';
import { SystemService, Incident, OverallPublicStatus, SystemStatusLevel, ServiceGroup, IncidentType, IncidentImpact, IncidentLifecycleStatus, ServiceComponent } from '../types'; 
import { getPublicServices, getActivePublicIncidents, getOverallPublicStatus, adminGetAllServiceGroups, adminGetAllServices } from '../services/appwrite'; 
import LoadingSpinner from '../components/ui/LoadingSpinner';
import OverallStatusBanner from '../components/public_status/OverallStatusBanner';
import ServiceStatusList from '../components/public_status/ServiceStatusList';
import CurrentIncidentsSection from '../components/public_status/CurrentIncidentsSection';
import PastIncidentsSection from '../components/public_status/PastIncidentsSection';
import { useDatabaseStatus } from '../contexts/DatabaseStatusContext'; 
import GuestReportFormModal from '../components/public_status/GuestReportFormModal'; 
import { useNotification } from '../contexts/NotificationContext'; 
import { useGuestReportModal } from '../contexts/GuestReportModalContext'; // Added

const severityOrder: SystemStatusLevel[] = [
  SystemStatusLevel.MAJOR_OUTAGE,
  SystemStatusLevel.PARTIAL_OUTAGE,
  SystemStatusLevel.DEGRADED,
  SystemStatusLevel.MAINTENANCE,
  SystemStatusLevel.OPERATIONAL,
  SystemStatusLevel.UNKNOWN,
];

const getSeverityIndex = (status: SystemStatusLevel): number => {
  const index = severityOrder.indexOf(status);
  return index === -1 ? severityOrder.length -1 : index; 
};

function deriveServiceStatuses(baseServices: SystemService[], activeIncidents: Incident[]): SystemService[] {
  return baseServices.map(originalService => {
    // Start with a shallow copy to avoid mutating the original objects from state/props
    const service = { ...originalService, components: originalService.components ? [...originalService.components] : [] };

    // 1. Determine internal status based on manual setting and subcomponents
    let internalDerivedStatus = service.status; // Start with the manually set status from DB
    if (service.components && service.components.length > 0) {
      const worstSubcomponentStatus = service.components.reduce((worst, comp) => {
        return getSeverityIndex(comp.status) < getSeverityIndex(worst) ? comp.status : worst;
      }, SystemStatusLevel.OPERATIONAL);
      
      // If worst subcomponent status is more severe, it dictates the internal status
      if (getSeverityIndex(worstSubcomponentStatus) < getSeverityIndex(internalDerivedStatus)) {
        internalDerivedStatus = worstSubcomponentStatus;
      }
    }
    // At this point, internalDerivedStatus is the worse of manual or subcomponents

    // 2. Apply incident overrides
    const affectingIncidents = activeIncidents.filter(inc => 
      inc.affectedServiceIds.includes(service.id) &&
      inc.currentLifecycleStatus !== IncidentLifecycleStatus.RESOLVED &&
      inc.currentLifecycleStatus !== IncidentLifecycleStatus.COMPLETED &&
      inc.currentLifecycleStatus !== IncidentLifecycleStatus.DISMISSED
    );

    let finalServiceStatus = internalDerivedStatus; // This is now our baseline
    let finalServiceStatusIndex = getSeverityIndex(finalServiceStatus);

    for (const incident of affectingIncidents) {
      let incidentImpactStatus: SystemStatusLevel | null = null;
      
      if (incident.type === IncidentType.MAINTENANCE && 
          (incident.currentLifecycleStatus === IncidentLifecycleStatus.IN_PROGRESS || 
           incident.currentLifecycleStatus === IncidentLifecycleStatus.SCHEDULED ||
           // Consider other active maintenance statuses if needed
           incident.currentLifecycleStatus === IncidentLifecycleStatus.ACKNOWLEDGED || // If maintenance is acknowledged and not yet in progress but imminent
           incident.currentLifecycleStatus === IncidentLifecycleStatus.IDENTIFIED   // If problem identified and maintenance is about to start
          ) 
         ) {
        incidentImpactStatus = SystemStatusLevel.MAINTENANCE;
      } else if (incident.type === IncidentType.INCIDENT) {
        switch (incident.impact) {
          case IncidentImpact.CRITICAL:
            incidentImpactStatus = SystemStatusLevel.MAJOR_OUTAGE;
            break;
          case IncidentImpact.SIGNIFICANT:
            incidentImpactStatus = SystemStatusLevel.PARTIAL_OUTAGE;
            break;
          case IncidentImpact.MINOR:
            incidentImpactStatus = SystemStatusLevel.DEGRADED;
            break;
          // Note: IncidentImpact.NONE usually doesn't change operational status unless specified otherwise
        }
      }

      // If the incident implies a more severe status, override
      if (incidentImpactStatus) {
        const incidentImpactStatusIndex = getSeverityIndex(incidentImpactStatus);
        if (incidentImpactStatusIndex < finalServiceStatusIndex) { 
          finalServiceStatus = incidentImpactStatus;
          finalServiceStatusIndex = incidentImpactStatusIndex;
        }
      }
    }
    
    service.status = finalServiceStatus; // Assign the final derived status
    return service;
  });
}


const PublicStatusPage: React.FC = () => {
  const [overallStatus, setOverallStatus] = useState<OverallPublicStatus | null>(null);
  const [services, setServices] = useState<SystemService[]>([]); 
  const [allServicesForFilter, setAllServicesForFilter] = useState<SystemService[]>([]); 
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus(); 
  const { addNotification } = useNotification(); 
  const { isGuestReportModalOpen, closeGuestReportModal } = useGuestReportModal(); // Use context for modal


  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        publicServicesData, 
        allServicesData, // For past incidents filter
        groupsData, 
        activeIncidentsData,
      ] = await Promise.all([
        getPublicServices(), 
        adminGetAllServices(), 
        adminGetAllServiceGroups(),
        getActivePublicIncidents(),
      ]);
      
      setAllServicesForFilter(allServicesData); 
      setServiceGroups(groupsData);
      setActiveIncidents(activeIncidentsData);

      const derivedServices = deriveServiceStatuses(publicServicesData, activeIncidentsData);
      setServices(derivedServices);
      
      // Derive overall status based on the processed services.
      // getOverallPublicStatus typically calculates this based on the services it fetches.
      // If we want it to use `derivedServices`, we might need to pass them or adjust `getOverallPublicStatus`.
      // For now, assuming `getOverallPublicStatus` does its own internal fetch and derivation for simplicity.
      // Or, derive it client-side here:
      let mostSevereStatusLevel = SystemStatusLevel.OPERATIONAL;
      if (derivedServices.length > 0) {
          mostSevereStatusLevel = derivedServices.reduce((worst, srv) => {
              return getSeverityIndex(srv.status) < getSeverityIndex(worst) ? srv.status : worst;
          }, SystemStatusLevel.OPERATIONAL);
      }
      
      const overallMessages: Record<SystemStatusLevel, string> = {
        [SystemStatusLevel.OPERATIONAL]: "All systems operational.",
        [SystemStatusLevel.DEGRADED]: "Some services are experiencing degraded performance.",
        [SystemStatusLevel.PARTIAL_OUTAGE]: "Some services are experiencing a partial outage.",
        [SystemStatusLevel.MAJOR_OUTAGE]: "Major service outage impacting multiple systems.",
        [SystemStatusLevel.MAINTENANCE]: "Services are currently undergoing scheduled maintenance.",
        [SystemStatusLevel.UNKNOWN]: "System status is currently unknown."
      };

      setOverallStatus({ level: mostSevereStatusLevel, message: overallMessages[mostSevereStatusLevel] });


      setDbAvailable(); 
    } catch (err) {
      const errorMsg = (err as Error).message || 'Could not load status information. Please try again later.';
      console.error("Failed to load status page data:", err);
      setError(errorMsg);
      setOverallStatus({level: SystemStatusLevel.UNKNOWN, message: "Status information currently unavailable."});
      setDbUnavailable(errorMsg); 
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 60000); 
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleGuestReportSuccess = () => {
    closeGuestReportModal(); // Use context to close modal
    addNotification({
        type: 'success',
        title: 'Report Submitted',
        message: 'Thank you! Your issue report has been submitted successfully.'
    });
  };


  if (loading && !overallStatus) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">Loading current system status...</p>
      </div>
    );
  }

  if (error && !overallStatus) { 
     return (
        <div className="text-center py-10">
            <i className="fas fa-exclamation-triangle fa-3x text-red-500 dark:text-red-400 mb-4"></i>
            <h2 className="text-2xl font-semibold text-red-700 dark:text-red-300 mb-2">Error Loading Status</h2>
            <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{error}</p>
        </div>
    );
  }


  return (
    <div className="space-y-10">
      {overallStatus && <OverallStatusBanner status={overallStatus} />}
      
      {loading && overallStatus && (services.length > 0 || activeIncidents.length > 0) && ( 
        <div className="fixed top-20 right-6 bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] p-2 rounded-md shadow-lg text-sm text-[var(--color-primary-blue)] z-50 border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
          <LoadingSpinner size="sm" className="inline-block mr-2"/> Checking for updates...
        </div>
      )}

      {/* "Report an Issue" button removed from here */}

      {activeIncidents.length > 0 && (
        <CurrentIncidentsSection incidents={activeIncidents} services={services}/>
      )}

      <ServiceStatusList services={services} serviceGroups={serviceGroups} isLoading={loading && services.length === 0} />
      
      <PastIncidentsSection initialIncidents={[]} services={allServicesForFilter} />

      <GuestReportFormModal
        isOpen={isGuestReportModalOpen}
        onClose={closeGuestReportModal}
        services={services.filter(s => s.isMonitoredPublicly)} 
        onSubmitSuccess={handleGuestReportSuccess}
      />

    </div>
  );
};

export default PublicStatusPage;
