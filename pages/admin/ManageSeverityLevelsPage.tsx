

import React, { useState, useEffect, useCallback } from 'react';
import { SeverityLevel, FormMode } from '../../types';
import { adminGetAllSeverityLevels, adminCreateSeverityLevel, adminUpdateSeverityLevel, adminDeleteSeverityLevel } from '../../services/appwrite';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import SeverityLevelForm from '../../components/admin/forms/SeverityLevelForm';
import { useNotification } from '../../contexts/NotificationContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';

const ManageSeverityLevelsPage: React.FC = () => {
  const [severityLevels, setSeverityLevels] = useState<SeverityLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(FormMode.ADD);
  const [editingSeverityLevel, setEditingSeverityLevel] = useState<SeverityLevel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addNotification } = useNotification();
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetAllSeverityLevels();
      setSeverityLevels(data);
      setDbAvailable();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load severity levels.';
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

  const handleOpenModal = (mode: FormMode, level?: SeverityLevel) => {
    setFormMode(mode);
    setEditingSeverityLevel(level || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingSeverityLevel(null);
  };

  const handleSaveSeverityLevel = async (data: Omit<SeverityLevel, 'id'|'$id'|'createdAt'|'updatedAt'>) => {
    setIsSubmitting(true);
    const levelName = data.name || editingSeverityLevel?.name || 'New Level';
    try {
      if (formMode === FormMode.EDIT && editingSeverityLevel?.id) {
        await adminUpdateSeverityLevel(editingSeverityLevel.id, data);
        addNotification({ type: 'success', title: 'Severity Level Updated', message: `"${levelName}" was updated.`});
      } else {
        await adminCreateSeverityLevel(data);
        addNotification({ type: 'success', title: 'Severity Level Added', message: `"${levelName}" was added.`});
      }
      await fetchData(); 
      handleCloseModal();
    } catch (err) {
      const errorMsg = (err as Error).message || `Failed to ${formMode === FormMode.ADD ? 'create' : 'update'} severity level.`;
      addNotification({ type: 'error', title: 'Save Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg); // Consider if every save error means DB is unavailable
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSeverityLevel = async (levelId: string, levelName: string) => {
    const confirmMessage = `Are you sure you want to delete the severity level "${levelName}"? This action cannot be undone. If this level is in use by incidents, deletion might be prevented.`;

    if (window.confirm(confirmMessage)) {
      setLoading(true); 
      try {
        await adminDeleteSeverityLevel(levelId);
        addNotification({ type: 'success', title: 'Severity Level Deleted', message: `"${levelName}" was removed.`});
        await fetchData(); 
      } catch (err) {
        const errorMsg = (err as Error).message || "Failed to delete severity level.";
        addNotification({ type: 'error', title: 'Delete Error', message: errorMsg, persistent: true });
        // No need to setDbUnavailable here as the service layer handles if it's a "DB down" type error vs "in use"
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && severityLevels.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card 
        title="Manage Severity Levels" 
        titleIcon="fa-triangle-exclamation"
        actions={
          <button 
            onClick={() => handleOpenModal(FormMode.ADD)}
            className="px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Add New Level
          </button>
        }
      >
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Define and manage severity levels for incidents. These levels help categorize and prioritize incidents.
        </p>
        
        {loading && severityLevels.length > 0 && <div className="py-4"><LoadingSpinner /></div>}

        {!loading && severityLevels.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No severity levels configured yet. Click "Add New Level" to get started.</p>
        )}

        {severityLevels.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Color</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {severityLevels.sort((a,b) => a.priority - b.priority).map(level => (
                  <tr key={level.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 whitespace-nowrap">
                        <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600" style={{ backgroundColor: level.color }} title={level.color}></div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{level.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{level.priority}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] max-w-xs truncate" title={level.description}>{level.description || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                      <button 
                        onClick={() => handleOpenModal(FormMode.EDIT, level)}
                        className="text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)]"
                        aria-label={`Edit ${level.name}`}
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteSeverityLevel(level.id, level.name)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                        aria-label={`Delete ${level.name}`}
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
        title={formMode === FormMode.EDIT ? "Edit Severity Level" : "Add New Severity Level"} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        size="md"
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
              form="severity-level-form-id" 
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] disabled:opacity-70 flex items-center"
            >
              {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
              {isSubmitting ? 'Saving...' : (formMode === FormMode.EDIT ? 'Save Changes' : 'Add Level')}
            </button>
          </>
        }
      >
        <SeverityLevelForm 
            mode={formMode} 
            initialData={editingSeverityLevel} 
            onSave={handleSaveSeverityLevel} 
            isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default ManageSeverityLevelsPage;