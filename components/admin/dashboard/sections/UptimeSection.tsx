

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ServiceUptime } from '../../../../types';
import { getInternalServiceUptime } from '../../../../services/appwrite';
import Card from '../../../ui/Card';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import { useTheme } from '../../../../contexts/ThemeContext'; // Import useTheme

const InternalUptimeSection: React.FC = () => {
  const { theme } = useTheme();
  const [uptimeData, setUptimeData] = useState<ServiceUptime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getInternalServiceUptime();
      setUptimeData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load internal service uptime.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Card title="Internal Service Uptime (Last 30 Days)" titleIcon="fa-chart-area"><LoadingSpinner /></Card>;
  if (error) return <Card title="Internal Service Uptime (Last 30 Days)" titleIcon="fa-chart-area"><p className="text-red-500 dark:text-red-400">{error}</p></Card>;
  
  const chartData = uptimeData.map(service => ({
    name: service.serviceName,
    uptime: service.uptimePercentage,
  }));

  const getBarColor = (uptime: number) => {
    if (uptime >= 99.9) return theme === 'dark' ? '#10B981' : '#10B981'; 
    if (uptime >= 99) return theme === 'dark' ? '#F59E0B' : '#F59E0B'; 
    return theme === 'dark' ? '#EF4444' : '#EF4444';
  };
  
  const tickColor = theme === 'dark' ? 'var(--color-dark-text-secondary)' : 'var(--color-light-text-secondary)';
  const gridStrokeColor = theme === 'dark' ? 'var(--color-dark-border)' : 'var(--color-light-border)';
  const legendColor = theme === 'dark' ? 'var(--color-dark-text-primary)' : 'var(--color-light-text-primary)';
  const tooltipBgColor = theme === 'dark' ? 'var(--color-dark-card-bg)' : 'var(--color-light-card-bg)';
  const tooltipTextColor = theme === 'dark' ? 'var(--color-dark-text-primary)' : 'var(--color-light-text-primary)';


  return (
    <Card title="Internal Service Uptime (Last 30 Days)" titleIcon="fa-chart-area" actions={
      <button onClick={fetchData} className="text-sm text-[var(--color-primary-blue)] hover:text-[var(--color-primary-blue-hover)] dark:text-[var(--color-primary-blue)] dark:hover:text-[#38bdf8]">
        <i className="fas fa-sync-alt mr-1"></i> Refresh
      </button>
    }>
      {uptimeData.length === 0 ? (
         <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No internal uptime data available.</p>
      ) : (
        <>
          <div className="h-72 w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} />
                <YAxis unit="%" domain={[90, 100]} tick={{ fontSize: 12, fill: tickColor }} />
                <Tooltip
                  cursor={{ fill: theme === 'dark' ? 'rgba(71, 85, 105, 0.5)' : 'rgba(239, 246, 255, 0.5)' }}
                  contentStyle={{ backgroundColor: tooltipBgColor, borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: `1px solid ${gridStrokeColor}` }}
                  labelStyle={{ fontWeight: 'bold', color: tooltipTextColor }}
                  itemStyle={{ color: tooltipTextColor }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: legendColor }} />
                <Bar dataKey="uptime" name="Uptime %" barSize={30}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.uptime)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {uptimeData.map(service => (
              <div key={service.id} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-md border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{service.serviceName}</span>
                  <span className={`font-bold ${
                    service.uptimePercentage >= 99.9 ? (theme === 'dark' ? 'text-green-400' : 'text-green-600') :
                    service.uptimePercentage >= 99 ? (theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600') : (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                  }`}>{service.uptimePercentage.toFixed(3)}%</span>
                </div>
                {service.lastIncident && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last incident: {new Date(service.lastIncident.date).toLocaleDateString()} ({service.lastIncident.duration}) - {service.lastIncident.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default InternalUptimeSection;