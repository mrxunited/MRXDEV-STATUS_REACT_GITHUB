import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind color class e.g., 'text-[var(--color-primary-blue)]'
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color = 'text-[var(--color-primary-blue)]', className = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2', // Slightly smaller 'sm' for better fit in buttons
    md: 'w-8 h-8 border-[3px]', // Adjusted border for md
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${color}`}
        style={{ borderTopColor: 'transparent' }} 
      ></div>
    </div>
  );
};

export default LoadingSpinner;