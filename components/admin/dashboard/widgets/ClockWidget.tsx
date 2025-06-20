
import React, { useState, useEffect } from 'react'; // Removed useRef
import Card from '../../../ui/Card';
import { format } from 'date-fns';
import { useWidgetCustomization } from '../../../../contexts/WidgetCustomizationContext';
import { ClockFormat } from '../../../../types';
import LoadingSpinner from '../../../ui/LoadingSpinner'; // Added for loading state

const ClockWidget: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { customSettings, isLoadingCustomSettings } = useWidgetCustomization(); // Removed updateClockSettings
  // const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Removed
  // const settingsRef = useRef<HTMLDivElement>(null); // Removed

  const clockSettings = customSettings.clock || { format: '24h' as ClockFormat };

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  // Removed useEffect for handleClickOutside as settings panel is gone

  // Removed handleFormatChange as settings are managed centrally

  const timeFormatString = clockSettings.format === '12h' ? 'h:mm:ss a' : 'HH:mm:ss';

  // Removed settingsButton and related JSX
  
  if (isLoadingCustomSettings) {
      return (
          <Card title="Current Time" titleIcon="fa-clock" className="widget-card">
              <div className="text-center h-20 flex items-center justify-center"><LoadingSpinner size="sm" /></div>
          </Card>
      );
  }


  return (
    <Card title="Current Time" titleIcon="fa-clock" className="widget-card">
      <div className="text-center">
        <div 
          className="text-4xl md:text-5xl font-bold text-[var(--color-primary-blue)] tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {format(currentTime, timeFormatString)}
        </div>
        <div className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mt-1">
          {format(currentTime, 'eeee, MMMM d, yyyy')}
        </div>
      </div>
    </Card>
  );
};

export default ClockWidget;
