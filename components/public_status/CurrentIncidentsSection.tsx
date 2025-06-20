
import React from 'react';
import { Incident, SystemService, IncidentType, IncidentImpact, IncidentLifecycleStatus } from '../../types'; // Updated to IncidentLifecycleStatus
import StatusPill from '../ui/StatusPill';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

interface IncidentItemProps {
  incident: Incident;
  services: SystemService[];
}

const IncidentItem: React.FC<IncidentItemProps> = ({ incident, services }) => {
  const [isExpanded, setIsExpanded] = React.useState(incident.messages.length <= 1); 

  const affectedServiceNames = incident.affectedServiceIds
    .map(id => services.find(s => s.id === id)?.name)
    .filter(name => !!name)
    .join(', ');

  const latestMessage = incident.messages[0];

  const formatTimestamp = (isoDate: string) => {
    try {
        const date = parseISO(isoDate);
        const distance = formatDistanceToNowStrict(date, { addSuffix: true });
        return distance.replace(/ago$/, '<span class="opacity-80 dark:opacity-70">ago</span>');
    } catch(e) {
        return "Invalid date";
    }
  };

  const getBorderColorClass = () => {
    if (incident.type === IncidentType.MAINTENANCE) return 'border-[var(--color-primary-blue)] bg-blue-50 dark:bg-blue-900/30';
    switch (incident.impact) {
        case IncidentImpact.CRITICAL: return 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30';
        case IncidentImpact.SIGNIFICANT: return 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/30';
        case IncidentImpact.MINOR: return 'border-yellow-400 dark:border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30';
        default: return 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-slate-800/30';
    }
  }

  return (
    <div className={`p-5 rounded-lg shadow-lg border-l-4 ${getBorderColorClass()}`}>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2">
        <h3 className="text-xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1 sm:mb-0">{incident.title}</h3>
        <div className="flex items-center space-x-2">
            <StatusPill status={incident.type} subtle/>
            <StatusPill status={incident.currentLifecycleStatus} subtle/> 
            {incident.type === IncidentType.INCIDENT && <StatusPill status={incident.impact} subtle/>}
        </div>
      </div>

      {latestMessage && (
        <div className="mb-3 pl-1">
          <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{latestMessage.message}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <i className="fas fa-clock mr-1"></i>
            <span dangerouslySetInnerHTML={{ __html: formatTimestamp(latestMessage.timestamp) }} />
            {latestMessage.postedBy && ` by ${latestMessage.postedBy}`}
          </p>
        </div>
      )}

      {affectedServiceNames && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          <strong className="font-medium text-gray-600 dark:text-gray-300">Affected Services:</strong> {affectedServiceNames}
        </p>
      )}
      
      {incident.type === IncidentType.MAINTENANCE && incident.scheduledStartTime && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            <p>
                <strong className="font-medium text-gray-600 dark:text-gray-300">Scheduled:</strong> {new Date(incident.scheduledStartTime).toLocaleString()}
                {incident.scheduledEndTime && ` to ${new Date(incident.scheduledEndTime).toLocaleString()}`}
            </p>
        </div>
      )}

      {incident.messages.length > 1 && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] focus:outline-none mb-2"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Hide' : 'Show'} Full History ({incident.messages.length} updates)
            <i className={`fas fa-chevron-down ml-1 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
          </button>
          {isExpanded && (
            <div className="mt-2 space-y-3 border-t pt-3 border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
              {incident.messages.slice(1).map(update => ( 
                <div key={update.id} className="pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                  <StatusPill status={update.status} subtle />
                  <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] my-1">{update.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                     <i className="fas fa-clock mr-1"></i>
                     <span dangerouslySetInnerHTML={{ __html: formatTimestamp(update.timestamp) }} />
                     {update.postedBy && ` by ${update.postedBy}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface CurrentIncidentsSectionProps {
  incidents: Incident[];
  services: SystemService[];
}

const CurrentIncidentsSection: React.FC<CurrentIncidentsSectionProps> = ({ incidents, services }) => {
  if (incidents.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="current-incidents-heading">
      <h2 id="current-incidents-heading" className="text-2xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-6">
        Current Incidents & Maintenance
      </h2>
      <div className="space-y-6">
        {incidents.map(incident => (
          <IncidentItem key={incident.id} incident={incident} services={services}/>
        ))}
      </div>
    </section>
  );
};

export default CurrentIncidentsSection;
