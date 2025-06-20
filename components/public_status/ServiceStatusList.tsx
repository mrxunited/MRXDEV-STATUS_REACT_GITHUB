

import React from 'react';
import { SystemService, SystemStatusLevel, ServiceGroup } from '../../types';
import StatusPill from '../ui/StatusPill';
import LoadingSpinner from '../ui/LoadingSpinner';
import PingStatusIndicator from '../ui/PingStatusIndicator';

interface ServiceStatusListProps {
  services: SystemService[];
  serviceGroups: ServiceGroup[];
  isLoading: boolean;
}

const ServiceStatusItem: React.FC<{ service: SystemService }> = ({ service }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasSubComponents = service.components && service.components.length > 0;

  return (
    <div className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] p-4 rounded-lg shadow-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] transition-all hover:shadow-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{service.name}</h3>
        <StatusPill status={service.status} />
      </div>
      {service.publicDescription && <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mt-1">{service.publicDescription}</p>}
      
      {service.pingEnabled && service.lastPingResult && (
        <div className="mt-2 text-xs">
          <span className="font-medium text-gray-500 dark:text-gray-400">Health Check: </span>
          <PingStatusIndicator pingResult={service.lastPingResult} size="sm" />
        </div>
      )}

      <div className="mt-2 text-xs text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] flex justify-between items-center">
        <div>
          {typeof service.uptime7Days === 'number' && (
            <span className="mr-3" title="Uptime last 7 days">
              <i className="fas fa-chart-line mr-1 text-green-500 dark:text-green-400"></i>7d: {service.uptime7Days.toFixed(2)}%
            </span>
          )}
          {typeof service.uptime30Days === 'number' && (
            <span title="Uptime last 30 days">
              <i className="fas fa-calendar-alt mr-1 text-blue-500 dark:text-blue-400"></i>30d: {service.uptime30Days.toFixed(2)}%
            </span>
          )}
        </div>
         {hasSubComponents && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] text-xs font-medium"
            aria-expanded={isExpanded}
            aria-controls={`components-${service.id}`}
          >
            {isExpanded ? 'Hide' : 'Show'} Details <i className={`fas fa-chevron-down transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
          </button>
        )}
      </div>
      {hasSubComponents && isExpanded && (
        <div id={`components-${service.id}`} className="mt-3 pt-3 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Components</h4>
          {service.components?.map(comp => (
            <div key={comp.id} className="ml-2 p-2 bg-gray-50 dark:bg-slate-800/50 rounded-md shadow-sm">
              <div className="flex justify-between items-center text-sm ">
                <span className="font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{comp.name}</span>
                <StatusPill status={comp.status} subtle />
              </div>
              {comp.description && <p className="text-xs text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mt-0.5">{comp.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const getGroupOverallStatus = (groupServices: SystemService[]): SystemStatusLevel => {
    if (!groupServices || groupServices.length === 0) {
        return SystemStatusLevel.UNKNOWN;
    }

    const statuses = groupServices.map(s => s.status);

    if (statuses.some(s => s === SystemStatusLevel.MAJOR_OUTAGE)) return SystemStatusLevel.MAJOR_OUTAGE;
    if (statuses.some(s => s === SystemStatusLevel.PARTIAL_OUTAGE)) return SystemStatusLevel.PARTIAL_OUTAGE;
    if (statuses.some(s => s === SystemStatusLevel.DEGRADED)) return SystemStatusLevel.DEGRADED;
    if (statuses.some(s => s === SystemStatusLevel.MAINTENANCE)) return SystemStatusLevel.MAINTENANCE;
    if (statuses.every(s => s === SystemStatusLevel.OPERATIONAL)) return SystemStatusLevel.OPERATIONAL;
    
    return SystemStatusLevel.UNKNOWN;
};


const ServiceStatusList: React.FC<ServiceStatusListProps> = ({ services, serviceGroups, isLoading }) => {
  if (isLoading) {
    return (
      <div className="py-8">
        <h2 className="text-2xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-6">Service Status</h2>
        {[...Array(2)].map((_, groupIndex) => ( // Placeholder for 2 groups
          <div key={`loading-group-${groupIndex}`} className="mb-8">
            <div className="h-8 bg-gray-300 dark:bg-slate-700 rounded w-1/2 mb-4 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(2)].map((_, i) => ( // Placeholder for 2 services per group
                <div key={i} className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] p-6 rounded-lg shadow-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] animate-pulse">
                  <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/2 mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/4"></div>
                    <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  const servicesByGroupId: Record<string, SystemService[]> = services.reduce((acc, service) => {
    const groupId = service.groupId || 'ungrouped';
    if (!acc[groupId]) {
      acc[groupId] = [];
    }
    acc[groupId].push(service);
    return acc;
  }, {} as Record<string, SystemService[]>);

  // Sort groups by displayOrder
  const sortedGroups = [...serviceGroups].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <section aria-labelledby="services-status-heading">
      <h2 id="services-status-heading" className="text-2xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-6">
        Current Service Status
      </h2>
      
      {sortedGroups.map(group => {
        const groupServices = (servicesByGroupId[group.id] || []).sort((a,b) => a.displayOrder - b.displayOrder);
        if (groupServices.length === 0) return null; // Don't render empty groups
        const groupStatus = getGroupOverallStatus(groupServices);
        return (
          <div key={group.id} className="mb-10">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
              <h3 className="text-xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
                {group.name}
              </h3>
              <StatusPill status={groupStatus} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupServices.map(service => (
                <ServiceStatusItem key={service.id} service={service} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Ungrouped Services */}
      {(servicesByGroupId['ungrouped'] && servicesByGroupId['ungrouped'].length > 0) && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
             <h3 className="text-xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
                Other Services
              </h3>
              <StatusPill status={getGroupOverallStatus(servicesByGroupId['ungrouped'])} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesByGroupId['ungrouped'].sort((a,b) => a.displayOrder - b.displayOrder).map(service => (
              <ServiceStatusItem key={service.id} service={service} />
            ))}
          </div>
        </div>
      )}

      {services.length === 0 && !isLoading && (
         <div className="py-8 text-center">
            <i className="fas fa-info-circle fa-2x text-gray-400 dark:text-gray-500 mb-3"></i>
            <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No services are currently being monitored or displayed.</p>
        </div>
      )}
    </section>
  );
};

export default ServiceStatusList;
