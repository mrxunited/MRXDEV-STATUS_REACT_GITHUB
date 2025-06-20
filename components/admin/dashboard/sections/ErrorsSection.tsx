

import React, { useState, useEffect } from 'react';
import { ErrorReport } from '../../../../types';
import { getErrorReports } from '../../../../services/appwrite';
import Card from '../../../ui/Card';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import StatusPill from '../../../ui/StatusPill';

const ErrorsSection: React.FC = () => {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getErrorReports();
      setReports(data);
      setError(null);
    } catch (err) {
      setError('Failed to load error reports.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Card title="Error Reports" titleIcon="fa-bug"><LoadingSpinner /></Card>;
  if (error) return <Card title="Error Reports" titleIcon="fa-bug"><p className="text-red-500 dark:text-red-400">{error}</p></Card>;

  return (
    <Card title="Recent Error Reports" titleIcon="fa-bug" actions={
       <button onClick={fetchData} className="text-sm text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] dark:text-[var(--color-primary-blue)] dark:hover:text-[#38bdf8]">
        <i className="fas fa-sync-alt mr-1"></i> Refresh
      </button>
    }>
      {reports.length === 0 ? (
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No error reports in the last 24 hours.</p>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              {reports.map(report => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{new Date(report.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{report.service}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
                    <span className="font-medium">{report.errorCode}:</span> {report.message}
                    {report.details && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-md">{report.details}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <StatusPill status={report.severity} />
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

export default ErrorsSection;