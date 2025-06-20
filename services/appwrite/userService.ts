
import { ID, Query, Models, AppwriteException, Permission, Role } from 'appwrite';
import { AdminUser, ApiKey, NewApiKey } from '../../types';
import { APPWRITE_CONFIG, API_KEY_PREFIX } from '../../constants';
import { databases, isUserExplicitlyInMockMode, isAppwriteEffectivelyConfigured, ERROR_MSG_NOT_CONFIGURED, ERROR_MSG_SDK_INIT_FAILED, ERROR_MSG_LIVE_OP_FAILED, SDK_INIT_ERROR, sha256, simulateApiCall } from './appwriteClient';
import * as mockService from './mockService'; // Corrected import path

// --- Data Mapping Helpers ---
const mapDocumentToAdminUser = (doc: Models.Document): AdminUser => ({
  id: doc.id, 
  $id: doc.$id, 
  email: doc.email,
  name: doc.name,
  role: doc.role as 'Admin' | 'Support' | 'Viewer',
  createdAt: doc.$createdAt, 
  updatedAt: doc.$updatedAt, 
});

const mapDocumentToApiKey = (doc: Models.Document): ApiKey => ({
  $id: doc.$id,
  id: doc.$id, 
  label: doc.label,
  keyPrefix: doc.keyPrefix,
  keySuffix: doc.keySuffix,
  hashedKey: doc.hashedKey, 
  userId: doc.userId,
  createdAt: doc.$createdAt, 
  lastUsedAt: doc.lastUsedAt,
  expiresAt: doc.expiresAt,
  revokedAt: doc.revokedAt,
});

// --- Admin User Management ---
export const adminGetAdminUserByAuthId = async (appwriteAuthUserId: string): Promise<AdminUser | null> => {
    const operationName = 'adminGetAdminUserByAuthId';
    // This function is critical for auth, so it should throw if Appwrite isn't ready,
    // rather than falling back to mock unless explicitly in mock mode for testing auth flow itself.
    if (isUserExplicitlyInMockMode()) {
      console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}. User ID: ${appwriteAuthUserId}`);
      const mockUser = mockService.getMockAdminUsers().find(u => u.id === appwriteAuthUserId);
      return simulateApiCall(mockUser || null);
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`Auth Service Critical Error (${operationName}): ${errorMsg}`);
        throw new Error(`Cannot verify user role: ${errorMsg}`);
    }
    try {
        console.info(`LIVE Appwrite Call (Auth Critical): ${operationName} for user ${appwriteAuthUserId}`);
        const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.adminUsersCollectionId!,
            [Query.equal('id', appwriteAuthUserId), Query.limit(1)] 
        );
        if (response.documents.length > 0) {
            return mapDocumentToAdminUser(response.documents[0]);
        }
        console.warn(`User with Appwrite Auth ID ${appwriteAuthUserId} not found in admin_users collection.`);
        return null; 
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName} (Auth Critical). User: ${appwriteAuthUserId}. Error: ${errMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName} for role): ${errMsg}`);
    }
};

export const adminGetAllUsers = async (): Promise<AdminUser[]> => {
    const operationName = 'adminGetAllUsers';
    if (isUserExplicitlyInMockMode()) {
      console.warn(`MOCK MODE (User Choice): Using MOCK data for ${operationName}.`);
      return simulateApiCall(mockService.getMockAdminUsers());
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
        throw new Error(errorMsg);
    }
    try {
        console.info(`LIVE Appwrite Call: ${operationName}`);
        const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.adminUsersCollectionId!,
            [Query.orderAsc('name')]
        );
        return response.documents.map(mapDocumentToAdminUser);
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
    }
};

