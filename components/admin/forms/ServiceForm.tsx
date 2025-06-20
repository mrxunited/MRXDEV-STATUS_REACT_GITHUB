
import React, { useState, useEffect } from 'react';
import { SystemService, SystemStatusLevel, FormMode, ServiceGroup, ServiceComponent } from '../../../types';
import { ID } from 'appwrite'; // For generating unique IDs for subcomponents

interface ServiceFormProps {
  mode: FormMode;
  initialData?: SystemService | null;
  serviceGroups: ServiceGroup[]; 
  onSave: (serviceData: SystemService | Omit<SystemService, 'id' | '$id' | 'lastCheckedAutomated' | 'lastPingResult' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void; 
  isSubmitting: boolean; 
}

const ServiceForm: React.FC<ServiceFormProps> = ({ mode, initialData, serviceGroups, onSave, isSubmitting }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  const [status, setStatus] = useState<SystemStatusLevel>(SystemStatusLevel.OPERATIONAL);
  const [isMonitoredPublicly, setIsMonitoredPublicly] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [groupId, setGroupId] = useState<string | undefined>(undefined);
  
  const [pingEnabled, setPingEnabled] = useState(false);
  const [pingUrl, setPingUrl] = useState('');
  const [pingIntervalMinutes, setPingIntervalMinutes] = useState<2 | 5 | 10 | 15>(5);
  const [pingAlertsMuted, setPingAlertsMuted] = useState(false);

  const [components, setComponents] = useState<ServiceComponent[]>([]);
  const [editingComponent, setEditingComponent] = useState<ServiceComponent | null>(null);
  const [showComponentForm, setShowComponentForm] = useState(false);
  
  const [formError, setFormError] = useState<string | null>(null);
 
  useEffect(() => {
    if (mode === FormMode.EDIT && initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setPublicDescription(initialData.publicDescription || '');
      setStatus(initialData.status);
      setIsMonitoredPublicly(initialData.isMonitoredPublicly);
      setDisplayOrder(initialData.displayOrder);
      setGroupId(initialData.groupId || undefined);
      setPingEnabled(initialData.pingEnabled || false);
      setPingUrl(initialData.pingUrl || '');
      setPingIntervalMinutes(initialData.pingIntervalMinutes || 5);
      setPingAlertsMuted(initialData.pingAlertsMuted || false);
      setComponents(initialData.components || []);
    } else {
      setName('');
      setDescription('');
      setPublicDescription('');
      setStatus(SystemStatusLevel.OPERATIONAL);
      setIsMonitoredPublicly(true);
      setPingUrl('');
      setGroupId(undefined);
      setPingEnabled(false);
      setPingIntervalMinutes(5);
      setPingAlertsMuted(false);
      setComponents([]);
      // Example: if you had access to all services for display order calculation
      // const maxOrder = allServices.length > 0 ? Math.max(...allServices.map(s => s.displayOrder)) : 0;
      // setDisplayOrder(maxOrder + 1);
      setDisplayOrder(0); // Default to 0 for new
    }
    setShowComponentForm(false);
    setEditingComponent(null);
  }, [mode, initialData]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Service name is required.');
      return;
    }
    if (displayOrder < 0) {
        setFormError('Display order must be a non-negative number.');
        return;
    }
    if (pingEnabled && !pingUrl.trim()) {
        setFormError('Ping URL is required when ping monitoring is enabled.');
        return;
    }
    if (pingUrl && !pingUrl.match(/^https?:\/\/.+/)) {
        setFormError('Ping URL must be a valid HTTP/HTTPS URL.');
        return;
    }

    const serviceData = {
      name: name.trim(),
      description: description.trim(),
      publicDescription: publicDescription.trim(),
      status,
      isMonitoredPublicly,
      displayOrder: Number(displayOrder),
      groupId: groupId === '' ? undefined : groupId,
      pingEnabled,
      pingUrl: pingEnabled && pingUrl.trim() !== '' ? pingUrl.trim() : undefined,
      pingIntervalMinutes,
      pingAlertsMuted,
      components, // Include components in the payload
    };

    if (mode === FormMode.EDIT && initialData) {
      await onSave({ ...initialData, ...serviceData });
    } else {
      await onSave(serviceData as Omit<SystemService, 'id' | '$id' | 'lastCheckedAutomated' | 'lastPingResult' | 'updatedAt'>);
    }
  };

