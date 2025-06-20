import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] transition-colors duration-200 ${
        theme === 'dark' 
          ? 'text-yellow-400 hover:bg-gray-700' 
          : 'text-gray-600 hover:bg-gray-200'
      } ${className}`}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {theme === 'dark' ? (
        <i className="fas fa-sun fa-lg"></i>
      ) : (
        <i className="fas fa-moon fa-lg"></i>
      )}
    </button>
  );
};

export default ThemeSwitcher;
