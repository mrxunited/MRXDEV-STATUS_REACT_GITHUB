import { AppwriteException, ID } from 'appwrite';
import { User, ActivityStatus, ActivityTargetType } from '../../types'; 
import { account, isAppwriteEffectivelyConfigured, isUserExplicitlyInMockMode, SDK_INIT_ERROR } from './appwriteClient';
import { adminGetAdminUserByAuthId } from './userService'; 
import { addMockUserActivityLog } from './mockService'; 
import { addActivityLog } from './activityLogService'; // For new comprehensive logging

const LOCAL_STORAGE_USER_KEY = 'currentUser';

export const login = async (email: string, pass: string): Promise<User> => {
  const loginActionDetails = {
    action: `Login attempt for ${email}`,
    targetType: ActivityTargetType.AUTHENTICATION,
    ipAddress: 'N/A', // Client-side, IP not readily available here
    userAgent: navigator.userAgent,
  };

  if (!isAppwriteEffectivelyConfigured()) {
    const errorMsg = SDK_INIT_ERROR?.message || "Appwrite SDK not initialized or Appwrite not configured for auth.";
    console.error("Login attempt failed:", errorMsg);
    if (isUserExplicitlyInMockMode()) {
        let mockUserToReturn: User | null = null;
        if (email === 'admin@mrx.com' && pass === 'password') {
            mockUserToReturn = { id: 'mock_admin_auth_id', email: 'admin@mrx.com', name: 'Admin User (Mock)', role: 'Admin' };
        } else if (email === 'support@mrx.com' && pass === 'password') {
            mockUserToReturn = { id: 'mock_support_auth_id', email: 'support@mrx.com', name: 'Support User (Mock)', role: 'Support' };
        }
        
        if (mockUserToReturn) {
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUserToReturn));
            // Log to existing widget log
            addMockUserActivityLog({ 
              userId: mockUserToReturn.id,
              userName: mockUserToReturn.name,
              action: 'User login (Mock)',
              status: ActivityStatus.SUCCESS,
              details: `Mock login for ${mockUserToReturn.email}`
            });
            // Log to new comprehensive log
            addActivityLog({
              ...loginActionDetails,
              userId: mockUserToReturn.id,
              userName: mockUserToReturn.name,
              userRole: mockUserToReturn.role,
              status: ActivityStatus.SUCCESS,
              details: 'Successful mock login.',
            });
            return mockUserToReturn;
        } else {
             addActivityLog({
                ...loginActionDetails,
                userName: email, // Use email as username for failed attempt
                status: ActivityStatus.FAILURE,
                details: 'Invalid mock credentials.',
            });
        }
    }
    throw new Error(`Login service unavailable: ${errorMsg}`);
  }

  try {
    const session = await account.createEmailPasswordSession(email, pass);
    const appwriteAuthUserId = session.userId;

    const adminUserDetails = await adminGetAdminUserByAuthId(appwriteAuthUserId);

    if (adminUserDetails) {
      const user: User = {
        id: appwriteAuthUserId,
        email: adminUserDetails.email,
        name: adminUserDetails.name,
        role: adminUserDetails.role,
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      addActivityLog({
          ...loginActionDetails,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          status: ActivityStatus.SUCCESS,
          details: 'Successful login.',
        });
      return user;
    } else {
      await account.deleteSession('current'); 
      addActivityLog({
          ...loginActionDetails,
          userId: appwriteAuthUserId,
          userName: email, // Use email if name not yet fetched
          status: ActivityStatus.FAILURE,
          details: 'User authenticated but not found in admin_users collection (unauthorized).',
      });
      throw new Error('User authenticated but not authorized for the admin panel.');
    }
  } catch (error) {
    const appwriteError = error as AppwriteException;
    let errorDetail = appwriteError.message || 'An unexpected error occurred during login.';
    if (appwriteError.type === 'user_invalid_credentials' || (appwriteError.message && appwriteError.message.toLowerCase().includes('invalid credentials'))) {
      errorDetail = 'Invalid email or password.';
    }
     addActivityLog({
        ...loginActionDetails,
        userName: email,
        status: ActivityStatus.FAILURE,
        details: errorDetail,
    });
    if (appwriteError.message && appwriteError.message.includes('not authorized')) {
        throw appwriteError;
    }
    console.error('Appwrite login error:', appwriteError);
    throw new Error(errorDetail);
  }
};

export const logout = async (): Promise<void> => {
  const storedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  let userId = "unknown_id";
  let userName = "Unknown User";
  let userRole: User['role'] | 'Guest' | 'System' = 'System';

  if (storedUser) {
      try {
          const parsedUser = JSON.parse(storedUser) as User;
          userId = parsedUser.id;
          userName = parsedUser.name;
          userRole = parsedUser.role;
      } catch (e) { /* ignore */ }
  }

  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  
  const logoutActionDetails = {
    userId,
    userName,
    userRole,
    action: 'User logout',
    targetType: ActivityTargetType.AUTHENTICATION,
    status: ActivityStatus.SUCCESS,
    ipAddress: 'N/A',
    userAgent: navigator.userAgent,
  };

  if (isUserExplicitlyInMockMode() && !isAppwriteEffectivelyConfigured()) {
     addMockUserActivityLog({ // For widget
        userId: userId,
        userName: userName,
        action: 'User logout (Mock)',
        status: ActivityStatus.SUCCESS,
        details: 'User logged out from mock session.'
    });
    addActivityLog({ // For comprehensive log
        ...logoutActionDetails,
        details: 'User logged out from mock session.',
    });
  }

  if (isAppwriteEffectivelyConfigured()) {
    try {
      await account.deleteSession('current');
      addActivityLog({
          ...logoutActionDetails,
          details: 'Successfully deleted Appwrite session.',
      });
    } catch (error) {
      console.warn('Failed to delete Appwrite session on logout:', error);
       addActivityLog({
          ...logoutActionDetails,
          status: ActivityStatus.FAILURE,
          details: `Failed to delete Appwrite session: ${(error as Error).message}`,
      });
    }
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  const storedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser) as User;
      if (!isAppwriteEffectivelyConfigured()) {
          if (isUserExplicitlyInMockMode()) return parsedUser;
      }
      if(isAppwriteEffectivelyConfigured()) {
          await account.get(); 
      }
      return parsedUser;
    } catch (e) {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }
  
  if (!isAppwriteEffectivelyConfigured()) {
    return null;
  }

  try {
    const appwriteAccountInfo = await account.get();
    const appwriteAuthUserId = appwriteAccountInfo.$id;

    const adminUserDetails = await adminGetAdminUserByAuthId(appwriteAuthUserId);
    if (adminUserDetails) {
      const user: User = {
        id: appwriteAuthUserId,
        email: adminUserDetails.email,
        name: adminUserDetails.name,
        role: adminUserDetails.role,
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      return user;
    } else {
      // If user exists in Appwrite Auth but not in our admin_users table, they are not authorized.
      // Log them out to prevent access.
      await account.deleteSession('current');
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      return null;
    }
  } catch (error) {
    // If account.get() fails (e.g. no session), clear local storage.
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    return null;
  }
};
