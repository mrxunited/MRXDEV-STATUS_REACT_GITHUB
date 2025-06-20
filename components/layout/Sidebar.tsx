
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteIdentity } from '../../contexts/SiteIdentityContext'; 

interface NavItemProps {
  to: string;
  iconClass: string;
  label: string;
  isCollapsed: boolean;
  isSubItem?: boolean; // Added for sub-item styling
}

const NavItem: React.FC<NavItemProps> = ({ to, iconClass, label, isCollapsed, isSubItem }) => (
  <NavLink
    to={to}
    end
    className={({ isActive }) =>
      `flex items-center py-3 rounded-lg transition-colors duration-150 ease-in-out group
       ${isCollapsed ? 'px-3 justify-center' : (isSubItem ? 'pl-10 pr-4' : 'px-4')}
       ${isActive
         ? 'bg-[var(--color-primary-blue)] text-white shadow-md'
         : 'text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-[var(--color-light-text-primary)] dark:hover:text-[var(--color-dark-text-primary)]'
       }`
    }
    title={isCollapsed ? label : undefined} // Show label as tooltip when collapsed
  >
    {({ isActive }) => (
      <>
        <i
          className={
            `fas ${iconClass} 
            ${isCollapsed ? 'text-xl' : 'w-6 h-6 mr-3 text-center'}
            transition-colors duration-150 ease-in-out 
            ${isActive
              ? 'text-white'
              : `text-gray-400 dark:text-gray-500 group-hover:text-[var(--color-primary-blue)] dark:group-hover:text-[var(--color-primary-blue-hover)]`
            }`
          }
        ></i>
        {!isCollapsed && <span className={`truncate text-sm font-medium ${isSubItem ? 'opacity-90' : ''}`}>{label}</span>}
      </>
    )}
  </NavLink>
);


// New CollapsibleNavItem component
interface CollapsibleNavItemProps {
  iconClass: string;
  label: string;
  isCollapsed: boolean;
  basePath: string;
  children: React.ReactNode;
}

