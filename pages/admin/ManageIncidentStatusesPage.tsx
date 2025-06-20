
import React, { useState, useEffect, useCallback } from 'react';
import { IncidentStatusDefinition, FormMode } from '../../types';
import { 
    adminGetAllIncidentStatusDefinitions, 
    adminCreateIncidentStatusDefinition, 
    adminUpdateIncidentStatusDefinition, 
    adminDeleteIncidentStatusDefinition 
} from '../../services/appwrite';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import IncidentStatusForm from '../../components/admin/forms/IncidentStatusForm';
import { useNotification } from '../../contexts/NotificationContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';

const ManageIncidentStatusesPage: React.FC = () => {
  const [statuses, setStatuses] = useState<IncidentStatusDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(FormMode.ADD);
  const [editingStatus, setEditingStatus] = useState<IncidentStatusDefinition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addNotification } = useNotification();
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetAllIncidentStatusDefinitions();
      setStatuses(data);
      setDbAvailable();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load incident status definitions.';
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

  const handleOpenModal = (mode: FormMode, status?: IncidentStatusDefinition) => {
    setFormMode(mode);
    setEditingStatus(status || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingStatus(null);
  };

  const handleSaveStatus = async (data: Omit<IncidentStatusDefinition, 'id'|'$id'|'createdAt'|'updatedAt'>) => {
    setIsSubmitting(true);
    const statusName = data.name || editingStatus?.name || 'New Status';
    try {
      if (formMode === FormMode.EDIT && editingStatus?.id) {
        await adminUpdateIncidentStatusDefinition(editingStatus.id, data);
        addNotification({ type: 'success', title: 'Status Updated', message: `Incident status "${statusName}" was updated.`});
      } else {
        await adminCreateIncidentStatusDefinition(data);
        addNotification({ type: 'success', title: 'Status Added', message: `Incident status "${statusName}" was added.`});
      }
      await fetchData(); 
      handleCloseModal();
    } catch (err) {
      const errorMsg = (err as Error).message || `Failed to ${formMode === FormMode.ADD ? 'create' : 'update'} incident status.`;
      addNotification({ type: 'error', title: 'Save Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStatus = async (statusId: string, statusName: string) => {
    // TODO: Check if status is in use by any incidents.
    // For now, simple confirm.
    const confirmMessage = `Are you sure you want to delete the incident status "${statusName}"? This action cannot be undone and may affect existing incidents using this status.`;

    if (window.confirm(confirmMessage)) {
      setLoading(true); 
      try {
        await adminDeleteIncidentStatusDefinition(statusId);
        addNotification({ type: 'success', title: 'Status Deleted', message: `Incident status "${statusName}" was removed.`});
        await fetchData(); 
      } catch (err) {
        const errorMsg = (err as Error).message || "Failed to delete incident status.";
        addNotification({ type: 'error', title: 'Delete Error', message: errorMsg, persistent: true });
        setDbUnavailable(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && statuses.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card 
        title="Manage Incident Statuses" 
        titleIcon="fa-tags"
        actions={
          <button 
            onClick={() => handleOpenModal(FormMode.ADD)}
            className="px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Add New Status
          </button>
        }
      >
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Define and manage custom status types for incidents. These statuses can be used to track the progress of an incident through its lifecycle.
        </p>
        
        {loading && statuses.length > 0 && <div className="py-4"><LoadingSpinner /></div>}

        {!loading && statuses.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No incident statuses configured yet. Click "Add New Status" to get started.</p>
        )}

        {statuses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Enabled</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Default</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {statuses.sort((a,b) => a.displayOrder - b.displayOrder).map(statusDef => (
                  <tr key={statusDef.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 whitespace-nowrap">
                        <span 
                            className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" 
                            style={{ backgroundColor: statusDef.color, color: '#ffffff' /* Adjust text color for contrast if needed */ }}
                            title={statusDef.color}
                        >
                            {statusDef.name}
                        </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{statusDef.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{statusDef.displayOrder}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {statusDef.isEnabled ? 
                            <span className="text-green-600 dark:text-green-400"><i className="fas fa-check-circle mr-1"></i>Yes</span> :
                            <span className="text-red-600 dark:text-red-400"><i className="fas fa-times-circle mr-1"></i>No</span>
                        }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {statusDef.isDefault ? 
                            <span className="text-blue-600 dark:text-blue-400"><i className="fas fa-star mr-1"></i>Yes</span> :
                            <span className="text-gray-500 dark:text-gray-400">No</span>
                        }
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] max-w-xs truncate" title={statusDef.description}>{statusDef.description || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                      <button 
                        onClick={() => handleOpenModal(FormMode.EDIT, statusDef)}
                        className="text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)]"
                        aria-label={`Edit ${statusDef.name}`}
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteStatus(statusDef.id, statusDef.name)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                        aria-label={`Delete ${statusDef.name}`}
                      >
                        <i className="fas fa-trash-alt mr-1"></i>Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal 
        title={formMode === FormMode.EDIT ? "Edit Incident Status" : "Add New Incident Status"} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit" 
              form="incident-status-form-id" 
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] disabled:opacity-70 flex items-center"
            >
              {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
              {isSubmitting ? 'Saving...' : (formMode === FormMode.EDIT ? 'Save Changes' : 'Add Status')}
            </button>
          </>
        }
      >
        <IncidentStatusForm 
            mode={formMode} 
            initialData={editingStatus} 
            onSave={handleSaveStatus} 
            isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default ManageIncidentStatusesPage;
