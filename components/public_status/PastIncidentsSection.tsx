

import React, { useState, useEffect, useCallback } from 'react';
import { Incident, SystemService, IncidentType, IncidentLifecycleStatus, IncidentFilters, PredefinedDateRange } from '../../types'; // Updated to IncidentLifecycleStatus
import StatusPill from '../ui/StatusPill';
import { getPastPublicIncidents } from '../../services/appwrite'; 
import LoadingSpinner from '../ui/LoadingSpinner';
import { formatDistanceToNowStrict, parseISO, format, isValid } from 'date-fns'; 
import HistoryFilterBar from '../shared/HistoryFilterBar'; 

interface PastIncidentItemProps {
  incident: Incident;
  services: SystemService[];
}

const PastIncidentItem: React.FC<PastIncidentItemProps> = ({ incident, services }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const affectedServiceNames = incident.affectedServiceIds
    .map(id => services.find(s => s.id === id)?.name)
    .filter(name => !!name)
    .join(', ');

  const resolutionTime = incident.resolvedAt || incident.updatedAt;
  
  let durationDisplay = '';
  if (incident.createdAt && resolutionTime) {
      try {
          const createdDate = parseISO(incident.createdAt);
          const resolvedDate = parseISO(resolutionTime);
          if(isValid(createdDate) && isValid(resolvedDate)) { 
             durationDisplay = formatDistanceToNowStrict(createdDate, { unit: 'minute', addSuffix: false, partialMethod: 'round' }); 
          } else {
             durationDisplay = "N/A";
          }
      } catch (e) {
          console.warn("Could not parse date for duration", e);
          durationDisplay = "Error";
      }
  }


  return (
    <div className="py-4 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] last:border-b-0">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start">
        <div>
          <h4 
            className="text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] hover:text-[var(--color-primary-blue)] dark:hover:text-[var(--color-primary-blue-hover)] cursor-pointer" 
            onClick={() => setIsExpanded(!isExpanded)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded)}}
            tabIndex={0}
            role="button"
            aria-expanded={isExpanded}
            aria-controls={`incident-details-${incident.id}`}
          >
            {incident.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {incident.type === IncidentType.INCIDENT ? 'Resolved' : 'Completed'}: {new Date(resolutionTime).toLocaleString()}
            {durationDisplay && ` (Duration: approx ${durationDisplay})`}
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center space-x-2 flex-shrink-0">
          <StatusPill status={incident.type} subtle />
          <StatusPill status={incident.currentLifecycleStatus} subtle />
        </div>
      </div>
      {isExpanded && (
        <div id={`incident-details-${incident.id}`} className="mt-3 pl-2 space-y-3">
          {affectedServiceNames && (
            <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
              <strong className="font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Affected:</strong> {affectedServiceNames}
            </p>
          )}
          <h5 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase pt-1">Updates</h5>
          {incident.messages.map(update => (
            <div key={update.id} className="pl-2 border-l-2 border-gray-200 dark:border-gray-700 text-sm">
                <div className="flex items-center mb-0.5">
                    <StatusPill status={update.status} subtle/>
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{new Date(update.timestamp).toLocaleString()} {update.postedBy && `by ${update.postedBy}`}</span>
                </div>
              <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{update.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


interface PastIncidentsSectionProps {
  initialIncidents: Incident[]; 
  services: SystemService[];
}

const defaultIncidentFilters: IncidentFilters = {
  predefinedRange: 'allTime',
  serviceId: '',
  type: null,
  status: null, // Will use IncidentLifecycleStatus
};

const INCIDENTS_PER_PAGE = 5;

const PastIncidentsSection: React.FC<PastIncidentsSectionProps> = ({ services }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filters, setFilters] = useState<IncidentFilters>(defaultIncidentFilters);
  const [loading, setLoading] = useState(true); 
  const [loadingMore, setLoadingMore] = useState(false); 
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = useCallback(async (newFilters: IncidentFilters, resetList: boolean = false) => {
    if (resetList) {
      setLoading(true);
      setPage(1);
      setIncidents([]); 
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const currentOffset = resetList ? 0 : (page -1) * INCIDENTS_PER_PAGE;
      const newIncidents = await getPastPublicIncidents(INCIDENTS_PER_PAGE, currentOffset, newFilters);
      
      setIncidents(prev => resetList ? newIncidents : [...prev, ...newIncidents]);
      setHasMore(newIncidents.length === INCIDENTS_PER_PAGE);
      if (resetList) setPage(2); 
      else if (newIncidents.length > 0) setPage(prev => prev + 1);

    } catch (err) {
      console.error("Failed to load past incidents", err);
      setError("Could not load incident history. Please try again later.");
    } finally {
      if (resetList) setLoading(false);
      setLoadingMore(false);
    }
  }, [page]); 

  useEffect(() => {
    fetchIncidents(defaultIncidentFilters, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleApplyFilters = (newFilters: IncidentFilters) => {
    setFilters(newFilters);
    fetchIncidents(newFilters, true); 
  };
  
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
        fetchIncidents(filters, false); 
    }
  };


  return (
    <section aria-labelledby="past-incidents-heading" className="mt-12">
      <h2 id="past-incidents-heading" className="text-2xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-4">
        Incident History
      </h2>
      
      <HistoryFilterBar 
        services={services} 
        initialFilters={filters} 
        onApplyFilters={handleApplyFilters}
        isLoading={loading || loadingMore}
      />

      {loading && incidents.length === 0 && (
         <div className="py-8 text-center"><LoadingSpinner size="lg"/><p className="mt-2 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">Loading history...</p></div>
      )}
      
      {error && (
         <div className="py-8 text-center text-red-600 dark:text-red-400">
             <i className="fas fa-exclamation-triangle fa-2x mb-2"></i>
             <p>{error}</p>
        </div>
      )}

      {!loading && !error && incidents.length === 0 && (
        <div className="text-center py-6 bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] p-6 rounded-lg shadow-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
          <i className="fas fa-history fa-2x text-gray-400 dark:text-gray-500 mb-3"></i>
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No past incidents or maintenance events match your current filters.</p>
        </div>
      )}

      {incidents.length > 0 && (
        <div className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] p-2 sm:p-6 rounded-lg shadow-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
          {incidents.map(incident => (
            <PastIncidentItem key={incident.id} incident={incident} services={services} />
          ))}
        </div>
      )}
      
      {loadingMore && <div className="py-4 text-center"><LoadingSpinner/> <p className="text-sm text-gray-500 dark:text-gray-400">Loading more incidents...</p></div>}
      
      {hasMore && !loading && !loadingMore && incidents.length > 0 && (
        <div className="pt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] focus:ring-opacity-50 disabled:opacity-70"
          >
            Load More
          </button>
        </div>
      )}
      {!hasMore && incidents.length > 0 && !loading && !loadingMore && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-6">End of incident history for the current filters.</p>
      )}
    </section>
  );
};

export default PastIncidentsSection;
