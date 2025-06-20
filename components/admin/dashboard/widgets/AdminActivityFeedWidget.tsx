

import React, { useState, useEffect } from 'react';
import Card from '../../../ui/Card';
import { UserActivityLog } from '../../../../types';
import { getUserActivity } from '../../../../services/appwrite';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import StatusPill from '../../../ui/StatusPill';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

const AdminActivityFeedWidget: React.FC = () => {
  const [logs, setLogs] = useState<UserActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserActivity(5); // Fetch last 5 activities for widget
      setLogs(data);
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

  return (
    <Card title="Recent Admin Activity" titleIcon="fa-history">
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No recent admin activity.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {logs.map(log => (
            <div key={log.id} className="p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
                    {log.action}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    By: {log.userName}
                  </p>
                </div>
                <StatusPill status={log.status} subtle />
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {formatDistanceToNowStrict(parseISO(log.timestamp), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default AdminActivityFeedWidget;