# MRX United Status Platform - Live Appwrite Database Setup Guide

This document outlines the database collections, attributes, and example structures required for the MRX United status platform when using a **live Appwrite backend**.

**Important Note on Application Behavior:**
The application is designed to connect to a live Appwrite instance if connection details are properly configured in `src/constants.ts` (specifically `APPWRITE_CONFIG`). If Appwrite is not configured, or if "Mock Data Mode" is explicitly enabled (via UI toggle or `?mock=true` URL parameter), the application will fall back to using **mock data** (`src/services/appwrite/mockService.ts`). This ensures functionality for development and in scenarios where a live database connection is unavailable.

This document serves as the blueprint for setting up the necessary Appwrite collections for full application functionality.

## General Setup

1.  **Create an Appwrite Project:** If you haven't already, create a project in your Appwrite console.
2.  **Obtain Project Details:** Note your Project ID and API Endpoint.
3.  **Create a Database:** Within your Appwrite project, create a new database. Note its Database ID.
4.  **Update `constants.ts`:** In the application's `src/constants.ts` file, update the `APPWRITE_CONFIG` object with your actual `endpoint`, `projectId`, and `databaseId`.

    ```typescript
    export const APPWRITE_CONFIG: AppwriteConfig = {
      endpoint: 'YOUR_APPWRITE_ENDPOINT', // e.g., 'https://cloud.appwrite.io/v1'
      projectId: 'YOUR_APPWRITE_PROJECT_ID',
      databaseId: 'YOUR_DATABASE_ID',
      // ... collection IDs ...
    };
    ```

## Collections and Attributes

For each collection listed below:
*   Create the collection in your Appwrite database using the specified **Collection ID** (matches the `...CollectionId` in `constants.ts`).
*   Define the **Custom Attributes** as detailed. Attributes managed by Appwrite (like `$id`, `$createdAt`, `$updatedAt`, `$permissions`) are not listed under "Custom Attributes" but are used by the application.
*   Set **Permissions** appropriately:
    *   Publicly readable data (e.g., `public_services`, `public_incidents`, `service_groups`): Grant `Read` access to `role:all`.
    *   Admin-managed data (writing to any collection, `admin_users`, `api_keys`, `incident_reviews`): Restrict `Create`, `Update`, `Delete` access to authenticated users with specific roles (e.g., 'Admin', 'Support') or to users themselves for their own data (e.g., an admin user managing their own API keys). You can manage roles using Appwrite Teams or by checking attributes on the user's document in the `admin_users` collection.
*   Create **Indexes** on frequently queried or sorted attributes for optimal performance.


---

### 1. Service Groups (`service_groups`)
Stores definitions for groups that categorize services.
**Collection ID:** `service_groups` (defined in `APPWRITE_CONFIG.serviceGroupsCollectionId`)

**Custom Attributes:**
| Name           | Type    | Required | Size/Details | Example Value         |
|----------------|---------|----------|--------------|-----------------------|
| `name`         | String  | Yes      | 255          | "Core Infrastructure" |
| `displayOrder` | Integer | Yes      |              | `1`                   |

**Recommended Indexes:** `displayOrder` (ASC)

---

### 2. Public Services (`public_services`)
Stores information about services monitored and displayed on the public status page.
**Collection ID:** `public_services` (defined in `APPWRITE_CONFIG.publicServicesCollectionId`)

**Custom Attributes:**
| Name                  | Type    | Required | Size/Details         | Example Value                                  | Default |
|-----------------------|---------|----------|----------------------|------------------------------------------------|---------|
| `name`                | String  | Yes      | 255                  | "Main API"                                     |         |
| `status`              | String  | Yes      | 50 (Enum `SystemStatusLevel`) | "Operational"                             |         |
| `description`         | String  | No       | 1000                 | "Internal notes."                              |         |
| `publicDescription`   | String  | No       | 1000                 | "Core API for services."                       |         |
| `lastCheckedAutomated`| String  | Yes      | (ISO Datetime)       | `2023-10-27T10:00:00.000Z`                      |         |
| `uptime7Days`         | Float   | No       |                      | `99.99`                                        |         |
| `uptime30Days`        | Float   | No       |                      | `99.95`                                        |         |
| `isMonitoredPublicly` | Boolean | Yes      |                      | `true`                                         | `true`  |
| `displayOrder`        | Integer | Yes      |                      | `1`                                            | `0`     |
| `groupId`             | String  | No       | 255 (FK to `service_groups.$id`) | (ID of a service group)                 |         |
| `components`          | String  | No       | 4000 (JSON Array String)    | `[{\"name\": \"Auth\", \"status\": \"Operational\"}]` |         |
| `pingUrl`             | String  | No       | 1000 (URL)           | `https://api.mrx.com/health`                   |         |
| `lastPingResult`      | String  | No       | 2000 (JSON Object String)   | `{\"status\": \"Online\", ...}`                  |         |
| `pingEnabled`         | Boolean | Yes      |                      | `false`                                        | `false` |
| `pingIntervalMinutes` | Integer | Yes      | (e.g. 2,5,10,15)     | `5`                                            | `5`     |
| `pingAlertsMuted`     | Boolean | Yes      |                      | `false`                                        | `false` |


