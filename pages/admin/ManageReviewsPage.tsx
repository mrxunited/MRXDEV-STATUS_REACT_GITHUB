

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Incident, 
    IncidentReview, 
    SystemService, 
    IncidentReviewFilters, 
    PIRStatus, 
    PIRSeverityLevel, 
    IncidentType, 
    IncidentImpact, 
    IncidentLifecycleStatus,
    IncidentFilters 
} from '../../types'; 
import { 
    adminGetAllIncidentReviews, 
    adminGetAllIncidents, 
    adminGetAllServices 
} from '../../services/appwrite'; 
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusPill from '../../components/ui/StatusPill';
import HistoryFilterBar from '../../components/shared/HistoryFilterBar'; 
import { useNotification } from '../../contexts/NotificationContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';
import { useNavigate, useLocation } from 'react-router-dom'; 
import { formatDistanceToNowStrict, parseISO, differenceInDays, isValid } from 'date-fns';

const defaultPIRFilters: IncidentReviewFilters = {
  predefinedRange: 'allTime', 
  serviceId: '',
  pirStatus: null,
  pirSeverity: null,
  incidentType: null,
};

const PENDING_REVIEW_HIGHLIGHT_DAYS = 3; // Days after which a pending review is highlighted

interface DisplayableReviewItem {
  key: string; 
  incident: Incident;
  reviewData: Partial<Omit<IncidentReview, 'status' | 'incidentId'>> & { status: PIRStatus; incidentId: string; $id?: string; };
}

const ManageReviewsPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();
  const navigate = useNavigate();
  const location = useLocation(); 

  const [displayItems, setDisplayItems] = useState<DisplayableReviewItem[]>([]);
  const [services, setServices] = useState<SystemService[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<IncidentReviewFilters>(defaultPIRFilters);

  const fetchData = useCallback(async (filtersToApply: IncidentReviewFilters) => {
    setLoading(true);
    try {
      const servicesData = await adminGetAllServices();
      setServices(servicesData);

      const incidentQueryFilters: IncidentFilters = {
        dateRange: filtersToApply.dateRange,
        predefinedRange: filtersToApply.predefinedRange,
        serviceId: filtersToApply.serviceId,
        type: filtersToApply.incidentType,
      };

      const resolvedIncidents = await adminGetAllIncidents({
        ...incidentQueryFilters,
        status: IncidentLifecycleStatus.RESOLVED,
      });
      const completedMaintenance = await adminGetAllIncidents({
        ...incidentQueryFilters,
        status: IncidentLifecycleStatus.COMPLETED,
      });
      const candidateIncidents = [...resolvedIncidents, ...completedMaintenance];

      const allReviews = await adminGetAllIncidentReviews();
      const reviewsMap: Record<string, IncidentReview> = {};
      allReviews.forEach(review => {
        reviewsMap[review.incidentId] = review;
      });

      let tempDisplayItems: DisplayableReviewItem[] = candidateIncidents.map(incident => {
        const existingReview = reviewsMap[incident.id];
        return {
          key: existingReview?.$id || `pending-${incident.id}`,
          incident: incident,
          reviewData: existingReview 
            ? { ...existingReview } 
            : { 
                incidentId: incident.id,
                status: PIRStatus.PENDING, 
              }
        };
      });
      
      if (filtersToApply.pirStatus) {
        tempDisplayItems = tempDisplayItems.filter(item => item.reviewData.status === filtersToApply.pirStatus);
      }
      if (filtersToApply.pirSeverity) {
        tempDisplayItems = tempDisplayItems.filter(item => item.reviewData.severityLevel === filtersToApply.pirSeverity);
      }
       if (filtersToApply.incidentId) { // Allow direct filtering by incident ID
        tempDisplayItems = tempDisplayItems.filter(item => item.incident.id === filtersToApply.incidentId);
      }


      tempDisplayItems.sort((a, b) => {
        const dateA = a.incident.resolvedAt || a.incident.updatedAt;
        const dateB = b.incident.resolvedAt || b.incident.updatedAt;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1; 
        if (!dateB) return -1;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setDisplayItems(tempDisplayItems);
      setDbAvailable();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load De-Briefs or related data.';
      addNotification({ type: 'error', title: 'Loading Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [addNotification, setDbAvailable, setDbUnavailable]);


  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pirStatusParam = params.get('pirStatus') as PIRStatus | null;
    const validPirStatus = pirStatusParam && Object.values(PIRStatus).includes(pirStatusParam) ? pirStatusParam : null;

    const initialFiltersToApply = {
        ...defaultPIRFilters,
        pirStatus: validPirStatus,
    };
    setCurrentFilters(initialFiltersToApply); 
    fetchData(initialFiltersToApply); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); 


  const handleApplyFilters = (incidentFiltersFromBar: IncidentFilters) => {
    setCurrentFilters(prev => {
        const newReviewFilters: IncidentReviewFilters = {
            ...prev, 
            dateRange: incidentFiltersFromBar.dateRange,
            predefinedRange: incidentFiltersFromBar.predefinedRange,
            serviceId: incidentFiltersFromBar.serviceId,
            incidentType: incidentFiltersFromBar.type, 
        };
        fetchData(newReviewFilters);
        return newReviewFilters;
    });
  };
  
  const handlePirFilterChange = (filterName: keyof Pick<IncidentReviewFilters, 'pirStatus' | 'pirSeverity'>, value: PIRStatus | PIRSeverityLevel | null) => {
      setCurrentFilters(prev => {
          const newFilters = {...prev, [filterName]: value};
          fetchData(newFilters);
          return newFilters;
      });
  };


  const handleViewEditPIR = (incidentId: string) => {
    navigate(`/admin/incidents?openPIR=${incidentId}&source=reviews`); 
  };
  
  const getPIRStatusPill = (status?: PIRStatus) => {
    if (!status) return <StatusPill status={PIRStatus.PENDING} subtle />;
    return <StatusPill status={status} subtle />;
  };
  
  const getPIRSeverityPill = (pirSeverity?: PIRSeverityLevel) => {
      if (!pirSeverity) return <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>;
      let pillType: any = pirSeverity; 
      if (pirSeverity === 'Critical') pillType = IncidentImpact.CRITICAL;
      else if (pirSeverity === 'High') pillType = IncidentImpact.SIGNIFICANT;
      else if (pirSeverity === 'Medium') pillType = IncidentImpact.MINOR;
      else if (pirSeverity === 'Low') pillType = IncidentImpact.NONE; 
      return <StatusPill status={pillType as IncidentImpact} subtle />;
  };


  if (loading && displayItems.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  const historyBarFilters: IncidentFilters = {
    dateRange: currentFilters.dateRange,
    predefinedRange: currentFilters.predefinedRange,
    serviceId: currentFilters.serviceId,
    type: currentFilters.incidentType,
    status: null, 
  };


  return (
    <div className="space-y-6">
      <Card title="Incident De-Briefs (Post-Mortems)" titleIcon="fa-clipboard-check">
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Manage and review Post-Incident De-Briefs for resolved incidents and completed maintenance.
        </p>

        <HistoryFilterBar
          services={services}
          initialFilters={historyBarFilters} 
          onApplyFilters={handleApplyFilters} 
          isLoading={loading}
        />
        
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="pirStatusFilter" className="block text-xs font-medium text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-1">De-Brief Status</label>
                <select 
                    id="pirStatusFilter" 
                    value={currentFilters.pirStatus || ''} 
                    onChange={(e) => handlePirFilterChange('pirStatus', e.target.value as PIRStatus || null)}
                    className="w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]"
                    disabled={loading}
                >
                    <option value="">All De-Brief Statuses</option>
                    {Object.values(PIRStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="pirSeverityFilter" className="block text-xs font-medium text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-1">De-Brief Severity</label>
                <select 
                    id="pirSeverityFilter" 
                    value={currentFilters.pirSeverity || ''} 
                    onChange={(e) => handlePirFilterChange('pirSeverity', e.target.value as PIRSeverityLevel || null)}
                    className="w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]"
                    disabled={loading}
                >
                    <option value="">All Severities</option>
                    {(['Low', 'Medium', 'High', 'Critical'] as PIRSeverityLevel[]).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
        </div>

        
        {loading && <div className="py-4"><LoadingSpinner /></div>}

        {!loading && displayItems.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">
            No incident de-briefs match the current filters.
          </p>
        )}

        {displayItems.length > 0 && !loading && (
          <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Incident Title</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resolved/Completed On</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">De-Brief Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">De-Brief Severity</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Participants</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {displayItems.map(item => {
                  const { incident, reviewData } = item;
                  const isPendingPastDue = reviewData.status === PIRStatus.PENDING && 
                                           incident.resolvedAt && isValid(parseISO(incident.resolvedAt)) &&
                                           differenceInDays(new Date(), parseISO(incident.resolvedAt)) > PENDING_REVIEW_HIGHLIGHT_DAYS;
                  return (
                    <tr key={item.key} className={`hover:bg-gray-50 dark:hover:bg-slate-800/60 ${isPendingPastDue ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}>
                      <td className="px-3 py-3 text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
                        {isPendingPastDue && <i className="fas fa-exclamation-triangle text-yellow-500 dark:text-yellow-400 mr-2" title={`Pending review for over ${PENDING_REVIEW_HIGHLIGHT_DAYS} days`}></i>}
                        {incident.title}
                        {incident.debriefRequired && reviewData.status === PIRStatus.PENDING && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300">Debrief Required</span>}
                      </td>
                      <td className="px-3 py-3 text-sm"><StatusPill status={incident.type} subtle /></td>
                      <td className="px-3 py-3 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]" title={incident.resolvedAt && isValid(parseISO(incident.resolvedAt)) ? new Date(incident.resolvedAt).toLocaleString() : 'N/A'}>
                        {incident.resolvedAt && isValid(parseISO(incident.resolvedAt)) ? formatDistanceToNowStrict(parseISO(incident.resolvedAt), { addSuffix: true }) : 'N/A'}
                      </td>
                      <td className="px-3 py-3 text-sm">{getPIRStatusPill(reviewData.status)}</td>
                      <td className="px-3 py-3 text-sm">{getPIRSeverityPill(reviewData.severityLevel)}</td>
                      <td className="px-3 py-3 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
                        {reviewData.participants && reviewData.participants.length > 0 ? reviewData.participants.join(', ') : (reviewData.status === PIRStatus.COMPLETED && reviewData.$id ? 'N/A' : '')}
                        {reviewData.reviewedAt && isValid(parseISO(reviewData.reviewedAt)) && <span className="block text-xs text-gray-400 dark:text-gray-500">({new Date(reviewData.reviewedAt).toLocaleDateString()})</span>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                        <button 
                          onClick={() => handleViewEditPIR(incident.id)}
                          className="text-[var(--color-primary-blue)] hover:underline"
                          aria-label={`Manage De-Brief for ${incident.title}`}
                        >
                          {reviewData.status === PIRStatus.COMPLETED && reviewData.$id ? 'View De-Brief' : 'Start/Edit De-Brief'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ManageReviewsPage;