  const handleAddComponent = () => {
    setFormError(null);
    setEditingComponent({ id: ID.unique(), name: '', status: SystemStatusLevel.OPERATIONAL, description: '' });
    setShowComponentForm(true);
  };

  const handleEditComponent = (componentToEdit: ServiceComponent) => {
    setFormError(null);
    setEditingComponent(componentToEdit);
    setShowComponentForm(true);
  };

  const handleSaveComponent = (componentData: ServiceComponent) => {
    if (!componentData.name.trim()) {
        setFormError("Component name cannot be empty.");
        return;
    }
    // Check for duplicate names if editing existing or adding new
    const duplicateName = components.some(c => c.name.toLowerCase() === componentData.name.toLowerCase() && c.id !== componentData.id);
    if (duplicateName) {
        setFormError(`A subcomponent with the name "${componentData.name}" already exists for this service.`);
        return;
    }
    setFormError(null);

    if (components.find(c => c.id === componentData.id)) { // Editing existing
      setComponents(components.map(c => c.id === componentData.id ? componentData : c));
    } else { // Adding new
      setComponents([...components, componentData]);
    }
    setShowComponentForm(false);
    setEditingComponent(null);
  };
  
  const handleDeleteComponent = (componentId: string) => {
    setComponents(components.filter(c => c.id !== componentId));
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";


  return (
    <form onSubmit={handleSubmit} id="service-form-id" className="space-y-4">
      {formError && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
      
      <div>
        <label htmlFor="service-name" className={labelClass}>Service Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="service-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="service-status" className={labelClass}>Current Status (Manual Override)</label>
            <select
            id="service-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as SystemStatusLevel)}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            disabled={isSubmitting}
            >
            {Object.values(SystemStatusLevel).map(level => (
                <option key={level} value={level}>{level}</option>
            ))}
            </select>
             <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This status can be overridden by subcomponent health or incidents.</p>
        </div>
        <div>
            <label htmlFor="service-group" className={labelClass}>Service Group</label>
            <select
                id="service-group"
                value={groupId || ''} 
                onChange={(e) => setGroupId(e.target.value || undefined)} 
                className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                disabled={isSubmitting}
            >
                <option value="">Ungrouped</option>
                {serviceGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                ))}
            </select>
        </div>
      </div>
      
      <div>
        <label htmlFor="service-public-desc" className={labelClass}>Public Description (for status page)</label>
        <textarea
          id="service-public-desc"
          rows={2}
          value={publicDescription}
          onChange={(e) => setPublicDescription(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Briefly describe the service for public users."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="service-internal-desc" className={labelClass}>Internal Description/Notes</label>
        <textarea
          id="service-internal-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Internal notes, not shown publicly."
          disabled={isSubmitting}
        />
      </div>

      {/* Subcomponents Section */}
      <div className="pt-4 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] space-y-3">
        <div className="flex justify-between items-center">
            <h4 className="text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Subcomponents</h4>
            {!showComponentForm && (
                <button type="button" onClick={handleAddComponent} className="text-sm text-[var(--color-primary-blue)] hover:underline disabled:opacity-50" disabled={isSubmitting}>
                    <i className="fas fa-plus mr-1"></i>Add Subcomponent
                </button>
            )}
        </div>
        {components.length > 0 && !showComponentForm && (
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {components.map(comp => (
                    <li key={comp.id} className="p-2.5 bg-gray-50 dark:bg-slate-800/60 rounded-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] flex justify-between items-start">
                        <div>
                            <p className="font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{comp.name} - <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                comp.status === SystemStatusLevel.OPERATIONAL ? 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300' :
                                comp.status === SystemStatusLevel.DEGRADED ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/40 dark:text-yellow-300' :
                                comp.status === SystemStatusLevel.PARTIAL_OUTAGE ? 'bg-orange-100 text-orange-700 dark:bg-orange-700/40 dark:text-orange-300' :
                                comp.status === SystemStatusLevel.MAJOR_OUTAGE ? 'bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300' :
                                comp.status === SystemStatusLevel.MAINTENANCE ? 'bg-blue-100 text-blue-700 dark:bg-blue-700/40 dark:text-blue-300' :
                                'bg-gray-200 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300'
                            }`}>{comp.status}</span></p>
                            {comp.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{comp.description}</p>}
                        </div>
                        <div className="space-x-2 flex-shrink-0 ml-2">
                            <button type="button" onClick={() => handleEditComponent(comp)} className="text-xs text-[var(--color-primary-blue)] hover:underline disabled:opacity-50" disabled={isSubmitting || showComponentForm}><i className="fas fa-edit"></i></button>
                            <button type="button" onClick={() => handleDeleteComponent(comp.id)} className="text-xs text-red-500 hover:underline disabled:opacity-50" disabled={isSubmitting || showComponentForm}><i className="fas fa-trash"></i></button>
                        </div>
                    </li>
                ))}
            </ul>
        )}
        {components.length === 0 && !showComponentForm && <p className="text-xs text-gray-400 dark:text-gray-500">No subcomponents added yet.</p>}

        {showComponentForm && editingComponent && (
            <ComponentEditorForm
                component={editingComponent}
                onSave={handleSaveComponent}
                onCancel={() => { setShowComponentForm(false); setEditingComponent(null); setFormError(null); }}
                isSubmitting={isSubmitting}
                existingComponentNames={components.filter(c => c.id !== editingComponent.id).map(c => c.name.toLowerCase())}
            />
        )}
      </div>


      <div className="pt-4 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] space-y-4">
        <h4 className="text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Ping Monitoring</h4>
        <div className="flex items-center">
            <input
            id="service-ping-enabled"
            type="checkbox"
            checked={pingEnabled}
            onChange={(e) => setPingEnabled(e.target.checked)}
            className="h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700"
            disabled={isSubmitting}
            />
            <label htmlFor="service-ping-enabled" className={`ml-2 block text-sm ${labelClass}`}>Enable Ping Monitoring</label>
        </div>

        {pingEnabled && (
          <>
            <div>
              <label htmlFor="service-ping-url" className={labelClass}>Ping URL <span className="text-red-500">*</span></label>
              <input
                type="url"
                id="service-ping-url"
                value={pingUrl}
                onChange={(e) => setPingUrl(e.target.value)}
                className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                placeholder="e.g., https://api.example.com/health"
                required={pingEnabled}
                disabled={isSubmitting || !pingEnabled}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="service-ping-interval" className={labelClass}>Ping Interval</label>
                    <select
                        id="service-ping-interval"
                        value={pingIntervalMinutes}
                        onChange={(e) => setPingIntervalMinutes(Number(e.target.value) as 2 | 5 | 10 | 15)}
                        className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                        disabled={isSubmitting || !pingEnabled}
                    >
                        <option value="2">2 minutes</option>
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="15">15 minutes</option>
                    </select>
                </div>
                <div className="flex items-end pb-2">
                    <div className="flex items-center">
                        <input
                        id="service-ping-alerts-muted"
                        type="checkbox"
                        checked={pingAlertsMuted}
                        onChange={(e) => setPingAlertsMuted(e.target.checked)}
                        className="h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700"
                        disabled={isSubmitting || !pingEnabled}
                        />
                        <label htmlFor="service-ping-alerts-muted" className={`ml-2 block text-sm ${labelClass}`}>Mute Ping Notifications</label>
                    </div>
                </div>
            </div>
          </>
        )}
      </div>


      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
        <div>
            <label htmlFor="service-display-order" className={labelClass}>Display Order (in group)</label>
            <input
            type="number"
            id="service-display-order"
            min="0"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            disabled={isSubmitting}
            />
        </div>
        <div className="flex items-end pb-2">
            <div className="flex items-center">
                <input
                id="service-is-public"
                type="checkbox"
                checked={isMonitoredPublicly}
                onChange={(e) => setIsMonitoredPublicly(e.target.checked)}
                className="h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700"
                disabled={isSubmitting}
                />
                <label htmlFor="service-is-public" className={`ml-2 block text-sm ${labelClass}`}>Show on public status page?</label>
            </div>
        </div>
      </div>
    </form>
  );
};

interface ComponentEditorFormProps {
    component: ServiceComponent;
    onSave: (component: ServiceComponent) => void;
    onCancel: () => void;
    isSubmitting: boolean;
    existingComponentNames: string[]; // Pass existing names for validation
}

const ComponentEditorForm: React.FC<ComponentEditorFormProps> = ({ component, onSave, onCancel, isSubmitting, existingComponentNames }) => {
    const [name, setName] = useState(component.name);
    const [status, setStatus] = useState<SystemStatusLevel>(component.status);
    const [description, setDescription] = useState(component.description || '');
    const [componentFormError, setComponentFormError] = useState<string|null>(null);
    
    const inputBaseClass = "w-full px-3 py-1.5 border rounded-md shadow-sm text-sm transition-colors";
    const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
    const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
    const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
    const labelClass = "block text-xs font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-0.5";


    const handleInnerSave = () => {
        setComponentFormError(null);
        const trimmedName = name.trim();
        if (!trimmedName) {
            setComponentFormError("Component name cannot be empty.");
            return;
        }
        if (existingComponentNames.includes(trimmedName.toLowerCase())) {
            setComponentFormError(`A subcomponent with the name "${trimmedName}" already exists.`);
            return;
        }
        onSave({ ...component, name: trimmedName, status, description: description.trim() });
    };

    return (
        <div className="p-3 my-2 space-y-3 border border-dashed border-[var(--color-primary-blue)] dark:border-[var(--color-primary-blue-hover)] rounded-md bg-blue-50/30 dark:bg-blue-900/20">
            <p className="text-sm font-medium text-[var(--color-primary-blue)]">{component.name ? 'Edit Subcomponent' : 'Add New Subcomponent'}</p>
            {componentFormError && <p className="text-xs text-red-600 dark:text-red-400">{componentFormError}</p>}
            <div>
                <label htmlFor={`comp-name-${component.id}`} className={labelClass}>Name <span className="text-red-500">*</span></label>
                <input id={`comp-name-${component.id}`} type="text" value={name} onChange={e => setName(e.target.value)} className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} required disabled={isSubmitting}/>
            </div>
            <div>
                <label htmlFor={`comp-status-${component.id}`} className={labelClass}>Status</label>
                <select id={`comp-status-${component.id}`} value={status} onChange={e => setStatus(e.target.value as SystemStatusLevel)} className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting}>
                    {Object.values(SystemStatusLevel).map(sVal => <option key={sVal} value={sVal}>{sVal}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor={`comp-desc-${component.id}`} className={labelClass}>Description (Optional)</label>
                <textarea id={`comp-desc-${component.id}`} rows={2} value={description} onChange={e => setDescription(e.target.value)} className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={isSubmitting}/>
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onCancel} className="px-3 py-1 text-xs rounded-md bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 disabled:opacity-50" disabled={isSubmitting}>Cancel</button>
                <button type="button" onClick={handleInnerSave} className="px-3 py-1 text-xs rounded-md bg-[var(--color-primary-blue)] text-white hover:bg-[var(--color-primary-blue-hover)] disabled:opacity-50" disabled={isSubmitting || !name.trim()}>Save Component</button>
            </div>
        </div>
    );
};


export default ServiceForm;
