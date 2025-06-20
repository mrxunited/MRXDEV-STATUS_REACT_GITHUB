

import React, { useState, useEffect, useMemo } from 'react'; // Removed useRef
import Card from '../../../ui/Card';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay, // 0 (Sun) to 6 (Sat)
  isToday,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { Incident, IncidentType, CalendarStartDay } from '../../../../types'; // Removed CalendarWidgetSettings
import { adminGetAllIncidents } from '../../../../services/appwrite';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import { useWidgetCustomization } from '../../../../contexts/WidgetCustomizationContext';

const CalendarWidget: React.FC = () => {
  const { customSettings, isLoadingCustomSettings } = useWidgetCustomization(); // Removed updateCalendarSettings
  const calendarSettings = customSettings.calendar || { startDay: 'sunday' as CalendarStartDay };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  // const [isSettingsOpen, setIsSettingsOpen] = useState(false); // Removed
  // const settingsRef = useRef<HTMLDivElement>(null); // Removed

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const allIncidents = await adminGetAllIncidents(); 
        setIncidents(allIncidents.filter(inc => inc.scheduledStartTime));
      } catch (error) {
        console.error("Failed to load incidents for calendar", error);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  // Removed useEffect for handleClickOutside and handleStartDayChange

  const weekStartsOn = calendarSettings.startDay === 'monday' ? 1 : 0;

  const firstDayOfMonth = startOfMonth(currentDate);
  const lastDayOfMonth = endOfMonth(currentDate);
  
  const firstDayOfCalendarGrid = startOfWeek(firstDayOfMonth, { weekStartsOn });
  const lastDayOfCalendarGrid = endOfWeek(lastDayOfMonth, { weekStartsOn });

  const daysForGrid = eachDayOfInterval({
    start: firstDayOfCalendarGrid,
    end: lastDayOfCalendarGrid,
  });


  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const getEventsForDay = (day: Date): Incident[] => {
    return incidents.filter(incident => 
      incident.scheduledStartTime && isSameDay(parseISO(incident.scheduledStartTime), day)
    );
  };

  const renderDays = () => {
    return daysForGrid.map((day, index) => {
      const eventsOnDay = getEventsForDay(day);
      const isCurrentDay = isToday(day);
      const isCurrentDisplayMonth = isSameMonth(day, currentDate);

      return (
        <div
          key={index}
          className={`p-1 sm:p-2 border relative text-center 
                      ${isCurrentDisplayMonth ? 'text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]' : 'text-gray-400 dark:text-gray-500 opacity-70'}
                      ${isCurrentDay ? 'bg-[var(--color-primary-blue)] text-white rounded-full font-bold' : 'hover:bg-gray-100 dark:hover:bg-slate-700 rounded'}
                      border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]
                      transition-colors duration-150 ease-in-out cursor-default group
                      min-h-[40px] sm:min-h-[50px] flex flex-col justify-start items-center`}
          title={eventsOnDay.length > 0 ? eventsOnDay.map(e => e.title).join(', ') : format(day, 'PPP')}
        >
          <span className={`${isCurrentDay ? 'text-white' : ''}`}>{format(day, 'd')}</span>
          {eventsOnDay.length > 0 && isCurrentDisplayMonth && (
             <div className="flex justify-center items-end mt-auto space-x-0.5">
              {eventsOnDay.slice(0, 3).map(event => (
                <span
                  key={event.id}
                  className={`h-1.5 w-1.5 rounded-full ${event.type === IncidentType.MAINTENANCE ? (isCurrentDay ? 'bg-white' : 'bg-blue-500') : (isCurrentDay ? 'bg-white' : 'bg-red-500')}`}
                  title={event.title}
                ></span>
              ))}
            </div>
          )}
           {eventsOnDay.length > 0 && isCurrentDisplayMonth && (
             <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-max max-w-xs z-10 
                           hidden group-hover:block px-2 py-1 
                           bg-[var(--color-dark-modal-bg)] text-white text-xs 
                           rounded shadow-lg pointer-events-none">
              {eventsOnDay.map(e => <div key={e.id}>{e.title} ({e.type})</div>)}
            </div>
           )}
        </div>
      );
    });
  };
  
  const daysOfWeekLabels = useMemo(() => {
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (calendarSettings.startDay === 'monday') {
      return [...labels.slice(1), labels[0]]; // Mon, Tue, ..., Sun
    }
    return labels; // Sun, Mon, ... Sat
  }, [calendarSettings.startDay]);

  // Removed settingsButton and related JSX

  if (isLoadingCustomSettings || loadingEvents) {
    return (
      <Card title="Calendar" titleIcon="fa-calendar-alt" className="widget-card">
          <div className="h-48 flex items-center justify-center"><LoadingSpinner/></div>
      </Card>
    );
  }

  return (
    <Card title="Calendar" titleIcon="fa-calendar-alt" className="widget-card">
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Previous month"
        >
          <i className="fas fa-chevron-left text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]"></i>
        </button>
        <div className="flex flex-col items-center">
            <h3 className="text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
            {format(currentDate, 'MMMM yyyy')}
            </h3>
            <button 
                onClick={handleToday}
                className="text-xs text-[var(--color-primary-blue)] hover:underline"
            >
                Today
            </button>
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Next month"
        >
          <i className="fas fa-chevron-right text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]"></i>
        </button>
      </div>
        <>
            <div className="grid grid-cols-7 gap-px text-xs text-center font-medium text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">
                {daysOfWeekLabels.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
                {renderDays()}
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2 justify-center">
                <span className="flex items-center"><span className="h-2 w-2 bg-red-500 rounded-full mr-1"></span> Incident</span>
                <span className="flex items-center"><span className="h-2 w-2 bg-blue-500 rounded-full mr-1"></span> Maintenance</span>
            </div>
        </>
    </Card>
  );
};

export default CalendarWidget;