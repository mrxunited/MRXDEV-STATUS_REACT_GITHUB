
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ThemeSwitcher from '../ui/ThemeSwitcher';
import MockDataToggle from '../admin/common/MockDataToggle'; 
import { useSiteIdentity } from '../../contexts/SiteIdentityContext'; // Added

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { siteIdentity, isLoadingIdentity } = useSiteIdentity(); // Added

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/admin/login');
  };

  const headerTitle = isLoadingIdentity ? "Administrator Panel" : `${siteIdentity.siteName || 'MRX United'} - Admin Panel`;

  return (
    <header className="h-20 bg-[var(--color-light-header-bg)] dark:bg-[var(--color-dark-header-bg)] shadow-sm flex items-center justify-between px-6 flex-shrink-0 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{headerTitle}</h2>
      </div>
      <div className="flex items-center space-x-4">
        <MockDataToggle className="hidden sm:flex"/> {/* Added MockDataToggle */}
        <ThemeSwitcher />
        <div className="relative">
          {user && (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)} 
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-blue)] focus:ring-opacity-50"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary-blue)] flex items-center justify-center text-white font-semibold">
                {user.name.substring(0, 1).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <span className="block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{user.name}</span>
                <span className="block text-xs text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{user.role}</span>
              </div>
              <i className={`fas fa-chevron-down text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] transition-transform duration-200 ${dropdownOpen ? 'transform rotate-180' : ''}`}></i>
            </button>
          )}
          {dropdownOpen && user && (
            <div className="absolute right-0 mt-2 w-56 bg-[var(--color-light-modal-bg)] dark:bg-[var(--color-dark-modal-bg)] rounded-md shadow-xl z-20 py-1 border border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
              <div className="px-4 py-3 text-sm text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
                <p className="font-medium">Signed in as</p>
                <strong className="block truncate">{user.email}</strong>
              </div>
              <div className="px-4 py-2 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] sm:hidden"> {/* Mock toggle for small screens */}
                <MockDataToggle />
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white transition-colors"
              >
                <i className="fas fa-sign-out-alt w-5 mr-2"></i>Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
