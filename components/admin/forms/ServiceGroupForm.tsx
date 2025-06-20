
import React, { useState, useEffect } from 'react';
import { ServiceGroup, FormMode } from '../../../types';

interface ServiceGroupFormProps {
  mode: FormMode;
  initialData?: ServiceGroup | null;
  onSave: (groupData: ServiceGroup | Omit<ServiceGroup, 'id' | '$id'>) => Promise<void>;
  isSubmitting: boolean;
}

const ServiceGroupForm: React.FC<ServiceGroupFormProps> = ({ mode, initialData, onSave, isSubmitting }) => {
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === FormMode.EDIT && initialData) {
      setName(initialData.name);
      setDisplayOrder(initialData.displayOrder);
    } else {
      setName('');
      setDisplayOrder(0); // Default or calculate next based on existing groups if needed
    }
  }, [mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Group name is required.');
      return;
    }
    if (displayOrder < 0) {
      setFormError('Display order must be a non-negative number.');
      return;
    }

    const groupData = {
      name: name.trim(),
      displayOrder: Number(displayOrder),
    };

    if (mode === FormMode.EDIT && initialData) {
      await onSave({ ...initialData, ...groupData });
    } else {
      await onSave(groupData as Omit<ServiceGroup, 'id' | '$id'>);
    }
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";

  return (
    <form onSubmit={handleSubmit} id="service-group-form-id" className="space-y-4">
      {formError && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
      
      <div>
        <label htmlFor="group-name" className={labelClass}>Group Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="group-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="group-display-order" className={labelClass}>Display Order <span className="text-red-500">*</span></label>
        <input
          type="number"
          id="group-display-order"
          min="0"
          value={displayOrder}
          onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          required
          disabled={isSubmitting}
        />
      </div>
    </form>
  );
};

export default ServiceGroupForm;
