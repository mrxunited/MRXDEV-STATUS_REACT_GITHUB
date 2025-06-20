
import React from 'react';
import { PingResult, PingStatus } from '../../types';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

interface PingStatusIndicatorProps {
  pingResult?: PingResult;
  size?: 'sm' | 'md';
}

const PingStatusIndicator: React.FC<PingStatusIndicatorProps> = ({ pingResult, size = 'md' }) => {
  if (!pingResult) {
    return <span className={`text-xs ${size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300`}>
             <i className="fas fa-question-circle mr-1"></i> No Data
           </span>;
  }

  const { status, statusCode, responseTimeMs, checkedAt, error } = pingResult;

  let iconClass = 'fas fa-question-circle';
  let colorClasses = 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  let displayedText: string;

  switch (status) {
    case PingStatus.PINGING:
      iconClass = 'fas fa-spinner fa-spin';
      colorClasses = 'bg-blue-100 text-blue-700 dark:bg-blue-700/40 dark:text-blue-300';
      displayedText = 'Pinging...';
      break;
    case PingStatus.ONLINE:
      iconClass = 'fas fa-check-circle';
      colorClasses = 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300';
      displayedText = PingStatus.ONLINE;
      break;
    case PingStatus.SLOW:
      iconClass = 'fas fa-clock';
      colorClasses = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/40 dark:text-yellow-300';
      displayedText = PingStatus.SLOW;
      break;
    case PingStatus.OFFLINE:
      iconClass = 'fas fa-times-circle';
      colorClasses = 'bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300';
      displayedText = PingStatus.OFFLINE;
      break;
    case PingStatus.TIMEOUT:
      iconClass = 'fas fa-times-circle';
      colorClasses = 'bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300';
      displayedText = PingStatus.TIMEOUT;
      break;
    case PingStatus.ERROR:
      iconClass = 'fas fa-times-circle';
      colorClasses = 'bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300';
      displayedText = PingStatus.ERROR;
      break;
    case PingStatus.UNKNOWN:
    default:
       iconClass = 'fas fa-question-circle';
       colorClasses = 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
       displayedText = PingStatus.UNKNOWN;
       break;
  }
  
  const formattedCheckedAt = formatDistanceToNowStrict(parseISO(checkedAt), { addSuffix: true });

  const tooltipContent = `
    Status: ${status}
    ${statusCode ? `\nCode: ${statusCode}` : ''}
    ${responseTimeMs !== undefined ? `\nTime: ${responseTimeMs}ms` : ''}
    ${error ? `\nError: ${error}` : ''}
    \nChecked: ${formattedCheckedAt}
  `.trim().replace(/\n +/g, '\n');


  return (
    <span 
      className={`inline-flex items-center text-xs font-medium rounded-full ${size === 'sm' ? 'px-1.5 py-0.5' : 'px-2.5 py-1'} ${colorClasses}`}
      title={tooltipContent}
    >
      <i className={`${iconClass} ${size === 'sm' ? 'mr-0.5' : 'mr-1.5'}`}></i>
      {displayedText}
      {status === PingStatus.ONLINE && responseTimeMs !== undefined && size === 'md' && (
        <span className="ml-1.5 text-xs opacity-80">({responseTimeMs}ms)</span>
      )}
       {status === PingStatus.SLOW && responseTimeMs !== undefined && size === 'md' && (
        <span className="ml-1.5 text-xs opacity-80">({responseTimeMs}ms)</span>
      )}
    </span>
  );
};

export default PingStatusIndicator;
