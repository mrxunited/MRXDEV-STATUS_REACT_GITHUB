import { WidgetConfig } from '../types';

// Import Widget Components
import ClockWidget from '../components/admin/dashboard/widgets/ClockWidget';
import CalendarWidget from '../components/admin/dashboard/widgets/CalendarWidget';
import SystemHealthSummaryWidget from '../components/admin/dashboard/widgets/SystemHealthSummaryWidget';
import QuickNotesWidget from '../components/admin/dashboard/widgets/QuickNotesWidget';
import AdminActivityFeedWidget from '../components/admin/dashboard/widgets/AdminActivityFeedWidget';
import UptimeGraphsWidget from '../components/admin/dashboard/widgets/UptimeGraphsWidget';
import WeatherWidget from '../components/admin/dashboard/widgets/WeatherWidget'; // Added

export const WIDGET_REGISTRY: WidgetConfig[] = [
  {
    id: 'clock',
    title: 'Clock',
    icon: 'fa-clock',
    defaultEnabled: true,
    component: ClockWidget,
  },
  {
    id: 'calendar',
    title: 'Calendar',
    icon: 'fa-calendar-alt',
    defaultEnabled: true,
    component: CalendarWidget,
  },
  {
    id: 'weather', // Added Weather Widget
    title: 'Weather',
    icon: 'fa-cloud-sun',
    defaultEnabled: false, // Disabled by default
    component: WeatherWidget,
  },
  {
    id: 'systemHealth',
    title: 'System Health Summary',
    icon: 'fa-heartbeat',
    defaultEnabled: true,
    component: SystemHealthSummaryWidget,
  },
  {
    id: 'quickNotes',
    title: 'Quick Notes',
    icon: 'fa-sticky-note',
    defaultEnabled: true,
    component: QuickNotesWidget,
  },
  {
    id: 'activityFeed',
    title: 'Admin Activity Feed',
    icon: 'fa-history',
    defaultEnabled: true,
    component: AdminActivityFeedWidget,
  },
  {
    id: 'uptimeGraphs',
    title: 'Uptime Graphs',
    icon: 'fa-chart-line',
    defaultEnabled: false, 
    component: UptimeGraphsWidget,
  },
];