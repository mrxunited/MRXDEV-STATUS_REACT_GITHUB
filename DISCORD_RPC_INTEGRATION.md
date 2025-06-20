
# Discord Rich Presence (RPC) Integration Guide

This guide provides conceptual steps for integrating Discord Rich Presence into an application. True Rich Presence, especially for web applications, often requires a local helper application or proxy due to browser limitations.

## 1. Prerequisites

*   **Discord Developer Application:**
    *   Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    *   Create a new application.
    *   Note down the **Client ID**.
    *   (Optional) Upload Rich Presence Assets (images) under the "Rich Presence" -> "Art Assets" section. These will be referenced by keys.

*   **Discord SDK/RPC Library:**
    *   For Node.js or Electron applications (which might act as a helper for a web app), you'd typically use a library like `discord-rpc`.
      ```bash
      npm install discord-rpc
      # or
      yarn add discord-rpc
      ```
    *   For web-only solutions, direct RPC is not feasible. You would need to communicate with a local proxy/helper application that uses such a library.

## 2. Conceptual Integration Steps (using a helper/proxy model)

The following steps assume you have a local helper application (e.g., built with Node.js/Electron) that the web frontend can communicate with (e.g., via WebSockets or local HTTP requests).

### Helper Application (Node.js/Electron Example using `discord-rpc`)

```javascript
// helper-app.js (Simplified Example)
const RPC = require('discord-rpc');

const clientId = 'YOUR_CLIENT_ID_HERE'; // Replace with your actual Client ID
const rpc = new RPC.Client({ transport: 'ipc' });

rpc.on('ready', () => {
  console.log('Discord RPC: Ready');
  // Initially set some activity or wait for instructions from web app
  setActivity({
    details: 'Browsing the web',
    state: 'On a cool site!',
    startTimestamp: Date.now(),
    largeImageKey: 'main_logo', // Asset key from Discord Developer Portal
    largeImageText: 'My Awesome App',
  });
});

async function setActivity(activityData) {
  if (!rpc || !clientId) {
    return;
  }
  try {
    await rpc.setActivity(activityData);
    console.log('Discord RPC: Activity updated');
  } catch (error) {
    console.error('Discord RPC: Failed to set activity', error);
  }
}

// Example: Listen for activity updates from your web application
// (e.g., via a WebSocket server or local HTTP server in this helper)
// wsServer.on('connection', ws => {
//   ws.on('message', message => {
//     try {
//       const activityData = JSON.parse(message);
//       setActivity(activityData);
//     } catch (e) {
//       console.error('Failed to parse activity data:', e);
//     }
//   });
// });

rpc.login({ clientId }).catch(console.error);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down RPC client...');
  await rpc.destroy();
  process.exit(0);
});
```

### Web Application (Frontend - `App.tsx` or a dedicated service)

1.  **Establish Communication:** Implement a way for your web app to send messages to the local helper application (e.g., WebSocket client connecting to `ws://localhost:PORT`).
2.  **Send Activity Updates:** When the user's state changes (e.g., navigates to a new page, performs an action), send the desired Rich Presence data to the helper.

    ```typescript
    // Conceptual function in your web app
    function sendRichPresenceUpdate(activityData: {
      details?: string;
      state?: string;
      startTimestamp?: number; // Unix epoch ms
      largeImageKey?: string;
      largeImageText?: string;
      // ... other fields
    }) {
      // Example: using a WebSocket instance `ws`
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(activityData));
      } else {
        console.warn('WebSocket to RPC helper not available.');
      }
    }

    // Usage Example:
    // In a useEffect or event handler in App.tsx or a relevant component
    useEffect(() => {
      // Assuming discordSettings is available and RPC is enabled by user
      if (discordSettings.enableRichPresence) {
        sendRichPresenceUpdate({
          details: discordSettings.defaultRichPresenceDetails || 'Managing Status Platform',
          state: discordSettings.defaultRichPresenceState || 'MRX United Admin',
          // Dynamically add current section if configured
          // state: discordSettings.showSectionInPresence ? `Viewing: ${currentPageName}` : discordSettings.defaultRichPresenceState,
          startTimestamp: discordSettings.showTimestampInPresence ? Date.now() : undefined,
          // largeImageKey: 'your_asset_key',
          // largeImageText: 'Site Name',
        });
      }
    }, [location.pathname, discordSettings]); // Update on page change or settings change
    ```

## 3. Core Rich Presence Fields

*   `details`: The main description (e.g., "Browsing Users Page").
*   `state`: Sub-description or status (e.g., "Editing User ID: 123").
*   `startTimestamp`: Unix timestamp (milliseconds) for "elapsed" time.
*   `endTimestamp`: Unix timestamp (milliseconds) for "time left".
*   `largeImageKey`: Key of the large image asset uploaded to Discord.
*   `largeImageText`: Tooltip text for the large image.
*   `smallImageKey`: Key of the small image asset.
*   `smallImageText`: Tooltip text for the small image.
*   `instance`: (Boolean) Whether this instance of the game is the primary one.

## 4. Security & Practical Considerations

*   **Client ID:** The Client ID is generally safe to expose in client-side code if necessary, but the communication mechanism to a local RPC client is the sensitive part.
*   **User Consent:** Always provide a way for users to enable/disable Rich Presence integration in your application's settings.
*   **Helper Application:**
    *   The helper application needs to be installed and running on the user's machine.
    *   Consider packaging (e.g., with Electron Packager or NSIS) and auto-updates for the helper.
    *   Secure communication between the web app and the helper (e.g., local server with token authentication if not using simple WebSockets to localhost).
*   **Error Handling:** Implement robust error handling for when the Discord client is not running or RPC connection fails.

## 5. Alternative: Web-Based RPC Proxies (Advanced)

Some community projects attempt to create web-friendly RPC proxies that might not require a full helper app, but these often have their own complexities and potential security concerns. They typically still involve a server component that interacts with the Discord API more directly, or a browser extension. This is beyond a simple client-side integration.

This guide focuses on the more traditional local helper model, as it's the most common way to achieve reliable Rich Presence from non-game applications.
The existing `DiscordSettingsContext.tsx` and `DiscordIntegrationPage.tsx` in your application provide a good starting point for managing user preferences for RPC. The actual RPC logic would then be triggered based on these settings.
    