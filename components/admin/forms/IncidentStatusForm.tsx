
import React, { useState, useEffect } from 'react';
import { IncidentStatusDefinition, FormMode } from '../../../types';

interface IncidentStatusFormProps {
  mode: FormMode;
  initialData?: IncidentStatusDefinition | null;
  onSave: (data: Omit<IncidentStatusDefinition, 'id' | '$id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isSubmitting: boolean;
}

const IncidentStatusForm: React.FC<IncidentStatusFormProps> = ({ mode, initialData, onSave, isSubmitting }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#2563EB'); // Default blue
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === FormMode.EDIT && initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setColor(initialData.color);
      setDisplayOrder(initialData.displayOrder);
      setIsEnabled(initialData.isEnabled);
      setIsDefault(initialData.isDefault);
    } else {
      setName('');
      setDescription('');
      setColor('#2563EB');
      setDisplayOrder(0);
      setIsEnabled(true);
      setIsDefault(false);
    }
  }, [mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Status name is required.');
      return;
    }
    if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) {
      setFormError('Color must be a valid hex code (e.g., #FF0000 or #F00).');
      return;
    }
    if (displayOrder < 0) {
      setFormError('Display order must be a non-negative number.');
      return;
    }

    const dataToSave = {
      name: name.trim(),
      description: description.trim(),
      color: color.trim(),
      displayOrder: Number(displayOrder),
      isEnabled,
      isDefault,
    };

    await onSave(dataToSave);
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";

  return (
    <form onSubmit={handleSubmit} id="incident-status-form-id" className="space-y-4">
      {formError && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
      
      <div>
        <label htmlFor="status-name" className={labelClass}>Status Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="status-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          required
          disabled={isSubmitting}
          maxLength={50}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="status-color" className={labelClass}>Color (Hex Code) <span className="text-red-500">*</span></label>
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    id="status-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} flex-grow`}
                    required
                    pattern="^#([0-9A-Fa-f]{3}){1,2}$"
                    title="Enter a valid hex color code, e.g., #RRGGBB or #RGB"
                    disabled={isSubmitting}
                    maxLength={7}
                />
                <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 p-0 border-none rounded-md cursor-pointer"
                    disabled={isSubmitting}
                    title="Pick a color"
                />
            </div>
        </div>
        <div>
            <label htmlFor="status-display-order" className={labelClass}>Display Order <span className="text-red-500">*</span></label>
            <input
            type="number"
            id="status-display-order"
            min="0"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10))}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            required
            disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Lower number means higher in list/priority.</p>
        </div>
      </div>

      <div>
        <label htmlFor="status-description" className={labelClass}>Description</label>
        <textarea
          id="status-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Optional: Describe what this status means or when it should be used."
          disabled={isSubmitting}
          maxLength={255}
        />
      </div>
      <div className="space-y-2 pt-2 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
        <div className="flex items-center">
            <input
                id="status-is-enabled"
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700"
                disabled={isSubmitting}
            />
            <label htmlFor="status-is-enabled" className={`ml-2 block text-sm ${labelClass}`}>Enable this status type?</label>
        </div>
        <div className="flex items-center">
            <input
                id="status-is-default"
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700"
                disabled={isSubmitting}
            />
            <label htmlFor="status-is-default" className={`ml-2 block text-sm ${labelClass}`}>Set as default status for new incidents?</label>
             <p className="ml-2 text-xs text-gray-400 dark:text-gray-500">(If multiple are default, the one with lowest display order might be chosen)</p>
        </div>
      </div>
    </form>
  );
};

export default IncidentStatusForm;
