
(() => {
  const MRX_EMBED_ID_PREFIX = 'mrx-status-embed-';
  const MRX_STYLE_ID_PREFIX = 'mrx-status-style-';

  // Find the current script tag
  const currentScript = document.currentScript || (() => {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  if (!currentScript) {
    console.error('MRX Status Embed: Could not find its own script tag.');
    return;
  }

  const dataset = currentScript.dataset;
  const embedType = dataset.type || 'overall';
  const apiKey = dataset.key;
  let theme = dataset.theme || 'auto';

  // Determine unique ID for this embed instance
  const instanceId = MRX_EMBED_ID_PREFIX + (dataset.id || Math.random().toString(36).substring(7));
  const styleId = MRX_STYLE_ID_PREFIX + (dataset.id || Math.random().toString(36).substring(7));


  if (theme === 'auto') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const createContainer = () => {
    let container = document.getElementById(instanceId);
    if (container) { // Clear previous content if re-initializing
        container.innerHTML = '';
    } else {
        container = document.createElement('div');
        container.id = instanceId;
        currentScript.parentNode.insertBefore(container, currentScript.nextSibling);
    }
    container.className = `mrx-status-widget mrs-theme-${theme}`;
    return container;
  };

  const createStyles = () => {
    if (document.getElementById(styleId)) {
        return; // Styles already added for this instance or globally
    }
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      .mrx-status-widget {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        padding: 10px 15px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        font-size: 14px;
        line-height: 1.5;
        border: 1px solid transparent;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03);
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
      }
      .mrx-status-widget .mrx-status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 8px;
        flex-shrink: 0;
      }
      .mrx-status-widget .mrx-status-text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Themes */
      .mrs-theme-light {
        background-color: #ffffff;
        color: #374151; /* gray-700 */
        border-color: #e5e7eb; /* gray-200 */
      }
      .mrs-theme-dark {
        background-color: #1f2937; /* gray-800 */
        color: #f3f4f6; /* gray-100 */
        border-color: #374151; /* gray-700 */
      }

      /* Status Colors - Light Theme */
      .mrs-theme-light .mrx-status-dot.operational { background-color: #10B981; /* green-500 */ }
      .mrs-theme-light .mrx-status-dot.degraded { background-color: #F59E0B; /* yellow-500 */ }
      .mrs-theme-light .mrx-status-dot.partial_outage { background-color: #F97316; /* orange-500 */ }
      .mrs-theme-light .mrx-status-dot.major_outage { background-color: #EF4444; /* red-500 */ }
      .mrs-theme-light .mrx-status-dot.maintenance { background-color: #3B82F6; /* blue-500 */ }
      .mrs-theme-light .mrx-status-dot.unknown { background-color: #9CA3AF; /* gray-400 */ }
      
      /* Status Colors - Dark Theme */
      .mrs-theme-dark .mrx-status-dot.operational { background-color: #34D399; /* green-400 */ }
      .mrs-theme-dark .mrx-status-dot.degraded { background-color: #FBBF24; /* yellow-400 */ }
      .mrs-theme-dark .mrx-status-dot.partial_outage { background-color: #FB923C; /* orange-400 */ }
      .mrs-theme-dark .mrx-status-dot.major_outage { background-color: #F87171; /* red-400 */ }
      .mrs-theme-dark .mrx-status-dot.maintenance { background-color: #60A5FA; /* blue-400 */ }
      .mrs-theme-dark .mrx-status-dot.unknown { background-color: #6B7280; /* gray-500 */ }

      /* Loading/Error states */
      .mrs-theme-light .mrx-status-loading,
      .mrs-theme-light .mrx-status-error { color: #6B7280; } /* gray-500 */
      .mrs-theme-dark .mrx-status-loading,
      .mrs-theme-dark .mrx-status-error { color: #9CA3AF; } /* gray-400 */

      .mrx-status-widget .mrx-spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: mrs-spin 1s linear infinite;
        margin-right: 6px;
      }
      @keyframes mrs-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleElement);
  };

  const renderLoading = (container) => {
    container.innerHTML = `
        <div class="mrx-spinner"></div>
        <span class="mrx-status-text mrx-status-loading">Loading status...</span>
    `;
  };

  const renderError = (container, message) => {
    container.innerHTML = `
        <span class="mrx-status-dot unknown"></span>
        <span class="mrx-status-text mrx-status-error">${message || 'Error loading status'}</span>
    `;
  };

  const renderOverallStatus = (container, data) => {
    if (!data || !data.overallStatus) {
      renderError(container, 'Status data unavailable.');
      return;
    }
    const { level, message } = data.overallStatus;
    const statusClass = level.toLowerCase().replace(/\s+/g, '_');
    
    container.innerHTML = `
      <span class="mrx-status-dot ${statusClass}"></span>
      <span class="mrx-status-text">${message}</span>
    `;
  };

  const fetchData = async () => {
    const container = createContainer();
    renderLoading(container);

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      renderError(container, 'API key missing in script.');
      return;
    }

    try {
      const apiUrl = `${window.location.origin}/api/status?apiKey=${apiKey}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorMsg = `HTTP error ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) { /* ignore parse error */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();

      if (embedType === 'overall') {
        renderOverallStatus(container, data);
      } else {
        renderError(container, `Embed type "${embedType}" not supported.`);
      }
    } catch (error) {
      console.error('MRX Status Embed Error:', error);
      renderError(container, error.message);
    }
  };

  createStyles();
  fetchData();

})();