**Recommended Indexes:** `displayOrder` (ASC), `isMonitoredPublicly`, `groupId`, `pingEnabled`.

---

### 3. Public Incidents (`public_incidents`)
Stores details about incidents and maintenance events.
**Collection ID:** `public_incidents` (defined in `APPWRITE_CONFIG.publicIncidentsCollectionId`)

**Custom Attributes:**
| Name                         | Type    | Required | Size/Details                        | Example Value                          | Default |
|------------------------------|---------|----------|-------------------------------------|----------------------------------------|---------|
| `title`                      | String  | Yes      | 255                                 | "Payment Processing Delays"            |         |
| `type`                       | String  | Yes      | 50 (Enum `IncidentType`)           | "Incident"                            |         |
| `impact`                     | String  | Yes      | 50 (Enum `IncidentImpact`)         | "Significant"                         |         |
| `currentLifecycleStatus`     | String  | Yes      | 50 (Enum `IncidentLifecycleStatus` or custom String from `incident_status_types`) | "Monitoring"                 |         |
| `affectedServiceIds`         | String  | Yes      | Array (max 20 items, each 255 chars), store as JSON string `["id1", "id2"]`| `["service_id1", "service_id2"]` |         |
| `messages`                   | String  | Yes      | 10000 (JSON Array String of `IncidentMessage`). Serves as status history. | `[{\"id\": ..., \"message\": ...}]` |         |
| `resolvedAt`                 | String  | No       | (ISO Datetime)                      | `2023-10-27T10:30:00.000Z`               |         |
| `detectedAt`                 | String  | No       | (ISO Datetime)                      | `2023-10-27T09:00:00.000Z`               |         |
| `acknowledgedAt`             | String  | No       | (ISO Datetime)                      | `2023-10-27T09:15:00.000Z`               |         |
| `scheduledStartTime`         | String  | No       | (ISO Datetime)                      | `2023-11-01T02:00:00.000Z`               |         |
| `scheduledEndTime`           | String  | No       | (ISO Datetime)                      | `2023-11-01T04:00:00.000Z`               |         |
| `isPubliclyVisible`          | Boolean | Yes      |                                     | `true`                                 | `true`  |
| `severityLevelId`            | String  | No       | 255 (FK to `severity_levels.$id`)   | `sev_critical_id`                      |         |
| `incidentStatusId`           | String  | No       | 255 (FK to `incident_status_types.$id`) | `status_investigating_id`            |         |
| `debriefRequired`            | Boolean | No       |                                     | `false`                                | `false` |

*Appwrite's `$createdAt` and `$updatedAt` are used for incident creation/update timestamps.*

**`IncidentMessage` Sub-Structure (within `messages` JSON array string):**
Each object has `id` (String), `timestamp` (String ISO Datetime), `status` (String Enum `IncidentLifecycleStatus` or custom String), `message` (String), `postedBy` (String, optional).

**Recommended Indexes:** `$updatedAt` (DESC), `isPubliclyVisible`, `type`, `currentLifecycleStatus`, `resolvedAt`, `severityLevelId`, `incidentStatusId`, `debriefRequired`. Consider indexing `affectedServiceIds` if frequently queried.

---

### 4. Incident Reviews (`incident_reviews`)
Stores Post-Incident Review (De-Brief) documentation linked to incidents.
**Collection ID:** `incident_reviews` (defined in `APPWRITE_CONFIG.incidentReviewsCollectionId`)

