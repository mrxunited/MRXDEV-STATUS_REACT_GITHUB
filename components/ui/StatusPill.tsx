

import React from 'react';
import { SystemStatusLevel, ActivityStatus, ErrorSeverity, IncidentLifecycleStatus, IncidentImpact, IncidentType, GuestIncidentReportStatus, PIRStatus, PIRSeverityLevel } from '../../types';

type StatusType = SystemStatusLevel | ActivityStatus | ErrorSeverity | IncidentLifecycleStatus | IncidentImpact | IncidentType | GuestIncidentReportStatus | PIRStatus | PIRSeverityLevel;

interface StatusPillProps {
  status: StatusType;
  subtle?: boolean; 
  className?: string;
}

interface StatusStyle {
  pill: string; 
  icon?: string; 
  iconClass?: string; 
  text: string; 
}

const getStatusStyles = (status: StatusType, subtle?: boolean): StatusStyle => {
  const basePill = subtle 
    ? 'px-2 py-0.5 rounded text-xs font-medium' 
    : 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold';
  
  switch (status) {
    // SystemStatusLevel
    case SystemStatusLevel.OPERATIONAL:
      return { pill: `${basePill} bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300`, icon: 'fa-check-circle', iconClass: 'text-green-500 dark:text-green-400', text: 'Operational' };
    case SystemStatusLevel.DEGRADED:
      return { pill: `${basePill} bg-yellow-100 text-yellow-700 dark:bg-yellow-700/40 dark:text-yellow-300`, icon: 'fa-exclamation-triangle', iconClass: 'text-yellow-500 dark:text-yellow-400', text: 'Degraded' };
    case SystemStatusLevel.PARTIAL_OUTAGE:
        return { pill: `${basePill} bg-orange-100 text-orange-700 dark:bg-orange-700/40 dark:text-orange-300`, icon: 'fa-broadcast-tower', iconClass: 'text-orange-500 dark:text-orange-400', text: 'Partial Outage' };
    case SystemStatusLevel.MAJOR_OUTAGE:
      return { pill: `${basePill} bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300`, icon: 'fa-times-circle', iconClass: 'text-red-500 dark:text-red-400', text: 'Major Outage' };
    case SystemStatusLevel.MAINTENANCE:
      return { pill: `${basePill} bg-blue-100 text-blue-700 dark:bg-blue-700/40 dark:text-blue-300`, icon: 'fa-wrench', iconClass: 'text-blue-500 dark:text-blue-400', text: 'Maintenance' };
    case SystemStatusLevel.UNKNOWN:
       return { pill: `${basePill} bg-gray-200 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300`, icon: 'fa-question-circle', iconClass: 'text-gray-400 dark:text-gray-500', text: 'Unknown' };

    // ActivityStatus
    case ActivityStatus.SUCCESS:
      return { pill: `${basePill} bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300`, icon: 'fa-check-circle', iconClass: 'text-green-500 dark:text-green-400', text: 'Success' };
    case ActivityStatus.FAILURE:
      return { pill: `${basePill} bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300`, icon: 'fa-times-circle', iconClass: 'text-red-500 dark:text-red-400', text: 'Failure' };
    case ActivityStatus.PENDING:
      return { pill: `${basePill} bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300`, icon: 'fa-spinner fa-spin', iconClass: 'text-gray-500 dark:text-gray-400', text: 'Pending' };

    // ErrorSeverity
    case ErrorSeverity.CRITICAL:
      return { pill: `${basePill} bg-red-200 text-red-800 dark:bg-red-600/50 dark:text-red-200 font-bold`, icon: 'fa-skull-crossbones', iconClass: 'text-red-600 dark:text-red-300', text: 'Critical' };
    case ErrorSeverity.ERROR:
      return { pill: `${basePill} bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300`, icon: 'fa-bug', iconClass: 'text-red-500 dark:text-red-400', text: 'Error' };
    case ErrorSeverity.WARNING:
      return { pill: `${basePill} bg-yellow-100 text-yellow-700 dark:bg-yellow-700/40 dark:text-yellow-300`, icon: 'fa-exclamation-triangle', iconClass: 'text-yellow-500 dark:text-yellow-400', text: 'Warning' };
    case ErrorSeverity.INFO:
      return { pill: `${basePill} bg-sky-100 text-sky-700 dark:bg-sky-700/40 dark:text-sky-300`, icon: 'fa-info-circle', iconClass: 'text-sky-500 dark:text-sky-400', text: 'Info' };

    // IncidentLifecycleStatus (replaces previous IncidentUpdateStatus for main incident status display)
    case IncidentLifecycleStatus.DETECTED:
      return { pill: `${basePill} bg-pink-100 text-pink-800 dark:bg-pink-700/50 dark:text-pink-200`, icon: 'fa-bullseye', iconClass: 'text-pink-600 dark:text-pink-300', text: 'Detected' };
    case IncidentLifecycleStatus.ACKNOWLEDGED:
      return { pill: `${basePill} bg-purple-100 text-purple-800 dark:bg-purple-700/50 dark:text-purple-200`, icon: 'fa-check', iconClass: 'text-purple-600 dark:text-purple-300', text: 'Acknowledged' };
    case IncidentLifecycleStatus.INVESTIGATING:
      return { pill: `${basePill} bg-yellow-100 text-yellow-800 dark:bg-yellow-700/50 dark:text-yellow-200`, icon: 'fa-search', iconClass: 'text-yellow-600 dark:text-yellow-300', text: 'Investigating' };
    case IncidentLifecycleStatus.IDENTIFIED:
      return { pill: `${basePill} bg-amber-100 text-amber-800 dark:bg-amber-700/50 dark:text-amber-200`, icon: 'fa-lightbulb', iconClass: 'text-amber-600 dark:text-amber-300', text: 'Identified' };
    case IncidentLifecycleStatus.IN_PROGRESS:
      return { pill: `${basePill} bg-blue-100 text-blue-800 dark:bg-blue-700/50 dark:text-blue-200`, icon: 'fa-cogs', iconClass: 'text-blue-600 dark:text-blue-300', text: 'In Progress' };
    case IncidentLifecycleStatus.MONITORING:
      return { pill: `${basePill} bg-sky-100 text-sky-800 dark:bg-sky-700/50 dark:text-sky-200`, icon: 'fa-wave-square', iconClass: 'text-sky-600 dark:text-sky-300', text: 'Monitoring' };
    case IncidentLifecycleStatus.RESOLVED:
      return { pill: `${basePill} bg-green-100 text-green-800 dark:bg-green-700/50 dark:text-green-200`, icon: 'fa-check-double', iconClass: 'text-green-600 dark:text-green-300', text: 'Resolved' };
    case IncidentLifecycleStatus.COMPLETED:
      return { pill: `${basePill} bg-emerald-100 text-emerald-800 dark:bg-emerald-700/50 dark:text-emerald-200`, icon: 'fa-flag-checkered', iconClass: 'text-emerald-600 dark:text-emerald-300', text: 'Completed' };
    case IncidentLifecycleStatus.DISMISSED:
        return { pill: `${basePill} bg-gray-200 text-gray-700 dark:bg-gray-600/50 dark:text-gray-300`, icon: 'fa-times-circle', iconClass: 'text-gray-500 dark:text-gray-400', text: 'Dismissed' };
    case IncidentLifecycleStatus.SCHEDULED:
      return { pill: `${basePill} bg-indigo-100 text-indigo-800 dark:bg-indigo-700/50 dark:text-indigo-200`, icon: 'fa-calendar-alt', iconClass: 'text-indigo-600 dark:text-indigo-300', text: 'Scheduled' };
    case IncidentLifecycleStatus.UPDATE: // This is for message type, not a primary incident status pill typically.
      return { pill: `${basePill} bg-gray-100 text-gray-800 dark:bg-gray-700/60 dark:text-gray-200`, icon: 'fa-comment-dots', iconClass: 'text-gray-600 dark:text-gray-300', text: 'Update' };
    
    // IncidentImpact
    case IncidentImpact.CRITICAL: 
      return { pill: `${basePill} bg-red-600 text-white dark:bg-red-500 dark:text-white`, icon: 'fa-bomb', text: 'Critical Impact' };
    case IncidentImpact.SIGNIFICANT:
      return { pill: `${basePill} bg-orange-500 text-white dark:bg-orange-500 dark:text-white`, icon: 'fa-exclamation-circle', text: 'Significant Impact' };
    case IncidentImpact.MINOR:
      return { pill: `${basePill} bg-yellow-400 text-gray-800 dark:bg-yellow-500 dark:text-gray-900`, icon: 'fa-info-circle', text: 'Minor Impact' };
    case IncidentImpact.NONE: 
      return { pill: `${basePill} bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-100`, icon: 'fa-bell-slash', text: 'No Impact / Low Severity' };
      
    // IncidentType
    case IncidentType.INCIDENT:
      return { pill: `${basePill} bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300`, icon: 'fa-bolt', text: 'Incident'};
    case IncidentType.MAINTENANCE:
      return { pill: `${basePill} bg-blue-100 text-blue-700 dark:bg-blue-700/40 dark:text-blue-300`, icon: 'fa-tools', text: 'Maintenance'};
    case IncidentType.INFORMATION:
      return { pill: `${basePill} bg-sky-100 text-sky-700 dark:bg-sky-700/40 dark:text-sky-300`, icon: 'fa-bullhorn', text: 'Information'};

    // GuestIncidentReportStatus
    case GuestIncidentReportStatus.NEW:
      return { pill: `${basePill} bg-blue-100 text-blue-700 dark:bg-blue-700/40 dark:text-blue-300`, icon: 'fa-lightbulb', text: 'New' };
    case GuestIncidentReportStatus.REVIEWED:
      return { pill: `${basePill} bg-yellow-100 text-yellow-700 dark:bg-yellow-700/40 dark:text-yellow-300`, icon: 'fa-glasses', text: 'Reviewed' };
    case GuestIncidentReportStatus.ACKNOWLEDGED:
      return { pill: `${basePill} bg-indigo-100 text-indigo-700 dark:bg-indigo-700/40 dark:text-indigo-300`, icon: 'fa-thumbs-up', text: 'Acknowledged' };
    case GuestIncidentReportStatus.LINKED_TO_INCIDENT:
      return { pill: `${basePill} bg-purple-100 text-purple-700 dark:bg-purple-700/40 dark:text-purple-300`, icon: 'fa-link', text: 'Linked to Incident' };
    case GuestIncidentReportStatus.RESOLVED_VIA_OTHER_MEANS:
      return { pill: `${basePill} bg-green-100 text-green-700 dark:bg-green-700/40 dark:text-green-300`, icon: 'fa-check-circle', text: 'Resolved (Other)' };
    case GuestIncidentReportStatus.DISMISSED:
      return { pill: `${basePill} bg-gray-200 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300`, icon: 'fa-times-circle', text: 'Dismissed' };

    // PIRStatus
    case PIRStatus.PENDING:
      return { pill: `${basePill} bg-yellow-100 text-yellow-700 dark:bg-yellow-700/40 dark:text-yellow-300`, icon: 'fa-hourglass-half', text: 'Pending Review' };
    case PIRStatus.IN_PROGRESS:
      return { pill: `${basePill} bg-blue-100 text-blue-700 dark:bg-blue-700/40 dark:text-blue-300`, icon: 'fa-tasks', text: 'Review In Progress' };
    case PIRStatus.COMPLETED:
      return { pill: `${basePill} bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300`, icon: 'fa-check-square', text: 'Review Completed' };
      
    // PIRSeverityLevel
    case 'Low':
        return { pill: `${basePill} bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-100`, icon: 'fa-shield-alt', text: 'Low Severity' };
    case 'Medium':
        return { pill: `${basePill} bg-yellow-400 text-gray-800 dark:bg-yellow-500 dark:text-gray-900`, icon: 'fa-triangle-exclamation', text: 'Medium Severity' }; 
    case 'High':
        return { pill: `${basePill} bg-orange-500 text-white dark:bg-orange-500 dark:text-white`, icon: 'fa-radiation', text: 'High Severity' };
    case 'Critical': 
        return { pill: `${basePill} bg-red-600 text-white dark:bg-red-500 dark:text-white`, icon: 'fa-biohazard', text: 'Critical Severity' };


    default:
      const statusAsString = status as string;
      const defaultText = (typeof statusAsString === 'string' && statusAsString.length > 0 && statusAsString.length < 30) 
                          ? statusAsString.charAt(0).toUpperCase() + statusAsString.slice(1) 
                          : 'Unknown Status';
      return { pill: `${basePill} bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200`, icon: 'fa-question-circle', iconClass: 'text-gray-500 dark:text-gray-400', text: defaultText };
  }
};

const StatusPill: React.FC<StatusPillProps> = ({ status, subtle, className }) => {
  const styles = getStatusStyles(status, subtle);

  return (
    <span className={`${styles.pill} ${className || ''}`} title={styles.text}>
      {styles.icon && <i className={`fas ${styles.icon} ${subtle ? 'mr-1' : 'mr-1.5'} ${styles.iconClass}`}></i>}
      {styles.text}
    </span>
  );
};

export default StatusPill;
