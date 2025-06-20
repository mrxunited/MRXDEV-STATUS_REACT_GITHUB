
import React, { useState, useEffect } from 'react';
import Card from '../../../ui/Card';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import { SystemStatusLevel } from '../../../../types';
import StatusPill from '../../../ui/StatusPill';
// Simulate an API call
const mockFetchSystemHealth = (): Promise<any> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({
                appwriteApiStatus: Math.random() > 0.1 ? SystemStatusLevel.OPERATIONAL : SystemStatusLevel.DEGRADED,
                overallServiceUptime: Math.random() * (100 - 99.5) + 99.5, // 99.5 to 100
                lastHeartbeat: new Date(Date.now() - Math.random() * 60000).toISOString(), // Within the last minute
            });
        }, 800);
    });
};

interface HealthStatProps {
    label: string;
    value: string | number;
    statusLevel?: SystemStatusLevel;
    icon?: string;
}

const HealthStatItem: React.FC<HealthStatProps> = ({ label, value, statusLevel, icon }) => {
    return (
        <div className="py-2 px-3 bg-gray-50 dark:bg-slate-700/50 rounded-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
            <div className="flex items-center justify-between">
                <div className="flex items-center text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">
                    {icon && <i className={`fas ${icon} mr-2 w-4 text-center text-[var(--color-primary-blue)]`}></i>}
                    {label}:
                </div>
                {statusLevel ? (
                    <StatusPill status={statusLevel} subtle />
                ) : (
                    <span className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
                        {typeof value === 'number' ? value.toFixed(3) : value}
                    </span>
                )}
            </div>
        </div>
    );
};


const SystemHealthSummaryWidget: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mockFetchSystemHealth().then(data => {
      setHealthData(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Card title="System Health" titleIcon="fa-heartbeat">
        <div className="h-24 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (!healthData) {
    return (
      <Card title="System Health" titleIcon="fa-heartbeat">
        <p className="text-sm text-red-500 dark:text-red-400">Could not load system health data.</p>
      </Card>
    );
  }

  return (
    <Card title="System Health Summary" titleIcon="fa-heartbeat">
      <div className="space-y-2.5">
        <HealthStatItem 
            label="Appwrite API" 
            value={healthData.appwriteApiStatus} 
            statusLevel={healthData.appwriteApiStatus}
            icon="fa-server"
        />
        <HealthStatItem 
            label="Overall Service Uptime (Public)" 
            value={`${healthData.overallServiceUptime.toFixed(3)}%`}
            icon="fa-shield-alt"
        />
        <HealthStatItem 
            label="Last System Heartbeat" 
            value={new Date(healthData.lastHeartbeat).toLocaleTimeString()}
            icon="fa-wave-square"
        />
      </div>
    </Card>
  );
};

export default SystemHealthSummaryWidget;
