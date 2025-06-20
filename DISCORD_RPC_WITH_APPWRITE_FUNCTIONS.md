
# Discord Bot Rich Presence with Appwrite Functions

This guide outlines how to use Appwrite Functions to manage and update the Rich Presence (activity status) of a **dedicated Discord Bot** associated with your MRX United Status Platform. This allows your bot to display dynamic information about the platform's status directly in its Discord profile.

**Note:** This approach updates the presence of a *Bot User* in your Discord server. It is distinct from individual user Rich Presence (which shows what a specific logged-in Discord user is doing on their own profile) that typically requires integration with the user's local Discord client.

## Use Cases for Bot Presence via Appwrite Functions:

*   Displaying overall system status (e.g., "Watching: All Systems Operational").
*   Showing the number of active incidents (e.g., "Playing: 1 Active Incident").
*   Indicating when the dashboard was last updated or checked.

## 1. Prerequisites

*   **Discord Bot User:**
    1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    2.  Create a new application or use an existing one.
    3.  Navigate to the "Bot" tab.
    4.  Click "Add Bot" and confirm.
    5.  **Copy the Bot Token:** Under the bot's username, click "Reset Token" (or "View Token" if already generated). Copy this token. **Treat this token like a password; keep it secure.**
    6.  (Optional) Enable "Presence Intent" and "Server Members Intent" under "Privileged Gateway Intents" if your bot logic requires them (for basic presence updates, they might not be strictly needed, but `discord.js` might require some).
    7.  Invite this bot to your Discord server using an OAuth2 URL generator (e.g., from the "OAuth2" -> "URL Generator" tab in the Developer Portal, select `bot` scope).

*   **Appwrite Project:**
    *   An existing Appwrite project where your status dashboard data is stored.
    *   Appwrite CLI installed and logged in to your project.

*   **Node.js Environment:** For creating and deploying the Appwrite Function.

## 2. Setting up the Appwrite Function

### 2.1. Create the Function

1.  Open your terminal in your project directory.
2.  Initialize a new Appwrite Function:
    ```bash
    appwrite init function
    ```
3.  Follow the prompts:
    *   **Name your function:** e.g., `updateDiscordBotPresence`
    *   **Choose your runtime:** Select a Node.js runtime (e.g., Node.js 18.0 or later).

### 2.2. Install Dependencies

Navigate into your newly created function's directory (e.g., `updateDiscordBotPresence`).
Install `discord.js` for interacting with the Discord API and `node-appwrite` if your function needs to fetch data from your Appwrite database.

```bash
cd updateDiscordBotPresence
npm install discord.js node-appwrite
```

Your `package.json` in this function folder should look something like this:
```json
{
  "name": "updatediscordbotpresence",
  "version": "1.0.0",
  "description": "Appwrite function to update Discord bot presence.",
  "main": "src/index.js", // Or your main file name
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "discord.js": "^14.7.1", // Or a more recent stable version
    "node-appwrite": "^11.0.0" // Or a more recent version
  }
}
```

### 2.3. Configure Environment Variables

In the Appwrite Console, navigate to your function's settings page ("Functions" -> select your function -> "Settings" tab -> "Variables"). Add the following environment variables:

*   `DISCORD_BOT_TOKEN`: The bot token you copied earlier.
*   `APPWRITE_ENDPOINT`: Your Appwrite project's API endpoint (e.g., `https://cloud.appwrite.io/v1`).
*   `APPWRITE_PROJECT_ID`: Your Appwrite project ID.
*   `APPWRITE_API_KEY`: An Appwrite API Key with necessary permissions (e.g., `databases.read` if fetching status data). **Store this securely.**
*   (Optional) `DATABASE_ID`, `COLLECTION_ID_SERVICES`, etc., if your function will fetch specific data.

## 3. Function Code (Example: `src/index.js`)

This example function will log in as the bot, set a presence, and then log out. Appwrite Functions are typically short-lived, so the bot logs in for each execution. Discord usually retains the last set presence for some time.

