
# MRX United Status Admin Dashboard

A modern, intuitive status dashboard for MRX United, tailored for internal administrative use. Displays real-time system status, user activity, service uptime, and error reports. This platform also provides a public-facing status page for end-users.

## Table of Contents

1.  [Features](#features)
2.  [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Appwrite Backend Setup](#appwrite-backend-setup)
    *   [Environment Variables](#environment-variables)
3.  [Local Development & Testing](#local-development--testing)
    *   [Running the Application](#running-the-application)
    *   [Mock Data Mode](#mock-data-mode)
4.  [Building & Deployment](#building--deployment)
5.  [Using the Application](#using-the-application)
    *   [Admin Panel](#admin-panel)
    *   [Public Status Page](#public-status-page)
    *   [API Endpoint](#api-endpoint)
6.  [Troubleshooting](#troubleshooting)

## Features

*   **Admin Dashboard:** Centralized interface for managing status information.
    *   Real-time internal system health monitoring.
    *   User activity logging.
    *   Service uptime and error reporting.
*   **Public Status Page Management:**
    *   Create, update, and manage public services and service groups.
    *   Report and manage incidents and scheduled maintenance.
    *   Post-Incident Review (De-Brief) management.
    *   Manage guest-submitted issue reports.
*   **User & Access Management:**
    *   Admin, Support, and Viewer roles.
    *   API Key generation and management for external integrations.
*   **Customization:**
    *   Site appearance (name, logo, favicon, footer).
    *   Widget visibility and settings for the admin dashboard.
    *   Customizable incident severity levels and status types.
*   **Integrations:**
    *   Discord integration for notifications and (conceptual) Rich Presence.
*   **Embeddable Widget:** Generate a script to embed a status widget on external sites.
*   **Public API Endpoint:** Provides status information in JSON format.

## Getting Started

### Prerequisites

*   A modern web browser (Chrome, Firefox, Safari, Edge).
*   A simple HTTP server for local development (e.g., VS Code Live Server, Python's `http.server`, `npx serve`).
*   An Appwrite instance (self-hosted or cloud) for live data functionality.

### Appwrite Backend Setup

For the application to connect to a live backend and persist data, an Appwrite project must be set up.

1.  **Follow the instructions in [`DATABASE_SETUP.md`](./DATABASE_SETUP.md)** to create the necessary Appwrite project, database, collections, and attributes.
2.  **Update Configuration:**
    *   Open `src/constants.ts`.
    *   Modify the `APPWRITE_CONFIG` object with your Appwrite project's `endpoint`, `projectId`, and `databaseId`, along with all specified `collectionId`s.

    ```typescript
    // src/constants.ts
    export const APPWRITE_CONFIG: AppwriteConfig = {
      endpoint: 'YOUR_APPWRITE_ENDPOINT', // e.g., 'https://cloud.appwrite.io/v1'
      projectId: 'YOUR_APPWRITE_PROJECT_ID',
      databaseId: 'YOUR_DATABASE_ID',
      // ... other collection IDs ...
    };
    ```

### Environment Variables

*   **Gemini API Key (if using Gemini features):**
    The application is structured to potentially use the Gemini API via `@google/genai`. If you integrate features that call Gemini models, ensure the API key is available as an environment variable `process.env.API_KEY` in the execution context where the `@google/genai` client is initialized.
    *   For client-side Gemini usage (as would be the case in this pure frontend app), this typically means you'd need a server-side proxy to securely handle the API key, or you'd use a build tool to inject it. **Directly embedding API keys in client-side code is insecure.** This boilerplate assumes the key's availability if Gemini features are implemented.

## Local Development & Testing

### Running the Application

This application is a static site and can be run using any simple HTTP server.

1.  Ensure all project files (`index.html`, `index.tsx`, `global.css`, etc.) are in a directory.
2.  Serve the `index.html` file from the root of this directory using an HTTP server.
    *   **Example using VS Code Live Server:** Right-click `index.html` and select "Open with Live Server".
    *   **Example using Python:** Navigate to the project root in your terminal and run `python -m http.server`. Access at `http://localhost:8000`.
    *   **Example using `npx serve`:** Navigate to the project root and run `npx serve .`.

The application uses ES modules and imports dependencies dynamically from `esm.sh`. No `npm install` or traditional build step is required for basic local serving.

### Mock Data Mode

The application can run in "Mock Data Mode," which simulates backend responses without needing a live Appwrite connection. This is useful for UI development and testing.

*   **Automatic Fallback:** If Appwrite is not configured in `src/constants.ts` (i.e., placeholder values are still present), the application will automatically attempt to use mock data for read operations. Some write operations might be disabled or appear to work locally without persisting.
*   **Manual Toggle:**
    *   **UI Toggle:** In the admin panel header, there's a "Mock Data" toggle. Enabling this will force the app to use mock services for Appwrite interactions.
    *   **URL Parameter:** Appending `?mock=true` to the URL will force mock mode. `?mock=false` will attempt to use live data (if Appwrite is configured).
    *   **localStorage:** The UI toggle also sets a `mrx-mock-mode` item in localStorage to persist the choice.
*   **Behavior in Mock Mode:**
    *   Most data fetching will return pre-defined mock data from `src/services/appwrite/mockService.ts`.
    *   Data creation/update/deletion operations will appear to succeed locally by manipulating the mock data store in memory (or localStorage for some items like API keys), but will **not** persist to a live backend.
    *   The "Data Source" indicator in the admin footer will show the current mode (e.g., "Mock Data (Forced)", "DB Unconfigured (Mock Fallback)").

## Building & Deployment

This project, in its current state, does not have a complex build process (like Webpack or Parcel). It's designed to run directly from static files.

*   **"Building"** essentially means ensuring all your static assets (`index.html`, `index.tsx` which is transpiled by the browser via esbuild on `esm.sh`, `global.css`, images in `public/assets/`, `embed.js`, etc.) are correctly organized.
*   **Deployment:** To deploy the application, simply host all the files (maintaining the directory structure) on a static web hosting provider (e.g., Vercel, Netlify, GitHub Pages, AWS S3, etc.).

No compilation or bundling step is explicitly required *by this boilerplate's current setup*. The `index.tsx` is treated as an ES module and dependencies are fetched dynamically.

## Using the Application

### Admin Panel

Access the admin panel by navigating to `/admin/login` (e.g., `http://localhost:PORT/admin/login` or `YOUR_DEPLOYED_URL/admin/login`).

*   **Login:**
    *   If Appwrite is configured: Use credentials for users set up in Appwrite Authentication and also present in your `admin_users` database collection with appropriate roles.
    *   If in Mock Data Mode (and Appwrite isn't configured or is overridden):
        *   Admin: `admin@mrx.com` / `password`
        *   Support: `support@mrx.com` / `password`
*   **Dashboard (`/admin/dashboard`):**
    *   Overview of internal system health, quick links to manage public status page content, access to administration tools for Admins, and customizable widgets panel.
*   **Widget Settings (`/admin/widget-settings`):**
    *   Enable/disable and configure dashboard widgets (Clock, Calendar, Weather, etc.).
*   **Manage Services (`/admin/services`):**
    *   Define services for the public status page, including status, descriptions, ping monitoring, and subcomponents.
*   **Service Groups (`/admin/service-groups`):**
    *   Organize services into logical groups.
*   **Manage Incidents (`/admin/incidents`):**
    *   Report new incidents, schedule maintenance, post updates, and resolve issues.
    *   Link to Decision Flows and manage Post-Incident Reviews (De-Briefs).
*   **Decision Flows (`/admin/decision-flows`):**
    *   Create and manage standardized playbooks/checklists for responding to incidents.
*   **De-Briefs (`/admin/reviews`):**
    *   Document Post-Incident Reviews, linking them to resolved incidents/completed maintenance.
*   **Guest Reports (`/admin/guest-reports`):**
    *   Review and manage issue reports submitted by public users. Convert reports into official incidents.
*   **Embed Script (`/admin/embed-generator`):**
    *   Generate JavaScript snippets to embed a status widget on external websites.
*   **User Management (`/admin/users` - Admin Role Only):**
    *   Add, edit, and delete admin panel users (Admin, Support, Viewer roles).
*   **API Key Management (`/admin/api-keys` - Admin Role Only):**
    *   Generate and revoke API keys for programmatic access to the status API.
*   **Site Appearance (`/admin/site-appearance` - Admin Role Only):**
    *   Customize site name, logo, favicon, footer text, and meta description.
*   **Activity Logs (`/admin/activity-logs` - Admin Role Only):**
    *   View a comprehensive log of actions performed within the admin panel and key system events.
*   **Integrations (`/admin/integrations/discord` - Admin Role Only):**
    *   Configure Discord webhook URLs for various notifications.
    *   Set up conceptual Discord Rich Presence settings. For details, see `DISCORD_INTEGRATION_GUIDE.md` and `DISCORD_RPC_INTEGRATION.md`.
*   **Field Customization (`/admin/field-customization/*` - Admin Role Only):**
    *   Manage custom Severity Levels for incidents.
    *   Manage custom Incident Status types.

### Public Status Page

Accessible at the root path (e.g., `http://localhost:PORT/` or `YOUR_DEPLOYED_URL/`).

*   Displays the overall system status.
*   Lists services and their current statuses, grouped by service groups, including subcomponent status if applicable.
*   Shows active incidents and maintenance events with detailed updates.
*   Provides a filterable history of past incidents.
*   Allows users to report issues via the "Report Issue" button, which opens a modal form.

### API Endpoint

A JSON API endpoint is available at `/api/status?apiKey=YOUR_API_KEY`.

*   Requires a valid API key generated from the admin panel.
*   Returns a comprehensive JSON object with overall status, service details (grouped and ungrouped), active incidents, scheduled maintenance, and a summary of recent incident history.

## Troubleshooting

*   **Appwrite Connection Issues:**
    *   Verify `APPWRITE_CONFIG` in `src/constants.ts` is correct and does not contain placeholder values.
    *   Ensure your Appwrite instance is running, accessible, and the project/database exists.
    *   Check collection IDs and permissions in your Appwrite project match `DATABASE_SETUP.md`.
    *   The "Database Error Banner" or "Mock Mode Banner" at the top of the admin panel provides clues about the data source status.
*   **Mock Data Not Working as Expected:**
    *   Check localStorage for `mrx-mock-mode` (true/false) or use the `?mock=true` URL parameter to force it.
    *   Remember that write operations in mock mode are typically not persisted to a live backend and may only affect the current session's in-memory mock data.
*   **API Key for Embed/API Endpoint Not Working:**
    *   Ensure the API key is correctly copied from the "API Key Management" page and is not revoked.
    *   The key must be for an admin user with appropriate permissions if the API logic implies user-specific data (though current status API is generally public read for validated keys).
*   **Discord Notifications Not Sending:**
    *   Verify the Webhook URL is correct and saved in the Discord Integration settings.
    *   Ensure the "Enable" toggle for the specific alert type is active.
    *   Use the "Test Webhook" button in the Discord settings page to check basic connectivity.
    *   Consult `DISCORD_INTEGRATION_GUIDE.md` for webhook setup details.
*   **Rich Presence Not Working:**
    *   True Rich Presence requires a local Discord client and often a helper application. The in-app settings are conceptual for what data *would* be sent. See `DISCORD_RPC_INTEGRATION.md`.
*   **Styling or Script Issues:**
    *   Clear your browser cache.
    *   Check the browser's developer console for JavaScript errors or network issues (e.g., failing to load dependencies from `esm.sh`).

For further issues, check the browser's developer console for detailed error messages.
```