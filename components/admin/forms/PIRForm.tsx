
import React from 'react';
import { IncidentReview, PIRStatus, PIRSeverityLevel } from '../../../types'; 

interface PIRFormProps {
  incidentId: string; 
  pirData: Partial<Omit<IncidentReview, 'id' | '$id' | 'incidentId' | 'createdAt' | 'updatedAt'>>; 
  onPIRChange: (fieldName: keyof Omit<IncidentReview, 'id' | '$id' | 'incidentId' | 'createdAt' | 'updatedAt'>, value: any) => void; 
  isSubmitting: boolean;
  currentUserName?: string; 
}

const PIRForm: React.FC<PIRFormProps> = ({ pirData, onPIRChange, isSubmitting, currentUserName }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | boolean | undefined | string[] = value;
    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'participants') {
      // For participants, store as an array of strings from comma-separated input
      processedValue = value.split(',').map(p => p.trim()).filter(p => p.length > 0);
    }
    onPIRChange(name as keyof Omit<IncidentReview, 'id' | '$id' | 'incidentId' | 'createdAt' | 'updatedAt'>, processedValue);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as PIRStatus;
    onPIRChange('status', newStatus); 
    if (newStatus === PIRStatus.COMPLETED) {
      if ((!pirData.participants || pirData.participants.length === 0) && currentUserName) {
        onPIRChange('participants', [currentUserName]);
      }
      if (!pirData.reviewedAt) {
        onPIRChange('reviewedAt', new Date().toISOString().substring(0,16)); 
      }
    }
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";

  return (
    <div className="space-y-4 py-2">
      <div>
        <label htmlFor="pirStatus" className={labelClass}>Review Status</label>
        <select
          id="pirStatus"
          name="status" 
          value={pirData.status || PIRStatus.PENDING}
          onChange={handleStatusChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          disabled={isSubmitting}
        >
          {Object.values(PIRStatus).map(statusValue => (
            <option key={statusValue} value={statusValue}>{statusValue}</option>
          ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="incidentSummaryText" className={labelClass}>Incident Summary</label>
        <textarea
          id="incidentSummaryText"
          name="incidentSummaryText"
          rows={3}
          value={pirData.incidentSummaryText || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Brief overview of the incident."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="rootCauseSummary" className={labelClass}>Root Cause Analysis</label>
        <textarea
          id="rootCauseSummary"
          name="rootCauseSummary" 
          rows={3}
          value={pirData.rootCauseSummary || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Detailed analysis of the root cause(s)."
          disabled={isSubmitting}
        />
      </div>
      
      <div>
        <label htmlFor="whatWentWell" className={labelClass}>What Went Well?</label>
        <textarea
          id="whatWentWell"
          name="whatWentWell"
          rows={3}
          value={pirData.whatWentWell || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Aspects of the incident response that were handled effectively."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="whatWentWrong" className={labelClass}>What Went Wrong?</label>
        <textarea
          id="whatWentWrong"
          name="whatWentWrong"
          rows={3}
          value={pirData.whatWentWrong || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Areas where the response could have been improved."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="actionItems" className={labelClass}>Action Items / Next Steps</label>
        <textarea
          id="actionItems"
          name="actionItems"
          rows={4}
          value={pirData.actionItems || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Specific, measurable, assignable, realistic, and time-bound (SMART) actions. E.g., '- [ ] Task Owner: Update documentation by YYYY-MM-DD.'"
          disabled={isSubmitting}
        />
      </div>
      
      <div>
        <label htmlFor="timelineOfEvents" className={labelClass}>Timeline of Key Events</label>
        <textarea
          id="timelineOfEvents"
          name="timelineOfEvents" 
          rows={4}
          value={pirData.timelineOfEvents || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="e.g., 10:00 AM - First alert received..."
          disabled={isSubmitting}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="severityLevel" className={labelClass}>Incident Severity Level (PIR Assessment)</label>
            <select
            id="severityLevel"
            name="severityLevel" 
            value={pirData.severityLevel || ''}
            onChange={handleInputChange}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            disabled={isSubmitting}
            >
            <option value="" disabled>Select severity</option>
            {(['Low', 'Medium', 'High', 'Critical'] as PIRSeverityLevel[]).map(level => (
                <option key={level} value={level}>{level}</option>
            ))}
            </select>
        </div>
         <div className="flex items-center mt-4">
            <input
              id="isPreventable"
              name="isPreventable" 
              type="checkbox"
              checked={pirData.isPreventable || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-[var(--color-primary-blue)] border-gray-300 dark:border-gray-600 rounded focus:ring-[var(--color-primary-blue)] bg-gray-100 dark:bg-gray-700"
              disabled={isSubmitting}
            />
            <label htmlFor="isPreventable" className={`ml-2 block text-sm ${labelClass}`}>Was this incident preventable?</label>
        </div>
      </div>
      
      {pirData.isPreventable && (
         <div>
            <label htmlFor="preventableReasoning" className={labelClass}>Reasoning for Preventability</label>
            <textarea
            id="preventableReasoning"
            name="preventableReasoning" 
            rows={2}
            value={pirData.preventableReasoning || ''}
            onChange={handleInputChange}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            placeholder="Explain why it was or was not preventable."
            disabled={isSubmitting}
            />
        </div>
      )}

      <div>
        <label htmlFor="impactedSystemsText" className={labelClass}>Detailed Systems/Services Impacted</label>
        <textarea
          id="impactedSystemsText"
          name="impactedSystemsText" 
          rows={2}
          value={pirData.impactedSystemsText || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="List specific components or user-facing impacts."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="communicationSent" className={labelClass}>Communication Sent</label>
        <textarea
          id="communicationSent"
          name="communicationSent" 
          rows={2}
          value={pirData.communicationSent || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="e.g., Email to users, Twitter update, Internal Slack."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="resolutionSteps" className={labelClass}>Resolution Steps Taken</label>
        <textarea
          id="resolutionSteps"
          name="resolutionSteps" 
          rows={4}
          value={pirData.resolutionSteps || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Detail the steps taken to resolve the incident."
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="followUpActions" className={labelClass}>Follow-up Actions (Formerly Preventive)</label>
        <textarea
          id="followUpActions"
          name="followUpActions" 
          rows={3}
          value={pirData.followUpActions || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="What actions will be taken to prevent recurrence or improve future response?"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="lessonsLearned" className={labelClass}>Lessons Learned</label>
        <textarea
          id="lessonsLearned"
          name="lessonsLearned" 
          rows={3}
          value={pirData.lessonsLearned || ''}
          onChange={handleInputChange}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Key takeaways from this incident."
          disabled={isSubmitting}
        />
      </div>
      
      {(pirData.status === PIRStatus.COMPLETED || pirData.status === PIRStatus.IN_PROGRESS) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
            <div>
                <label htmlFor="participants" className={labelClass}>Participants</label>
                <input
                    type="text"
                    id="participants"
                    name="participants" // Field name in IncidentReview
                    value={Array.isArray(pirData.participants) ? pirData.participants.join(', ') : (pirData.participants || '')}
                    onChange={handleInputChange}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                    placeholder="Comma-separated names or user IDs"
                    disabled={isSubmitting}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Enter names or user IDs, separated by commas.</p>
            </div>
            <div>
                <label htmlFor="reviewedAt" className={labelClass}>Date Reviewed (De-Brief Date)</label>
                 <input
                    type="datetime-local"
                    id="reviewedAt"
                    name="reviewedAt"
                    value={pirData.reviewedAt ? pirData.reviewedAt.substring(0,16) : ''}
                    onChange={handleInputChange}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
                    disabled={isSubmitting}
                />
            </div>
        </div>
      )}

    </div>
  );
};

export default PIRForm;
