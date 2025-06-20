

import React, { useState, useEffect } from 'react';
import Card from '../../../ui/Card';
import { ServiceUptime } from '../../../../types';
import { getInternalServiceUptime } from '../../../../services/appwrite';
import LoadingSpinner from '../../../ui/LoadingSpinner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../../../contexts/ThemeContext';

const UptimeGraphsWidget: React.FC = () => {
  const { theme } = useTheme();
  const [uptimeData, setUptimeData] = useState<ServiceUptime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInternalServiceUptime();
        setUptimeData(data);
      } catch (err) {
        setError('Failed to load uptime data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = uptimeData.map(service => ({
    name: service.serviceName.length > 15 ? service.serviceName.substring(0, 12) + '...' : service.serviceName, // Shorten name for chart
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
  const tooltipBgColor = theme === 'dark' ? 'var(--color-dark-modal-bg)' : 'var(--color-light-modal-bg)'; // Use modal bg for tooltip
  const tooltipTextColor = theme === 'dark' ? 'var(--color-dark-text-primary)' : 'var(--color-light-text-primary)';

  return (
    <Card title="Service Uptime (Internal)" titleIcon="fa-chart-line">
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      ) : uptimeData.length === 0 ? (
        <p className="text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">No uptime data available.</p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: tickColor }} interval={0} angle={-30} textAnchor="end" />
              <YAxis unit="%" domain={[90, 100]} tick={{ fontSize: 10, fill: tickColor }} />
              <Tooltip
                cursor={{ fill: theme === 'dark' ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.4)' }}
                contentStyle={{ 
                    backgroundColor: tooltipBgColor, 
                    borderRadius: '0.375rem', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', 
                    border: `1px solid ${gridStrokeColor}` 
                }}
                labelStyle={{ fontWeight: 'bold', color: tooltipTextColor, marginBottom: '4px', display: 'block' }}
                itemStyle={{ color: tooltipTextColor, fontSize: '12px' }}
                formatter={(value: number, name: string, props: any) => [`${value.toFixed(3)}%`, props.payload.name]} // Show full name in tooltip
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: legendColor }} payload={[{ value: 'Uptime % (Last 30d)', type: 'square', id: 'ID01', color: '#8884d8' }]}/>
              <Bar dataKey="uptime" name="Uptime %" barSize={20}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.uptime)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default UptimeGraphsWidget;