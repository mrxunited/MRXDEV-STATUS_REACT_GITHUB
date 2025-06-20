
import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import NotificationToast from './NotificationToast';

const MAX_VISIBLE_TOASTS = 4;

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  // Only render the most recent N notifications
  const visibleNotifications = notifications.slice(0, MAX_VISIBLE_TOASTS);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="fixed top-20 right-4 z-[1000] w-full max-w-sm space-y-3 pointer-events-none" // pointer-events-none on container
    >
      {/* Reverse notifications so newest appears on top if using flex-col-reverse, or adjust mapping for flex-col */}
      {/* Current setup adds new notifications to the beginning of the array, so direct map works for newest on top */}
      {visibleNotifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto"> {/* pointer-events-auto on individual toasts */}
          <NotificationToast
            notification={notification}
            onDismiss={removeNotification}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
