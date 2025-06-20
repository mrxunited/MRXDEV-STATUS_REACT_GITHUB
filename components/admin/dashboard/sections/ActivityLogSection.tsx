
import React, { useState, useEffect } from 'react';
import { UserActivityLog } from '../../../../types';
import { getUserActivity } from '../../../../services/appwrite';
import Card from '../../../ui/Card';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import StatusPill from '../../../ui/StatusPill';
import { formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';

const ActivityLogSection: React.FC = () => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getUserActivity(); // Fetch with default limit (e.g., 10)
      setLogs(data);
      setError(null);
    } catch (err) {
      setError('Failed to load activity logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  const formatLogTimestamp = (timestamp: string): string => {
    try {
      const date = parseISO(timestamp);
      if (isValid(date)) {
        return formatDistanceToNowStrict(date, { addSuffix: true });
      }
      return 'Invalid Date';
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) return <Card title="User Activity Log" titleIcon="fa-users"><LoadingSpinner /></Card>;
  if (error) return <Card title="User Activity Log" titleIcon="fa-users"><p className="text-red-500 dark:text-red-400">{error}</p></Card>;

  return (
    <Card title="Recent User Activity" titleIcon="fa-list-alt" actions={
      <button onClick={fetchData} className="text-sm text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] dark:text-[var(--color-primary-blue)] dark:hover:text-[#38bdf8]">
        <i className="fas fa-sync-alt mr-1"></i> Refresh
      </button>
    }>
      {logs.length === 0 ? (
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No recent activity.</p>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]" title={new Date(log.timestamp).toLocaleString()}>
                    {formatLogTimestamp(log.timestamp)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]" title={`User ID: ${log.userId}`}>
                    {log.userName}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
                    {log.action}
                    {log.details && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs" title={log.details}>{log.details}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <StatusPill status={log.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default ActivityLogSection;