**Custom Attributes:**
| Name                         | Type    | Required | Size/Details                        | Example Value                          | Default |
|------------------------------|---------|----------|-------------------------------------|----------------------------------------|---------|
| `incidentId`                 | String  | Yes      | 255 (FK to `public_incidents.$id`)  | `inc_payment_degraded_240315`        |         |
| `status`                     | String  | Yes      | 50 (Enum `PIRStatus`)              | "Review Completed"                     | `Pending Review` |
| `incidentSummaryText`        | String  | No       | 2000                                | "DB overload caused API slowdown."     |         |
| `rootCauseSummary`           | String  | No       | 2000                                | "Database connection pool exhausted."  |         |
| `timelineOfEvents`           | String  | No       | 10000 (Consider larger if needed)   | "Detailed timeline of events..."      |         |
| `impactedSystemsText`        | String  | No       | 2000                                | "API, Website, Mobile App (iOS)"       |         |
| `communicationSent`          | String  | No       | 2000                                | "Status page updated, email to users." |         |
| `resolutionSteps`            | String  | No       | 10000 (Consider larger if needed)   | "Increased DB pool size, restarted app."|         |
| `whatWentWell`               | String  | No       | 5000                                | "Quick identification by SRE team."    |         |
| `whatWentWrong`              | String  | No       | 5000                                | "Alerting threshold was too high."     |         |
| `actionItems`                | String  | No       | 5000 (Markdown/Text)                | "- [ ] Adjust alert thresholds"         |         |
| `followUpActions`            | String  | No       | 5000                                | "Monitor DB pool, set up alerts."      |         |
| `lessonsLearned`             | String  | No       | 5000                                | "Need better monitoring on DB pool."   |         |
| `severityLevel`              | String  | No       | 50 (Enum `PIRSeverityLevel`)       | "High"                                 |         |
| `isPreventable`              | Boolean | No       |                                     | `true`                                 | `false` |
| `preventableReasoning`       | String  | No       | 2000                                | "Proactive monitoring could have..."   |         |
| `participants`               | String  | No       | 500 (JSON Array String of names/IDs)| `[\"Admin User\", \"Support Lead\"]`      |         |
| `reviewedAt`                 | String  | No       | (ISO Datetime)                      | `2023-10-28T14:00:00.000Z`               |         |
*Appwrite's `$createdAt` and `$updatedAt` are used for review document timestamps.*

**Permissions for `incident_reviews` collection:**
*   **Create, Read, Update, Delete Access (Collection Level):**
    *   Grant to an "Admins" or "Support" Appwrite Team (or users identified by 'Admin'/'Support' roles). PIRs are typically managed internally.

**Recommended Indexes:** `incidentId` (Unique, if one review per incident), `status`, `severityLevel`, `reviewedAt`.

---

### 5. Admin Users (`admin_users`)
Stores application-specific details and roles for admin panel users. This links to Appwrite's authentication users.
**Collection ID:** `admin_users` (defined in `APPWRITE_CONFIG.adminUsersCollectionId`)

**Custom Attributes:**
| Name        | Type    | Required | Size/Details   | Example Value               | Notes                                     |
|-------------|---------|----------|----------------|-----------------------------|-------------------------------------------|
| `id`        | String  | Yes      | 255 (Unique)   | `appwrite_auth_user_id_123` | **Crucial: Must store the Appwrite Authentication User's `$id`**. This is used to link the auth user to their application role. |
| `email`     | String  | Yes      | 255 (Unique)   | `admin@mrx.com`             | Should match Appwrite Auth User's email   |
| `name`      | String  | Yes      | 255            | "Administrator Prime"       | Should match Appwrite Auth User's name    |
| `role`      | String  | Yes      | 50 (Enum 'Admin', 'Support', 'Viewer') | "Admin"                 | Application-specific role                 |
*Appwrite's `$createdAt` and `$updatedAt` are used for document timestamps.*

**Relationship to Appwrite Auth:**
*   When a user logs in via Appwrite Auth, their Appwrite Auth User `$id` is used to query this `admin_users` collection (matching against the `id` attribute) to retrieve their application-specific role.
*   An Appwrite Auth user must have a corresponding entry in this collection to access the admin panel with a defined role. The `id` field in this collection **must match** the user's Appwrite Auth `$id`.

**Permissions for `admin_users` collection:**
*   **Collection-Level Permissions:**
    *   `Create`, `Update`, `Delete` Access: Grant to an "Admins" Appwrite Team (or users identified by the 'Admin' role). This allows admins to manage user roles.
    *   `Read` Access: Grant to an "Admins" Appwrite Team. This allows admins to list all users on the "User Management" page.
