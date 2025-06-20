
import React, { useState, useEffect } from 'react';
import { SeverityLevel, FormMode } from '../../../types';

interface SeverityLevelFormProps {
  mode: FormMode;
  initialData?: SeverityLevel | null;
  onSave: (data: Omit<SeverityLevel, 'id' | '$id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isSubmitting: boolean;
}

const SeverityLevelForm: React.FC<SeverityLevelFormProps> = ({ mode, initialData, onSave, isSubmitting }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#CCCCCC'); // Default color
  const [priority, setPriority] = useState(0);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === FormMode.EDIT && initialData) {
      setName(initialData.name);
      setColor(initialData.color);
      setPriority(initialData.priority);
      setDescription(initialData.description || '');
    } else {
      setName('');
      setColor('#CCCCCC');
      setPriority(0);
      setDescription('');
    }
  }, [mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Severity level name is required.');
      return;
    }
    if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) {
      setFormError('Color must be a valid hex code (e.g., #FF0000 or #F00).');
      return;
    }
    if (priority < 0) {
      setFormError('Priority must be a non-negative number.');
      return;
    }

    const dataToSave = {
      name: name.trim(),
      color: color.trim(),
      priority: Number(priority),
      description: description.trim(),
    };

    await onSave(dataToSave);
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";

  return (
    <form onSubmit={handleSubmit} id="severity-level-form-id" className="space-y-4">
      {formError && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
      
      <div>
        <label htmlFor="severity-name" className={labelClass}>Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="severity-name"
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
            <label htmlFor="severity-color" className={labelClass}>Color (Hex Code) <span className="text-red-500">*</span></label>
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    id="severity-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} flex-grow`}
                    required
                    pattern="^#([0-9A-Fa-f]{3}){1,2}$"
                    title="Enter a valid hex color code, e.g., #RRGGBB or #RGB"
                    disabled={isSubmitting}
                    maxLength={7}
                />
                <div className="w-8 h-8 rounded-md border border-gray-300 dark:border-gray-600 flex-shrink-0" style={{ backgroundColor: /^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : 'transparent' }}></div>
            </div>
        </div>
        <div>
            <label htmlFor="severity-priority" className={labelClass}>Priority <span className="text-red-500">*</span></label>
            <input
            type="number"
            id="severity-priority"
            min="0"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value, 10))}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            required
            disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Lower number means higher priority (e.g., 1 is highest).</p>
        </div>
      </div>

      <div>
        <label htmlFor="severity-description" className={labelClass}>Description</label>
        <textarea
          id="severity-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Optional: Describe when this severity level should be used."
          disabled={isSubmitting}
          maxLength={255}
        />
      </div>
    </form>
  );
};

export default SeverityLevelForm;