export const adminCreateUser = async (userData: Omit<AdminUser, '$id' | 'createdAt' | 'updatedAt'>): Promise<AdminUser> => {
    const operationName = 'adminCreateUser';
    if (isUserExplicitlyInMockMode()) {
      console.warn(`MOCK MODE (User Choice): Simulating create for ${operationName}.`);
      return simulateApiCall(mockService.createMockAdminUser(userData));
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
        throw new Error(errorMsg);
    }
     try {
        console.info(`LIVE Appwrite Call: ${operationName}`);
        // userData.id is the Appwrite Auth User ID
        // The document ID ($id) for this admin_users entry will be auto-generated by ID.unique()
        const permissions = [
            Permission.read(Role.user(userData.id)), // The user themselves can read this document
            // Assuming 'admins' team exists and has appropriate members for management
            // Or rely on collection-level permissions for admins to manage CUD operations
            Permission.update(Role.team('admins')), 
            Permission.delete(Role.team('admins')),
            Permission.read(Role.team('admins')), // Admins can also read all user role docs
        ];

        const document = await databases.createDocument(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.adminUsersCollectionId!,
            ID.unique(), // This creates the Appwrite Document ID ($id)
            userData,     // This is the data payload, including AdminUser.id (Appwrite Auth User ID)
            permissions   // Document-level permissions
        );
        return mapDocumentToAdminUser(document);
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Creating ${operationName}): ${errMsg}`);
    }
};

export const adminUpdateUser = async (adminUserAppwriteDocId: string, updates: Partial<Omit<AdminUser, 'id' | '$id' | 'createdAt' | 'updatedAt' | 'email'>>): Promise<AdminUser> => {
    const operationName = 'adminUpdateUser';
    if (isUserExplicitlyInMockMode()) {
      console.warn(`MOCK MODE (User Choice): Simulating update for ${operationName}.`);
      const updatedUser = mockService.updateMockAdminUser(adminUserAppwriteDocId, updates); 
      if(!updatedUser) throw new Error("User not found in mock data for update.");
      return simulateApiCall(updatedUser);
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
        throw new Error(errorMsg);
    }
    try {
        console.info(`LIVE Appwrite Call: ${operationName}`);
        const payload = { ...updates }; 
        const document = await databases.updateDocument(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.adminUsersCollectionId!,
            adminUserAppwriteDocId, 
            payload
        );
        return mapDocumentToAdminUser(document);
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Updating ${operationName}): ${errMsg}`);
    }
};

export const adminDeleteUser = async (adminUserAppwriteDocId: string): Promise<void> => {
    const operationName = 'adminDeleteUser';
    if (isUserExplicitlyInMockMode()) {
      console.warn(`MOCK MODE (User Choice): Simulating delete for ${operationName}.`);
      mockService.deleteMockAdminUser(adminUserAppwriteDocId); 
      return simulateApiCall(undefined);
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
        throw new Error(errorMsg);
    }
    try {
        console.info(`LIVE Appwrite Call: ${operationName}`);
        await databases.deleteDocument(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.adminUsersCollectionId!,
            adminUserAppwriteDocId 
        );
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Deleting ${operationName}): ${errMsg}`);
    }
};


// --- API Key Management ---
export const adminGetApiKeys = async (userId: string): Promise<ApiKey[]> => {
    const operationName = 'adminGetApiKeys';
    if (isUserExplicitlyInMockMode()) {
        console.warn(`MOCK MODE (User Choice): Using MOCK (localStorage) data for ${operationName}.`);
        return mockService.getMockApiKeysByUserId(userId); 
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.apiKeysCollectionId ? "API Keys Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
        throw new Error(errorMsg);
    }
    try {
        console.info(`LIVE Appwrite Call: ${operationName}`);
        const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.apiKeysCollectionId!,
            [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
        );
        return response.documents.map(mapDocumentToApiKey);
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Fetching ${operationName}): ${errMsg}`);
    }
};

