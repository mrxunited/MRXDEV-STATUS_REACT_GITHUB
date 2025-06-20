import React, { useState, useEffect, useRef } from 'react';
import { SystemService } from '../../types';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';
import { createGuestIncidentReport } from '../../services/appwrite';
import { useNotification } from '../../contexts/NotificationContext';

interface GuestReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: SystemService[];
  onSubmitSuccess: () => void;
}

const GuestReportFormModal: React.FC<GuestReportFormModalProps> = ({ isOpen, onClose, services, onSubmitSuccess }) => {
  const [serviceId, setServiceId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { addNotification } = useNotification();
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timerId = setTimeout(() => {
        descriptionRef.current?.focus();
      }, 100); 
      return () => clearTimeout(timerId);
    }
  }, [isOpen]);

  const resetForm = () => {
    setServiceId('');
    setDescription('');
    setEmail('');
    setFormError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!serviceId) {
      setFormError('Please select the affected service.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please describe the issue.');
      descriptionRef.current?.focus();
      return;
    }
    if (description.trim().length < 10) {
      setFormError('Please provide a more detailed description (at least 10 characters).');
      descriptionRef.current?.focus();
      return;
    }
     if (description.trim().length > 2000) {
      setFormError('Description is too long (max 2000 characters).');
      descriptionRef.current?.focus();
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormError('Please enter a valid email address or leave it blank.');
        return;
    }


    setIsSubmitting(true);
    try {
      await createGuestIncidentReport({
        serviceId,
        description: description.trim(),
        email: email.trim() || undefined, 
      });
      onSubmitSuccess(); 
      resetForm();
    } catch (error) {
      console.error('Failed to submit guest report:', error);
      const errorMsg = (error as Error).message || 'Could not submit your report. Please try again later.';
      setFormError(errorMsg);
      addNotification({type: 'error', title: 'Submission Failed', message: errorMsg});
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";


  return (
    <Modal
      title="Report an Issue"
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      preventModalFocus={true} // Prevent Modal from self-focusing
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
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
            form="guest-report-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-500 border border-transparent rounded-md shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-70 flex items-center"
          >
            {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2" /> : null}
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} id="guest-report-form" className="space-y-4">
        {formError && <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
        
        <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
          Experiencing an issue not listed on our status page? Please let us know.
        </p>

        <div>
          <label htmlFor="guest-report-service" className={labelClass}>
            Which service is affected? <span className="text-red-500">*</span>
          </label>
          <select
            id="guest-report-service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            required
            disabled={isSubmitting}
          >
            <option value="" disabled>Select a service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
             <option value="other">Other / Not Sure</option>
          </select>
        </div>

        <div>
          <label htmlFor="guest-report-description" className={labelClass}>
            Describe the issue <span className="text-red-500">*</span>
          </label>
          <textarea
            id="guest-report-description"
            ref={descriptionRef}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            placeholder="Please provide as much detail as possible, e.g., what you were doing, what happened, any error messages."
            required
            disabled={isSubmitting}
          />
           <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Min 10 characters, max 2000.</p>
        </div>

        <div>
          <label htmlFor="guest-report-email" className={labelClass}>
            Your Email (Optional)
          </label>
          <input
            type="email"
            id="guest-report-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            placeholder="your.email@example.com"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            We'll only use this to contact you if we need more details about your report.
          </p>
        </div>
         <p className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
            Your User Agent ({navigator.userAgent.substring(0,50)}...) will be submitted with this report to help us diagnose the issue. 
            We respect your privacy.
        </p>
      </form>
    </Modal>
  );
};

export default GuestReportFormModal;