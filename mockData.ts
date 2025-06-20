

import {
  SystemService, UserActivityLog, ServiceUptime, ErrorReport,
  SystemStatusLevel, ActivityStatus, ErrorSeverity, Incident, IncidentType,
  IncidentImpact, IncidentLifecycleStatus, IncidentMessage, AdminUser, 
  PingResult, PingStatus, ServiceGroup, ApiKey, NewApiKey,
  GuestIncidentReport, GuestIncidentReportStatus, IncidentReview, PIRStatus, PIRSeverityLevel, IncidentReviewFilters, SeverityLevel, IncidentFilters, IncidentStatusDefinition, ServiceComponent,
  DecisionFlow, DecisionFlowStep, ActiveIncidentFlow, ActiveFlowStatus // New types
} from '../../types'; // Changed import path
import { ID } from 'appwrite'; 
import { MOCK_USER_ID_ADMIN, MOCK_USER_ID_SUPPORT, LOCAL_STORAGE_API_KEYS_KEY, API_KEY_PREFIX } from '../constants';
import { isWithinInterval, parseISO, subDays, isValid as dateIsValid } from 'date-fns'; 

// --- Mock Data Store ---

let mockServiceGroupsStore: ServiceGroup[] = [
  { $id: 'group_core_doc', id: 'group_core', name: 'Core Infrastructure', displayOrder: 1 },
  { $id: 'group_customer_doc', id: 'group_customer', name: 'Customer Facing Services', displayOrder: 2 },
  { $id: 'group_internal_doc', id: 'group_internal', name: 'Internal Tools', displayOrder: 3 },
];

let mockPublicServicesStore: SystemService[] = [
  { 
    $id: 'api_main_doc', id: 'api_main', name: 'Main API', 
    publicDescription: 'Core application programming interface for all MRX services.', 
    status: SystemStatusLevel.OPERATIONAL, 
    lastCheckedAutomated: new Date(Date.now() - 60000 * 2).toISOString(), 
    uptime7Days: 99.99, uptime30Days: 99.95, isMonitoredPublicly: true, 
    displayOrder: 1, groupId: 'group_core', 
    components: [
        {id: ID.unique(), name: "Authentication Endpoint", status: SystemStatusLevel.OPERATIONAL, description: "Handles user login and token generation."},
        {id: ID.unique(), name: "Data Processing Queue", status: SystemStatusLevel.OPERATIONAL, description: "Processes incoming data streams."},
        {id: ID.unique(), name: "User Profile Service", status: SystemStatusLevel.DEGRADED, description: "Manages user profile data, experiencing slight delays."}
    ],
    pingUrl: 'https://jsonplaceholder.typicode.com/todos/1', 
    lastPingResult: { status: PingStatus.ONLINE, checkedAt: new Date().toISOString(), responseTimeMs: 120 }, 
    pingEnabled: true, pingIntervalMinutes: 5, pingAlertsMuted: false 
  },
  { 
    $id: 'website_portal_doc', id: 'website_portal', name: 'Customer Portal', 
    publicDescription: 'Web access for customer accounts and services.', 
    status: SystemStatusLevel.OPERATIONAL, 
    lastCheckedAutomated: new Date(Date.now() - 60000 * 3).toISOString(), 
    uptime7Days: 100, uptime30Days: 99.98, isMonitoredPublicly: true, 
    displayOrder: 2, groupId: 'group_customer', 
    components: [
        {id: ID.unique(), name: "Homepage Loading", status: SystemStatusLevel.OPERATIONAL},
        {id: ID.unique(), name: "Account Dashboard", status: SystemStatusLevel.OPERATIONAL}
    ],
    pingUrl: 'https://jsonplaceholder.typicode.com/posts/1', 
    lastPingResult: { status: PingStatus.ONLINE, checkedAt: new Date().toISOString(), responseTimeMs: 80 }, 
    pingEnabled: true, pingIntervalMinutes: 10, pingAlertsMuted: false
  },
  { 
    $id: 'payment_gateway_doc', id: 'payment_gateway', name: 'Payment Processing', 
    publicDescription: 'Handles all subscriptions and payment transactions.', 
    status: SystemStatusLevel.DEGRADED, 
    lastCheckedAutomated: new Date(Date.now() - 60000 * 1).toISOString(), 
    uptime7Days: 99.5, uptime30Days: 99.0, isMonitoredPublicly: true, 
    displayOrder: 3, groupId: 'group_customer', 
    // No components for this one initially
    pingUrl: 'https://jsonplaceholder.typicode.com/nonexistent', 
    lastPingResult: { status: PingStatus.OFFLINE, checkedAt: new Date().toISOString(), error: "Mock: Not found" }, 
    pingEnabled: false, pingIntervalMinutes: 5, pingAlertsMuted: true 
  },
  { 
    $id: 'support_system_doc', id: 'support_system', name: 'Support Tickets', 
    publicDescription: 'System for submitting and tracking support requests.', 
    status: SystemStatusLevel.MAINTENANCE, 
    lastCheckedAutomated: new Date(Date.now() - 60000 * 5).toISOString(), 
    uptime7Days: 100, uptime30Days: 100, isMonitoredPublicly: true, 
    displayOrder: 4, groupId: 'group_customer', 
    lastPingResult: { status: PingStatus.UNKNOWN, checkedAt: new Date().toISOString() }, 
    pingEnabled: false, pingIntervalMinutes: 15, pingAlertsMuted: false 
  },
  { 
    $id: 'internal_tool_doc', id: 'internal_tool', name: 'Internal Analytics', 
    publicDescription: 'Backend analytics processing.', 
    status: SystemStatusLevel.OPERATIONAL, 
    lastCheckedAutomated: new Date(Date.now() - 60000 * 5).toISOString(), 
    uptime7Days: 100, uptime30Days: 100, isMonitoredPublicly: false, 
    displayOrder: 5, groupId: 'group_internal', 
    pingEnabled: false, pingIntervalMinutes: 5, pingAlertsMuted: false 
  },
  { 
    $id: 'internal_db_doc', id: 'internal_db', name: 'Internal Primary Database', 
    status: SystemStatusLevel.OPERATIONAL, 
    lastCheckedAutomated: new Date().toISOString(), 
    isMonitoredPublicly: false, displayOrder: 2, groupId: 'group_internal', 
    pingEnabled: false, pingIntervalMinutes: 5, pingAlertsMuted: false 
  },
];

