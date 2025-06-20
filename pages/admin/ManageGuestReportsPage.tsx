

import React, { useState, useEffect, useCallback } from 'react';
import { GuestIncidentReport, GuestIncidentReportStatus, SystemService, Incident, IncidentType, FormMode, IncidentLifecycleStatus, IncidentImpact } from '../../types';
import { 
    adminGetAllGuestIncidentReports, 
    adminUpdateGuestIncidentReport, 
    adminDeleteGuestIncidentReport,
    adminGetAllServices, 
    adminCreateIncident 
} from '../../services/appwrite';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusPill from '../../components/ui/StatusPill';
import Modal from '../../components/ui/Modal';
import IncidentForm from '../../components/admin/forms/IncidentForm'; // For creating official incident
import { useNotification } from '../../contexts/NotificationContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ID } from 'appwrite'; // Added import for ID

const ManageGuestReportsPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();
  const { user: authUser } = useAuth();

  const [guestReports, setGuestReports] = useState<GuestIncidentReport[]>([]);
  const [services, setServices] = useState<SystemService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedReport, setSelectedReport] = useState<GuestIncidentReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isIncidentFormModalOpen, setIsIncidentFormModalOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsData, servicesData] = await Promise.all([
        adminGetAllGuestIncidentReports(),
        adminGetAllServices()
      ]);
      setGuestReports(reportsData);
      setServices(servicesData);
      setDbAvailable();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load guest reports or services.';
      addNotification({ type: 'error', title: 'Loading Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [addNotification, setDbAvailable, setDbUnavailable]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getServiceName = (serviceId: string): string => {
    if (serviceId === 'other') return 'Other / Not Sure';
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };
  
  const handleViewDetails = (report: GuestIncidentReport) => {
    setSelectedReport(report);
    setEditingNotes(report.notes || '');
    setIsDetailModalOpen(true);
  };

  const handleStatusChange = async (reportId: string, newStatus: GuestIncidentReportStatus, currentNotes?: string, officialIncidentId?: string) => {
    setIsSubmitting(true);
    try {
      await adminUpdateGuestIncidentReport(reportId, { status: newStatus, notes: currentNotes, officialIncidentId });
      addNotification({ type: 'success', title: 'Status Updated', message: `Report status changed to ${newStatus}.` });
      fetchData(); // Refresh list
      if(selectedReport && selectedReport.id === reportId) { // if detail modal was open
         setSelectedReport(prev => prev ? {...prev, status: newStatus, notes: currentNotes, officialIncidentId} : null);
      }
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to update report status.';
      addNotification({ type: 'error', title: 'Update Failed', message: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveNotes = async () => {
    if (!selectedReport) return;
    setIsSubmitting(true);
    try {
        await adminUpdateGuestIncidentReport(selectedReport.id, { notes: editingNotes });
        addNotification({ type: 'success', title: 'Notes Updated', message: `Notes for report ${selectedReport.id.substring(0,6)}... updated.` });
        fetchData(); // Refresh list
        setSelectedReport(prev => prev ? {...prev, notes: editingNotes} : null);
    } catch(err) {
        addNotification({type: 'error', title: 'Notes Update Failed', message: (err as Error).message});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('Are you sure you want to delete this guest report? This action cannot be undone.')) {
      setIsSubmitting(true);
      try {
        await adminDeleteGuestIncidentReport(reportId);
        addNotification({ type: 'success', title: 'Report Deleted', message: 'Guest report has been deleted.' });
        fetchData();
        if (selectedReport && selectedReport.id === reportId) setIsDetailModalOpen(false);
      } catch (err) {
        const errorMsg = (err as Error).message || 'Failed to delete report.';
        addNotification({ type: 'error', title: 'Delete Failed', message: errorMsg });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const openCreateOfficialIncidentModal = (report: GuestIncidentReport) => {
    setSelectedReport(report); // Store the report that's being converted
    setIsIncidentFormModalOpen(true);
  };

  const handleSaveOfficialIncident = async (
    data: Incident | Omit<Incident, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string, initialStatus: IncidentLifecycleStatus }
  ) => {
    if (!selectedReport) return; // Should not happen if modal is open
    setIsSubmitting(true);
    const incidentTitle = data.title || 'Untitled Event';
    try {
      const createData = data as Omit<Incident, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string, initialStatus: IncidentLifecycleStatus };
      const newOfficialIncident = await adminCreateIncident({...createData, postedBy: authUser?.name || "Admin"});
      
      addNotification({ type: 'success', title: 'Official Incident Created', message: `Incident "${incidentTitle}" created from guest report.` });
      
      // Update guest report status and link to official incident
      await handleStatusChange(selectedReport.id, GuestIncidentReportStatus.LINKED_TO_INCIDENT, selectedReport.notes, newOfficialIncident.id);
      
      setIsIncidentFormModalOpen(false);
      setSelectedReport(null); // Clear selected report after conversion
      // fetchData(); // Already called by handleStatusChange
    } catch (err) {
      addNotification({ type: 'error', title: 'Failed to Create Official Incident', message: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";


  if (loading && guestReports.length === 0) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <Card title="Manage Guest-Submitted Reports" titleIcon="fa-bug">
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Review and manage incident reports submitted by guests.
        </p>
        
        {loading && guestReports.length > 0 && <div className="py-4"><LoadingSpinner /></div>}

        {!loading && guestReports.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No guest reports submitted yet.</p>
        )}

        {guestReports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Submitted</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Service</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {guestReports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]" title={new Date(report.submittedAt).toLocaleString()}>
                        {formatDistanceToNowStrict(parseISO(report.submittedAt), { addSuffix: true })}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{getServiceName(report.serviceId)}</td>
                    <td className="px-3 py-3 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] max-w-xs truncate" title={report.description}>{report.description}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{report.email || 'N/A'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm"><StatusPill status={report.status as any} /></td> {/* Cast as any for now */}
                    <td className="px-3 py-3 whitespace-nowrap text-xs font-medium space-x-2">
                      <button onClick={() => handleViewDetails(report)} className="text-[var(--color-primary-blue)] hover:underline" aria-label={`View details for report ${report.id.substring(0,6)}`}>Details</button>
                       <button onClick={() => openCreateOfficialIncidentModal(report)} className="text-green-600 hover:underline" aria-label={`Create official incident from report ${report.id.substring(0,6)}`}>Create Incident</button>
                      <button onClick={() => handleDeleteReport(report.id)} className="text-red-600 hover:underline" aria-label={`Delete report ${report.id.substring(0,6)}`}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedReport && (
        <Modal
            title={`Guest Report Details (${selectedReport.id.substring(0,8)}...)`}
            isOpen={isDetailModalOpen}
            onClose={() => setIsDetailModalOpen(false)}
            size="lg"
            footer={
                <>
                    <button onClick={() => setIsDetailModalOpen(false)} className="px-3 py-1.5 text-sm font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)]">Close</button>
                    <button onClick={handleSaveNotes} disabled={isSubmitting} className="px-3 py-1.5 text-sm font-medium text-white bg-[var(--color-primary-blue)] rounded-md hover:bg-[var(--color-primary-blue-hover)] disabled:opacity-70">
                        {isSubmitting && selectedReport.notes !== editingNotes ? <LoadingSpinner size="sm" color="text-white" className="mr-1.5"/> : null}
                        Save Notes
                    </button>
                </>
            }
        >
            <div className="space-y-4 text-sm">
                <p><strong>Submitted:</strong> {new Date(selectedReport.submittedAt).toLocaleString()}</p>
                <p><strong>Service:</strong> {getServiceName(selectedReport.serviceId)}</p>
                <p><strong>Email:</strong> {selectedReport.email || 'Not provided'}</p>
                <p><strong>Description:</strong></p>
                <pre className="whitespace-pre-wrap p-2 bg-gray-100 dark:bg-slate-800 rounded text-xs">{selectedReport.description}</pre>
                <p><strong>User Agent:</strong> <span className="text-xs text-gray-500 dark:text-gray-400">{selectedReport.userAgent || 'Not provided'}</span></p>
                {selectedReport.officialIncidentId && <p><strong>Linked Official Incident:</strong> <StatusPill status={selectedReport.officialIncidentId as any} /> </p>}
                <div>
                    <label htmlFor="guest-report-status" className="block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1">Status</label>
                    <select 
                        id="guest-report-status"
                        value={selectedReport.status}
                        onChange={(e) => handleStatusChange(selectedReport.id, e.target.value as GuestIncidentReportStatus, editingNotes)}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                        disabled={isSubmitting}
                    >
                        {Object.values(GuestIncidentReportStatus).map(sVal => (
                            <option key={sVal} value={sVal}>{sVal}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="guest-report-notes" className="block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1">Admin Notes</label>
                    <textarea id="guest-report-notes" rows={3} value={editingNotes} onChange={(e) => setEditingNotes(e.target.value)}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                        placeholder="Internal notes for this report..."
                        disabled={isSubmitting}
                    />
                </div>

            </div>
        </Modal>
      )}

      {isIncidentFormModalOpen && selectedReport && (
         <Modal 
            title="Create Official Incident from Guest Report"
            isOpen={isIncidentFormModalOpen} 
            onClose={() => { setIsIncidentFormModalOpen(false); setSelectedReport(null); }}
            size="xl"
            footer={
            <>
                <button type="button" onClick={() => { setIsIncidentFormModalOpen(false); setSelectedReport(null); }} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] disabled:opacity-50">Cancel</button>
                <button type="submit" form="incident-form-id" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] disabled:opacity-70 flex items-center">
                {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
                Create Incident
                </button>
            </>
            }
        >
            <IncidentForm
                mode={FormMode.ADD}
                // Pre-fill based on selectedReport
                initialData={{
                    title: `User Report: ${selectedReport.description.substring(0,50)}${selectedReport.description.length > 50 ? '...' : ''}`,
                    type: IncidentType.INCIDENT, // Default to incident
                    impact: IncidentImpact.MINOR, // Default impact
                    currentLifecycleStatus: IncidentLifecycleStatus.INVESTIGATING,
                    affectedServiceIds: selectedReport.serviceId !== 'other' ? [selectedReport.serviceId] : [],
                    messages: [{id: ID.unique(), timestamp: new Date().toISOString(), status: IncidentLifecycleStatus.INVESTIGATING, message: `Initial report from guest: \n${selectedReport.description}`}],
                    isPubliclyVisible: true,
                    createdAt: '', // Will be set by backend/mock
                    updatedAt: '', // Will be set by backend/mock
                    id: '' // Will be set by backend/mock
                }}
                services={services.filter(s => s.isMonitoredPublicly)} 
                onSave={handleSaveOfficialIncident}
                onCancel={() => { setIsIncidentFormModalOpen(false); setSelectedReport(null); }}
                isSubmitting={isSubmitting}
            />
        </Modal>
      )}

    </div>
  );
};

export default ManageGuestReportsPage;