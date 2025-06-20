
import React, { useState, useEffect } from 'react';
import { SiteIdentitySettings } from '../../../types';
import LoadingSpinner from '../../ui/LoadingSpinner';

interface SiteAppearanceFormProps {
  initialSettings: SiteIdentitySettings;
  onSave: (settings: Partial<Omit<SiteIdentitySettings, '$id' | 'updatedAt'>>) => Promise<void>;
  isSubmitting: boolean;
}

const SiteAppearanceForm: React.FC<SiteAppearanceFormProps> = ({ initialSettings, onSave, isSubmitting }) => {
  const [siteName, setSiteName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [footerText, setFooterText] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setSiteName(initialSettings.siteName);
    setLogoUrl(initialSettings.logoUrl || '');
    setFaviconUrl(initialSettings.faviconUrl || '');
    setFooterText(initialSettings.footerText);
    setMetaDescription(initialSettings.metaDescription || '');
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!siteName.trim()) {
      setFormError('Site Name is required.');
      return;
    }
    if (logoUrl && !logoUrl.match(/^https?:\/\/.+/i) && !logoUrl.startsWith('/assets/')) {
        setFormError('Logo URL must be a valid HTTP/HTTPS URL or a local path like /assets/image.png.');
        return;
    }
    if (faviconUrl && !faviconUrl.match(/^https?:\/\/.+/i) && !faviconUrl.startsWith('/assets/')) {
        setFormError('Favicon URL must be a valid HTTP/HTTPS URL or a local path like /favicon.ico.');
        return;
    }
    if (metaDescription.length > 160) {
        setFormError('Meta Description should ideally be under 160 characters.');
        // Allow save but show warning
    }


    await onSave({
      siteName: siteName.trim(),
      logoUrl: logoUrl.trim() || undefined,
      faviconUrl: faviconUrl.trim() || undefined,
      footerText: footerText.trim(),
      metaDescription: metaDescription.trim() || undefined,
    });
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";


  return (
    <form onSubmit={handleSubmit} id="site-appearance-form" className="space-y-6">
      {formError && (
        <div className={`p-3 border rounded-md text-sm ${formError.includes('required') ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-600 text-red-700 dark:text-red-300' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-500 text-yellow-700 dark:text-yellow-300'}`}>
            <i className={`fas ${formError.includes('required') ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'} mr-2`}></i>
            {formError}
        </div>
      )}

      <div>
        <label htmlFor="siteName" className={labelClass}>Site Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="siteName"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          required
          disabled={isSubmitting}
          maxLength={100}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Used in page titles and headers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="logoUrl" className={labelClass}>Logo URL</label>
            <input
            type="url"
            id="logoUrl"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            placeholder="https://example.com/logo.png or /assets/logo.png"
            disabled={isSubmitting}
            maxLength={255}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">URL for your site logo. Displayed in headers.</p>
        </div>
        <div>
            <label htmlFor="faviconUrl" className={labelClass}>Favicon URL</label>
            <input
            type="url"
            id="faviconUrl"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            placeholder="https://example.com/favicon.ico or /favicon.ico"
            disabled={isSubmitting}
            maxLength={255}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">URL for your browser tab icon.</p>
        </div>
      </div>
      
      <div>
        <label htmlFor="metaDescription" className={labelClass}>Meta Description</label>
        <textarea
          id="metaDescription"
          rows={2}
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="Brief description for search engines (max 160 characters recommended)."
          disabled={isSubmitting}
          maxLength={200}
        />
      </div>

      <div>
        <label htmlFor="footerText" className={labelClass}>Footer Text</label>
        <textarea
          id="footerText"
          rows={3}
          value={footerText}
          onChange={(e) => setFooterText(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          placeholder="e.g., © 2024 Your Company. All rights reserved."
          disabled={isSubmitting}
          maxLength={500}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Displayed in the site footer. Basic HTML is not supported here directly for security; use plain text or markdown if your display component handles it (current one does not).</p>
      </div>

      <div className="pt-5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-[var(--color-primary-blue)] border border-transparent rounded-md shadow-sm hover:bg-[var(--color-primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] disabled:opacity-70 flex items-center justify-center"
        >
          {isSubmitting ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : <i className="fas fa-save mr-2"></i>}
          {isSubmitting ? 'Saving...' : 'Save Appearance Settings'}
        </button>
      </div>
    </form>
  );
};

export default SiteAppearanceForm;