*   **Document-Level Permissions (Critical for Role Fetching):**
    *   When a new document is created in `admin_users` (e.g., by an Admin via the UI), it **must** be assigned document-level `Read` permission for the user it represents.
    *   This is typically `Permission.read(Role.user("APPWRITE_AUTH_USER_ID"))`, where `"APPWRITE_AUTH_USER_ID"` is the value stored in the `id` attribute of that specific `admin_users` document.
    *   Without this permission, users (especially non-Admins) will not be able to fetch their own role after logging in, as `adminGetAdminUserByAuthId` will not be able to read their specific document. The application's `adminCreateUser` service function should handle setting these permissions.

**Recommended Indexes:** `id` (unique, for fast role lookup), `email` (unique).

---

### 6. API Keys (`api_keys`)
Manages API keys for administrators.
**Collection ID:** `api_keys` (defined in `APPWRITE_CONFIG.apiKeysCollectionId`)

**Security Warning:** The current client-side implementation uses SHA-256 for pseudo-hashing. **This is NOT secure for production.** For real security, API keys should be validated server-side (e.g., using Appwrite Functions) with strong, salted hashing (bcrypt/argon2). The full key must never be stored plaintext after generation.

**Custom Attributes:**
| Name         | Type    | Required | Size/Details   | Example Value                   | Notes |
|--------------|---------|----------|----------------|---------------------------------|-------|
| `label`      | String  | Yes      | 255            | "My Monitoring Service"         | User-defined label for the key |
| `userId`     | String  | Yes      | 255            | (Appwrite Auth User ID)         | ID of the admin user who owns this key |
| `keyPrefix`  | String  | Yes      | 50             | `mrx_pk_abcdefg`                | First part of the key (non-sensitive) |
| `keySuffix`  | String  | Yes      | 50             | `wxyz`                          | Last 4-8 characters of the key (non-sensitive) |
| `hashedKey`  | String  | Yes      | 255            | (SHA-256 hash of the full key)  | **Demo only. Not secure.** |
| `lastUsedAt` | String  | No       | (ISO Datetime) | `2024-05-15T14:30:00.000Z`      | Updated on (simulated) validation |
| `expiresAt`  | String  | No       | (ISO Datetime) |                                 | For future use |
| `revokedAt`  | String  | No       | (ISO Datetime) |                                 | Timestamp if key is revoked |
*Appwrite's `$createdAt` is used for key creation timestamp.*

**Permissions for `api_keys` collection:**
*   Users should only be able to manage (create, read, revoke) their own API keys. This is typically handled by setting document-level permissions where the `userId` matches the authenticated user's ID. For example, grant `Read`, `Update` (for revoke), and `Delete` permissions to `user:USER_ID_PLACEHOLDER` (where USER_ID_PLACEHOLDER is the value of the `userId` attribute in the document).
*   `Create` permission can be granted at the collection level to authenticated users who are allowed to generate keys (e.g., `role:users` or specific Admin team).

**Recommended Indexes:** `userId`, `keyPrefix`, `keySuffix`, `revokedAt`.

---
### 7. Guest Incident Reports (`guest_incident_reports`)
Stores incident reports submitted by unauthenticated guests.
**Collection ID:** `guest_incident_reports` (defined in `APPWRITE_CONFIG.guestIncidentReportsCollectionId`)

