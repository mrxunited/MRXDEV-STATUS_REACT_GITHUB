
import React, { useState, useEffect } from 'react';
import { DecisionFlow, DecisionFlowStep, FormMode, IncidentType, SeverityLevel, DecisionFlowAttachment, DecisionFlowLink } from '../../../types';
import { ID } from 'appwrite';

interface DecisionFlowFormProps {
  mode: FormMode;
  initialData?: DecisionFlow | null;
  onSave: (flowData: DecisionFlow | Omit<DecisionFlow, 'id' | '$id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isSubmitting: boolean;
}

const DecisionFlowForm: React.FC<DecisionFlowFormProps> = ({ mode, initialData, onSave, isSubmitting }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<DecisionFlowStep[]>([]);
  
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === FormMode.EDIT && initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setSteps(initialData.steps ? initialData.steps.map((s, i) => ({...s, displayOrder: i})) : []);
    } else {
      setName('');
      setDescription('');
      setSteps([{ id: ID.unique(), title: '', description: '', displayOrder: 0, required: true, attachments: [], links: [] }]);
    }
  }, [mode, initialData]);

  const handleStepChange = (index: number, field: keyof DecisionFlowStep, value: any) => {
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = value;
    setSteps(newSteps);
  };
  
  const handleAttachmentChange = (stepIndex: number, attachmentIndex: number, field: keyof DecisionFlowAttachment, value: string) => {
    const newSteps = [...steps];
    if (newSteps[stepIndex] && newSteps[stepIndex].attachments) {
      (newSteps[stepIndex].attachments![attachmentIndex] as any)[field] = value;
      setSteps(newSteps);
    }
  };
  
  const addAttachment = (stepIndex: number) => {
    const newSteps = [...steps];
    if (!newSteps[stepIndex].attachments) newSteps[stepIndex].attachments = [];
    newSteps[stepIndex].attachments!.push({ id: ID.unique(), name: '', url: '' });
    setSteps(newSteps);
  };

  const removeAttachment = (stepIndex: number, attachmentIndex: number) => {
    const newSteps = [...steps];
    if (newSteps[stepIndex] && newSteps[stepIndex].attachments) {
      newSteps[stepIndex].attachments!.splice(attachmentIndex, 1);
      setSteps(newSteps);
    }
  };
  
  const handleLinkChange = (stepIndex: number, linkIndex: number, field: keyof DecisionFlowLink, value: string) => {
    const newSteps = [...steps];
    if (newSteps[stepIndex] && newSteps[stepIndex].links) {
      (newSteps[stepIndex].links![linkIndex] as any)[field] = value;
      setSteps(newSteps);
    }
  };

  const addLink = (stepIndex: number) => {
    const newSteps = [...steps];
    if (!newSteps[stepIndex].links) newSteps[stepIndex].links = [];
    newSteps[stepIndex].links!.push({ id: ID.unique(), label: '', url: '' });
    setSteps(newSteps);
  };

  const removeLink = (stepIndex: number, linkIndex: number) => {
    const newSteps = [...steps];
    if (newSteps[stepIndex] && newSteps[stepIndex].links) {
      newSteps[stepIndex].links!.splice(linkIndex, 1);
      setSteps(newSteps);
    }
  };


  const addStep = () => {
    setSteps([...steps, { id: ID.unique(), title: '', description: '', displayOrder: steps.length, required: true, attachments: [], links: [] }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
        setFormError("A decision flow must have at least one step.");
        return;
    }
    setFormError(null);
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps.map((step, idx) => ({ ...step, displayOrder: idx })));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === steps.length - 1)) {
        return;
    }
    const newSteps = [...steps];
    const stepToMove = newSteps[index];
    newSteps.splice(index, 1);
    newSteps.splice(direction === 'up' ? index - 1 : index + 1, 0, stepToMove);
    setSteps(newSteps.map((s, i) => ({ ...s, displayOrder: i })));
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError('Flow name is required.');
      return;
    }
    if (steps.some(step => !step.title.trim())) {
        setFormError('All steps must have a title.');
        return;
    }
    if (steps.some(step => step.attachments?.some(att => !att.name.trim() || !att.url.trim()))) {
        setFormError('All attachments must have a name and a URL.');
        return;
    }
    if (steps.some(step => step.links?.some(link => !link.label.trim() || !link.url.trim()))) {
        setFormError('All links must have a label and a URL.');
        return;
    }

    const flowData = {
      name: name.trim(),
      description: description.trim(),
      steps: steps.map((step, index) => ({ ...step, displayOrder: index })),
    };

    if (mode === FormMode.EDIT && initialData) {
      await onSave({ ...initialData, ...flowData });
    } else {
      await onSave(flowData as Omit<DecisionFlow, 'id' | '$id' | 'createdAt' | 'updatedAt'>);
    }
  };

  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";
  const smallLabelClass = "block text-xs font-medium text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-0.5";

  return (
    <form onSubmit={handleSubmit} id="decision-flow-form-id" className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {formError && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
      
      <div>
        <label htmlFor="flow-name" className={labelClass}>Flow Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="flow-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          required
          disabled={isSubmitting}
          maxLength={100}
        />
      </div>

      <div>
        <label htmlFor="flow-description" className={labelClass}>Description</label>
        <textarea
          id="flow-description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Optional: Describe the purpose of this flow."
          disabled={isSubmitting}
          maxLength={500}
        />
      </div>

      <div className="space-y-3 pt-3 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
        <h4 className="text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Steps</h4>
        {steps.map((step, index) => (
          <div key={step.id} className="p-4 border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] rounded-md space-y-3 bg-gray-50 dark:bg-slate-800/50 relative">
            <div className="flex justify-between items-center">
                <p className={`${smallLabelClass} font-semibold`}>Step {index + 1}</p>
                <div className="flex items-center space-x-1">
                    <button type="button" onClick={() => moveStep(index, 'up')} disabled={isSubmitting || index === 0} className="p-1 text-xs hover:bg-gray-200 dark:hover:bg-slate-700 rounded disabled:opacity-50" title="Move Up"><i className="fas fa-arrow-up"></i></button>
                    <button type="button" onClick={() => moveStep(index, 'down')} disabled={isSubmitting || index === steps.length - 1} className="p-1 text-xs hover:bg-gray-200 dark:hover:bg-slate-700 rounded disabled:opacity-50" title="Move Down"><i className="fas fa-arrow-down"></i></button>
                    <button type="button" onClick={() => removeStep(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1 text-xs hover:bg-red-100 dark:hover:bg-red-700/30 rounded" disabled={isSubmitting || steps.length <= 1} title="Remove Step"><i className="fas fa-times"></i></button>
                </div>
            </div>
            
            <div>
                <label htmlFor={`step-title-${step.id}`} className={smallLabelClass}>Title <span className="text-red-500">*</span></label>
                <input type="text" id={`step-title-${step.id}`} value={step.title} onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} py-1.5 text-sm`} required disabled={isSubmitting} placeholder="Action to perform"/>
            </div>
            <div>
                <label htmlFor={`step-description-${step.id}`} className={smallLabelClass}>Description/Instructions</label>
                <textarea id={`step-description-${step.id}`} rows={2} value={step.description || ''} onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} py-1.5 text-sm`} disabled={isSubmitting} placeholder="Detailed instructions for this step (optional)"/>
            </div>

            {/* Attachments */}
            <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-slate-700">
                <label className={smallLabelClass}>Attachments</label>
                {step.attachments?.map((att, attIndex) => (
                    <div key={att.id} className="flex items-center space-x-2 text-xs">
                        <input type="text" value={att.name} onChange={(e) => handleAttachmentChange(index, attIndex, 'name', e.target.value)} placeholder="Attachment Name" className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} py-1 flex-1`} disabled={isSubmitting} />
                        <input type="url" value={att.url} onChange={(e) => handleAttachmentChange(index, attIndex, 'url', e.target.value)} placeholder="Attachment URL" className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} py-1 flex-1`} disabled={isSubmitting} />
                        <button type="button" onClick={() => removeAttachment(index, attIndex)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 dark:hover:bg-red-700/30" disabled={isSubmitting}><i className="fas fa-minus-circle"></i></button>
                    </div>
                ))}
                <button type="button" onClick={() => addAttachment(index)} className="text-xs text-green-600 hover:underline disabled:opacity-50" disabled={isSubmitting}><i className="fas fa-plus-circle mr-1"></i>Add Attachment</button>
            </div>

            {/* Links */}
            <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-slate-700">
                <label className={smallLabelClass}>Helpful Links</label>
                {step.links?.map((link, linkIndex) => (
                    <div key={link.id} className="flex items-center space-x-2 text-xs">
                        <input type="text" value={link.label} onChange={(e) => handleLinkChange(index, linkIndex, 'label', e.target.value)} placeholder="Link Label" className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} py-1 flex-1`} disabled={isSubmitting} />
                        <input type="url" value={link.url} onChange={(e) => handleLinkChange(index, linkIndex, 'url', e.target.value)} placeholder="Link URL" className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} py-1 flex-1`} disabled={isSubmitting} />
                        <button type="button" onClick={() => removeLink(index, linkIndex)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 dark:hover:bg-red-700/30" disabled={isSubmitting}><i className="fas fa-minus-circle"></i></button>
                    </div>
                ))}
                <button type="button" onClick={() => addLink(index)} className="text-xs text-green-600 hover:underline disabled:opacity-50" disabled={isSubmitting}><i className="fas fa-plus-circle mr-1"></i>Add Link</button>
            </div>


             <div className="flex items-center pt-2 border-t border-gray-200 dark:border-slate-700">
                <input type="checkbox" id={`step-required-${step.id}`} checked={step.required !== undefined ? step.required : true} onChange={(e) => handleStepChange(index, 'required', e.target.checked)}
                    className="h-3.5 w-3.5 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700" disabled={isSubmitting}/>
                <label htmlFor={`step-required-${step.id}`} className={`ml-2 block text-xs ${labelClass}`}>Step is required</label>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addStep}
          className="mt-2 px-3 py-1.5 text-xs font-medium text-[var(--color-primary-blue)] border border-[var(--color-primary-blue)] rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/40 disabled:opacity-50"
          disabled={isSubmitting}
        >
          <i className="fas fa-plus mr-1"></i>Add Step
        </button>
      </div>
    </form>
  );
};

export default DecisionFlowForm;
