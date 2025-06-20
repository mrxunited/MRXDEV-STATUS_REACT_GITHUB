
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { ID } from 'appwrite'; // For generating unique IDs

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // in ms. Default is 5000ms.
  persistent?: boolean; // If true, requires manual close.
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notificationDetails: Omit<Notification, 'id'>): string => {
    const id = ID.unique();
    const newNotification: Notification = {
      id,
      ...notificationDetails,
    };
    setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prevNotifications =>
      prevNotifications.filter(notification => notification.id !== id)
    );
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