let mockSeverityLevelsStore: SeverityLevel[] = [
    { $id: ID.unique(), id: 'sev_critical', name: 'Critical', color: '#EF4444', priority: 1, description: 'Total system outage or major business impact.', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { $id: ID.unique(), id: 'sev_high', name: 'High', color: '#F97316', priority: 2, description: 'Significant degradation or critical functionality affected.', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { $id: ID.unique(), id: 'sev_medium', name: 'Medium', color: '#F59E0B', priority: 3, description: 'Limited impact or minor functionality affected.', createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), updatedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
    { $id: ID.unique(), id: 'sev_low', name: 'Low', color: '#10B981', priority: 4, description: 'Cosmetic issue or informational update needed.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

let mockIncidentStatusDefinitionsStore: IncidentStatusDefinition[] = [
    { $id: ID.unique(), id: 'status_detected', name: 'Detected', description: 'New report, needs vetting.', color: '#E11D48', displayOrder: 1, isEnabled: true, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { $id: ID.unique(), id: 'status_investigating', name: 'Investigating', description: 'Actively looking into the cause.', color: '#F59E0B', displayOrder: 2, isEnabled: true, isDefault: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { $id: ID.unique(), id: 'status_identified', name: 'Identified', description: 'Root cause found.', color: '#FACC15', displayOrder: 3, isEnabled: true, isDefault: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { $id: ID.unique(), id: 'status_monitoring', name: 'Monitoring', description: 'Fix deployed, observing stability.', color: '#2563EB', displayOrder: 4, isEnabled: true, isDefault: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { $id: ID.unique(), id: 'status_resolved', name: 'Resolved', description: 'Issue fixed and verified.', color: '#16A34A', displayOrder: 5, isEnabled: true, isDefault: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];


let mockPublicIncidentsStore: Incident[] = [
  {
    $id: 'inc_payment_degraded_240315_doc', id: 'inc_payment_degraded_240315',
    title: 'Payment Processing Delays', type: IncidentType.INCIDENT, impact: IncidentImpact.SIGNIFICANT, currentLifecycleStatus: IncidentLifecycleStatus.MONITORING, 
    affectedServiceIds: ['payment_gateway'],
    messages: [
      { id: ID.unique(), timestamp: new Date(Date.now() - 60000 * 10).toISOString(), status: IncidentLifecycleStatus.MONITORING, message: 'We are continuing to monitor performance. Most transactions are now processing normally.', postedBy: 'Engineering Team' },
      { id: ID.unique(), timestamp: new Date(Date.now() - 60000 * 60).toISOString(), status: IncidentLifecycleStatus.IDENTIFIED, message: 'The issue has been identified and a fix is being implemented. We expect improvements shortly.', postedBy: 'Engineering Team' },
      { id: ID.unique(), timestamp: new Date(Date.now() - 60000 * 120).toISOString(), status: IncidentLifecycleStatus.INVESTIGATING, message: 'We are investigating reports of intermittent delays and failures in payment processing.', postedBy: 'Support Team' },
    ],
    createdAt: new Date(Date.now() - 60000 * 120).toISOString(), updatedAt: new Date(Date.now() - 60000 * 10).toISOString(), isPubliclyVisible: true,
    severityLevelId: 'sev_high',
    incidentStatusId: 'status_monitoring',
    debriefRequired: true,
  },
  {
    $id: 'maint_support_240318_doc', id: 'maint_support_240318',
    title: 'Scheduled Maintenance for Support System', type: IncidentType.MAINTENANCE, impact: IncidentImpact.MINOR, currentLifecycleStatus: IncidentLifecycleStatus.IN_PROGRESS, 
    affectedServiceIds: ['support_system'],
    messages: [
      { id: ID.unique(), timestamp: new Date(Date.now() - 60000 * 30).toISOString(), status: IncidentLifecycleStatus.IN_PROGRESS, message: 'Maintenance is currently in progress. The support ticket system may be temporarily unavailable.', postedBy: 'SysAdmin' },
      { id: ID.unique(), timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), status: IncidentLifecycleStatus.SCHEDULED, message: 'Scheduled maintenance to upgrade server infrastructure.', postedBy: 'SysAdmin' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 1 - 60000*5).toISOString(), updatedAt: new Date(Date.now() - 60000 * 30).toISOString(),
    scheduledStartTime: new Date(Date.now() - 60000 * 30).toISOString(), scheduledEndTime: new Date(Date.now() + 60000 * 90).toISOString(), isPubliclyVisible: true,
    debriefRequired: false,
  },
  {
    $id: 'inc_resolved_api_outage_doc', id: 'inc_resolved_api_outage',
    title: 'Resolved: API Outage', type: IncidentType.INCIDENT, impact: IncidentImpact.CRITICAL, currentLifecycleStatus: IncidentLifecycleStatus.RESOLVED, 
    affectedServiceIds: ['api_main'],
    messages: [
      { id: ID.unique(), timestamp: new Date(Date.now() - 86400000 * 2 + 60000 * 120).toISOString(), status: IncidentLifecycleStatus.RESOLVED, message: 'The API services have been fully restored. We are monitoring the situation.', postedBy: 'Admin User' },
      { id: ID.unique(), timestamp: new Date(Date.now() - 86400000 * 2 + 60000 * 60).toISOString(), status: IncidentLifecycleStatus.MONITORING, message: 'A fix has been deployed. We are monitoring recovery.', postedBy: 'Admin User' },
      { id: ID.unique(), timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), status: IncidentLifecycleStatus.INVESTIGATING, message: 'We are currently experiencing a major outage affecting the Main API.', postedBy: 'Admin User' },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), 
    updatedAt: new Date(Date.now() - 86400000 * 2 + 60000 * 120).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 2 + 60000 * 120).toISOString(),
    isPubliclyVisible: true,
    severityLevelId: 'sev_critical',
    incidentStatusId: 'status_resolved',
    debriefRequired: true,
  },
];

let mockIncidentReviewsStore: IncidentReview[] = [
    {
        $id: ID.unique(), id: ID.unique(),
        incidentId: 'inc_resolved_api_outage', 
        status: PIRStatus.COMPLETED,
        incidentSummaryText: "A brief summary of the API outage.",
        rootCauseSummary: "Misconfiguration in load balancer led to cascading failures.",
        timelineOfEvents: "10:00 AM - Alerts received. 10:05 AM - Investigating. 10:30 AM - Root cause identified. 11:00 AM - Fix deployed. 11:30 AM - Services restored.",
        impactedSystemsText: "Main API, Customer Portal (partially due to API dependency)",
        communicationSent: "Status page updated at 10:10 AM, 11:05 AM, 11:35 AM.",
        resolutionSteps: "Corrected load balancer configuration. Restarted affected API instances.",
        whatWentWell: "Rapid identification of issue by SRE team.",
        whatWentWrong: "Initial alerting thresholds were too high, delaying detection.",
        actionItems: "- [ ] Update load balancer health checks (DevOps)\n- [ ] Review alerting thresholds for critical APIs (SRE)",
        followUpActions: "Implement automated checks for load balancer config. Improve monitoring on API health.",
        lessonsLearned: "Need faster escalation path for critical alerts. Configuration changes require more thorough review.",
        severityLevel: "Critical",
        isPreventable: true,
        preventableReasoning: "A more robust pre-deployment check of the load balancer configuration could have caught the error.",
        participants: ["Administrator Prime", "SRE Lead"],
        reviewedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
        $id: ID.unique(), id: ID.unique(),
        incidentId: 'inc_payment_degraded_240315', 
        status: PIRStatus.PENDING,
        createdAt: new Date(Date.now() - 60000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 60000 * 5).toISOString(),
    }
];


let mockAdminUsersStore: AdminUser[] = [
    { $id: ID.unique(), id: MOCK_USER_ID_ADMIN, name: 'Administrator Prime', email: 'admin@mrx.com', role: 'Admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { $id: ID.unique(), id: MOCK_USER_ID_SUPPORT, name: 'Support Lead', email: 'support@mrx.com', role: 'Support', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { $id: ID.unique(), id: 'viewer_user_id', name: 'Charlie Viewer', email: 'viewer@mrx.com', role: 'Viewer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// This store will now derive its content from mockPublicServicesStore
let mockInternalSystemServicesStore: SystemService[] = mockPublicServicesStore.filter(s => !s.isMonitoredPublicly).sort((a, b) => a.displayOrder - b.displayOrder);

let mockUserActivityStore: UserActivityLog[] = [
  { id: ID.unique(), timestamp: new Date(Date.now() - 60000 * 5).toISOString(), userId: MOCK_USER_ID_ADMIN, userName: 'Admin User', action: 'User login', status: ActivityStatus.SUCCESS, details: 'IP: 192.168.1.100' },
];
let mockServiceUptimeStore: ServiceUptime[] = [
  { id: ID.unique(), serviceName: 'Internal Main API', uptimePercentage: 99.985 },
];
let mockErrorReportsStore: ErrorReport[] = [
  { id: ID.unique(), timestamp: new Date(Date.now() - 60000 * 30).toISOString(), service: 'Payment Gateway Internal', errorCode: 'PGW-5001', message: 'Transaction declined by bank', severity: ErrorSeverity.WARNING, details: 'User card expired.' },
];

let mockGuestIncidentReportsStore: GuestIncidentReport[] = [
    { $id: ID.unique(), id: ID.unique(), serviceId: 'api_main', description: "Main API seems to be returning 503 errors intermittently.", email: "testuser@example.com", submittedAt: new Date(Date.now() - 3600000).toISOString(), status: GuestIncidentReportStatus.NEW, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"},
    { $id: ID.unique(), id: ID.unique(), serviceId: 'website_portal', description: "Cannot log in to the customer portal, login button is disabled.", submittedAt: new Date(Date.now() - 7200000).toISOString(), status: GuestIncidentReportStatus.REVIEWED, notes: "Investigating further."},
];

// Decision Flow Mock Data
let mockDecisionFlowsStore: DecisionFlow[] = [
    {
        id: ID.unique(), $id: ID.unique(), name: 'Standard Service Outage Protocol',
        description: 'Default steps to take when a critical service is reported as down.',
        steps: [
            { id: ID.unique(), title: 'Acknowledge Alert & Notify Team', description: 'Confirm alert in monitoring system. Notify on-call engineer and relevant stakeholders via Slack/PagerDuty.', displayOrder: 0, required: true },
            { id: ID.unique(), title: 'Initial Triage & Impact Assessment', description: 'Quickly assess the scope of the outage. How many users/services are affected? What is the business impact?', displayOrder: 1, required: true },
            { id: ID.unique(), title: 'Post Initial Public Update', description: 'Update the public status page with initial information. State that the issue is being investigated.', displayOrder: 2, required: true },
            { id: ID.unique(), title: 'Check Logs & Metrics', description: 'Review application logs, server metrics, and APM dashboards for error patterns or anomalies.', displayOrder: 3, required: true },
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    },
    {
        id: ID.unique(), $id: ID.unique(), name: 'Database Connectivity Issue Flow',
        description: 'Specific steps for when database connectivity is suspected.',
        steps: [
            { id: ID.unique(), title: 'Verify Network to DB', description: 'Ping DB server, check firewall rules, VPN connectivity if applicable.', displayOrder: 0, required: true },
            { id: ID.unique(), title: 'Check DB Server Health', description: 'CPU, Memory, Disk I/O on the database server.', displayOrder: 1, required: true },
            { id: ID.unique(), title: 'Check Connection Pool', description: 'Are applications exhausting the connection pool?', displayOrder: 2, required: false },
        ],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
];

let mockActiveIncidentFlowsStore: ActiveIncidentFlow[] = [];


// --- Helper for mock API Keys stored in localStorage ---
const getMockApiKeysFromStorage = (): ApiKey[] => {
  try {
    const storedKeys = localStorage.getItem(LOCAL_STORAGE_API_KEYS_KEY);
    return storedKeys ? JSON.parse(storedKeys) : [];
  } catch (e) {
    console.error("Error reading mock API keys from localStorage:", e);
    return [];
  }
};

const saveMockApiKeysToStorage = (keys: ApiKey[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_API_KEYS_KEY, JSON.stringify(keys));
  } catch (e) {
    console.error("Error saving mock API keys to localStorage:", e);
  }
};


// --- Accessor and Manipulator Functions for Mock Data ---

// Service Groups
export const getMockServiceGroups = (): ServiceGroup[] => JSON.parse(JSON.stringify(mockServiceGroupsStore.sort((a,b) => a.displayOrder - b.displayOrder)));
export const createMockServiceGroup = (groupData: Omit<ServiceGroup, 'id' | '$id'>): ServiceGroup => {
  const newGroup: ServiceGroup = {
    ...groupData,
    id: ID.unique(),
    $id: ID.unique(),
  };
  mockServiceGroupsStore.push(newGroup);
  return JSON.parse(JSON.stringify(newGroup));
};
export const updateMockServiceGroup = (groupId: string, updates: Partial<Omit<ServiceGroup, 'id' | '$id'>>): ServiceGroup | null => {
  let group = mockServiceGroupsStore.find(g => g.id === groupId);
  if (group) {
    group = { ...group, ...updates };
    mockServiceGroupsStore = mockServiceGroupsStore.map(g => g.id === groupId ? group! : g);
    return JSON.parse(JSON.stringify(group));
  }
  return null;
};
export const deleteMockServiceGroup = (groupId: string): void => {
  mockServiceGroupsStore = mockServiceGroupsStore.filter(g => g.id !== groupId);
  
  mockPublicServicesStore = mockPublicServicesStore.map(s => {
    if (s.groupId === groupId) {
      return { ...s, groupId: undefined };
    }
    return s;
  });
};


// Public Services
export const getMockPublicServices = (): SystemService[] => JSON.parse(JSON.stringify(mockPublicServicesStore));

export const createMockPublicService = (serviceData: Omit<SystemService, 'id' | '$id' | 'lastCheckedAutomated' | 'lastPingResult' | 'updatedAt'>): SystemService => {
  const newService: SystemService = {
    ...serviceData,
    id: ID.unique(),
    $id: ID.unique(),
    lastCheckedAutomated: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastPingResult: serviceData.pingUrl ? { status: PingStatus.UNKNOWN, checkedAt: new Date().toISOString() } : undefined,
    pingEnabled: serviceData.pingEnabled !== undefined ? serviceData.pingEnabled : false,
    pingIntervalMinutes: serviceData.pingIntervalMinutes || 5,
    pingAlertsMuted: serviceData.pingAlertsMuted !== undefined ? serviceData.pingAlertsMuted : false,
    components: serviceData.components || [],
  };
  mockPublicServicesStore.push(newService);
  if (!newService.isMonitoredPublicly) {
    mockInternalSystemServicesStore = mockPublicServicesStore.filter(s => !s.isMonitoredPublicly).sort((a,b) => a.displayOrder - b.displayOrder);
  }
  return JSON.parse(JSON.stringify(newService));
};

export const updateMockPublicService = (serviceId: string, updates: Partial<Omit<SystemService, 'id' | '$id' | 'updatedAt'>>): SystemService | null => {
  let service = mockPublicServicesStore.find(s => s.id === serviceId);
  if (service) {
    const currentComponents = service.components || [];
    const updatedComponents = updates.components !== undefined ? updates.components : currentComponents;

    if ('pingUrl' in updates && updates.pingUrl && (!service.pingUrl || service.pingUrl !== updates.pingUrl)) {
        (updates as SystemService).lastPingResult = { status: PingStatus.UNKNOWN, checkedAt: new Date().toISOString() };
    } else if ('pingUrl' in updates && !updates.pingUrl) {
        (updates as SystemService).lastPingResult = undefined;
    }
    
    service = { ...service, ...updates, components: updatedComponents, updatedAt: new Date().toISOString() } as SystemService;
    mockPublicServicesStore = mockPublicServicesStore.map(s => s.id === serviceId ? service! : s);
    mockInternalSystemServicesStore = mockPublicServicesStore.filter(s => !s.isMonitoredPublicly).sort((a,b) => a.displayOrder - b.displayOrder);
    return JSON.parse(JSON.stringify(service));
  }
  return null;
};

export const deleteMockPublicService = (serviceId: string): void => {
  mockPublicServicesStore = mockPublicServicesStore.filter(s => s.id !== serviceId);
  mockInternalSystemServicesStore = mockPublicServicesStore.filter(s => !s.isMonitoredPublicly).sort((a,b) => a.displayOrder - b.displayOrder);
};
export const pingMockService = (serviceId: string): PingResult => {
    const service = mockPublicServicesStore.find(s => s.id === serviceId);
    if (!service || !service.pingUrl) {
        const errorResult = { status: PingStatus.ERROR, checkedAt: new Date().toISOString(), error: "Service not found or no ping URL configured." };
        if (service) service.lastPingResult = errorResult;
        return JSON.parse(JSON.stringify(errorResult));
    }
    
    let pingResult: PingResult;
    
    const responseTimeMs = 50 + Math.random() * 450; 
    if (service.pingUrl.includes('nonexistent') || Math.random() < 0.1) {
        pingResult = { status: PingStatus.OFFLINE, statusCode: 404, responseTimeMs, checkedAt: new Date().toISOString(), error: "Simulated Mock: Resource not found." };
    } else if (Math.random() < 0.05) {
        pingResult = { status: PingStatus.TIMEOUT, responseTimeMs: 2000, checkedAt: new Date().toISOString(), error: "Simulated Mock: Request timed out." };
    } else {
        const statusCode = 200;
        let status = PingStatus.ONLINE;
        if (responseTimeMs > 300) status = PingStatus.SLOW;
        pingResult = { status, statusCode, responseTimeMs, checkedAt: new Date().toISOString() };
    }
    service.lastPingResult = pingResult;
    mockPublicServicesStore = mockPublicServicesStore.map(s => s.id === serviceId ? service : s);
    return JSON.parse(JSON.stringify(pingResult));
};


// Public Incidents
export const applyMockIncidentFilters = (incidents: Incident[], filters?: IncidentFilters): Incident[] => {
    if (!filters) return incidents;
  
    let filteredIncidents = [...incidents];
  
    if (filters.predefinedRange && filters.predefinedRange !== 'allTime') {
      const now = new Date();
      let startDate: Date;
      if (filters.predefinedRange === 'last7days') startDate = subDays(now, 7);
      else if (filters.predefinedRange === 'last30days') startDate = subDays(now, 30);
      else startDate = new Date(0); 
      
      const dateFieldToFilter = (filters.status === IncidentLifecycleStatus.RESOLVED || filters.status === IncidentLifecycleStatus.COMPLETED) ? 'resolvedAt' : 'updatedAt';

      filteredIncidents = filteredIncidents.filter(inc => {
        const incidentDateField = inc[dateFieldToFilter as keyof Incident] || inc.updatedAt; 
        if (!incidentDateField) return false;
        const incidentDate = parseISO(incidentDateField as string);
        return dateIsValid(incidentDate) && isWithinInterval(incidentDate, { start: startDate, end: now });
      });
    } else if (filters.dateRange?.start && filters.dateRange?.end) {
      const startDate = parseISO(filters.dateRange.start);
      const endDate = parseISO(filters.dateRange.end);
      const dateFieldToFilter = (filters.status === IncidentLifecycleStatus.RESOLVED || filters.status === IncidentLifecycleStatus.COMPLETED) ? 'resolvedAt' : 'updatedAt';
      if(dateIsValid(startDate) && dateIsValid(endDate)) {
          filteredIncidents = filteredIncidents.filter(inc => {
              const incidentDateField = inc[dateFieldToFilter as keyof Incident] || inc.updatedAt;
              if (!incidentDateField) return false;
              const incidentDate = parseISO(incidentDateField as string);
              return dateIsValid(incidentDate) && isWithinInterval(incidentDate, { start: startDate, end: endDate });
          });
      }
    }
  
    if (filters.serviceId) {
      filteredIncidents = filteredIncidents.filter(inc => inc.affectedServiceIds.includes(filters.serviceId!));
    }
    if (filters.type) { 
       filteredIncidents = filteredIncidents.filter(inc => inc.type === filters.type);
    }
    if (filters.status) {
        filteredIncidents = filteredIncidents.filter(inc => inc.currentLifecycleStatus === filters.status);
    }
    
    return filteredIncidents;
  };

export const getMockPublicIncidents = (): Incident[] => JSON.parse(JSON.stringify(mockPublicIncidentsStore));
export const getMockPublicIncidentById = (id: string): Incident | undefined => JSON.parse(JSON.stringify(mockPublicIncidentsStore.find(inc => inc.id === id)));
export const createMockPublicIncident = (incidentData: Omit<Incident, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'messages'> & { initialMessage: string, initialStatus: IncidentLifecycleStatus, postedBy?: string }): Incident => {
  const now = new Date().toISOString();
  const firstMessage: IncidentMessage = {
    id: ID.unique(), timestamp: now, status: incidentData.initialStatus, message: incidentData.initialMessage, postedBy: incidentData.postedBy || "System Admin"
  };
  const newIncident: Incident = {
    id: ID.unique(), $id: ID.unique(), title: incidentData.title, type: incidentData.type, impact: incidentData.impact,
    currentLifecycleStatus: incidentData.initialStatus, affectedServiceIds: incidentData.affectedServiceIds, messages: [firstMessage],
    createdAt: now, updatedAt: now, isPubliclyVisible: incidentData.isPubliclyVisible,
    scheduledStartTime: incidentData.scheduledStartTime, scheduledEndTime: incidentData.scheduledEndTime,
    severityLevelId: incidentData.severityLevelId,
    debriefRequired: incidentData.debriefRequired || false,
    detectedAt: now, 
    acknowledgedAt: incidentData.initialStatus === IncidentLifecycleStatus.ACKNOWLEDGED ? now : undefined,
  };
  if ( (newIncident.currentLifecycleStatus === IncidentLifecycleStatus.RESOLVED && newIncident.type === IncidentType.INCIDENT) ||
       (newIncident.currentLifecycleStatus === IncidentLifecycleStatus.COMPLETED && newIncident.type === IncidentType.MAINTENANCE) ) {
    newIncident.resolvedAt = now;
    
    if (!mockIncidentReviewsStore.find(r => r.incidentId === newIncident.id)) {
        createMockIncidentReview({
            incidentId: newIncident.id,
            status: PIRStatus.PENDING,
        });
    }
  }
  mockPublicIncidentsStore.unshift(newIncident);
  return JSON.parse(JSON.stringify(newIncident));
};

export const updateMockPublicIncident = (incidentId: string, updates: Partial<Omit<Incident, 'id' | '$id' | 'messages' | 'createdAt' | 'updatedAt'>>): Incident | null => {
  let incident = mockPublicIncidentsStore.find(inc => inc.id === incidentId);
  if (incident) {
    const now = new Date().toISOString();
    const oldStatus = incident.currentLifecycleStatus;
    const newStatus = updates.currentLifecycleStatus || oldStatus;
    
    let messages = [...incident.messages];
    if (newStatus && newStatus !== oldStatus) {
        messages.unshift({
            id: ID.unique(),
            timestamp: now,
            status: newStatus as IncidentLifecycleStatus, 
            message: `Incident status changed from ${oldStatus} to ${newStatus}.`,
            postedBy: "System" 
        });
    }

    incident = { ...incident, ...updates, messages, updatedAt: now } as Incident;
    
    if ( (newStatus === IncidentLifecycleStatus.RESOLVED && incident.type === IncidentType.INCIDENT && !incident.resolvedAt) ||
         (newStatus === IncidentLifecycleStatus.COMPLETED && incident.type === IncidentType.MAINTENANCE && !incident.resolvedAt) ) {
        incident.resolvedAt = now;
        if (!mockIncidentReviewsStore.find(r => r.incidentId === incident!.id)) {
            createMockIncidentReview({ incidentId: incident!.id, status: PIRStatus.PENDING });
        }
    } else if (newStatus === IncidentLifecycleStatus.ACKNOWLEDGED && !incident.acknowledgedAt) {
        incident.acknowledgedAt = now;
    }
    else if ( (oldStatus === IncidentLifecycleStatus.RESOLVED || oldStatus === IncidentLifecycleStatus.COMPLETED) &&
                (newStatus !== IncidentLifecycleStatus.RESOLVED && newStatus !== IncidentLifecycleStatus.COMPLETED) ) {
        incident.resolvedAt = undefined;
    }

    mockPublicIncidentsStore = mockPublicIncidentsStore.map(inc => inc.id === incidentId ? incident! : inc);
    return JSON.parse(JSON.stringify(incident));
  }
  return null;
};

export const addMockIncidentMessage = (incidentId: string, messageData: { status: IncidentLifecycleStatus, message: string, postedBy?: string }): Incident | null => {
  const incident = mockPublicIncidentsStore.find(inc => inc.id === incidentId);
  if (incident) {
    const now = new Date().toISOString();
    const newMessage: IncidentMessage = {
      id: ID.unique(), timestamp: now, status: messageData.status, message: messageData.message, postedBy: messageData.postedBy || "System Admin",
    };
    incident.messages.unshift(newMessage);
    incident.currentLifecycleStatus = messageData.status;
    incident.updatedAt = newMessage.timestamp;

    if(((messageData.status === IncidentLifecycleStatus.RESOLVED && incident.type === IncidentType.INCIDENT) || (messageData.status === IncidentLifecycleStatus.COMPLETED && incident.type === IncidentType.MAINTENANCE)) && !incident.resolvedAt) {
        incident.resolvedAt = newMessage.timestamp;
        if (!mockIncidentReviewsStore.find(r => r.incidentId === incident.id)) {
            createMockIncidentReview({ incidentId: incident.id, status: PIRStatus.PENDING });
        }
    } else if (messageData.status === IncidentLifecycleStatus.ACKNOWLEDGED && !incident.acknowledgedAt) {
        incident.acknowledgedAt = now;
    }
    mockPublicIncidentsStore = mockPublicIncidentsStore.map(i => i.id === incidentId ? incident : i);
    return JSON.parse(JSON.stringify(incident));
  }
  return null;
};
export const deleteMockPublicIncident = (incidentId: string): void => {
  mockPublicIncidentsStore = mockPublicIncidentsStore.filter(inc => inc.id !== incidentId);
  mockIncidentReviewsStore = mockIncidentReviewsStore.filter(review => review.incidentId !== incidentId);
};

// Incident Reviews
export const getMockIncidentReviews = (filters?: IncidentReviewFilters): IncidentReview[] => {
  let reviews = JSON.parse(JSON.stringify(mockIncidentReviewsStore));
  if (!filters) return reviews.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (filters.pirStatus) {
    reviews = reviews.filter((r: IncidentReview) => r.status === filters.pirStatus);
  }
  if (filters.pirSeverity) {
    reviews = reviews.filter((r: IncidentReview) => r.severityLevel === filters.pirSeverity);
  }
  if (filters.incidentId) {
    reviews = reviews.filter((r: IncidentReview) => r.incidentId === filters.incidentId);
  }

  if (filters.serviceId || filters.incidentType || filters.dateRange || filters.predefinedRange) {
    reviews = reviews.filter((r: IncidentReview) => {
      const incident = mockPublicIncidentsStore.find(inc => inc.id === r.incidentId);
      if (!incident) return false; 

      if (filters.serviceId && !incident.affectedServiceIds.includes(filters.serviceId)) return false;
      if (filters.incidentType && incident.type !== filters.incidentType) return false;
      
      const dateToFilterOnReview = r.reviewedAt || r.updatedAt; 
      const dateToFilterOnIncident = incident.resolvedAt || incident.updatedAt; 
      
      let dateToFilter = dateToFilterOnIncident; 
      if (filters.pirStatus === PIRStatus.COMPLETED && r.reviewedAt) { 
          dateToFilter = r.reviewedAt;
      }

      if (!dateToFilter) return true; 

      if (filters.predefinedRange && filters.predefinedRange !== 'allTime') {
        const now = new Date();
        let startDate: Date;
        if (filters.predefinedRange === 'last7days') startDate = subDays(now, 7);
        else startDate = subDays(now, 30); 
        if (!isWithinInterval(parseISO(dateToFilter), { start: startDate, end: now })) return false;
      } else if (filters.dateRange?.start && filters.dateRange?.end) {
          const startDate = parseISO(filters.dateRange.start);
          const endDate = parseISO(filters.dateRange.end);
          if (dateIsValid(startDate) && dateIsValid(endDate)) {
            if (!isWithinInterval(parseISO(dateToFilter), { start: startDate, end: endDate })) return false;
          }
      }
      return true;
    });
  }
  
  return reviews.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const getMockIncidentReviewByIncidentId = (incidentId: string): IncidentReview | null => {
  const review = mockIncidentReviewsStore.find(r => r.incidentId === incidentId);
  return review ? JSON.parse(JSON.stringify(review)) : null;
};

export const createMockIncidentReview = (reviewData: Omit<IncidentReview, 'id' | '$id' | 'createdAt' | 'updatedAt'>): IncidentReview => {
  const now = new Date().toISOString();
  const newReview: IncidentReview = {
    $id: ID.unique(),
    id: ID.unique(),
    ...reviewData,
    createdAt: now,
    updatedAt: now,
  };
  
  const existingReviewIndex = mockIncidentReviewsStore.findIndex(r => r.incidentId === newReview.incidentId);
  if (existingReviewIndex !== -1) {
    mockIncidentReviewsStore[existingReviewIndex] = newReview; 
  } else {
    mockIncidentReviewsStore.push(newReview);
  }
  return JSON.parse(JSON.stringify(newReview));
};

export const updateMockIncidentReview = (reviewId: string, updates: Partial<Omit<IncidentReview, 'id' | '$id' | 'incidentId' | 'createdAt' | 'updatedAt'>>): IncidentReview | null => {
  const reviewIndex = mockIncidentReviewsStore.findIndex(r => r.id === reviewId || r.$id === reviewId);
  if (reviewIndex !== -1) {
    const now = new Date().toISOString();
    mockIncidentReviewsStore[reviewIndex] = {
      ...mockIncidentReviewsStore[reviewIndex],
      ...updates,
      updatedAt: now,
    };
    if (updates.status === PIRStatus.COMPLETED && !updates.reviewedAt && !mockIncidentReviewsStore[reviewIndex].reviewedAt) {
      mockIncidentReviewsStore[reviewIndex].reviewedAt = now;
    }
     if (updates.participants && !Array.isArray(updates.participants)) {
        mockIncidentReviewsStore[reviewIndex].participants = (updates.participants as string).split(',').map(p => p.trim()).filter(p => p);
    }
    return JSON.parse(JSON.stringify(mockIncidentReviewsStore[reviewIndex]));
  }
  return null;
};

export const deleteMockIncidentReview = (reviewId: string): void => {
  mockIncidentReviewsStore = mockIncidentReviewsStore.filter(r => r.id !== reviewId && r.$id !== reviewId);
};

// Severity Levels
export const getMockSeverityLevels = (): SeverityLevel[] => JSON.parse(JSON.stringify(mockSeverityLevelsStore.sort((a,b) => a.priority - b.priority)));
export const createMockSeverityLevel = (data: Omit<SeverityLevel, 'id' | '$id' | 'createdAt' | 'updatedAt'>): SeverityLevel => {
  const now = new Date().toISOString();
  const newLevel: SeverityLevel = {
    $id: ID.unique(),
    id: ID.unique(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  mockSeverityLevelsStore.push(newLevel);
  return JSON.parse(JSON.stringify(newLevel));
};
export const updateMockSeverityLevel = (id: string, updates: Partial<Omit<SeverityLevel, 'id'|'$id'|'createdAt'|'updatedAt'>>): SeverityLevel | null => {
  const index = mockSeverityLevelsStore.findIndex(level => level.id === id || level.$id === id);
  if (index !== -1) {
    mockSeverityLevelsStore[index] = {
      ...mockSeverityLevelsStore[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return JSON.parse(JSON.stringify(mockSeverityLevelsStore[index]));
  }
  return null;
};
export const deleteMockSeverityLevel = (id: string): void => {
  const isUsed = mockPublicIncidentsStore.some(incident => incident.severityLevelId === id);
  if (isUsed) {
    const level = mockSeverityLevelsStore.find(l => l.id === id || l.$id === id);
    const levelName = level ? level.name : `ID ${id}`;
    throw new Error(`Severity level '${levelName}' is currently in use by one or more incidents and cannot be deleted. Please reassign incidents to other severity levels first.`);
  }
  mockSeverityLevelsStore = mockSeverityLevelsStore.filter(level => level.id !== id && level.$id !== id);
};

// Incident Status Definitions
export const getMockIncidentStatusDefinitions = (): IncidentStatusDefinition[] => JSON.parse(JSON.stringify(mockIncidentStatusDefinitionsStore.sort((a,b) => a.displayOrder - b.displayOrder)));
export const createMockIncidentStatusDefinition = (data: Omit<IncidentStatusDefinition, 'id' | '$id' | 'createdAt' | 'updatedAt'>): IncidentStatusDefinition => {
  const now = new Date().toISOString();
  const newStatus: IncidentStatusDefinition = {
    $id: ID.unique(),
    id: ID.unique(),
    ...data,
    isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
    isDefault: data.isDefault !== undefined ? data.isDefault : false,
    createdAt: now,
    updatedAt: now,
  };
  mockIncidentStatusDefinitionsStore.push(newStatus);
  return JSON.parse(JSON.stringify(newStatus));
};
export const updateMockIncidentStatusDefinition = (id: string, updates: Partial<Omit<IncidentStatusDefinition, 'id'|'$id'|'createdAt'|'updatedAt'>>): IncidentStatusDefinition | null => {
  const index = mockIncidentStatusDefinitionsStore.findIndex(status => status.id === id || status.$id === id);
  if (index !== -1) {
    mockIncidentStatusDefinitionsStore[index] = {
      ...mockIncidentStatusDefinitionsStore[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return JSON.parse(JSON.stringify(mockIncidentStatusDefinitionsStore[index]));
  }
  return null;
};
export const deleteMockIncidentStatusDefinition = (id: string): void => {
  mockIncidentStatusDefinitionsStore = mockIncidentStatusDefinitionsStore.filter(status => status.id !== id && status.$id !== id);
};


// Admin Users
export const getMockAdminUsers = (): AdminUser[] => JSON.parse(JSON.stringify(mockAdminUsersStore));
export const createMockAdminUser = (userData: Omit<AdminUser, '$id' | 'createdAt' | 'updatedAt'>): AdminUser => {
  const now = new Date().toISOString();
  const newUser: AdminUser = {
    ...userData, 
    $id: ID.unique(), 
    id: userData.id, 
    createdAt: now, 
    updatedAt: now,
  };
  mockAdminUsersStore.push(newUser);
  return JSON.parse(JSON.stringify(newUser));
};
export const updateMockAdminUser = (adminUserDocId: string, updates: Partial<Omit<AdminUser, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'email'>>): AdminUser | null => {
  let user = mockAdminUsersStore.find(u => u.$id === adminUserDocId); 
  if (user) {
    const { email, ...safeUpdates } = updates as any; 
    user = { ...user, ...safeUpdates, updatedAt: new Date().toISOString() };
    mockAdminUsersStore = mockAdminUsersStore.map(u => u.$id === adminUserDocId ? user! : u);
    return JSON.parse(JSON.stringify(user));
  }
  return null;
};
export const deleteMockAdminUser = (adminUserDocId: string): void => {
  mockAdminUsersStore = mockAdminUsersStore.filter(u => u.$id !== adminUserDocId); 
};


// Internal Admin Dashboard Data
export const getMockInternalSystemStatus = (): SystemService[] => {
  // Filter from the main public services store for internal services
  return JSON.parse(JSON.stringify(mockPublicServicesStore.filter(s => !s.isMonitoredPublicly).sort((a, b) => a.displayOrder - b.displayOrder)));
};
export const getMockUserActivity = (limit: number = 10): UserActivityLog[] => JSON.parse(JSON.stringify(mockUserActivityStore.slice(0, limit)));
export const getMockInternalServiceUptime = (): ServiceUptime[] => JSON.parse(JSON.stringify(mockServiceUptimeStore));
export const getMockErrorReports = (limit: number = 10): ErrorReport[] => JSON.parse(JSON.stringify(mockErrorReportsStore.slice(0, limit)));
export const addMockErrorReport = (reportData: Omit<ErrorReport, 'id' | 'timestamp'>): ErrorReport => {
  const newReport: ErrorReport = {
    id: ID.unique(), timestamp: new Date().toISOString(), ...reportData,
  };
  mockErrorReportsStore.unshift(newReport);
  return JSON.parse(JSON.stringify(newReport));
};

// Mock API Key Functions
export const getMockApiKeysByUserId = async (userId: string): Promise<ApiKey[]> => {
  const allKeys = getMockApiKeysFromStorage();
  return allKeys.filter(key => key.userId === userId && !key.revokedAt);
};

async function mockSha256(message: string): Promise<string> {
    try {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; 
        }
        return "pseudo_hash_" + Math.abs(hash).toString(16);
    }
}


export const generateMockApiKey = async (label: string, userId: string): Promise<NewApiKey> => {
  const allKeys = getMockApiKeysFromStorage();
  const fullKey = `${API_KEY_PREFIX}${ID.unique()}_${ID.unique()}`;
  const newKeyEntry: NewApiKey = {
    $id: ID.unique(),
    id: ID.unique(), 
    label,
    fullKey,
    keyPrefix: fullKey.substring(0, API_KEY_PREFIX.length + 8), 
    keySuffix: fullKey.substring(fullKey.length - 8), 
    hashedKey: await mockSha256(fullKey), 
    userId,
    createdAt: new Date().toISOString(),
    lastUsedAt: undefined,
    expiresAt: undefined,
    revokedAt: undefined,
  };
  
  const { fullKey: _, ...keyToStore } = newKeyEntry; 
  allKeys.push(keyToStore);
  saveMockApiKeysToStorage(allKeys);
  return newKeyEntry; 
};

export const revokeMockApiKey = async (apiKeyDocId: string): Promise<void> => {
  let allKeys = getMockApiKeysFromStorage();
  allKeys = allKeys.map(key => {
    if (key.id === apiKeyDocId) {
      return { ...key, revokedAt: new Date().toISOString() };
    }
    return key;
  });
  saveMockApiKeysToStorage(allKeys);
};

export const validateMockApiKey = async (apiKeyString: string): Promise<boolean> => {
    const allKeys = getMockApiKeysFromStorage();
    if (!apiKeyString || !apiKeyString.startsWith(API_KEY_PREFIX)) {
        return false;
    }

    const keyPrefix = apiKeyString.substring(0, API_KEY_PREFIX.length + 8);
    const keySuffix = apiKeyString.substring(apiKeyString.length - 8);
    const currentHashedKey = await mockSha256(apiKeyString);

    const foundKey = allKeys.find(
        (key) =>
            key.keyPrefix === keyPrefix &&
            key.keySuffix === keySuffix &&
            !key.revokedAt
    );

    if (foundKey && foundKey.hashedKey === currentHashedKey) {
        foundKey.lastUsedAt = new Date().toISOString();
        saveMockApiKeysToStorage(allKeys);
        return true;
    }
    return false;
};

// Guest Incident Reports
export const getMockGuestIncidentReports = (): GuestIncidentReport[] => JSON.parse(JSON.stringify(mockGuestIncidentReportsStore));

export const createMockGuestIncidentReport = (reportData: Omit<GuestIncidentReport, '$id' | 'id' | 'submittedAt' | 'status' | 'userAgent' | 'notes' | 'officialIncidentId'>): GuestIncidentReport => {
  const newReport: GuestIncidentReport = {
    ...reportData,
    id: ID.unique(),
    $id: ID.unique(),
    submittedAt: new Date().toISOString(),
    status: GuestIncidentReportStatus.NEW,
    userAgent: navigator.userAgent,
  };
  mockGuestIncidentReportsStore.unshift(newReport);
  return JSON.parse(JSON.stringify(newReport));
};

export const updateMockGuestIncidentReport = (reportId: string, updates: Partial<Omit<GuestIncidentReport, 'id' | '$id' | 'serviceId' | 'description' | 'email' | 'submittedAt' | 'userAgent'>>): GuestIncidentReport | null => {
  let report = mockGuestIncidentReportsStore.find(r => r.id === reportId);
  if (report) {
    report = { ...report, ...updates };
    mockGuestIncidentReportsStore = mockGuestIncidentReportsStore.map(r => (r.id === reportId ? report! : r));
    return JSON.parse(JSON.stringify(report));
  }
  return null;
};

export const deleteMockGuestIncidentReport = (reportId: string): void => {
  mockGuestIncidentReportsStore = mockGuestIncidentReportsStore.filter(r => r.id !== reportId);
};

// Decision Flows
export const getMockDecisionFlows = (): DecisionFlow[] => JSON.parse(JSON.stringify(mockDecisionFlowsStore));
export const createMockDecisionFlow = (flowData: Omit<DecisionFlow, 'id'|'$id'|'createdAt'|'updatedAt'>): DecisionFlow => {
    const now = new Date().toISOString();
    const newFlow: DecisionFlow = {
        id: ID.unique(), $id: ID.unique(), ...flowData, createdAt: now, updatedAt: now,
        steps: flowData.steps.map((step, index) => ({...step, id: step.id || ID.unique(), displayOrder: index }))
    };
    mockDecisionFlowsStore.push(newFlow);
    return JSON.parse(JSON.stringify(newFlow));
};
export const updateMockDecisionFlow = (flowId: string, updates: Partial<Omit<DecisionFlow, 'id'|'$id'|'createdAt'|'updatedAt'>>): DecisionFlow | null => {
    const index = mockDecisionFlowsStore.findIndex(flow => flow.id === flowId);
    if (index !== -1) {
        mockDecisionFlowsStore[index] = { 
            ...mockDecisionFlowsStore[index], 
            ...updates, 
            steps: updates.steps ? updates.steps.map((step, idx) => ({...step, id: step.id || ID.unique(), displayOrder: idx })) : mockDecisionFlowsStore[index].steps,
            updatedAt: new Date().toISOString() 
        };
        return JSON.parse(JSON.stringify(mockDecisionFlowsStore[index]));
    }
    return null;
};
export const deleteMockDecisionFlow = (flowId: string): void => {
    mockDecisionFlowsStore = mockDecisionFlowsStore.filter(flow => flow.id !== flowId);
    mockActiveIncidentFlowsStore = mockActiveIncidentFlowsStore.filter(activeFlow => activeFlow.flowId !== flowId);
};

// Active Incident Flows
export const getMockActiveIncidentFlowByIncidentId = (incidentId: string): ActiveIncidentFlow | null => {
    const activeFlow = mockActiveIncidentFlowsStore.find(af => af.incidentId === incidentId);
    return activeFlow ? JSON.parse(JSON.stringify(activeFlow)) : null;
};
export const attachMockFlowToIncident = (incidentId: string, flowId: string, flowNameSnapshot: string): ActiveIncidentFlow => {
    // Remove existing flow for this incident if any
    mockActiveIncidentFlowsStore = mockActiveIncidentFlowsStore.filter(af => af.incidentId !== incidentId);
    
    const flowDefinition = mockDecisionFlowsStore.find(f => f.id === flowId);
    const initialStepStates: Record<string, any> = {};
    if (flowDefinition) {
        flowDefinition.steps.forEach(step => {
            initialStepStates[step.id] = { completed: false, skipped: false };
        });
    }

    const newActiveFlow: ActiveIncidentFlow = {
        id: ID.unique(), $id: ID.unique(), incidentId, flowId, flowNameSnapshot,
        stepStates: initialStepStates,
        status: ActiveFlowStatus.IN_PROGRESS,
        startedAt: new Date().toISOString(),
    };
    mockActiveIncidentFlowsStore.push(newActiveFlow);
    return JSON.parse(JSON.stringify(newActiveFlow));
};
export const updateMockActiveIncidentFlow = (activeFlowId: string, updates: Partial<Omit<ActiveIncidentFlow, 'id'|'$id'|'incidentId'|'flowId'|'flowNameSnapshot'|'startedAt'>>): ActiveIncidentFlow | null => {
    const index = mockActiveIncidentFlowsStore.findIndex(af => af.id === activeFlowId);
    if (index !== -1) {
        mockActiveIncidentFlowsStore[index] = { ...mockActiveIncidentFlowsStore[index], ...updates };
        if (updates.status === ActiveFlowStatus.COMPLETED && !mockActiveIncidentFlowsStore[index].completedAt) {
            mockActiveIncidentFlowsStore[index].completedAt = new Date().toISOString();
        }
        return JSON.parse(JSON.stringify(mockActiveIncidentFlowsStore[index]));
    }
    return null;
};

