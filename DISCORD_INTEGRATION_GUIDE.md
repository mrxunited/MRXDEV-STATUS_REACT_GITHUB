
# Discord Integration Guide for MRX United Status Platform

This guide explains how to integrate your MRX United Status Platform with Discord to receive real-time notifications for important events.

## Table of Contents
1.  [Purpose of the Integration](#1-purpose-of-the-integration)
2.  [Prerequisites: Setting up Discord Webhooks](#2-prerequisites-setting-up-discord-webhooks)
3.  [Configuring Discord Integration in the Admin Panel](#3-configuring-discord-integration-in-the-admin-panel)
    *   [Accessing Discord Settings](#accessing-discord-settings)
    *   [Configuration Fields](#configuration-fields)
    *   [Saving Settings](#saving-settings)
    *   [Testing Webhooks](#testing-webhooks)
4.  [How Notifications Work](#4-how-notifications-work)
    *   [Incident Alerts](#incident-alerts)
    *   [Maintenance Alerts](#maintenance-alerts)
    *   [Guest Report Alerts](#guest-report-alerts)
    *   [Admin Activity Alerts](#admin-activity-alerts)
5.  [Admin Rich Presence (Conceptual)](#5-admin-rich-presence-conceptual)
6.  [Troubleshooting](#6-troubleshooting)

## 1. Purpose of the Integration

The Discord integration allows your status platform to send automated notifications directly to specified channels in your Discord server. This helps keep your team and/or community informed about:

*   **New Incidents:** When an incident is created or updated.
*   **Scheduled Maintenance:** When maintenance is scheduled, started, or completed.
*   **New Guest Reports:** When a public user submits an issue report.
*   **Admin Activity:** (Optional) Key actions performed within the admin panel.

## 2. Prerequisites: Setting up Discord Webhooks

The primary way this application sends notifications to Discord is via **Webhooks**. A Webhook provides a unique URL that the application can send messages to, which then appear in a designated Discord channel.

**Steps to Create a Webhook in Discord:**

1.  **Open Discord Server Settings:**
    *   In your Discord server, right-click the server icon and go to "Server Settings", or click the server name and select "Server Settings".
    *   You need "Manage Webhooks" permission in the server or specific channel.
2.  **Navigate to Integrations:**
    *   In the Server Settings menu, find the "Integrations" tab.
3.  **Create Webhook:**
    *   Click on "Webhooks" (or "View Webhooks" then "New Webhook").
    *   Click the "New Webhook" button.
4.  **Configure the Webhook:**
    *   **Name:** Give your webhook a descriptive name (e.g., "Status Page Alerts", "Incidents Bot"). This will be the default name messages are posted under.
    *   **Channel:** Select the Discord channel where you want notifications from this webhook to be posted.
    *   **Avatar:** (Optional) You can set a default avatar for messages from this webhook.
5.  **Copy Webhook URL:**
    *   Once created, click the "Copy Webhook URL" button. This URL is what you'll paste into the status platform's admin panel. **Keep this URL secure, as anyone with it can post messages to that channel.**
6.  **Repeat for Different Notification Types (Recommended):**
    *   It's good practice to create separate webhooks for different types of alerts (e.g., one for incidents, one for maintenance, one for guest reports) so you can send them to different channels if needed.

**Note on Channel IDs:**
While the settings form includes fields for "Channel IDs", these are typically used for more advanced bot interactions (e.g., slash commands) that require a bot token. For the notification system described here, **Webhook URLs are the key component.**

## 3. Configuring Discord Integration in the Admin Panel

### Accessing Discord Settings

1.  Log in to the MRX United Admin Panel.
2.  In the sidebar, navigate to **Integrations** -> **Discord**.
    *   This will take you to the `/admin/integrations/discord` page.

### Configuration Fields

You'll find the following fields:

*   **Credentials (Handle with Care):**
    *   `Bot Token`: Primarily used if you were running a full Discord bot for commands or more complex interactions. **For simple webhook notifications, this is often not required by this application.**
    *   `Client ID`: The ID of your Discord Developer Application. Used for OAuth2 or Rich Presence.
    *   `Client Secret`: The secret for your Discord Developer Application. **Handle with extreme caution.**
    *   **Security Warning:** Storing Bot Tokens or Client Secrets directly is not recommended for production. For the webhook-based notifications provided by this application, these fields might not be necessary unless you plan to extend functionality.

*   **Webhook Configuration:**
    *   `Main Webhook URL`: A general webhook URL. Can be used as a fallback or for general announcements if specific ones aren't set.
    *   `Incident Alert Channel Webhook URL`: Paste the Webhook URL for the channel where you want incident-related notifications.
    *   `Maintenance Alert Channel Webhook URL`: Paste the Webhook URL for maintenance notifications.
    *   `Guest Report Alert Channel Webhook URL`: Paste the Webhook URL for notifications about new guest-submitted reports.
    *   `Admin Activity Alert Channel Webhook URL`: Paste the Webhook URL for logs of admin actions.

*   **Notification Toggles:**
    *   `Enable Incident Alerts`: Check to send notifications for new/updated incidents.
    *   `Enable Maintenance Alerts`: Check to send notifications for maintenance events.
    *   `Enable Guest Report Alerts`: Check to send notifications when guests submit reports.
    *   `Enable Admin Activity Alerts`: Check to log admin actions to Discord.

*   **Admin Rich Presence (Conceptual):**
    *   `Enable Rich Presence for My Account`: Toggles Rich Presence for your admin user *while viewing the dashboard*. (See section 5 for details).
    *   `Default "Details" Text`: Default text for the "details" field in Rich Presence.
    *   `Default "State" Text`: Default text for the "state" field in Rich Presence.
    *   `Show Current Dashboard Section`: If enabled, tries to show which section of the admin panel you are viewing.
    *   `Show "Since [Time]"`: If enabled, shows how long you've been active.

### Saving Settings
After filling in the desired fields, click the **"Save Discord Settings"** button at the bottom of the form.

### Testing Webhooks
*   Once you've configured and saved a `Main Webhook URL`, you can use the **"Test"** button next to it.
*   This will attempt to send a simple test message to that webhook URL. Check the configured Discord channel to confirm receipt.

## 4. How Notifications Work

When specific events occur in the status platform and the corresponding "Enable" toggle is checked in the Discord settings:

1.  The application backend (or a service worker, depending on implementation) detects the event.
2.  It formats a message, typically as a Discord Embed, containing relevant details.
3.  It sends this formatted message to the Webhook URL you configured for that alert type.
4.  Discord receives the message via the webhook and posts it into the designated channel.

### Incident Alerts
*   Sent when new incidents are created or significant updates are posted.
*   Includes incident title, current status, impact, affected services, and the latest update message.

### Maintenance Alerts
*   Sent for scheduled maintenance events (e.g., when created, started, or completed).
*   Includes maintenance title, status, schedule, and affected services.

### Guest Report Alerts
*   Sent when a public user submits an issue report via the "Report Issue" feature on the public status page.
*   Includes the service reported, description, and submitter's email (if provided).

### Admin Activity Alerts
*   (If enabled) Sends a log of key actions performed by administrators in the panel, such as creating/updating services or incidents, or user management changes.

## 5. Admin Rich Presence (Conceptual)

Rich Presence allows Discord to show what you're doing in an application as your status. For this web-based admin panel:

*   **Enabling it in settings** will attempt to update your Discord status *if you have a local Discord client running and capable of RPC interaction*.
*   **Web browsers cannot directly interact with the Discord desktop client's RPC server.**
*   This feature often relies on a **local helper application** that bridges the web app to the Discord client. Refer to `DISCORD_RPC_INTEGRATION.md` for more technical details on setting up such a helper if you wish to achieve full Rich Presence.
*   The "Test Rich Presence" button will log the intended activity data to the browser console, simulating what would be sent to a helper application.

## 6. Troubleshooting

*   **Notifications Not Appearing:**
    *   Double-check that the Webhook URL is correctly copied and pasted into the admin panel settings.
    *   Ensure the "Enable" toggle for the specific alert type is checked.
    *   Verify the webhook is still valid in your Discord server settings (it hasn't been deleted).
    *   Check the channel permissions for the webhook in Discord.
    *   Use the "Test" button for the Main Webhook URL to confirm basic connectivity.
    *   Look for any error messages in the browser console or application logs (if available).
*   **Invalid Webhook URL Error:**
    *   Ensure the URL starts with `https://discord.com/api/webhooks/`.
    *   Make sure there are no extra spaces or characters.
*   **Rich Presence Not Working:**
    *   This is expected for a purely web-based setup without a local helper application. The settings here are for configuring what *would* be sent if such a helper were active.

For further assistance, consult the application's main documentation or contact support.