**Custom Attributes:**
| Name                 | Type    | Required | Size/Details                          | Example Value                          | Default |
|----------------------|---------|----------|---------------------------------------|----------------------------------------|---------|
| `serviceId`          | String  | Yes      | 255 (FK to `public_services.$id`)     | `api_main`                             |         |
| `description`        | String  | Yes      | 2000                                  | "Website is showing a 500 error."      |         |
| `email`              | String  | No       | 255 (User's email for contact)        | `user@example.com`                     |         |
| `submittedAt`        | String  | Yes      | (ISO Datetime)                        | `2024-01-15T10:00:00.000Z`             |         |
| `status`             | String  | Yes      | 50 (Enum `GuestIncidentReportStatus`) | "New"                                  | "New"   |
| `userAgent`          | String  | No       | 500 (Client's User-Agent string)      | "Mozilla/5.0 (Windows NT 10.0; ...)"   |         |
| `notes`              | String  | No       | 1000 (Admin notes)                    | "Checked logs, seems valid."           |         |
| `officialIncidentId` | String  | No       | 255 (FK to `public_incidents.$id`)    | `inc_payment_degraded_240315`        |         |
*Appwrite's `$id`, `$createdAt`, `$updatedAt`, `$permissions` are also available.*

**Permissions for `guest_incident_reports` collection:**
*   **Collection-Level Permissions:**
    *   `role:all`: `Create` (Allows any guest to submit a report).
    *   `role:users` (or specific Admin/Support team): `Read`, `Update`, `Delete` (Allows authenticated admins/support to manage these reports).
*   **Document-Level Permissions:**
    *   When a document is created, it could be set to be readable/updatable by specific admin/support teams if finer-grained control beyond collection-level is needed. However, for this use case, collection-level permissions for admins are usually sufficient.

**Rate Limiting & Security:** It is highly recommended to implement rate limiting on the Appwrite collection settings for 'Create Document' to prevent abuse. CAPTCHA or other bot-detection mechanisms would typically be integrated via Appwrite Functions if server-side validation is desired.

**Recommended Indexes:** `submittedAt` (DESC), `status`, `serviceId`.

---

### 8. Severity Levels (`severity_levels`)
Stores definitions for incident severity levels.
**Collection ID:** `severity_levels` (defined in `APPWRITE_CONFIG.severityLevelsCollectionId`)

**Custom Attributes:**
| Name           | Type    | Required | Size/Details         | Example Value         |
|----------------|---------|----------|----------------------|-----------------------|
| `name`         | String  | Yes      | 50                   | "Critical"            |
| `color`        | String  | Yes      | 7 (Hex e.g. #FF0000) | "#FF0000"             |
| `priority`     | Integer | Yes      |                      | `1`                   |
| `description`  | String  | No       | 255                  | "Major system outage" |
*Appwrite's `$createdAt` and `$updatedAt` are used for document timestamps.*

**Permissions for `severity_levels` collection:**
*   **Collection-Level Permissions:**
    *   `role:member` (Authenticated Users): `Read` (To populate dropdowns in forms).
    *   Specific Admin Team/Role: `Create`, `Update`, `Delete` (For managing severity definitions).

**Recommended Indexes:** `priority` (ASC).

---

### 9. Incident Status Types (`incident_status_types`)
Stores customizable definitions for incident statuses (used for `currentLifecycleStatus` on incidents).
**Collection ID:** `incident_status_types` (defined in `APPWRITE_CONFIG.incidentStatusTypesCollectionId`)

**Custom Attributes:**
| Name           | Type    | Required | Size/Details         | Example Value         | Default |
|----------------|---------|----------|----------------------|-----------------------|---------|
| `name`         | String  | Yes      | 50                   | "Investigating"       |         |
| `description`  | String  | No       | 255                  | "Actively looking..." |         |
| `color`        | String  | Yes      | 7 (Hex e.g. #FFA500) | "#FFA500"             |         |
| `displayOrder` | Integer | Yes      |                      | `2`                   | `0`     |
| `isEnabled`    | Boolean | Yes      |                      | `true`                | `true`  |
| `isDefault`    | Boolean | Yes      |                      | `false`               | `false` |
*Appwrite's `$createdAt` and `$updatedAt` are used for document timestamps.*

**Permissions for `incident_status_types` collection:**
*   **Collection-Level Permissions:**
    *   `role:member` (Authenticated Users): `Read` (To populate dropdowns in forms).
    *   Specific Admin Team/Role: `Create`, `Update`, `Delete` (For managing status definitions).

**Recommended Indexes:** `displayOrder` (ASC), `isEnabled`.

---

### 10. Site Identity Settings (`site_identity_settings`)
Stores global branding and identity settings for the application. Typically, this collection will contain a single document with a fixed ID (e.g., `default_settings`).
**Collection ID:** `site_identity_settings` (defined in `APPWRITE_CONFIG.siteIdentityCollectionId`)
**Document ID (for the single settings document):** `default_settings` (defined in `constants.ts` as `SITE_IDENTITY_DOCUMENT_ID`)

**Custom Attributes:**
| Name              | Type   | Required | Size/Details                      | Example Value                                               |
|-------------------|--------|----------|-----------------------------------|-------------------------------------------------------------|
| `siteName`        | String | Yes      | 255                               | "MRX United Status"                                         |
| `logoUrl`         | String | No       | 1000 (URL)                        | `https://example.com/logo.png` or `/assets/my-logo.svg`   |
| `faviconUrl`      | String | No       | 1000 (URL)                        | `https://example.com/favicon.ico` or `/favicon.png`       |
| `footerText`      | String | Yes      | 1000                              | "© 2024 MRX United. All rights reserved."                   |
| `metaDescription` | String | No       | 255                               | "Official status page for MRX United services."             |
*Appwrite's `$updatedAt` is used for tracking when settings were last modified.*

**Permissions for `site_identity_settings` collection:**
*   **Collection-Level Permissions:**
    *   `role:all`: `Read` (To allow public pages and the admin panel to fetch branding).
    *   Specific Admin Team/Role: `Create`, `Update` (For managing settings via the admin panel). Deletion of the single settings document is typically not allowed or handled carefully.
*   **Document-Level Permissions (for the single 'default_settings' document):**
    *   `role:all`: `Read`.
    *   Specific Admin Team/Role: `Update`.

**Recommended Indexes:** None needed if only one document exists.

---

### 11. Decision Flows (`decision_flows`)
Stores definitions for response playbooks or decision flows.
**Collection ID:** `decision_flows` (defined in `APPWRITE_CONFIG.decisionFlowsCollectionId`)

**Custom Attributes:**
| Name                        | Type           | Required | Size/Details                            | Example Value                               | Notes                                      |
|-----------------------------|----------------|----------|-----------------------------------------|---------------------------------------------|--------------------------------------------|
| `name`                      | String         | Yes      | 255                                     | "Service Outage Protocol"                   | Name of the decision flow.                 |
| `description`               | String         | No       | 1000                                    | "Standard procedure for full service outage."| Optional description.                    |
| `associatedIncidentTypes`   | String (Array) | No       | Max 10 items, each 50 chars           | `["Incident"]`                            | JSON string array, e.g., `["Incident", "Maintenance"]`. Links to `IncidentType` enum. |
| `associatedSeverityLevelIds`| String (Array) | No       | Max 10 items, each 255 chars          | `["sev_critical_id"]`                     | JSON string array of SeverityLevel IDs.    |
| `steps`                     | String         | Yes      | 20000 (JSON Array of `DecisionFlowStep`)| `[{"id": "s1", "title": "Acknowledge", ...}]`| Stores the structured steps of the flow.   |
*Appwrite's `$createdAt` and `$updatedAt` are used for timestamps.*

**`DecisionFlowStep` Sub-Structure (within `steps` JSON array string):**
Each object: `id` (String, client-gen), `title` (String), `description` (String, optional), `instructions` (String, optional), `required` (Boolean, optional), `displayOrder` (Integer), `attachments` (Array of `{id, name, url}`), `links` (Array of `{id, label, url}`).
*Future fields for Step: `subFlowId` (String), `condition` (String).*

**Permissions:**
*   Admin Team: `Create`, `Read`, `Update`, `Delete`.
*   Support Team (or other relevant roles): `Read`.

**Recommended Indexes:** `name`.

---

### 12. Active Incident Flows (`active_incident_flows`)
Stores instances of decision flows actively attached to incidents.
**Collection ID:** `active_incident_flows` (defined in `APPWRITE_CONFIG.activeIncidentFlowsCollectionId`)

**Custom Attributes:**
| Name             | Type   | Required | Size/Details                             | Example Value                             | Notes                                       |
|------------------|--------|----------|------------------------------------------|-------------------------------------------|---------------------------------------------|
| `incidentId`     | String | Yes      | 255 (FK to `public_incidents.$id`)       | `inc_payment_degraded_240315`           | Links to the specific incident.             |
| `flowId`         | String | Yes      | 255 (FK to `decision_flows.$id`)         | `flow_service_outage_id`                | Links to the decision flow definition.      |
| `flowNameSnapshot`| String | Yes      | 255                                      | "Service Outage Protocol (v1.2)"          | Name of the flow at time of attachment.     |
| `stepStates`     | String | Yes      | 10000 (JSON of `Record<StepID, StepState>`) | `{"s1": {"completed": true, ...}}`        | Tracks state of each step in the instance.  |
| `status`         | String | Yes      | 50 (Enum `ActiveFlowStatus`)             | "In Progress"                             | Overall status of this flow instance.       |
| `startedAt`      | String | Yes      | (ISO Datetime)                           | `2023-10-27T10:00:00.000Z`                | When this flow was attached/started.        |
| `completedAt`    | String | No       | (ISO Datetime)                           | `2023-10-27T11:00:00.000Z`                | When this flow instance was completed.      |
| `notes`          | String | No       | 2000                                     | "Flow initiated by John Doe due to X."    | Overall notes for this instance of the flow.|
*Appwrite's `$createdAt` and `$updatedAt` are used for timestamps.*

**`DecisionFlowStepState` Sub-Structure (within `stepStates` JSON object):**
Each key is a `DecisionFlowStep.id`. Value object: `completed` (Boolean), `skipped` (Boolean, optional), `notes` (String, optional), `completedAt` (String ISO, optional), `completedBy` (String UserID, optional), `assignedTo` (String Array UserIDs, optional).

**Permissions:**
*   Admin/Support Teams (with incident management rights): `Create`, `Read`, `Update`, `Delete`.

**Recommended Indexes:** `incidentId` (Unique, if only one flow per incident), `flowId`, `status`.

---

### 13. Application Activity Logs (`app_activity_logs`)
Stores comprehensive logs for user and system actions across the site.
**Collection ID:** `app_activity_logs` (defined in `APPWRITE_CONFIG.activityLogsCollectionId`)

**Custom Attributes:**
| Name           | Type    | Required | Size/Details                         | Example Value                                | Notes                                   |
|----------------|---------|----------|--------------------------------------|----------------------------------------------|-----------------------------------------|
| `userId`       | String  | No       | 255                                  | `appwrite_auth_user_id_123` / `guest_session`| Appwrite Auth User ID or system/guest ID|
| `userName`     | String  | No       | 255                                  | "Administrator Prime" / "Guest"              | User's display name                     |
| `userRole`     | String  | No       | 50 (Enum `User['role']` or custom)   | "Admin" / "Guest" / "System"                 | Role of the actor                       |
| `action`       | String  | Yes      | 500                                  | "Created Incident"                           | Description of the action               |
| `targetType`   | String  | No       | 100 (Enum `ActivityTargetType`)      | "Incident"                                   | Type of the entity affected             |
| `targetId`     | String  | No       | 255                                  | `inc_payment_degraded_240315`              | ID of the entity affected               |
| `targetName`   | String  | No       | 255                                  | "Payment Processing Delays"                  | Name/title of the entity affected       |
| `timestamp`    | String  | Yes      | (ISO Datetime)                       | `2023-10-27T10:00:00.000Z`                   | Custom timestamp of the event           |
| `ipAddress`    | String  | No       | 45                                   | `192.168.1.100`                              | Client IP address (if available)        |
| `userAgent`    | String  | No       | 500                                  | "Mozilla/5.0 ..."                            | Client User Agent (if available)        |
| `details`      | String  | No       | 2000                                 | `{"oldStatus": "Investigating"}`             | Additional context (JSON or text)       |
| `status`       | String  | Yes      | 50 (Enum `ActivityStatus`)           | "Success"                                    | Outcome of the action                   |
*Appwrite's `$createdAt` is used for log entry creation timestamp in DB, but `timestamp` field is for the actual event time.*

**Permissions:**
*   Admin Team: `Create`, `Read`. (Deletion of logs is generally discouraged or restricted).
*   Support Team (or other relevant roles): `Read` (potentially with filters or restricted field visibility).

**Recommended Indexes:** `timestamp` (DESC), `userId`, `userRole`, `action`, `targetType`, `status`.

---
### 14. Discord Settings (`discord_settings`)
Stores global Discord integration settings. This collection will contain a single document with a fixed ID.
**Collection ID:** `discord_settings` (defined in `APPWRITE_CONFIG.discordSettingsCollectionId`)
**Document ID (for the single settings document):** `default_discord_config` (defined in `constants.ts` as `DISCORD_SETTINGS_DOCUMENT_ID`)

**Security Warning:** Storing `botToken` and `clientSecret` as plaintext strings in the database is **highly insecure for production environments**. These should be managed via Appwrite Functions or a dedicated secrets manager. This setup is for demonstration purposes only.

**Custom Attributes:**
| Name                          | Type    | Required | Size/Details                      | Example Value                                     | Default (from `DEFAULT_DISCORD_SETTINGS`) |
|-------------------------------|---------|----------|-----------------------------------|---------------------------------------------------|-------------------------------------------|
| `botToken`                    | String  | No       | 1000                              | `your_discord_bot_token`                          | `''`                                      |
| `clientId`                    | String  | No       | 255                               | `your_discord_client_id`                          | `''`                                      |
| `clientSecret`                | String  | No       | 255                               | `your_discord_client_secret`                      | `''`                                      |
| `mainWebhookUrl`              | String  | No       | 1000 (URL)                        | `https://discord.com/api/webhooks/...`            | `''`                                      |
| `incidentAlertChannelId`      | String  | No       | 255                               | `discord_channel_id_for_incidents`                | `''`                                      |
| `maintenanceAlertChannelId`   | String  | No       | 255                               | `discord_channel_id_for_maintenance`              | `''`                                      |
| `guestReportAlertChannelId`   | String  | No       | 255                               | `discord_channel_id_for_guest_reports`            | `''`                                      |
| `adminActivityAlertChannelId` | String  | No       | 255                               | `discord_channel_id_for_admin_activity`           | `''`                                      |
| `enableIncidentAlerts`        | Boolean | Yes      |                                   | `true`                                            | `false`                                   |
| `enableMaintenanceAlerts`     | Boolean | Yes      |                                   | `true`                                            | `false`                                   |
| `enableGuestReportAlerts`     | Boolean | Yes      |                                   | `false`                                           | `false`                                   |
| `enableAdminActivityAlerts`   | Boolean | Yes      |                                   | `false`                                           | `false`                                   |
| `enableRichPresence`          | Boolean | Yes      |                                   | `true`                                            | `false`                                   |
| `defaultRichPresenceDetails`  | String  | No       | 128                               | `Managing Status Platform`                        | `Managing Status Platform`                |
| `defaultRichPresenceState`    | String  | No       | 128                               | `MRX United`                                      | `MRX United`                              |
| `showSectionInPresence`       | Boolean | Yes      |                                   | `true`                                            | `true`                                    |
| `showTimestampInPresence`     | Boolean | Yes      |                                   | `true`                                            | `true`                                    |
*Appwrite's `$updatedAt` is used for tracking when settings were last modified.*

**Permissions for `discord_settings` collection:**
*   Specific Admin Team/Role: `Create`, `Read`, `Update`. Deletion of the single settings document is typically not allowed. Document-level permissions should grant this team `Read` and `Update` rights for the `default_discord_config` document.

---

## Internal Admin Dashboard Collections

These collections support the internal admin dashboard. The application may use mock data for these if Appwrite is not configured or if explicitly in mock mode.

### 15. Internal System Status (`internal_system_status`)
Tracks status of internal, non-public systems. Often, these are services from `public_services` where `isMonitoredPublicly` is `false`, or a separate collection.
**Collection ID:** `internal_system_status` (defined in `APPWRITE_CONFIG.systemStatusCollectionId`)
**Custom Attributes:** Similar to `public_services`. Key attributes: `name` (String), `status` (String Enum `SystemStatusLevel`), `lastCheckedAutomated` (String ISO Datetime), `description` (String).
**Recommended Indexes:** `displayOrder` (ASC).

### 16. User Activity Log (`user_activity`) (Existing Widget Specific)
Logs actions within the admin panel, used by the dashboard widget. **Distinct from `app_activity_logs`**.
**Collection ID:** `user_activity` (defined in `APPWRITE_CONFIG.userActivityCollectionId`)
**Custom Attributes:**
| Name        | Type    | Required | Size/Details   | Example Value                         |
|-------------|---------|----------|----------------|---------------------------------------|
| `timestamp` | String  | Yes      | (ISO Datetime) | `2023-10-27T10:00:00.000Z`            | Custom timestamp of the event |
| `userId`    | String  | Yes      | 255            | (Appwrite Auth User ID)               |
| `userName`  | String  | Yes      | 255            | "Admin User"                          |
| `action`    | String  | Yes      | 500            | "User login"                          |
| `details`   | String  | No       | 1000           | "IP: 192.168.1.100"                   |
| `status`    | String  | Yes      | 50 (Enum `ActivityStatus`) | "Success"                  |
**Recommended Indexes:** `timestamp` (DESC), `userId`, `action`.

### 17. Internal Service Uptime (`internal_service_uptime`)
Stores uptime metrics for internal services.
**Collection ID:** `internal_service_uptime` (defined in `APPWRITE_CONFIG.serviceUptimeCollectionId`)
**Custom Attributes:** `serviceName` (String, 255), `uptimePercentage` (Float), `lastIncident` (String, 2000, JSON Object String), `historicalData` (String, 4000, JSON Array String).
**Recommended Indexes:** `serviceName`.

### 18. Error Reports (`error_reports`)
Logs errors from internal systems.
**Collection ID:** `error_reports` (defined in `APPWRITE_CONFIG.errorReportsCollectionId`)
**Custom Attributes:** `timestamp` (String ISO Datetime, custom field), `service` (String, 255), `errorCode` (String, 50), `message` (String, 1000), `severity` (String Enum `ErrorSeverity`, 50), `details` (String, 4000).
**Recommended Indexes:** `timestamp` (DESC), `service`, `severity`.

---

This setup provides a comprehensive structure for the MRX United status platform on Appwrite. Remember to configure attribute sizes, permissions, and indexes according to your specific needs and Appwrite best practices.