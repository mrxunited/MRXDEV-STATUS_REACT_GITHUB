
import { Client, Databases, Account } from 'appwrite';
import { APPWRITE_CONFIG } from '../../constants';
import * as mockService from './mockService'; // Corrected import path

// --- Appwrite Configuration Check ---
export const IS_APPWRITE_CONFIGURED =
  APPWRITE_CONFIG.endpoint !== 'YOUR_APPWRITE_ENDPOINT' &&
  APPWRITE_CONFIG.projectId !== 'YOUR_APPWRITE_PROJECT_ID' &&
  APPWRITE_CONFIG.databaseId !== 'YOUR_DATABASE_ID';

// --- Appwrite Client Initialization ---
export let client: Client;
export let databases: Databases;
export let account: Account;
export let SDK_INIT_ERROR: Error | null = null;

if (IS_APPWRITE_CONFIGURED) {
  try {
    client = new Client();
    client
      .setEndpoint(APPWRITE_CONFIG.endpoint)
      .setProject(APPWRITE_CONFIG.projectId);
    databases = new Databases(client);
    account = new Account(client);
    console.info("Appwrite SDK initialized successfully in appwriteClient.ts. Live calls will be attempted if not in explicit mock mode.");
  } catch (e) {
    SDK_INIT_ERROR = e instanceof Error ? e : new Error(String(e));
    console.error("FATAL: Failed to initialize Appwrite SDK Client in appwriteClient.ts. Live operations will fail.", SDK_INIT_ERROR);
  }
} else {
    console.warn("appwriteClient.ts: Appwrite is not configured in constants.ts. Application will rely on explicit mock mode or fail for live data operations.");
}

// --- Error Messages ---
export const ERROR_MSG_NOT_CONFIGURED = "Appwrite backend is not configured in constants.ts. This operation cannot be completed without explicit mock mode.";
export const ERROR_MSG_SDK_INIT_FAILED = "Appwrite SDK client failed to initialize. Live operations cannot proceed.";
export const ERROR_MSG_LIVE_OP_FAILED = "Failed to perform operation with the Appwrite backend.";


// --- Helper for User-Explicit Mock Mode Check ---
export const isUserExplicitlyInMockMode = (): boolean => {
  try {
    const storedMockMode = localStorage.getItem('mrx-mock-mode');
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mock') === 'true') return true;
    if (urlParams.get('mock') === 'false') return false; 
    return storedMockMode !== null ? JSON.parse(storedMockMode) : false;
  } catch (error) {
    console.warn("Could not read mock mode from localStorage, defaulting to false.", error);
    return false;
  }
};

// Helper to check if Appwrite is configured AND SDK initialized correctly
export const isAppwriteEffectivelyConfigured = (): boolean => IS_APPWRITE_CONFIGURED && !SDK_INIT_ERROR && !!databases && !!account;


// --- Helper for Simulating API Call Delay (for mock mode only) ---
export const simulateApiCall = <T,>(data: T, delay: number = 300): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), delay)); 
};

// --- SHA-256 Helper (for API Key pseudo-hashing, demo only) ---
export async function sha256(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (e) {
    console.warn("SHA-256 hashing failed (crypto.subtle might be unavailable e.g. http context). Using weak fallback.", e);
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
        const char = message.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; 
    }
    return "pseudo_hash_" + Math.abs(hash).toString(16);
  }
}