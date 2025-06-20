

import React, { useState } from 'react';
import { Incident, IncidentLifecycleStatus } from '../../../types'; // Changed IncidentUpdateStatus to IncidentLifecycleStatus

interface IncidentUpdateFormProps {
  incident: Incident;
  onSave: (incidentId: string, updateData: { status: IncidentLifecycleStatus, message: string }) => Promise<void>; // Changed status type
  onCancel: () => void;
  isSubmitting: boolean;
}

const IncidentUpdateForm: React.FC<IncidentUpdateFormProps> = ({ incident, onSave, isSubmitting }) => {
  const [status, setStatus] = useState<IncidentLifecycleStatus>(incident.currentLifecycleStatus); // Changed status type
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!message.trim()) {
      setFormError('Update message cannot be empty.');
      return;
    }
    await onSave(incident.id, { status, message });
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";


  return (
    <form onSubmit={handleSubmit} id="incident-update-form-id" className="space-y-4">
      {formError && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
      
      <div>
        <label htmlFor="update-status" className={labelClass}>New Incident Lifecycle Status</label>
        <select
          id="update-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as IncidentLifecycleStatus)} // Changed status type
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          disabled={isSubmitting}
        >
          {Object.values(IncidentLifecycleStatus).filter(s => s !== IncidentLifecycleStatus.UPDATE).map(sVal => ( // Exclude generic 'Update' as a lifecycle state
            <option key={sVal} value={sVal}>{sVal}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="update-message" className={labelClass}>Update Message <span className="text-red-500">*</span></label>
        <textarea
          id="update-message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Provide details about this update..."
          required
          disabled={isSubmitting}
        />
      </div>
    </form>
  );
};

export default IncidentUpdateForm;