```javascript
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const sdk = require('node-appwrite');

module.exports = async (req, res) => {
    const {
        DISCORD_BOT_TOKEN,
        APPWRITE_ENDPOINT,
        APPWRITE_PROJECT_ID,
        APPWRITE_API_KEY,
        DATABASE_ID, // Example: if you fetch status
        SERVICES_COLLECTION_ID // Example: if you fetch status
    } = process.env;

    if (!DISCORD_BOT_TOKEN || !APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
        console.error('Missing required environment variables for Discord bot presence function.');
        return res.json({ success: false, error: 'Function configuration incomplete.' }, 500);
    }

    const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] }); // Minimal intents

    // Initialize Appwrite client (optional, if fetching data from Appwrite DB)
    // const appwriteClient = new sdk.Client()
    //     .setEndpoint(APPWRITE_ENDPOINT)
    //     .setProject(APPWRITE_PROJECT_ID)
    //     .setKey(APPWRITE_API_KEY);
    // const databases = new sdk.Databases(appwriteClient);

    try {
        await discordClient.login(DISCORD_BOT_TOKEN);
        console.log(`Logged in to Discord as ${discordClient.user.tag}!`);

        // --- Logic to Determine Bot Presence ---
        // This is where you'd customize the activity based on your platform's status.
        // Example: Set a default presence or fetch data from Appwrite to make it dynamic.
        
        let activityDetails = 'System Status'; // Default details
        let activityName = 'Monitoring...';    // Default state/name
        let activityType = ActivityType.Watching;

        // Example: Fetch overall status (simplified - adapt to your actual data structure)
        // try {
        //     const overallStatusDoc = await databases.getDocument(DATABASE_ID, YOUR_OVERALL_STATUS_COLLECTION_ID, 'current_status_doc_id');
        //     activityName = overallStatusDoc.statusMessage || 'All Systems Operational';
        //     if (overallStatusDoc.level === 'OPERATIONAL') activityType = ActivityType.Watching;
        //     else activityType = ActivityType.Playing; // e.g., "Playing: With 1 Incident"
        // } catch (dbError) {
        //     console.warn('Could not fetch dynamic status from Appwrite DB for bot presence:', dbError.message);
        // }

        // If payload is sent to the function (e.g., via HTTP trigger)
        if (req.body) {
            const payload = JSON.parse(req.body);
            activityDetails = payload.details || activityDetails;
            activityName = payload.name || activityName; // 'name' is the main text for most activities
            if (payload.type && ActivityType[payload.type] !== undefined) {
                 activityType = ActivityType[payload.type as keyof typeof ActivityType];
            }
        }

        await discordClient.user.setPresence({
            activities: [{
                name: activityName,
                type: activityType,
                // details: activityDetails, // 'details' not directly supported for bot presence like user RPC. Include in 'name' or use custom status.
            }],
            status: 'online', // 'online', 'idle', 'dnd', 'invisible'
        });

        console.log(`Discord bot presence updated: ${ActivityType[activityType]} ${activityName}`);
        
        await discordClient.destroy(); // Log out the bot
        return res.json({ success: true, message: 'Discord bot presence updated successfully.' });

    } catch (error) {
        console.error('Error in Discord presence function:', error);
        if (discordClient.isReady()) {
            await discordClient.destroy();
        }
        return res.json({ success: false, error: error.message }, 500);
    }
};
```

**Key points in the function code:**
*   It retrieves necessary secrets from environment variables.
*   Initializes the `discord.js` client and logs in.
*   **Presence Logic:** Contains placeholder logic for setting `activityName`, `activityDetails`, and `activityType`. You'll need to customize this to fetch real data from your Appwrite database or use data passed in the function's `req.payload` if triggered via HTTP.
*   `client.user.setPresence()`: This is the core `discord.js` method to update the bot's activity.
*   `client.destroy()`: Logs out the bot. Since Appwrite functions are short-lived, the bot logs in, sets presence, and logs out on each execution. Discord usually retains the last set presence.

