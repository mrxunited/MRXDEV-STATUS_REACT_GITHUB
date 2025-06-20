import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  titleIcon?: string;
  actions?: ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', titleIcon, actions }) => {
  return (
    <div className={`bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] shadow-lg rounded-xl overflow-hidden border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] flex justify-between items-center">
          <h3 className="text-lg font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] flex items-center">
            {titleIcon && <i className={`fas ${titleIcon} mr-3 text-[var(--color-primary-blue)]`}></i>}
            {title}
          </h3>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;