export const adminGenerateApiKey = async (label: string, userId: string): Promise<NewApiKey> => {
    const operationName = 'adminGenerateApiKey';
    if (isUserExplicitlyInMockMode()) {
        console.warn(`MOCK MODE (User Choice): Simulating generation (localStorage) for ${operationName}.`);
        return mockService.generateMockApiKey(label, userId);
    }
     if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.apiKeysCollectionId ? "API Keys Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
        throw new Error(errorMsg);
    }

    const fullKey = `${API_KEY_PREFIX}${ID.unique()}_${ID.unique()}`; 
    const keyPrefix = fullKey.substring(0, API_KEY_PREFIX.length + 8); 
    const keySuffix = fullKey.substring(fullKey.length - 8); 
    const hashedKey = await sha256(fullKey); 

    const apiKeyData = {
        label, userId, keyPrefix, keySuffix, hashedKey,
        lastUsedAt: null, expiresAt: null, revokedAt: null,
    };

    try {
        console.info(`LIVE Appwrite Call: ${operationName}`);
        const permissions = [
            Permission.read(Role.user(userId)),
            Permission.update(Role.user(userId)), // To allow user to revoke their own key
            Permission.delete(Role.user(userId)), // If direct deletion is allowed by user
        ];
        const document = await databases.createDocument(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.apiKeysCollectionId!,
            ID.unique(), 
            apiKeyData,
            permissions
        );
        return { ...mapDocumentToApiKey(document), fullKey };
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Generating ${operationName}): ${errMsg}`);
    }
};

export const adminRevokeApiKey = async (apiKeyAppwriteId: string, userId: string): Promise<void> => {
    const operationName = 'adminRevokeApiKey';
    if (isUserExplicitlyInMockMode()) {
        console.warn(`MOCK MODE (User Choice): Simulating revocation (localStorage) for ${operationName}.`);
        return mockService.revokeMockApiKey(apiKeyAppwriteId);
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.apiKeysCollectionId ? "API Keys Collection ID not configured." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): ${errorMsg}`);
        throw new Error(errorMsg);
    }
    try {
        console.info(`LIVE Appwrite Call: ${operationName}`);
        // Ensure the user owns this key before revoking, or that an admin is doing it.
        // For simplicity, assuming the caller (userId) has permission.
        // Fine-grained permission checks would happen at Appwrite collection/document level.
        await databases.updateDocument(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.apiKeysCollectionId!,
            apiKeyAppwriteId,
            { revokedAt: new Date().toISOString() }
        );
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName}. Error: ${errMsg}.`);
        throw new Error(`${ERROR_MSG_LIVE_OP_FAILED} (Revoking ${operationName}): ${errMsg}`);
    }
};

export const validateApiKey = async (apiKeyString: string): Promise<boolean> => { 
    const operationName = 'validateApiKey'; 
    if (isUserExplicitlyInMockMode()) {
        console.warn(`MOCK MODE (User Choice): Using MOCK (localStorage) validation for ${operationName}.`);
        return mockService.validateMockApiKey(apiKeyString);
    }
    if (!isAppwriteEffectivelyConfigured()) {
        const errorMsg = !APPWRITE_CONFIG.apiKeysCollectionId ? "API Keys Collection ID not configured for validation." : !APPWRITE_CONFIG.endpoint || !APPWRITE_CONFIG.projectId ? ERROR_MSG_NOT_CONFIGURED : `${ERROR_MSG_SDK_INIT_FAILED}${SDK_INIT_ERROR ? ` Details: ${SDK_INIT_ERROR.message}` : ''}`;
        console.error(`SERVICE ERROR (${operationName}): API key validation cannot proceed. ${errorMsg}`);
        return false; 
    }
    if (!apiKeyString || !apiKeyString.startsWith(API_KEY_PREFIX) || apiKeyString.length < (API_KEY_PREFIX.length + 16)) { 
        return false; 
    }

    const keyPrefix = apiKeyString.substring(0, API_KEY_PREFIX.length + 8);
    const keySuffix = apiKeyString.substring(apiKeyString.length - 8);
    const currentHashedKey = await sha256(apiKeyString);

    try {
        const response = await databases.listDocuments(
            APPWRITE_CONFIG.databaseId!,
            APPWRITE_CONFIG.apiKeysCollectionId!,
            [
                Query.equal('keyPrefix', keyPrefix),
                Query.equal('keySuffix', keySuffix),
                Query.isNull('revokedAt'), 
                Query.limit(1) 
            ]
        );

        if (response.documents.length > 0) {
            const keyDoc = response.documents[0];
            if (keyDoc.hashedKey === currentHashedKey) {
                databases.updateDocument(
                    APPWRITE_CONFIG.databaseId!,
                    APPWRITE_CONFIG.apiKeysCollectionId!,
                    keyDoc.$id,
                    { lastUsedAt: new Date().toISOString() }
                ).catch(err => console.warn("Failed to update lastUsedAt for API key:", err));
                return true;
            }
        }
        return false; 
    } catch (error) {
        const errMsg = (error instanceof Error) ? error.message : String(error);
        console.error(`Appwrite Call FAILED for ${operationName} during validation. Error: ${errMsg}.`);
        return false; 
    }
};
