

import React, { useState, useEffect } from 'react';
import { ServiceGroup, FormMode } from '../../types';
import { adminGetAllServiceGroups, adminCreateServiceGroup, adminUpdateServiceGroup, adminDeleteServiceGroup } from '../../services/appwrite'; 
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import ServiceGroupForm from '../../components/admin/forms/ServiceGroupForm';
import { useNotification } from '../../contexts/NotificationContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';

const ManageServiceGroupsPage: React.FC = () => {
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(FormMode.ADD);
  const [editingGroup, setEditingGroup] = useState<ServiceGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addNotification } = useNotification();
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await adminGetAllServiceGroups();
      setServiceGroups(data);
      setDbAvailable();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load service groups. Please try again.';
      addNotification({ type: 'error', title: 'Loading Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = (mode: FormMode, group?: ServiceGroup) => {
    setFormMode(mode);
    setEditingGroup(group || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingGroup(null);
  };

  const handleSaveGroup = async (groupData: ServiceGroup | Omit<ServiceGroup, 'id' | '$id'>) => {
    setIsSubmitting(true);
    const groupName = (groupData as ServiceGroup).name || editingGroup?.name || 'New Group';
    try {
      if (formMode === FormMode.EDIT && editingGroup && editingGroup.id) {
        await adminUpdateServiceGroup(editingGroup.id, groupData as Partial<Omit<ServiceGroup, 'id' | '$id'>>);
        addNotification({ type: 'success', title: 'Group Updated', message: `Service group "${groupName}" was updated.`});
      } else {
        await adminCreateServiceGroup(groupData as Omit<ServiceGroup, 'id' | '$id'>);
        addNotification({ type: 'success', title: 'Group Added', message: `Service group "${groupName}" was successfully added.`});
      }
      await fetchData(); 
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save service group:", err);
      const errorMsg = (err as Error).message || `Failed to ${formMode === FormMode.ADD ? 'create' : 'update'} service group.`;
      addNotification({ type: 'error', title: 'Save Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (window.confirm(`Are you sure you want to delete the service group "${groupName}"? Services in this group will become ungrouped. This action cannot be undone.`)) {
      setLoading(true); 
      try {
        await adminDeleteServiceGroup(groupId);
        addNotification({ type: 'success', title: 'Group Deleted', message: `Service group "${groupName}" was removed.`});
        await fetchData(); 
      } catch (err) {
        console.error("Failed to delete service group:", err);
        const errorMsg = (err as Error).message || "Failed to delete service group.";
        addNotification({ type: 'error', title: 'Delete Error', message: errorMsg, persistent: true });
        setDbUnavailable(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && serviceGroups.length === 0) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <Card 
        title="Manage Service Groups" 
        titleIcon="fa-object-group"
        actions={
          <button 
            onClick={() => handleOpenModal(FormMode.ADD)}
            className="px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Add New Group
          </button>
        }
      >
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Organize your services into groups for better readability on the public status page and internal management.
        </p>
        
        {loading && serviceGroups.length > 0 && <div className="py-4"><LoadingSpinner /></div>}

        {!loading && serviceGroups.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No service groups configured yet. Click "Add New Group" to get started.</p>
        )}

        {serviceGroups.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Display Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {serviceGroups.map(group => (
                  <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{group.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{group.displayOrder}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                      <button 
                        onClick={() => handleOpenModal(FormMode.EDIT, group)}
                        className="text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)]"
                        aria-label={`Edit ${group.name}`}
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500"
                        aria-label={`Delete ${group.name}`}
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
        title={formMode === FormMode.EDIT ? "Edit Service Group" : "Add New Service Group"} 
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
              form="service-group-form-id" 
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] disabled:opacity-70 flex items-center"
            >
              {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
              {isSubmitting ? 'Saving...' : (formMode === FormMode.EDIT ? 'Save Changes' : 'Add Group')}
            </button>
          </>
        }
      >
        <ServiceGroupForm 
            mode={formMode} 
            initialData={editingGroup} 
            onSave={handleSaveGroup} 
            isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default ManageServiceGroupsPage;