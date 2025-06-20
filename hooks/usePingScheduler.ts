

import { useEffect, useState, useCallback, useRef } from 'react';
import { SystemService, SystemStatusLevel, PingStatus } from '../types';
import { adminGetAllServices, adminPingService, adminUpdateService, isUserExplicitlyInMockMode } from '../services/appwrite';
import { useNotification } from '../contexts/NotificationContext';


const CONSECUTIVE_FAILURES_THRESHOLD = 3;

interface PingSchedulerState {
  [serviceId: string]: {
    timerId: number | null; // Changed NodeJS.Timeout to number
    consecutiveFailures: number;
    // Store the status that was present before pinger marked it down
    // This helps to restore it correctly, respecting manual overrides like Maintenance
    originalStatusBeforePingFailure: SystemStatusLevel | null; 
  };
}

export const usePingScheduler = () => {
  const { addNotification } = useNotification();
  const [schedulerState, setSchedulerState] = useState<PingSchedulerState>({});
  const servicesRef = useRef<SystemService[]>([]); // To hold the latest services data
  const isMountedRef = useRef(true); // To prevent state updates on unmounted component

  const updateServiceSchedulerState = useCallback((serviceId: string, updates: Partial<PingSchedulerState[string]>) => {
    setSchedulerState(prev => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || { timerId: null, consecutiveFailures: 0, originalStatusBeforePingFailure: null }),
        ...updates,
      },
    }));
  }, []);
  
  const performPingAndUpdate = useCallback(async (service: SystemService) => {
    if (!isMountedRef.current || !service.pingEnabled || !service.pingUrl) {
      if (schedulerState[service.id]?.timerId) {
          clearTimeout(schedulerState[service.id].timerId!);
          updateServiceSchedulerState(service.id, { timerId: null });
      }
      return;
    }

    // Preserve the service object passed to this specific ping cycle
    // to avoid issues if servicesRef.current is updated mid-operation by another process
    const currentServiceInstance = { ...service }; 

    try {
      const pingResult = await adminPingService(currentServiceInstance.id);
      
      if (!isMountedRef.current) return; // Check again after await

      const currentState = schedulerState[currentServiceInstance.id] || { timerId: null, consecutiveFailures: 0, originalStatusBeforePingFailure: null };
      let newConsecutiveFailures = currentState.consecutiveFailures;
      let newOriginalStatus = currentState.originalStatusBeforePingFailure;

      if (pingResult.status === PingStatus.OFFLINE || pingResult.status === PingStatus.TIMEOUT || pingResult.status === PingStatus.ERROR) {
        newConsecutiveFailures++;
        
        if (newConsecutiveFailures === 1 && currentServiceInstance.status !== SystemStatusLevel.MAINTENANCE && currentServiceInstance.status !== SystemStatusLevel.MAJOR_OUTAGE && currentServiceInstance.status !== SystemStatusLevel.PARTIAL_OUTAGE) {
          // Store the original status only on the first failure of a sequence,
          // and only if it's not already in a manually set outage/maintenance state.
          newOriginalStatus = currentServiceInstance.status;
        }

        if (newConsecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD && currentServiceInstance.status !== SystemStatusLevel.MAINTENANCE) {
          if (currentServiceInstance.status !== SystemStatusLevel.MAJOR_OUTAGE) { // Avoid redundant updates/notifications
            await adminUpdateService(currentServiceInstance.id, { status: SystemStatusLevel.MAJOR_OUTAGE });
            if (!currentServiceInstance.pingAlertsMuted) {
              addNotification({
                type: 'error',
                title: 'Service Down',
                message: `${currentServiceInstance.name} is unreachable after multiple attempts.`,
              });
            }
             // Refresh local servicesRef as its status has changed
            servicesRef.current = servicesRef.current.map(s => s.id === currentServiceInstance.id ? {...s, status: SystemStatusLevel.MAJOR_OUTAGE} : s);
          }
        }
      } else { // Ping was successful (Online or Slow)
        if (newConsecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD && currentServiceInstance.status === SystemStatusLevel.MAJOR_OUTAGE) {
          // If it was marked down BY PINGS (implied by consecutiveFailures threshold being met)
          const statusToRestore = newOriginalStatus || SystemStatusLevel.OPERATIONAL;
          await adminUpdateService(currentServiceInstance.id, { status: statusToRestore });
          if (!currentServiceInstance.pingAlertsMuted) {
            addNotification({
              type: 'success',
              title: 'Service Restored',
              message: `${currentServiceInstance.name} is now back online.`,
            });
          }
           // Refresh local servicesRef
          servicesRef.current = servicesRef.current.map(s => s.id === currentServiceInstance.id ? {...s, status: statusToRestore} : s);
        }
        newConsecutiveFailures = 0;
        newOriginalStatus = null; // Reset original status once service is back up
      }
      updateServiceSchedulerState(currentServiceInstance.id, { consecutiveFailures: newConsecutiveFailures, originalStatusBeforePingFailure: newOriginalStatus });

    } catch (error) {
      console.error(`Error pinging service ${currentServiceInstance.name}:`, error);
      // Don't update consecutive failures here as adminPingService handles its own errors and updates lastPingResult
    } finally {
      if (isMountedRef.current && currentServiceInstance.pingEnabled) { // Check again before rescheduling
        const nextDelay = currentServiceInstance.pingIntervalMinutes * 60 * 1000;
        const timerId = setTimeout(() => {
            // Fetch the LATEST service data before pinging again, in case interval/enabled status changed
            const latestServiceData = servicesRef.current.find(s => s.id === currentServiceInstance.id);
            if(latestServiceData) {
                performPingAndUpdate(latestServiceData);
            }
        }, nextDelay);
        updateServiceSchedulerState(currentServiceInstance.id, { timerId });
      }
    }
  }, [addNotification, schedulerState, updateServiceSchedulerState]); // updateServiceSchedulerState is memoized

  const initializeOrUpdateSchedulers = useCallback(async () => {
    if (isUserExplicitlyInMockMode()) {
        console.warn("Ping scheduler running in mock mode. Real pings will be simulated.");
    }
    try {
      const fetchedServices = await adminGetAllServices();
      servicesRef.current = fetchedServices; // Update ref with latest services

      if (!isMountedRef.current) return;

      const currentServiceIds = new Set(fetchedServices.map(s => s.id));
      
      // Clear timers for services that no longer exist or are disabled
      Object.keys(schedulerState).forEach(serviceId => {
        if (!currentServiceIds.has(serviceId) || !fetchedServices.find(s=>s.id === serviceId)?.pingEnabled) {
          if (schedulerState[serviceId]?.timerId) {
            clearTimeout(schedulerState[serviceId].timerId!);
          }
          // Optionally remove from schedulerState, or let it be overwritten/ignored
           setSchedulerState(prev => {
                const newState = {...prev};
                delete newState[serviceId];
                return newState;
           });
        }
      });
      
      fetchedServices.forEach(service => {
        if (service.pingEnabled && service.pingUrl) {
          const existingState = schedulerState[service.id];
          if (!existingState || !existingState.timerId) { // If no timer or just initialized
            // Start initial ping immediately for newly enabled/added services, then schedule
            performPingAndUpdate(service); 
          }
          // If interval changed, the existing timer will run its course, and reschedule with new interval.
          // Or, explicitly clear and reschedule if interval mismatch:
          // const currentTimerRunningForInterval = timersMap[service.id]?.interval;
          // if (existingState && existingState.timerId && currentTimerRunningForInterval !== service.pingIntervalMinutes) {
          //   clearTimeout(existingState.timerId);
          //   performPingAndUpdate(service); // Restart with new interval
          // }

        } else if (schedulerState[service.id]?.timerId) { // If ping got disabled
          clearTimeout(schedulerState[service.id].timerId!);
          updateServiceSchedulerState(service.id, { timerId: null });
        }
      });
    } catch (error) {
      console.error("Failed to initialize ping schedulers:", error);
    }
  }, [performPingAndUpdate, schedulerState, updateServiceSchedulerState]); // Added schedulerState

  useEffect(() => {
    isMountedRef.current = true;
    initializeOrUpdateSchedulers();

    // Re-initialize/check schedulers periodically (e.g., every 5 minutes)
    // to catch any services whose state might have been missed or changed outside this client
    const recheckInterval = setInterval(initializeOrUpdateSchedulers, 5 * 60 * 1000);

    return () => {
      isMountedRef.current = false;
      clearInterval(recheckInterval);
      Object.values(schedulerState).forEach(state => {
        if (state.timerId) {
          clearTimeout(state.timerId);
        }
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializeOrUpdateSchedulers]); // initializeOrUpdateSchedulers is memoized

  // Expose a function to manually re-trigger scheduler initialization if needed externally
  return { refreshPingSchedulers: initializeOrUpdateSchedulers }; 
};