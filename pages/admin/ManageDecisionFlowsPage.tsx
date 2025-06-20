
import React, { useState, useEffect, useCallback } from 'react';
import { DecisionFlow, FormMode } from '../../types';
import { adminGetAllDecisionFlows, adminCreateDecisionFlow, adminUpdateDecisionFlow, adminDeleteDecisionFlow } from '../../services/appwrite';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import DecisionFlowForm from '../../components/admin/forms/DecisionFlowForm';
import { useNotification } from '../../contexts/NotificationContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';

const ManageDecisionFlowsPage: React.FC = () => {
  const [flows, setFlows] = useState<DecisionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(FormMode.ADD);
  const [editingFlow, setEditingFlow] = useState<DecisionFlow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addNotification } = useNotification();
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetAllDecisionFlows();
      setFlows(data);
      setDbAvailable();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load decision flows.';
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

  const handleOpenModal = (mode: FormMode, flow?: DecisionFlow) => {
    setFormMode(mode);
    setEditingFlow(flow || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingFlow(null);
  };

  const handleSaveFlow = async (data: Omit<DecisionFlow, 'id'|'$id'|'createdAt'|'updatedAt'>) => {
    setIsSubmitting(true);
    const flowName = data.name || editingFlow?.name || 'New Flow';
    try {
      if (formMode === FormMode.EDIT && editingFlow?.id) {
        await adminUpdateDecisionFlow(editingFlow.id, data);
        addNotification({ type: 'success', title: 'Flow Updated', message: `Decision flow "${flowName}" was updated.`});
      } else {
        await adminCreateDecisionFlow(data);
        addNotification({ type: 'success', title: 'Flow Added', message: `Decision flow "${flowName}" was added.`});
      }
      await fetchData(); 
      handleCloseModal();
    } catch (err) {
      const errorMsg = (err as Error).message || `Failed to ${formMode === FormMode.ADD ? 'create' : 'update'} decision flow.`;
      addNotification({ type: 'error', title: 'Save Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFlow = async (flowId: string, flowName: string) => {
    const confirmMessage = `Are you sure you want to delete the decision flow "${flowName}"? This action cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      setLoading(true); 
      try {
        await adminDeleteDecisionFlow(flowId);
        addNotification({ type: 'success', title: 'Flow Deleted', message: `"${flowName}" was removed.`});
        await fetchData(); 
      } catch (err) {
        const errorMsg = (err as Error).message || "Failed to delete decision flow.";
        addNotification({ type: 'error', title: 'Delete Error', message: errorMsg, persistent: true });
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && flows.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card 
        title="Manage Incident Decision Flows" 
        titleIcon="fa-project-diagram"
        actions={
          <button 
            onClick={() => handleOpenModal(FormMode.ADD)}
            className="px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Add New Flow
          </button>
        }
      >
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Create and manage standardized decision flows or playbooks for incident response. These flows can be attached to incidents to guide responders.
        </p>
        
        {loading && flows.length > 0 && <div className="py-4"><LoadingSpinner /></div>}

        {!loading && flows.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No decision flows configured yet. Click "Add New Flow" to get started.</p>
        )}

        {flows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Steps</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {flows.map(flow => (
                  <tr key={flow.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{flow.name}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] max-w-md truncate" title={flow.description}>{flow.description || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{flow.steps.length}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{flow.updatedAt ? new Date(flow.updatedAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                      <button 
                        onClick={() => handleOpenModal(FormMode.EDIT, flow)}
                        className="text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)]"
                        aria-label={`Edit ${flow.name}`}
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteFlow(flow.id, flow.name)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                        aria-label={`Delete ${flow.name}`}
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
        title={formMode === FormMode.EDIT ? "Edit Decision Flow" : "Add New Decision Flow"} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        size="xl" 
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
              form="decision-flow-form-id" 
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] disabled:opacity-70 flex items-center"
            >
              {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
              {isSubmitting ? 'Saving...' : (formMode === FormMode.EDIT ? 'Save Changes' : 'Add Flow')}
            </button>
          </>
        }
      >
        <DecisionFlowForm 
            mode={formMode} 
            initialData={editingFlow} 
            onSave={handleSaveFlow} 
            isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default ManageDecisionFlowsPage;