const CollapsibleNavItem: React.FC<CollapsibleNavItemProps> = ({ iconClass, label, isCollapsed, basePath, children }) => {
  const [isOpen, setIsOpen] = useState(window.location.hash.startsWith(`#${basePath}`));

  // Update isOpen state if path changes (e.g. browser back/forward)
  React.useEffect(() => {
    const handleHashChange = () => {
      setIsOpen(window.location.hash.startsWith(`#${basePath}`));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [basePath]);


  if (isCollapsed) {
    return (
      <NavLink
        to={basePath} // Or first child's path
        className="flex items-center px-3 py-3 rounded-lg text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-gray-200 dark:hover:bg-slate-700 justify-center"
        title={label}
      >
        <i className={`fas ${iconClass} text-xl text-gray-400 dark:text-gray-500 group-hover:text-[var(--color-primary-blue)] dark:group-hover:text-[var(--color-primary-blue-hover)]`}></i>
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-gray-200 dark:hover:bg-slate-700 focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
          <i className={`fas ${iconClass} w-6 h-6 mr-3 text-center text-gray-400 dark:text-gray-500 group-hover:text-[var(--color-primary-blue)] dark:group-hover:text-[var(--color-primary-blue-hover)]`}></i>
          <span className="truncate text-sm font-medium">{label}</span>
        </div>
        <i className={`fas fa-chevron-down transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      {isOpen && (
        <div className="mt-1 ml-2 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
};


const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const { siteIdentity, isLoadingIdentity } = useSiteIdentity(); 
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderLogo = () => {
    if (isLoadingIdentity) return null; 
    if (siteIdentity.logoUrl) {
      return <img src={siteIdentity.logoUrl} alt={`${siteIdentity.siteName} Logo`} className={isCollapsed ? "h-8 w-auto mx-auto" : "h-10 w-auto"} />;
    }
    return <i className={`fas fa-shield-alt text-[var(--color-primary-blue)] ${isCollapsed ? 'text-2xl mb-2' : 'text-3xl mr-2'}`}></i>;
  };

  const siteNameOrDefault = isLoadingIdentity ? "Loading..." : siteIdentity.siteName || "Admin Panel";


  return (
    <aside className={`
      ${isCollapsed ? 'w-20' : 'w-64'}
      transition-all duration-300 ease-in-out
      bg-[var(--color-light-sidebar-bg)] dark:bg-[var(--color-dark-sidebar-bg)] 
      shadow-lg flex-shrink-0 hidden md:flex 
      border-r border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] 
      flex flex-col h-full
      relative overflow-hidden
    `}>
      {/* Header */}
      <div className={`flex items-center h-20 border-b border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] flex-shrink-0
        ${isCollapsed ? 'flex-col py-3 justify-center' : 'px-4 justify-between'}
      `}>
        {!isCollapsed && (
          <div className="flex items-center">
            {renderLogo()}
            <h1 className="text-xl font-bold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] ml-2">{siteNameOrDefault}</h1>
          </div>
        )}
        {isCollapsed && renderLogo()}
        <button
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-full text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
        >
            <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto min-h-0 hide-scrollbar ${isCollapsed ? 'p-2 space-y-3' : 'p-4 space-y-1'}`}>
        {!isCollapsed && <h2 className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Main</h2>}
        <NavItem to="/admin/dashboard" iconClass="fa-tachometer-alt" label="Internal Dashboard" isCollapsed={isCollapsed} />
        <NavItem to="/admin/widget-settings" iconClass="fa-puzzle-piece" label="Widget Settings" isCollapsed={isCollapsed} />
        
        {!isCollapsed && <h2 className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Public Status Page</h2>}
        <NavItem to="/admin/services" iconClass="fa-stream" label="Manage Services" isCollapsed={isCollapsed} />
        <NavItem to="/admin/service-groups" iconClass="fa-object-group" label="Service Groups" isCollapsed={isCollapsed} />
        <NavItem to="/admin/incidents" iconClass="fa-bolt" label="Manage Incidents" isCollapsed={isCollapsed} />
        <NavItem to="/admin/decision-flows" iconClass="fa-project-diagram" label="Decision Flows" isCollapsed={isCollapsed} /> 
        <NavItem to="/admin/reviews" iconClass="fa-clipboard-check" label="De-Briefs" isCollapsed={isCollapsed} /> 
        <NavItem to="/admin/guest-reports" iconClass="fa-bug" label="Guest Reports" isCollapsed={isCollapsed} /> 
        <NavItem to="/admin/embed-generator" iconClass="fa-code" label="Embed Script" isCollapsed={isCollapsed} />

        {user?.role === 'Admin' && (
          <>
            {!isCollapsed && <h2 className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Administration</h2>}
            <NavItem to="/admin/users" iconClass="fa-users-cog" label="User Management" isCollapsed={isCollapsed} />
            <NavItem to="/admin/api-keys" iconClass="fa-key" label="API Key Management" isCollapsed={isCollapsed} />
            <NavItem to="/admin/site-appearance" iconClass="fa-paint-brush" label="Site Appearance" isCollapsed={isCollapsed} /> 
            <NavItem to="/admin/activity-logs" iconClass="fa-history" label="Activity Logs" isCollapsed={isCollapsed} /> 
            
            <CollapsibleNavItem iconClass="fa-cogs" label="Integrations" isCollapsed={isCollapsed} basePath="/admin/integrations">
                <NavItem to="/admin/integrations/discord" iconClass="fab fa-discord" label="Discord" isCollapsed={isCollapsed} isSubItem />
                {/* Add other integration links here */}
            </CollapsibleNavItem>
            
            <CollapsibleNavItem iconClass="fa-edit" label="Field Customization" isCollapsed={isCollapsed} basePath="/admin/field-customization">
                 <NavItem to="/admin/field-customization/severity-levels" iconClass="fa-triangle-exclamation" label="Severity Levels" isCollapsed={isCollapsed} isSubItem />
                 <NavItem to="/admin/field-customization/incident-statuses" iconClass="fa-tags" label="Incident Statuses" isCollapsed={isCollapsed} isSubItem />
            </CollapsibleNavItem>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] flex-shrink-0
        ${isCollapsed ? 'py-3' : 'p-4'}
      `}>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {isCollapsed ? (
             <i className="fas fa-copyright" title={`© ${new Date().getFullYear()} ${siteIdentity.siteName || 'MRX United'}`}></i>
          ) : (
            siteIdentity.footerText || `© ${new Date().getFullYear()} MRX United`
          )}
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
