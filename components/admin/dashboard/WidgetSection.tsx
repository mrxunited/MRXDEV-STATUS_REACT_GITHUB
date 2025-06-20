
import React from 'react'; // Removed useState
import { useWidgetSettings } from '../../../contexts/WidgetSettingsContext';
import { useAuth } from '../../../contexts/AuthContext';
// import WidgetManagerModal from './WidgetManagerModal'; // Removed
import { WidgetConfig } from '../../../types';
import LoadingSpinner from '../../ui/LoadingSpinner';

interface WidgetSectionProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const WidgetSection: React.FC<WidgetSectionProps> = ({ isCollapsed, onToggleCollapse }) => {
  const { widgetSettings, isLoadingSettings, getAllWidgetConfigs } = useWidgetSettings();
  const { user } = useAuth();
  // const [isManagerModalOpen, setIsManagerModalOpen] = useState(false); // Removed

  const allWidgetConfigs = getAllWidgetConfigs();

  const enabledWidgets = allWidgetConfigs.filter(widget => 
    widgetSettings[widget.id] &&
    (!widget.requiredRole || widget.requiredRole === user?.role)
  );

  return (
    <>
      <aside
        className={`
          ${isCollapsed ? 'w-20' : 'w-72 md:w-80 lg:w-96'} 
          ${isCollapsed ? 'p-2' : 'p-4'}
          ${isCollapsed ? 'hidden lg:flex' : 'flex'} 
          flex-shrink-0
          transition-all duration-300 ease-in-out
          bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)]
          shadow-lg border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]
          flex flex-col
          relative 
          overflow-hidden 
        `}
        aria-label="Widgets Panel"
      >
        {/* Header */}
        <div className={`flex items-center mb-4 ${isCollapsed ? 'flex-col-reverse space-y-3 space-y-reverse w-full items-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <h3 className="text-lg font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] flex items-center whitespace-nowrap">
              <i className="fas fa-th-large mr-2 text-[var(--color-primary-blue)]"></i>
              Tools & Overview
            </h3>
          )}
          <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-3' : 'space-x-1 sm:space-x-2'}`}>
            {/* Settings cog icon removed */}
            <button
              title={isCollapsed ? "Expand Widgets Panel" : "Collapse Widgets Panel"}
              onClick={onToggleCollapse}
              className="p-2 rounded-full text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              aria-label={isCollapsed ? "Expand widgets panel" : "Collapse widgets panel"}
              aria-expanded={!isCollapsed}
            >
              <i className={`fas ${isCollapsed ? 'fa-chevron-left' : 'fa-chevron-right'}`}></i>
            </button>
          </div>
        </div>

        {/* Content: flex-grow allows this section to take up remaining vertical space, overflow-y-auto handles scrolling */}
        {isLoadingSettings ? (
          <div className="flex-grow flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : isCollapsed ? (
          <div className="flex-grow flex flex-col items-center space-y-4 pt-2 overflow-y-auto hide-scrollbar">
            {enabledWidgets.map((widget: WidgetConfig) => (
              <div 
                key={widget.id} 
                title={widget.title} 
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 cursor-default"
                role="img" 
                aria-label={widget.title}
              >
                <i className={`fas ${widget.icon} fa-fw text-xl text-[var(--color-primary-blue)]`}></i>
              </div>
            ))}
            {enabledWidgets.length === 0 && (
                 <span className="text-xs text-center text-gray-400 dark:text-gray-500 writing-mode-vertical-rl transform rotate-180 origin-center select-none" aria-hidden="true">No Widgets</span>
            )}
          </div>
        ) : (
          <div className="flex-grow space-y-5 overflow-y-auto pr-1 hide-scrollbar"> 
            {enabledWidgets.length > 0 ? (
              enabledWidgets.map((widget: WidgetConfig) => {
                const WidgetComponent = widget.component;
                return <WidgetComponent key={widget.id} />;
              })
            ) : (
              <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                <i className="fas fa-puzzle-piece fa-3x text-gray-300 dark:text-gray-600 mb-3"></i>
                <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
                  No widgets enabled.
                </p>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Manage widgets via the "Widget Settings" link in the sidebar.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={`
          flex-shrink-0 
          border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]
          ${isCollapsed ? 'py-2' : 'py-3'} 
          mt-auto 
        `}>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {isCollapsed ? (
              <>&copy;</>
            ) : (
              <>&copy; {new Date().getFullYear()} MRX Widgets</>
            )}
          </p>
        </div>
      </aside>
      {/* WidgetManagerModal removed */}
    </>
  );
};

export default WidgetSection;