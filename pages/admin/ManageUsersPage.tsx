

import React, { useState, useEffect } from 'react';
import { AdminUser, FormMode } from '../../types';
import { adminGetAllUsers, adminCreateUser, adminUpdateUser, adminDeleteUser } from '../../services/appwrite'; 
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import UserForm from '../../components/admin/forms/UserForm';
import { useAuth } from '../../contexts/AuthContext'; 
import { useNotification } from '../../contexts/NotificationContext';
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';
// Removed ID import from appwrite as it's not used here directly for new user ID anymore

const ManageUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth(); 
  const { addNotification } = useNotification();
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(FormMode.ADD);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await adminGetAllUsers();
      setUsers(data);
      setDbAvailable();
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load users. Please try again.';
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

  const handleOpenModal = (mode: FormMode, user?: AdminUser) => {
    setFormMode(mode);
    setEditingUser(user || null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (dataFromForm: Omit<AdminUser, '$id' | 'createdAt' | 'updatedAt'> | AdminUser) => {
    setIsSubmitting(true);
    setModalError(null);
    
    const userName = (dataFromForm as AdminUser).name || editingUser?.name || 'New User';
    const targetUserRole = (dataFromForm as AdminUser).role;

    if (formMode === FormMode.EDIT && editingUser?.id === currentUser?.id) {
        if (targetUserRole !== 'Admin' && editingUser.role === 'Admin') { 
            const adminCount = users.filter(u => u.role === 'Admin').length;
            if (adminCount <= 1) {
                 setModalError("Cannot demote the last administrator.");
                 setIsSubmitting(false);
                 return;
            }
        }
    }

    try {
      if (formMode === FormMode.EDIT && editingUser?.$id) { 
        // For edit, dataFromForm comes from UserForm which already has structure of AdminUser
        // We only want to update name and role. ID and Email are fixed.
        const updatePayload: Partial<Omit<AdminUser, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'email'>> = {
          name: (dataFromForm as AdminUser).name,
          role: (dataFromForm as AdminUser).role,
        };
        await adminUpdateUser(editingUser.$id, updatePayload);
        addNotification({ type: 'success', title: 'User Updated', message: `User "${userName}" was updated.` });
      } else { 
        // For ADD, dataFromForm is Omit<AdminUser, '$id' | 'createdAt' | 'updatedAt'>
        // It now includes the 'id' (Appwrite Auth User ID) from the form.
        const newUserPayload = dataFromForm as Omit<AdminUser, '$id' | 'createdAt' | 'updatedAt'>;
        // Ensure the 'id' field (Appwrite Auth User ID) is present from the form
        if (!newUserPayload.id || newUserPayload.id.trim() === '') {
            throw new Error("Appwrite Auth User ID is missing for the new user.");
        }
        await adminCreateUser(newUserPayload);
        addNotification({ type: 'success', title: 'User Added', message: `User "${userName}" was successfully added.` });
      }
      await fetchData();
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save user:", err);
      const errorMsg = (err as Error).message || `Failed to ${formMode === FormMode.ADD ? 'create' : 'update'} user.`;
      setModalError(errorMsg); 
      addNotification({ type: 'error', title: 'Save Error', message: errorMsg }); 
      setDbUnavailable(errorMsg); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (adminUserDocId: string, userName: string) => {
    const userToDeleteDetails = users.find(u => u.$id === adminUserDocId);

    if (userToDeleteDetails?.id === currentUser?.id) { 
      addNotification({ type: 'warning', title: 'Action Denied', message: 'You cannot delete yourself.' });
      return;
    }
    if (userToDeleteDetails?.role === 'Admin') {
        const adminCount = users.filter(u => u.role === 'Admin').length;
        if (adminCount <=1) {
            addNotification({ type: 'warning', title: 'Action Denied', message: 'Cannot delete the last administrator.' });
            return;
        }
    }

    if (window.confirm(`Are you sure you want to delete the user "${userName}"? This action cannot be undone.`)) {
      setLoading(true);
      try {
        await adminDeleteUser(adminUserDocId); 
        addNotification({ type: 'success', title: 'User Deleted', message: `User "${userName}" was deleted.` });
        await fetchData();
      } catch (err) {
        console.error("Failed to delete user:", err);
        const errorMsg = (err as Error).message || "Failed to delete user.";
        addNotification({ type: 'error', title: 'Delete Error', message: errorMsg, persistent: true });
        setDbUnavailable(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && users.length === 0) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;

  const getRoleBadgeClass = (role: AdminUser['role']) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 dark:bg-red-800/40 dark:text-red-300';
      case 'Support':
        return 'bg-green-100 text-green-800 dark:bg-green-800/40 dark:text-green-300';
      case 'Viewer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800/40 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/60 dark:text-gray-300';
    }
  };


  return (
    <div className="space-y-6">
      <Card 
        title="Manage Users" 
        titleIcon="fa-users-cog"
        actions={
          <button 
            onClick={() => handleOpenModal(FormMode.ADD)}
            className="px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center"
          >
            <i className="fas fa-user-plus mr-2"></i>Add New User
          </button>
        }
      >
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Manage administrator, support, and viewer accounts for the MRX United status platform.
          Note: This section creates user entries in the application database. Corresponding Appwrite Authentication users must be created separately in the Appwrite console.
        </p>
        
        {loading && users.length > 0 && <div className="py-4"><LoadingSpinner /></div>}

        {!loading && users.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No users configured yet. Click "Add New User" to get started.</p>
        )}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Auth User ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {users.map(user => (
                  <tr key={user.$id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60"> 
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{user.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{user.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hidden md:table-cell" title={user.id}>{user.id.substring(0,12)}...</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3">
                      <button 
                        onClick={() => handleOpenModal(FormMode.EDIT, user)}
                        className="text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                        aria-label={`Edit ${user.name}`}
                        disabled={user.id === currentUser?.id && user.role === 'Admin' && users.filter(u => u.role === 'Admin').length <= 1}
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.$id!, user.name)} 
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                        aria-label={`Delete ${user.name}`}
                        disabled={user.id === currentUser?.id || (user.role === 'Admin' && users.filter(u=>u.role === 'Admin').length <= 1)}
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
        title={formMode === FormMode.EDIT ? "Edit User" : "Add New User"} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        size="md"
        footer={
          <>
            <button type="button" onClick={handleCloseModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] disabled:opacity-50">Cancel</button>
            <button type="submit" form="user-form-id" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] disabled:opacity-70 flex items-center">
              {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
              {isSubmitting ? 'Saving...' : (formMode === FormMode.EDIT ? 'Save Changes' : 'Add User')}
            </button>
          </>
        }
      >
        <UserForm 
            mode={formMode} 
            initialData={editingUser} 
            onSave={handleSaveUser} 
            onCancel={handleCloseModal} 
            isSubmitting={isSubmitting}
        />
        {modalError && <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{modalError}</div>}
      </Modal>
    </div>
  );
};

export default ManageUsersPage;
