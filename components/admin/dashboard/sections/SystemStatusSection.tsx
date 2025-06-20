

import React, { useState, useEffect } from 'react';
import { SystemService, SystemStatusLevel } from '../../../../types';
import { getInternalSystemStatus } from '../../../../services/appwrite';
import Card from '../../../ui/Card';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import StatusPill from '../../../ui/StatusPill';

const InternalSystemStatusSection: React.FC = () => {
  const [services, setServices] = useState<SystemService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getInternalSystemStatus(); 
      setServices(data);
      setError(null);
    } catch (err) {
      setError('Failed to load internal system status.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Card title="Internal System Health" titleIcon="fa-heartbeat"><LoadingSpinner /></Card>;
  if (error) return <Card title="Internal System Health" titleIcon="fa-heartbeat"><p className="text-red-500 dark:text-red-400">{error}</p></Card>;

  const overallStatus = services.length > 0
    ? services.every(s => s.status === SystemStatusLevel.OPERATIONAL)
      ? SystemStatusLevel.OPERATIONAL
      : services.some(s => s.status === SystemStatusLevel.MAJOR_OUTAGE)
        ? SystemStatusLevel.MAJOR_OUTAGE
        : services.some(s => s.status === SystemStatusLevel.PARTIAL_OUTAGE)
          ? SystemStatusLevel.PARTIAL_OUTAGE
          : services.some(s => s.status === SystemStatusLevel.DEGRADED)
            ? SystemStatusLevel.DEGRADED
            : SystemStatusLevel.UNKNOWN
    : SystemStatusLevel.UNKNOWN;

  const overallBorderColor = 
    overallStatus === SystemStatusLevel.OPERATIONAL ? 'border-green-500 dark:border-green-400' :
    (overallStatus === SystemStatusLevel.MAJOR_OUTAGE || overallStatus === SystemStatusLevel.PARTIAL_OUTAGE) ? 'border-red-500 dark:border-red-400' :
    overallStatus === SystemStatusLevel.DEGRADED ? 'border-yellow-500 dark:border-yellow-400' :
    'border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]';


  return (
    <Card title="Internal System Health" titleIcon="fa-heartbeat" actions={
      <button onClick={fetchData} className="text-sm text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] dark:text-[var(--color-primary-blue)] dark:hover:text-[#38bdf8]">
        <i className="fas fa-sync-alt mr-1"></i> Refresh
      </button>
    }>
      <div className={`mb-4 p-3 rounded-lg border flex items-center justify-between ${overallBorderColor} bg-gray-50 dark:bg-slate-800`}>
        <h4 className="text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Overall Internal Health:</h4>
        <StatusPill status={overallStatus} />
      </div>
      {services.length === 0 && <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No internal services configured for monitoring.</p>}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {services.map(service => (
          <div key={service.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg shadow-sm border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-1">
              <h5 className="font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{service.name}</h5>
              <StatusPill status={service.status} />
            </div>
            <p className="text-xs text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
              {service.description || 'Monitoring operational status.'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Last checked: {new Date(service.lastCheckedAutomated).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default InternalSystemStatusSection;