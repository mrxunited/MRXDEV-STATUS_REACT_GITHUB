
import { DiscordSettings, DiscordWebhookPayload, DiscordEmbed, Incident, SystemService, UserActivityLog, GuestIncidentReport, IncidentType, SystemStatusLevel, ActivityStatus, ActivityLog, ActivityTargetType, DiscordRichPresenceActivity } from '../../types';
import { addActivityLog } from './activityLogService'; 

// Helper function to send data to a Discord webhook
export async function discordSendWebhookMessage(webhookUrl: string, payload: DiscordWebhookPayload): Promise<void> {
  if (!webhookUrl) {
    console.warn('Discord webhook URL is not configured. Skipping message.');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    console.info('Discord webhook message sent successfully.');
    addActivityLog({
        action: 'Sent Discord Webhook',
        targetType: ActivityTargetType.DISCORD_CONFIG,
        status: ActivityStatus.SUCCESS,
        details: `Message sent to webhook: ${webhookUrl.substring(0,35)}... Embeds: ${payload.embeds?.length || 0}`
    }).catch(e => console.error("Failed to log Discord webhook success:", e));

  } catch (error) {
    console.error('Error sending Discord webhook message:', error);
     addActivityLog({
        action: 'Failed to Send Discord Webhook',
        targetType: ActivityTargetType.DISCORD_CONFIG,
        status: ActivityStatus.FAILURE,
        details: `Webhook: ${webhookUrl.substring(0,35)}... Error: ${(error as Error).message}`
    }).catch(e => console.error("Failed to log Discord webhook failure:", e));
    throw error; 
  }
}

// --- Embed Builders ---

function getStatusColor(status: SystemStatusLevel | IncidentType): number {
  switch (status) {
    case SystemStatusLevel.OPERATIONAL: return 0x2ECC71; // Green
    case SystemStatusLevel.DEGRADED: return 0xF1C40F; // Yellow
    case SystemStatusLevel.PARTIAL_OUTAGE: return 0xE67E22; // Orange
    case SystemStatusLevel.MAJOR_OUTAGE: return 0xE74C3C; // Red
    case SystemStatusLevel.MAINTENANCE: return 0x3498DB; // Blue
    case IncidentType.MAINTENANCE: return 0x3498DB; // Blue
    case IncidentType.INCIDENT: return 0xE74C3C; // Red
    case IncidentType.INFORMATION: return 0x95A5A6; // Gray
    default: return 0x99AAB5; // Default gray
  }
}

export function createIncidentEmbed(incident: Incident, services: SystemService[], siteName: string): DiscordEmbed {
  const affectedServicesNames = incident.affectedServiceIds
    .map(id => services.find(s => s.id === id)?.name || id)
    .join(', ');

  const latestUpdate = incident.messages[0];

  return {
    title: `🔴 ${incident.type}: ${incident.title}`,
    description: latestUpdate?.message || "No specific update message provided.",
    color: getStatusColor(incident.type === IncidentType.INCIDENT ? SystemStatusLevel.MAJOR_OUTAGE : SystemStatusLevel.MAINTENANCE),
    fields: [
      { name: 'Status', value: incident.currentLifecycleStatus, inline: true },
      { name: 'Impact', value: incident.impact, inline: true },
      { name: 'Affected Services', value: affectedServicesNames || 'None specified', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: siteName },
  };
}

export function createMaintenanceEmbed(incident: Incident, services: SystemService[], siteName: string): DiscordEmbed {
   const affectedServicesNames = incident.affectedServiceIds
    .map(id => services.find(s => s.id === id)?.name || id)
    .join(', ');
  const latestUpdate = incident.messages[0];
  let scheduleInfo = 'Not specified';
  if(incident.scheduledStartTime) {
      scheduleInfo = `From: ${new Date(incident.scheduledStartTime).toLocaleString()}`;
      if(incident.scheduledEndTime) {
          scheduleInfo += `\nTo: ${new Date(incident.scheduledEndTime).toLocaleString()}`;
      }
  }

  return {
    title: `🛠️ Maintenance: ${incident.title}`,
    description: latestUpdate?.message || "Scheduled maintenance is upcoming or in progress.",
    color: getStatusColor(IncidentType.MAINTENANCE),
    fields: [
      { name: 'Status', value: incident.currentLifecycleStatus, inline: true },
      { name: 'Schedule', value: scheduleInfo, inline: false },
      { name: 'Affected Services', value: affectedServicesNames || 'None specified', inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: siteName },
  };
}

export function createGuestReportEmbed(report: GuestIncidentReport, serviceName: string, siteName: string): DiscordEmbed {
    return {
        title: `⚠️ New Guest Report for ${serviceName}`,
        description: report.description,
        color: getStatusColor(SystemStatusLevel.DEGRADED),
        fields: [
            { name: 'Service', value: serviceName, inline: true },
            { name: 'Submitted By', value: report.email || 'Anonymous', inline: true },
        ],
        timestamp: new Date(report.submittedAt).toISOString(),
        footer: { text: `${siteName} - Guest Report`},
    };
}

export function createAdminActivityEmbed(log: UserActivityLog | ActivityLog, siteName: string): DiscordEmbed {
    const isUserActivityLog = 'userName' in log && 'userId' in log && !('targetType' in log); // Differentiate old UserActivityLog from new ActivityLog
    const userName = isUserActivityLog ? (log as UserActivityLog).userName : (log as ActivityLog).userName || 'System';
    
    let description = log.details || `Action performed by ${userName}.`;
    if (!isUserActivityLog && (log as ActivityLog).targetType) {
        description += `\nTarget: ${(log as ActivityLog).targetType}`;
        if ((log as ActivityLog).targetName) description += ` - ${(log as ActivityLog).targetName}`;
        if ((log as ActivityLog).targetId) description += ` (ID: ${(log as ActivityLog).targetId})`;
    }


    return {
        title: `⚙️ Admin Activity: ${log.action}`,
        description: description,
        color: log.status === ActivityStatus.SUCCESS ? 0x2ECC71 : (log.status === ActivityStatus.FAILURE ? 0xE74C3C : 0xF1C40F),
        fields: [
            { name: 'User', value: userName, inline: true },
            { name: 'Status', value: log.status, inline: true},
        ],
        timestamp: new Date(log.timestamp).toISOString(),
        footer: { text: siteName },
    };
}

export async function discordSendTestWebhook(webhookUrl: string): Promise<void> {
    const testPayload: DiscordWebhookPayload = {
        username: "MRX Status Bot (Test)",
        embeds: [{
            title: "Webhook Test Successful! ✅",
            description: "If you see this message, your webhook URL is configured correctly.",
            color: 0x2ECC71, // Green
            timestamp: new Date().toISOString(),
            footer: { text: "MRX United Status Platform" }
        }]
    };
    await discordSendWebhookMessage(webhookUrl, testPayload);
}

export function updateDiscordRichPresence(activity: DiscordRichPresenceActivity): void {
  console.log("Simulating Discord Rich Presence Update:", activity);
  // Actual implementation would use Discord RPC SDK or Gateway API.
  // Example data that would be sent:
  // {
  //   details: activity.details,
  //   state: activity.state,
  //   startTimestamp: activity.startTimestamp,
  //   // largeImageKey: 'mrx_logo', (requires assets uploaded to Discord app)
  //   // largeImageText: 'MRX United',
  // }
}
