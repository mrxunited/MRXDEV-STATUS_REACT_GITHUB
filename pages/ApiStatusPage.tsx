

import React, { useEffect, useState } from 'react';
import {
  getOverallPublicStatus, getPublicServices, adminGetAllServiceGroups,
  getActivePublicIncidents, getPastPublicIncidents, validateApiKey
} from '../services/appwrite';
import { SystemService, ServiceGroup, Incident, OverallPublicStatus, SystemStatusLevel, IncidentType, IncidentFilters } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface ApiStatusResponse {
  overallStatus: OverallPublicStatus | null;
  serviceGroups: Array<{
    id: string;
    name: string;
    displayOrder: number;
    overallStatus: SystemStatusLevel;
    services: SystemService[];
  }>;
  ungroupedServices: SystemService[];
  activeIncidents: Incident[];
  scheduledMaintenance: Incident[];
  incidentHistorySummary: {
    source: string;
    incidents: Incident[];
  };
  generatedAt: string;
}

const getGroupOverallStatus = (groupServices: SystemService[]): SystemStatusLevel => {
    if (!groupServices || groupServices.length === 0) return SystemStatusLevel.UNKNOWN;
    const statuses = groupServices.map(s => s.status);
    if (statuses.some(s => s === SystemStatusLevel.MAJOR_OUTAGE)) return SystemStatusLevel.MAJOR_OUTAGE;
    if (statuses.some(s => s === SystemStatusLevel.PARTIAL_OUTAGE)) return SystemStatusLevel.PARTIAL_OUTAGE;
    if (statuses.some(s => s === SystemStatusLevel.DEGRADED)) return SystemStatusLevel.DEGRADED;
    if (statuses.some(s => s === SystemStatusLevel.MAINTENANCE)) return SystemStatusLevel.MAINTENANCE;
    if (statuses.every(s => s === SystemStatusLevel.OPERATIONAL)) return SystemStatusLevel.OPERATIONAL;
    return SystemStatusLevel.UNKNOWN;
};

const ApiStatusPage: React.FC = () => {
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.fontFamily = 'monospace';
    document.body.style.backgroundColor = '#1e1e1e'; // Dark background for JSON view
    document.body.style.color = '#d4d4d4'; // Light text
    
    const fetchDataAndRespond = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const apiKey = queryParams.get('apiKey');

        if (!apiKey) {
          setApiResponse(JSON.stringify({ error: 'API key is required. Provide it as a query parameter: ?apiKey=YOUR_KEY', code: 401 }, null, 2));
          setIsLoading(false);
          return;
        }

        const isValidKey = await validateApiKey(apiKey);
        if (!isValidKey) {
          setApiResponse(JSON.stringify({ error: 'Invalid or unauthorized API key.', code: 403 }, null, 2));
          setIsLoading(false);
          return;
        }

        const [
          overallStatusData,
          publicServicesData,
          serviceGroupsData,
          activeIncidentsData,
          pastIncidentsData
        ] = await Promise.all([
          getOverallPublicStatus(),
          getPublicServices(),
          adminGetAllServiceGroups(),
          getActivePublicIncidents(),
          getPastPublicIncidents(5, 0, { predefinedRange: 'last30days' } as IncidentFilters) // Fetch 5 most recent from last 30 days
        ]);

        const servicesByGroupId: Record<string, SystemService[]> = publicServicesData.reduce((acc, service) => {
          const groupId = service.groupId || 'ungrouped';
          if (!acc[groupId]) acc[groupId] = [];
          acc[groupId].push(service);
          return acc;
        }, {} as Record<string, SystemService[]>);

        const groupedServiceOutput = serviceGroupsData
          .sort((a,b) => a.displayOrder - b.displayOrder)
          .map(group => {
            const servicesInGroup = (servicesByGroupId[group.id] || []).sort((a,b) => a.displayOrder - b.displayOrder);
            return {
              id: group.id,
              name: group.name,
              displayOrder: group.displayOrder,
              overallStatus: getGroupOverallStatus(servicesInGroup),
              services: servicesInGroup,
            };
          });
        
        const ungroupedServicesOutput = (servicesByGroupId['ungrouped'] || []).sort((a,b) => a.displayOrder - b.displayOrder);

        const response: ApiStatusResponse = {
          overallStatus: overallStatusData,
          serviceGroups: groupedServiceOutput,
          ungroupedServices: ungroupedServicesOutput,
          activeIncidents: activeIncidentsData.filter(inc => inc.type === IncidentType.INCIDENT),
          scheduledMaintenance: activeIncidentsData.filter(inc => inc.type === IncidentType.MAINTENANCE),
          incidentHistorySummary: {
            source: "Last 5 resolved/completed incidents from the past 30 days",
            incidents: pastIncidentsData
          },
          generatedAt: new Date().toISOString(),
        };

        setApiResponse(JSON.stringify(response, null, 2));

      } catch (error) {
        console.error("Error generating API status response:", error);
        setApiResponse(JSON.stringify({ error: 'Failed to generate status data.', details: (error as Error).message, code: 500 }, null, 2));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDataAndRespond();
    
    // Cleanup styles on component unmount
    return () => {
        document.body.style.margin = '';
        document.body.style.fontFamily = '';
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
    };

  }, []);

  if (isLoading) {
    // This is primarily for the initial render before useEffect modifies the body.
    // The main loading visual will be the spinner within the pre tag.
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#1e1e1e' }}>
            <LoadingSpinner size="lg" color="text-gray-400" />
        </div>
    );
  }

  return (
    <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', padding: '20px', margin: 0 }}>
      {apiResponse}
    </pre>
  );
};

export default ApiStatusPage;