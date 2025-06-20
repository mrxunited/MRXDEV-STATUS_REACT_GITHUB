

import React, { useState, useEffect } from 'react';
import { SystemService, FormMode, PingStatus, ServiceGroup } from '../../types';
import { adminGetAllServices, adminCreateService, adminUpdateService, adminDeleteService, adminPingService, adminGetAllServiceGroups } from '../../services/appwrite'; 
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusPill from '../../components/ui/StatusPill';
import Modal from '../../components/ui/Modal';
import ServiceForm from '../../components/admin/forms/ServiceForm';
import PingStatusIndicator from '../../components/ui/PingStatusIndicator'; 
import { useNotification } from '../../contexts/NotificationContext'; 
import { useDatabaseStatus } from '../../contexts/DatabaseStatusContext';

const ManageServicesPage: React.FC = () => {
  const [services, setServices] = useState<SystemService[]>([]);
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>(FormMode.ADD);
  const [editingService, setEditingService] = useState<SystemService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pingingServiceId, setPingingServiceId] = useState<string | null>(null);

  const { addNotification } = useNotification(); 
  const { setDbUnavailable, setDbAvailable } = useDatabaseStatus();


  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesData, groupsData] = await Promise.all([
        adminGetAllServices(),
        adminGetAllServiceGroups()
      ]);
      setServices(servicesData);
      setServiceGroups(groupsData);
      setDbAvailable(); 
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load services or service groups. Please try again.';
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

  const handleOpenModal = (mode: FormMode, service?: SystemService) => {
    setFormMode(mode);
    setEditingService(service || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleSaveService = async (serviceData: SystemService | Omit<SystemService, 'id' | '$id' | 'lastCheckedAutomated' | 'lastPingResult' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      const serviceName = (serviceData as SystemService).name || (editingService?.name) || 'New Service';
      if (formMode === FormMode.EDIT && editingService && editingService.id) {
        await adminUpdateService(editingService.id, serviceData as Partial<Omit<SystemService, 'id' | '$id' | 'updatedAt'>>);
        addNotification({ type: 'success', title: 'Service Updated', message: `Service "${serviceName}" was updated.` });
      } else {
        await adminCreateService(serviceData as Omit<SystemService, 'id' | '$id' | 'lastCheckedAutomated' | 'lastPingResult' | 'updatedAt'>);
        addNotification({ type: 'success', title: 'Service Added', message: `Service "${serviceName}" was successfully added.` });
      }
      await fetchData(); 
      handleCloseModal();
    } catch (err) {
      console.error("Failed to save service:", err);
      const errorMsg = (err as Error).message || `Failed to ${formMode === FormMode.ADD ? 'create' : 'update'} service.`;
      addNotification({ type: 'error', title: 'Save Error', message: errorMsg, persistent: true });
      setDbUnavailable(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId: string, serviceName: string) => {
    if (window.confirm(`Are you sure you want to delete the service "${serviceName}"? This action cannot be undone.`)) {
      setLoading(true); 
      try {
        await adminDeleteService(serviceId);
        addNotification({ type: 'success', title: 'Service Deleted', message: `Service "${serviceName}" was removed.` });
        await fetchData(); 
      } catch (err) {
        console.error("Failed to delete service:", err);
        const errorMsg = (err as Error).message || "Failed to delete service.";
        addNotification({ type: 'error', title: 'Delete Error', message: errorMsg, persistent: true });
        setDbUnavailable(errorMsg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePingService = async (serviceId: string) => {
    setPingingServiceId(serviceId);
    const serviceToPing = services.find(s => s.id === serviceId);
    if (!serviceToPing) return;

    addNotification({type: 'info', title: 'Pinging Service', message: `Pinging ${serviceToPing.name}...`, duration: 2000});

    try {
      setServices(prevServices =>
        prevServices.map(s =>
          s.id === serviceId ? { ...s, lastPingResult: { status: PingStatus.PINGING, checkedAt: new Date().toISOString() } } : s
        )
      );
      const pingResult = await adminPingService(serviceId);
      setServices(prevServices =>
        prevServices.map(s => (s.id === serviceId ? { ...s, lastPingResult: pingResult } : s))
      );
      if (pingResult.status === PingStatus.ONLINE || pingResult.status === PingStatus.SLOW) {
        addNotification({type: 'success', title: 'Ping Successful', message: `${serviceToPing.name} is ${pingResult.status} (${pingResult.responseTimeMs}ms).`});
      } else {
        addNotification({type: 'warning', title: 'Ping Result', message: `${serviceToPing.name} responded: ${pingResult.status}. ${pingResult.error || ''}`});
      }
    } catch (err) {
      console.error("Failed to ping service:", err);
      const errorMsg = (err as Error).message || `Could not complete ping for ${serviceToPing.name}.`;
      setServices(prevServices =>
        prevServices.map(s =>
          s.id === serviceId ? { ...s, lastPingResult: { status: PingStatus.ERROR, error: errorMsg, checkedAt: new Date().toISOString() } } : s
        )
      );
      addNotification({type: 'error', title: 'Ping Failed', message: `Could not ping ${serviceToPing.name}: ${errorMsg}`});
    } finally {
      setPingingServiceId(null);
    }
  };

  const getGroupName = (groupId?: string): string => {
    if (!groupId) return 'Ungrouped';
    const group = serviceGroups.find(g => g.id === groupId);
    return group ? group.name : 'Unknown Group';
  };


  if (loading && services.length === 0 && serviceGroups.length === 0) return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  

  return (
    <div className="space-y-6">
      <Card 
        title="Manage Public Services" 
        titleIcon="fa-stream"
        actions={
          <button 
            onClick={() => handleOpenModal(FormMode.ADD)}
            className="px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center"
          >
            <i className="fas fa-plus mr-2"></i>Add New Service
          </button>
        }
      >
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-4 text-sm">
          Define and manage the services that appear on your public status page. Control their names, descriptions, display order, manually override their status, configure ping URLs for health checks, and manage subcomponents.
        </p>
        
        {loading && (services.length > 0 || serviceGroups.length > 0) && <div className="py-4"><LoadingSpinner /></div>}

        {!loading && services.length === 0 && (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No services configured yet. Click "Add New Service" to get started.</p>
        )}

        {services.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Group</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Components</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ping Monitor</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Public</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {services.sort((a, b) => {
                    const groupA = serviceGroups.find(g => g.id === a.groupId)?.displayOrder ?? Infinity;
                    const groupB = serviceGroups.find(g => g.id === b.groupId)?.displayOrder ?? Infinity;
                    if (groupA !== groupB) return groupA - groupB;
                    return a.displayOrder - b.displayOrder;
                  }).map(service => (
                  <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{service.displayOrder}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{service.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{getGroupName(service.groupId)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm"><StatusPill status={service.status} /></td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
                      {service.components && service.components.length > 0 ? `${service.components.length} component(s)` : 'None'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                        {service.pingEnabled && service.pingUrl ? (
                            <div className="flex flex-col space-y-1 text-xs">
                                <a href={service.pingUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary-blue)] hover:underline truncate max-w-[150px]" title={service.pingUrl}>
                                    {service.pingUrl}
                                </a>
                                <PingStatusIndicator pingResult={service.lastPingResult} size="sm" />
                                <span>Interval: {service.pingIntervalMinutes}m {service.pingAlertsMuted && <i title="Alerts Muted" className="fas fa-bell-slash text-gray-400 dark:text-gray-500 ml-1"></i>}</span>
                            </div>
                        ) : service.pingEnabled && !service.pingUrl ? (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400">Enabled (No URL)</span>
                        ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">Disabled</span>
                        )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
                      {service.isMonitoredPublicly ? 
                        <span className="text-green-600 dark:text-green-400 flex items-center"><i className="fas fa-check-circle mr-1.5"></i>Yes</span> :
                        <span className="text-red-600 dark:text-red-400 flex items-center"><i className="fas fa-times-circle mr-1.5"></i>No</span>
                      }
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs font-medium space-x-2">
                      {service.pingEnabled && service.pingUrl && (
                        <button
                          onClick={() => handlePingService(service.id)}
                          disabled={pingingServiceId === service.id}
                          className="px-2 py-1 text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 border border-teal-500 dark:border-teal-600 rounded hover:bg-teal-50 dark:hover:bg-teal-700/30 disabled:opacity-50 disabled:cursor-wait"
                          aria-label={`Ping ${service.name}`}
                        >
                          <i className={`fas ${pingingServiceId === service.id ? 'fa-spinner fa-spin' : 'fa-network-wired'} mr-1`}></i>Ping
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenModal(FormMode.EDIT, service)}
                        className="px-2 py-1 text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] border border-[var(--color-primary-blue)] rounded hover:bg-blue-50 dark:hover:bg-blue-700/30"
                        aria-label={`Edit ${service.name}`}
                      >
                        <i className="fas fa-edit mr-1"></i>Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteService(service.id, service.name)}
                        className="px-2 py-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 border border-red-500 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-700/30"
                        aria-label={`Delete ${service.name}`}
                      >
                        <i className="fas fa-trash-alt"></i>
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
        title={formMode === FormMode.EDIT ? "Edit Service" : "Add New Service"} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        size="xl" 
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-md shadow-sm 
                         bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] 
                         text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] 
                         border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] 
                         hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit" 
              form="service-form-id" 
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] disabled:opacity-70 flex items-center"
            >
              {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : null}
              {isSubmitting ? 'Saving...' : (formMode === FormMode.EDIT ? 'Save Changes' : 'Add Service')}
            </button>
          </>
        }
      >
        <ServiceForm 
            mode={formMode} 
            initialData={editingService} 
            serviceGroups={serviceGroups}
            onSave={handleSaveService} 
            onCancel={handleCloseModal} 
            isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default ManageServicesPage;
