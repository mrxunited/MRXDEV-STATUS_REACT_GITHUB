
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import { useNotification } from '../../contexts/NotificationContext';

type EmbedType = 'overall'; // Initially only 'overall' status
type EmbedTheme = 'light' | 'dark' | 'auto';

const EmbedGeneratorPage: React.FC = () => {
  const [embedType, setEmbedType] = useState<EmbedType>('overall');
  const [embedTheme, setEmbedTheme] = useState<EmbedTheme>('auto');
  const [generatedScript, setGeneratedScript] = useState('');
  const { addNotification } = useNotification();

  const generateScript = useCallback(() => {
    const scriptHost = window.location.origin; // Or your specific CDN/host for embed.js
    const scriptTag = `<script src="${scriptHost}/embed.js" data-type="${embedType}" data-theme="${embedTheme}" data-key="YOUR_API_KEY_HERE" async defer></script>`;
    setGeneratedScript(scriptTag);
  }, [embedType, embedTheme]);

  useEffect(() => {
    generateScript();
  }, [generateScript]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript).then(() => {
      addNotification({type: 'success', title: 'Copied!', message: 'Embed script copied to clipboard.'});
    }).catch(err => {
      console.error("Failed to copy script: ", err);
      addNotification({type: 'error', title: 'Copy Failed', message: 'Could not copy script. Please copy manually.'});
    });
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";


  return (
    <div className="space-y-6">
      <Card title="Embed Status Widget" titleIcon="fa-code">
        <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] mb-6 text-sm">
          Generate a JavaScript snippet to embed a real-time status widget on your external websites.
          This allows you to easily share your system's operational status with your users.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="embed-type" className={labelClass}>Widget Content</label>
            <select
              id="embed-type"
              value={embedType}
              onChange={(e) => setEmbedType(e.target.value as EmbedType)}
              className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            >
              <option value="overall">Overall System Status</option>
              {/* Future options:
              <option value="summary" disabled>Service Summary (coming soon)</option>
              <option value="incidents" disabled>Current Incidents (coming soon)</option>
              */}
            </select>
          </div>
          <div>
            <label htmlFor="embed-theme" className={labelClass}>Theme</label>
            <select
              id="embed-theme"
              value={embedTheme}
              onChange={(e) => setEmbedTheme(e.target.value as EmbedTheme)}
              className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            >
              <option value="auto">Automatic (User's system preference)</option>
              <option value="light">Light Theme</option>
              <option value="dark">Dark Theme</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className={labelClass}>Generated Embed Script</label>
          <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-md shadow-inner">
            <pre className="text-sm text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] whitespace-pre-wrap break-all">
              <code>{generatedScript}</code>
            </pre>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 rounded-md">
            <div className="flex items-start">
                 <i className="fas fa-exclamation-triangle text-yellow-500 dark:text-yellow-400 text-xl mt-0.5 mr-3"></i>
                <div>
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-200">Action Required: API Key</h4>
                    <p className="text-xs text-yellow-600 dark:text-yellow-300">
                    Replace <code>YOUR_API_KEY_HERE</code> in the script with a valid API key from the 
                    <a href="#/admin/api-keys" className="font-semibold underline hover:text-yellow-700 dark:hover:text-yellow-100"> API Key Management </a> page.
                    This key is necessary for the embedded widget to fetch status data.
                    </p>
                </div>
            </div>
            <button
                onClick={copyToClipboard}
                className="w-full sm:w-auto mt-2 sm:mt-0 px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center justify-center flex-shrink-0"
                >
                <i className="fas fa-copy mr-2"></i>Copy Script
            </button>
        </div>


        <div className="mt-8 pt-6 border-t border-[var(--color-light-border)] dark:border-[var(--color-dark-border)]">
          <h4 className="text-md font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-2">How to Use</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
            <li>Select your desired widget content and theme from the options above.</li>
            <li>Click the "Copy Script" button.</li>
            <li>Paste the copied script tag into the HTML of your external website, ideally just before the closing <code>&lt;/body&gt;</code> tag.</li>
            <li>
              **Important:** Replace <code>YOUR_API_KEY_HERE</code> in the script with a valid API key. You can generate or find existing keys on the "API Key Management" page.
            </li>
            <li>The status widget will then appear on your website where you placed the script.</li>
          </ol>
           <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            The embedded widget is designed to be lightweight and responsive. It will automatically update to reflect the latest system status.
            Ensure the domain where `embed.js` is hosted is publicly accessible.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default EmbedGeneratorPage;
