
import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SiteAppearanceForm from '../../components/admin/forms/SiteAppearanceForm';
import { useSiteIdentity } from '../../contexts/SiteIdentityContext';
import { useNotification } from '../../contexts/NotificationContext';
import { SiteIdentitySettings } from '../../types';

const SiteAppearancePage: React.FC = () => {
  const { siteIdentity, isLoadingIdentity, updateSiteIdentity, fetchSiteIdentity } = useSiteIdentity();
  const { addNotification } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (settingsUpdate: Partial<Omit<SiteIdentitySettings, '$id' | 'updatedAt'>>) => {
    setIsSubmitting(true);
    try {
      await updateSiteIdentity(settingsUpdate);
      addNotification({ type: 'success', title: 'Settings Updated', message: 'Site appearance settings saved successfully.' });
      // The context will trigger re-renders, but if direct DOM manipulation is needed, that happens in App.tsx
    } catch (error) {
      const errorMsg = (error instanceof Error) ? error.message : 'Failed to save settings.';
      addNotification({ type: 'error', title: 'Save Failed', message: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingIdentity && !siteIdentity.siteName) { // Check siteName to ensure initial load is complete
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="ml-4 text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">Loading site appearance settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Site Appearance & Branding" titleIcon="fa-paint-brush">
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-6 text-sm">
          Customize the look and feel of your status page and admin panel. Changes here will affect various branding elements.
        </p>
        {siteIdentity ? (
          <SiteAppearanceForm
            initialSettings={siteIdentity}
            onSave={handleSave}
            isSubmitting={isSubmitting}
          />
        ) : (
          <p className="text-red-500">Could not load site settings. Please try refreshing.</p>
        )}
      </Card>
    </div>
  );
};

export default SiteAppearancePage;
