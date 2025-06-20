
import React, { useEffect, useState } from 'react';
import { Notification, NotificationType } from '../../contexts/NotificationContext';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const DEFAULT_DURATION = 5000; // 5 seconds

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
  const { id, type, title, message, duration, persistent } = notification;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mount animation
    setIsVisible(true);

    // Auto-dismiss logic
    if (!persistent) {
      const dismissTimer = setTimeout(() => {
        handleDismiss();
      }, duration || DEFAULT_DURATION);
      return () => clearTimeout(dismissTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, persistent, duration]); // Rerun if these change, though id should be constant

  const handleDismiss = () => {
    setIsVisible(false);
    // Wait for fade-out animation before removing from DOM
    setTimeout(() => onDismiss(id), 300); // Corresponds to animation duration
  };

  const getIcon = (notificationType: NotificationType): string => {
    switch (notificationType) {
      case 'success': return 'fa-check-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-times-circle';
      case 'info': return 'fa-info-circle';
      default: return 'fa-bell';
    }
  };

  const getThemeClasses = (notificationType: NotificationType): string => {
    switch (notificationType) {
      case 'success':
        return 'bg-green-50 border-green-400 dark:bg-green-900/50 dark:border-green-600 text-green-700 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-400 dark:bg-yellow-800/50 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-400 dark:bg-red-900/50 dark:border-red-600 text-red-700 dark:text-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-400 dark:bg-blue-900/50 dark:border-blue-600 text-blue-700 dark:text-blue-200';
      default:
        return 'bg-gray-50 border-gray-400 dark:bg-gray-700 dark:border-gray-500 text-gray-700 dark:text-gray-200';
    }
  };

  const iconColor = (notificationType: NotificationType): string => {
     switch (notificationType) {
      case 'success': return 'text-green-500 dark:text-green-400';
      case 'warning': return 'text-yellow-500 dark:text-yellow-400';
      case 'error': return 'text-red-500 dark:text-red-400';
      case 'info': return 'text-blue-500 dark:text-blue-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`
        w-full max-w-sm rounded-lg shadow-xl border-l-4 p-4
        transform transition-all duration-300 ease-in-out
        ${getThemeClasses(type)}
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}
      `}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 text-xl ${iconColor(type)}`}>
          <i className={`fas ${getIcon(type)}`}></i>
        </div>
        <div className="ml-3 flex-1 pt-0.5">
          {title && <p className="text-sm font-semibold">{title}</p>}
          <p className="text-sm">{message}</p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={handleDismiss}
            className={`
              inline-flex rounded-md p-1.5 
              focus:outline-none focus:ring-2 focus:ring-offset-2 
              ${type === 'success' ? 'hover:bg-green-100 dark:hover:bg-green-800 focus:ring-green-600 dark:focus:ring-green-500 focus:ring-offset-green-50 dark:focus:ring-offset-green-900' : ''}
              ${type === 'warning' ? 'hover:bg-yellow-100 dark:hover:bg-yellow-700 focus:ring-yellow-600 dark:focus:ring-yellow-500 focus:ring-offset-yellow-50 dark:focus:ring-offset-yellow-800' : ''}
              ${type === 'error' ? 'hover:bg-red-100 dark:hover:bg-red-800 focus:ring-red-600 dark:focus:ring-red-500 focus:ring-offset-red-50 dark:focus:ring-offset-red-900' : ''}
              ${type === 'info' ? 'hover:bg-blue-100 dark:hover:bg-blue-800 focus:ring-blue-600 dark:focus:ring-blue-500 focus:ring-offset-blue-50 dark:focus:ring-offset-blue-900' : ''}
            `}
            aria-label="Dismiss notification"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
