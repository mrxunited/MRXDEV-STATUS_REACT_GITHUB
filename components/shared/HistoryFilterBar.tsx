

import React, { useState, useEffect } from 'react';
import { SystemService, IncidentType, IncidentLifecycleStatus, IncidentFilters, PredefinedDateRange } from '../../types'; // Changed IncidentUpdateStatus to IncidentLifecycleStatus

interface HistoryFilterBarProps {
  services: SystemService[];
  initialFilters: IncidentFilters;
  onApplyFilters: (filters: IncidentFilters) => void;
  isLoading: boolean;
}

const defaultFilters: IncidentFilters = {
  predefinedRange: 'allTime',
  serviceId: '',
  type: null,
  status: null, // Will use IncidentLifecycleStatus
};

const HistoryFilterBar: React.FC<HistoryFilterBarProps> = ({ services, initialFilters, onApplyFilters, isLoading }) => {
  const [filters, setFilters] = useState<IncidentFilters>(initialFilters || defaultFilters);

  useEffect(() => {
    setFilters(initialFilters || defaultFilters);
  }, [initialFilters]);

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value === '' ? null : value, 
    }));
  };
  
  const handlePredefinedRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as PredefinedDateRange;
     setFilters(prev => ({
      ...prev,
      predefinedRange: value,
      dateRange: { start: null, end: null } 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    onApplyFilters(defaultFilters); 
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-xs font-medium text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-1";


  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg shadow mb-6 border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label htmlFor="predefinedRange" className={labelClass}>Date Range</label>
          <select
            id="predefinedRange"
            name="predefinedRange"
            value={filters.predefinedRange}
            onChange={handlePredefinedRangeChange}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            disabled={isLoading}
          >
            <option value="allTime">All Time</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
          </select>
        </div>

        <div>
          <label htmlFor="serviceId" className={labelClass}>Service</label>
          <select
            id="serviceId"
            name="serviceId"
            value={filters.serviceId || ''}
            onChange={handleInputChange}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            disabled={isLoading}
          >
            <option value="">All Services</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className={labelClass}>Type</label>
          <select
            id="type"
            name="type"
            value={filters.type || ''}
            onChange={handleInputChange}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            disabled={isLoading}
          >
            <option value="">All Types</option>
            {Object.values(IncidentType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="status" className={labelClass}>Current Lifecycle Status</label>
          <select
            id="status"
            name="status"
            value={filters.status || ''}
            onChange={handleInputChange}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            disabled={isLoading}
          >
            <option value="">Any Status</option>
            {Object.values(IncidentLifecycleStatus).filter(s => s !== IncidentLifecycleStatus.UPDATE).map(statusValue => (
              <option key={statusValue} value={statusValue}>{statusValue}</option>
            ))}
          </select>
        </div>

        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 flex flex-wrap sm:flex-nowrap justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md shadow-sm 
                       bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] 
                       text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] 
                       border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] 
                       hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] 
                       focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 dark:focus:ring-gray-500 disabled:opacity-60"
          >
            <i className="fas fa-undo mr-2"></i>Reset
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--color-primary-blue)] disabled:opacity-60 flex items-center justify-center"
          >
            <i className="fas fa-filter mr-2"></i>Apply Filters
          </button>
        </div>
      </div>
    </form>
  );
};

export default HistoryFilterBar;