## 4. Triggering the Appwrite Function

You can trigger this function in several ways:

*   **Scheduled Task (Cron Job):**
    *   In the Appwrite Console, go to your function's "Settings" tab.
    *   Under "Schedule (Cron Syntax)", set a cron expression (e.g., `0 */5 * * * *` to run every 5 minutes).
    *   The function will then periodically fetch data (if you implement that part) and update the bot's presence.

*   **HTTP POST Request:**
    *   Enable "Execute Access" for desired users/roles or make it public (with API key auth if needed) in the function's settings.
    *   Your admin panel (or another backend service) can then make an HTTP POST request to the function's endpoint.
    *   You can pass a JSON body with `details`, `name`, and `type` to customize the presence dynamically.
        **Example Frontend Call (conceptual):**
        ```typescript
        // In your admin panel's DiscordIntegrationPage.tsx or a service
        import { functions } from '../services/appwrite'; // Assuming Appwrite client SDK setup

        async function updateBotPresenceViaFunction(payload: { name: string, type: string, details?: string }) {
            try {
                // Replace 'updateDiscordBotPresence' with your function's name/ID
                const result = await functions.createExecution('updateDiscordBotPresence', JSON.stringify(payload));
                console.log('Bot presence update triggered:', result);
                // Add success notification
            } catch (error) {
                console.error('Failed to trigger bot presence update:', error);
                // Add error notification
            }
        }

        // Example usage:
        // updateBotPresenceViaFunction({ name: "1 Active Incident", type: "Playing", details: "Investigating API slowdown" });
        ```

*   **Appwrite Database Events:**
    *   Configure the function to trigger when a document in a specific collection (e.g., `public_incidents`) is created or updated.
    *   The function will receive event data in `req.payload` (e.g., `req.payload.$id` of the changed document).
    *   It can then fetch the document details and update the bot's presence accordingly.
    *   In function settings, under "Events", add events like `databases.*.collections.YOUR_INCIDENTS_COLLECTION_ID.documents.*.create`.

## 5. Deploying the Function

1.  Navigate to your Appwrite project's root in the terminal.
2.  Deploy the function:
    ```bash
    appwrite deploy function
    ```
3.  Select your function (`updateDiscordBotPresence`) when prompted.
4.  Confirm the deployment. The Appwrite CLI will package your function and its dependencies.

## 6. Rich Presence Fields for Bot Activities

The `activities` array in `client.user.setPresence()` takes objects with:
*   `name`: The main text of the activity (e.g., "All Systems Operational").
*   `type`: An `ActivityType` enum from `discord.js`:
    *   `ActivityType.Playing` (Shows as "Playing...")
    *   `ActivityType.Streaming` (Shows as "Streaming...". Requires a `url` property for Twitch/YouTube.)
    *   `ActivityType.Listening` (Shows as "Listening to...")
    *   `ActivityType.Watching` (Shows as "Watching...")
    *   `ActivityType.Competing` (Shows as "Competing in...")
    *   `ActivityType.Custom` (Allows custom status with emoji. Requires `state` field for text).
*   `url`: (Optional) URL for `Streaming` type.

The `status` field in `setPresence` can be: `online`, `idle`, `dnd` (Do Not Disturb), or `invisible`.

## 7. Limitations and Considerations

*   **Function Execution Time:** Appwrite Functions have execution time limits. Ensure your function (including Discord login and data fetching) completes within these limits.
*   **Stateless Nature:** Functions are stateless. The bot logs in and out for each execution. Discord typically holds the last set presence for a reasonable duration.
*   **Rate Limits:** Be mindful of Discord API rate limits if triggering the function very frequently.
*   **Error Handling:** Implement robust error handling within your function.
*   **Security:** Store your `DISCORD_BOT_TOKEN` and `APPWRITE_API_KEY` securely as environment variables in the Appwrite console, not in your function's code.

This approach provides a serverless way to keep your Discord community informed about your platform's status via a bot's presence, orchestrated by Appwrite Functions.
      