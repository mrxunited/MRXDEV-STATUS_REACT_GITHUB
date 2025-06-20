
import React from 'react';
import { useSiteIdentity } from '../../contexts/SiteIdentityContext'; // Added

const PublicFooter: React.FC = () => {
  const { siteIdentity, isLoadingIdentity } = useSiteIdentity(); // Added

  const footerContent = isLoadingIdentity 
    ? `© ${new Date().getFullYear()} MRX United. All rights reserved.` // Default while loading
    : siteIdentity.footerText || `© ${new Date().getFullYear()} ${siteIdentity.siteName || 'MRX United'}. All rights reserved.`;

  return (
    <footer className="h-16 bg-slate-100 dark:bg-[var(--color-dark-bg)] text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] mt-auto"> {/* Removed fixed, bottom-0, left-0, right-0 and added mt-auto */}
      <div className="container mx-auto px-4 h-full flex items-center justify-center text-sm">
        {/* Using dangerouslySetInnerHTML is generally risky if footerText can contain arbitrary HTML.
            For simple text or if markdown is parsed to safe HTML, it's okay.
            Assuming plain text for now based on textarea input. */}
        <p dangerouslySetInnerHTML={{ __html: footerContent.replace(/\n/g, '<br />') }}></p>
      </div>
    </footer>
  );
};

export default PublicFooter;