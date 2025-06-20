
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext'; 
import { WidgetSettingsProvider } from './contexts/WidgetSettingsContext';
import { WidgetCustomizationProvider } from './contexts/WidgetCustomizationContext'; 
import { NotificationProvider } from './contexts/NotificationContext';
import { DatabaseStatusProvider } from './contexts/DatabaseStatusContext'; 
import { SiteIdentityProvider } from './contexts/SiteIdentityContext';
import { DiscordSettingsProvider } from './contexts/DiscordSettingsContext'; // Added
import { HashRouter } from 'react-router-dom';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <DatabaseStatusProvider> 
        <SettingsProvider>
          <SiteIdentityProvider>
            <DiscordSettingsProvider> {/* Added DiscordSettingsProvider */}
              <ThemeProvider>
                <NotificationProvider>
                  <WidgetCustomizationProvider> 
                    <WidgetSettingsProvider>
                      <AuthProvider>
                        <App />
                      </AuthProvider>
                    </WidgetSettingsProvider>
                  </WidgetCustomizationProvider>
                </NotificationProvider>
              </ThemeProvider>
            </DiscordSettingsProvider>
          </SiteIdentityProvider>
        </SettingsProvider>
      </DatabaseStatusProvider>
    </HashRouter>
  </React.StrictMode>
);