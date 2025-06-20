import React, { useState, useEffect, useCallback } from 'react';
import { ActivityLog, ActivityLogFilters, ActivityTargetType, ActivityStatus, User } from '../../types';
import { adminGetActivityLogs } from '../../services/appwrite';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const ITEMS_PER_PAGE = 15;

const ActivityLogPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ActivityLogFilters>({ predefinedRange: 'allTime' });
  const [searchTerm, setSearchTerm] = useState(''); // For combined search

  const fetchData = useCallback(async (page: number, appliedFilters: ActivityLogFilters) => {
    setLoading(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const { logs: fetchedLogs, total } = await adminGetActivityLogs(appliedFilters, ITEMS_PER_PAGE, offset);
      setLogs(fetchedLogs);
      setTotalLogs(total);
    } catch (err) {
      addNotification({ type: 'error', title: 'Error Fetching Logs', message: (err as Error).message });
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData(currentPage, filters);
    const intervalId = setInterval(() => fetchData(currentPage, filters), 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId);
  }, [currentPage, filters, fetchData]);

  const handleFilterChange = (filterName: keyof ActivityLogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value === '' ? undefined : value }));
    setCurrentPage(1); // Reset to first page on filter change
  };
  
  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const applySearchAndFilters = () => {
    // Combine search term into a generic filter field if your backend supports it,
    // or apply client-side if not. For this, we assume backend handles search via `userId` or `action` field.
    // If you want a generic search across multiple fields, `adminGetActivityLogs` would need to support that.
    // Here, we'll make `userId` filter act as a general search for userName for simplicity in mock.
    // For live, use Appwrite's search capability on specific fields.
    
    // For this example, if searchTerm is used, it might override specific filters or be combined.
    // Let's assume for now the backend takes `userId` for searching user name, and `action` for searching action.
    // We'll simplify here: if searchTerm exists, use it for `userId` (assuming it's for user name search)
    
    const newFilters = { ...filters };
    if (searchTerm.trim()) {
      newFilters.userId = searchTerm.trim(); // Or a generic 'q' parameter if backend supports
    } else {
      delete newFilters.userId; // Clear specific search if term is empty
    }
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({ predefinedRange: 'allTime' });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE);

  const formatLogTimestamp = (timestamp: string): string => {
    try {
      const date = parseISO(timestamp);
      return formatDistanceToNowStrict(date, { addSuffix: true });
    } catch { return 'Invalid Date'; }
  };

  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-xs font-medium text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-1";

  return (
    <Card title="📈 Application Activity Logs" titleIcon="fa-history">
      <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg shadow border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="predefinedRange" className={labelClass}>Date Range</label>
            <select id="predefinedRange" value={filters.predefinedRange || 'allTime'}
                    onChange={(e) => handleFilterChange('predefinedRange', e.target.value)}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={loading}>
              <option value="allTime">All Time</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
            </select>
          </div>
          <div>
            <label htmlFor="searchTerm" className={labelClass}>Search User/Action</label>
            <input type="text" id="searchTerm" value={searchTerm} onChange={handleSearchTermChange}
                   placeholder="e.g., John Doe or Created Incident"
                   className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={loading} />
          </div>
           <div>
            <label htmlFor="targetType" className={labelClass}>Target Type</label>
            <select id="targetType" value={filters.targetType || ''}
                    onChange={(e) => handleFilterChange('targetType', e.target.value)}
                    className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`} disabled={loading}>
              <option value="">All Types</option>
              {Object.values(ActivityTargetType).map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
           <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end space-x-2 mt-2">
            <button onClick={resetFilters} disabled={loading}
                    className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)] disabled:opacity-60">
              Reset
            </button>
            <button onClick={applySearchAndFilters} disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary-blue)] rounded-md hover:bg-[var(--color-primary-blue-hover)] disabled:opacity-60">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="py-8"><LoadingSpinner /></div>}
      {!loading && logs.length === 0 && (
        <p className="text-center py-6 text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No activity logs match your criteria.</p>
      )}
      {!loading && logs.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Target</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  {currentUser?.role === 'Admin' && <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IP Address</th>}
                  {/* User Agent could be too long, consider for details popover */}
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {logs.map(log => (
                  <tr key={log.$id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]" title={format(parseISO(log.timestamp), 'PPpp')}>
                      {formatLogTimestamp(log.timestamp)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <span className="font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{log.userName || 'N/A'}</span>
                      {log.userRole && <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({log.userRole})</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{log.action}</td>
                    <td className="px-3 py-3 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
                      {log.targetType && (
                        <span title={`ID: ${log.targetId || 'N/A'}`}>
                          {log.targetType}: {log.targetName || log.targetId || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                            log.status === ActivityStatus.SUCCESS ? 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-300' :
                            log.status === ActivityStatus.FAILURE ? 'bg-red-100 text-red-700 dark:bg-red-700/40 dark:text-red-300' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-700/40 dark:text-yellow-300'}`}>
                            {log.status}
                        </span>
                    </td>
                     {currentUser?.role === 'Admin' && <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{log.ipAddress || 'N/A'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}
                      className="px-3 py-1 text-sm border rounded-md bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50">Previous</button>
              <span className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || loading}
                      className="px-3 py-1 text-sm border rounded-md bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50">Next</button>
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">Logs automatically refresh every 30 seconds.</p>
        </>
      )}
    </Card>
  );
};

export default ActivityLogPage;
