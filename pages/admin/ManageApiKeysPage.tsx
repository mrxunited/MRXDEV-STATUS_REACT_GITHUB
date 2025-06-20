

import React, { useState, useEffect } from 'react';
import { ApiKey, NewApiKey } from '../../types'; 
import { adminGetApiKeys, adminGenerateApiKey, adminRevokeApiKey } from '../../services/appwrite';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext'; // To get current user ID

const ManageApiKeysPage: React.FC = () => {
  const { user: currentUser } = useAuth(); // Get current authenticated user
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKeyInfo, setGeneratedKeyInfo] = useState<NewApiKey | null>(null); 
  const [generateError, setGenerateError] = useState<string | null>(null);

  const { addNotification } = useNotification();

  const fetchData = async () => {
    if (!currentUser) {
        setLoading(false);
        addNotification({type: 'error', title: 'Auth Error', message: 'Cannot load API keys: User not authenticated.'});
        return;
    }
    setLoading(true);
    try {
      const data = await adminGetApiKeys(currentUser.id); // Pass current user's ID
      setApiKeys(data);
    } catch (err) {
      const errorMsg = (err as Error).message || 'Failed to load API keys. Please try again.';
      addNotification({type: 'error', title: 'Loading Error', message: errorMsg, persistent: true});
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // Refetch if user changes (e.g., re-login)

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
        setGenerateError("User not authenticated. Cannot generate key.");
        return;
    }
    if (!newKeyLabel.trim()) {
      setGenerateError("Label cannot be empty.");
      return;
    }
    setIsGenerating(true);
    setGeneratedKeyInfo(null);
    setGenerateError(null);
    try {
      const newKey = await adminGenerateApiKey(newKeyLabel.trim(), currentUser.id); // Pass current user's ID
      setGeneratedKeyInfo(newKey);
      setNewKeyLabel(''); 
      addNotification({type: 'success', title: 'API Key Generated', message: `Key "${newKey.label}" created.`});
      await fetchData(); 
    } catch (err) {
      const errorMsg = (err as Error).message || "Failed to generate API key.";
      setGenerateError(errorMsg); 
      addNotification({type: 'error', title: 'Generation Failed', message: errorMsg});
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (keyId: string, keyLabel: string) => {
    if (!currentUser) {
        addNotification({type: 'error', title: 'Auth Error', message: 'Cannot revoke key: User not authenticated.'});
        return;
    }
    if (window.confirm(`Are you sure you want to revoke the API key "${keyLabel}"? This key will no longer be usable.`)) {
      setLoading(true); 
      try {
        await adminRevokeApiKey(keyId, currentUser.id); // Pass current user's ID for potential server-side validation
        addNotification({type: 'success', title: 'API Key Revoked', message: `Key "${keyLabel}" has been revoked.`});
        await fetchData();
      } catch (err) {
        const errorMsg = (err as Error).message || "Failed to revoke API key.";
        addNotification({type: 'error', title: 'Revocation Failed', message: errorMsg, persistent: true});
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addNotification({type: 'info', title: 'Copied!', message: 'API Key copied to clipboard.'});
    }).catch(err => {
      console.error("Failed to copy API key: ", err);
      addNotification({type: 'error', title: 'Copy Failed', message: 'Could not copy key. Please copy manually.'});
    });
  };

  const maskApiKey = (keyPrefix: string | undefined, keySuffix: string | undefined) => {
    if (!keyPrefix || !keySuffix) return "Invalid Key Structure";
    return `${keyPrefix}...${keySuffix}`;
  };

  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";


  return (
    <div className="space-y-6">
      <Card title="Generate New API Key" titleIcon="fa-plus-circle">
        <form onSubmit={handleGenerateKey} className="space-y-4">
          {generateError && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{generateError}</div>}
          <div>
            <label htmlFor="new-key-label" className={labelClass}>Key Label <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="new-key-label"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
              placeholder="e.g., My Third-Party App"
              disabled={isGenerating || !currentUser}
            />
          </div>
          <button
            type="submit"
            disabled={isGenerating || !newKeyLabel.trim() || !currentUser}
            className="px-4 py-2 bg-[var(--color-primary-blue)] text-white rounded-md hover:bg-[var(--color-primary-blue-hover)] transition-colors text-sm font-medium flex items-center disabled:opacity-70"
          >
            {isGenerating ? <LoadingSpinner size="sm" color="text-white" className="mr-2"/> : <i className="fas fa-key mr-2"></i>}
            {isGenerating ? 'Generating...' : 'Generate Key'}
          </button>
        </form>
        {generatedKeyInfo && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-400 dark:border-green-600 rounded-md">
            <h4 className="text-md font-semibold text-green-700 dark:text-green-300">API Key Generated Successfully!</h4>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">Please copy your new API key. It will not be shown again.</p>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-slate-700 rounded font-mono text-sm text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] flex items-center justify-between">
              <code>{generatedKeyInfo.fullKey}</code> {/* Display fullKey from NewApiKey */}
              <button 
                onClick={() => copyToClipboard(generatedKeyInfo.fullKey)}
                className="ml-4 px-3 py-1 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 rounded text-xs"
                title="Copy to Clipboard"
                >
                <i className="fas fa-copy mr-1"></i>Copy
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Label: {generatedKeyInfo.label} | Created: {format(parseISO(generatedKeyInfo.createdAt), "PPpp")}</p>
          </div>
        )}
      </Card>

      <Card title="Existing API Keys" titleIcon="fa-list-alt">
        {loading ? <div className="py-4"><LoadingSpinner /></div>
        : !currentUser ? <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">Please login to manage API keys.</p>
        : apiKeys.length === 0 ? (
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] py-4 text-center">No API keys have been generated for your account yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Key (Masked)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Used</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] divide-y divide-[var(--color-light-border)] dark:divide-[var(--color-dark-border)]">
                {apiKeys.map(apiKey => (
                  <tr key={apiKey.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/60 ${apiKey.revokedAt ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">{apiKey.label}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)] font-mono">{maskApiKey(apiKey.keyPrefix, apiKey.keySuffix)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">{format(parseISO(apiKey.createdAt), "MMM d, yyyy")}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
                      {apiKey.lastUsedAt ? format(parseISO(apiKey.lastUsedAt), "MMM d, yyyy HH:mm") : 'Never'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {apiKey.revokedAt ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800/40 dark:text-red-300">
                          Revoked
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800/40 dark:text-green-300">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      {!apiKey.revokedAt && (
                        <button 
                          onClick={() => handleRevokeKey(apiKey.id, apiKey.label)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 disabled:opacity-50"
                          aria-label={`Revoke API key ${apiKey.label}`}
                          disabled={loading || !currentUser}
                        >
                          <i className="fas fa-ban mr-1"></i>Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
         <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Note: API Keys are stored securely. The full key is shown only once upon generation.
            Ensure your API key collection in Appwrite has appropriate permissions (user-specific write access is recommended).
        </p>
      </Card>
    </div>
  );
};

export default ManageApiKeysPage;