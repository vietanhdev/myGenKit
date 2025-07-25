import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  UserSettings, 
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  authenticateUser,
  createUser,
  saveUserSettings,
  loadUserSettings,
  userHasSettings,
  deleteUserSettings,
  getAllUsers,
  hasExistingUsers,
  clearCorruptedSettings,
  resetUserData
} from '../lib/user-management';

export interface UseUserSessionResult {
  // User state
  currentUser: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  
  // Settings state
  currentSettings: UserSettings | null;
  hasSettings: boolean;
  
  // Session state
  isAutoUnlocked: boolean;
  remainingTime: number;
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Settings actions
  loadSettings: (password: string) => Promise<boolean>;
  saveSettings: (settings: UserSettings, password: string) => Promise<void>;
  deleteSettings: () => void;
  resetUserData: () => void;
  
  // Utility
  getAllUsers: () => User[];
  hasExistingUsers: () => boolean;
}

const SESSION_TIMEOUT = 3600; // 1 hour in seconds
const SESSION_PASSWORD_KEY = 'genkit_session_password';
const SESSION_TIMESTAMP_KEY = 'genkit_session_timestamp';

export function useUserSession(): UseUserSessionResult {
  const navigate = useNavigate();
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSettings, setCurrentSettings] = useState<UserSettings | null>(null);
  const [hasSettings, setHasSettings] = useState(false);
  const [isAutoUnlocked, setIsAutoUnlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  // Store password temporarily in localStorage for auto-unlock
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Helper functions for localStorage password management
  const storeSessionPassword = (password: string, username: string) => {
    const expirationTime = Date.now() + SESSION_TIMEOUT * 1000;
    const sessionData = {
      password,
      username,
      expirationTime
    };
    localStorage.setItem(SESSION_PASSWORD_KEY, JSON.stringify(sessionData));
  };
  
  const getSessionPassword = useCallback((): string | null => {
    try {
      const stored = localStorage.getItem(SESSION_PASSWORD_KEY);
      if (!stored) return null;
      
      const sessionData = JSON.parse(stored);
      const now = Date.now();
      
      if (now > sessionData.expirationTime) {
        localStorage.removeItem(SESSION_PASSWORD_KEY);
        return null;
      }
      
      return sessionData.password;
    } catch (error) {
      localStorage.removeItem(SESSION_PASSWORD_KEY);
      return null;
    }
  }, []);
  
  const clearSessionPassword = () => {
    localStorage.removeItem(SESSION_PASSWORD_KEY);
  };
  
  const getLastActivityTime = (): number => {
    try {
      const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY);
      return timestamp ? parseInt(timestamp) : Date.now();
    } catch {
      return Date.now();
    }
  };

  // Initialize user session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const user = getCurrentUser();
        if (user) {
          setCurrentUserState(user);
          setIsLoggedIn(true);
          setHasSettings(userHasSettings(user));
        }
      } catch (error) {
        console.error('Failed to initialize user session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeSession();
  }, []);

  // Track activity and reset timeout
  const trackActivity = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(SESSION_TIMESTAMP_KEY, now.toString());
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      clearSessionPassword();
      setIsAutoUnlocked(false);
      setCurrentSettings(null);
      setRemainingTime(0);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      // Redirect to login page on timeout
      navigate('/login', { replace: true });
    }, SESSION_TIMEOUT * 1000);
    
    // Update remaining time immediately
    setRemainingTime(SESSION_TIMEOUT);
  }, [navigate]);

  // Countdown timer - start when auto-unlocked
  useEffect(() => {
    if (isAutoUnlocked && !countdownRef.current) {
      countdownRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - getLastActivityTime()) / 1000);
        const remaining = Math.max(0, SESSION_TIMEOUT - elapsed);
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          clearSessionPassword();
          setIsAutoUnlocked(false);
          setCurrentSettings(null);
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          // Redirect to login page on timeout
          navigate('/login', { replace: true });
        }
      }, 1000);
    } else if (!isAutoUnlocked && countdownRef.current) {
      // Clear timer if no longer auto-unlocked
      clearInterval(countdownRef.current);
      countdownRef.current = null;
      setRemainingTime(0);
    }
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [isAutoUnlocked, navigate]);

  // Auto-unlock settings when password is available (simplified)
  useEffect(() => {
    const autoUnlock = async () => {
      const storedPassword = getSessionPassword();
      // Only try to auto-unlock if we have password, user, settings exist, but no current settings loaded
      if (storedPassword && currentUser && hasSettings && !currentSettings) {
        try {
          const settings = await loadUserSettings(currentUser, storedPassword);
          if (settings) {
            setCurrentSettings(settings);
          }
        } catch (error) {
          console.warn('Auto-unlock failed, but keeping password for manual operations:', error);
          // Keep password available for manual save operations
        }
      }
    };
    
    // Only run when we have a user and settings state is determined
    if (currentUser !== null) {
      autoUnlock();
    }
  }, [currentUser, hasSettings, currentSettings, getSessionPassword, navigate]);

  // Activity listeners disabled - using manual timeout management in login/register
  // This prevents interference with the manual timeout setup

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  // Login function
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const user = authenticateUser(username, password);
      if (user) {
        // Set all user state first
        setCurrentUserState(user);
        setCurrentUser(user);
        setIsLoggedIn(true);
        
        const hasUserSettings = userHasSettings(user);
        setHasSettings(hasUserSettings);
        
        // Store password in localStorage BEFORE any async operations
        storeSessionPassword(password, user.username);
        
        // Set auto-unlock and start tracking
        setIsAutoUnlocked(true);
        setRemainingTime(SESSION_TIMEOUT);
        
        // Set up timeout manually here to ensure it's tied to the right timestamp
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          clearSessionPassword();
          setIsAutoUnlocked(false);
          setCurrentSettings(null);
          setRemainingTime(0);
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          // Redirect to login page on timeout
          navigate('/login', { replace: true });
        }, SESSION_TIMEOUT * 1000);
        
        // Automatically load settings if they exist
        if (hasUserSettings) {
          try {
            const settings = await loadUserSettings(user, password);
            if (settings) {
              setCurrentSettings(settings);
            }
          } catch (error) {
            console.error('Failed to auto-load settings after login:', error);
            
            // If the error is related to corrupted settings, clear them
            if (error instanceof Error && error.message.includes('Invalid password')) {
              console.warn('Settings appear to be corrupted, clearing them');
              clearCorruptedSettings(user);
              setHasSettings(false);
            }
            
            // Keep password available for manual operations despite auto-load failure
          }
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, [navigate]);

  // Register function
  const register = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const user = createUser(username, password);
      
      // Set all user state first
      setCurrentUserState(user);
      setCurrentUser(user);
      setIsLoggedIn(true);
      setHasSettings(false);
      
      // Store password in localStorage BEFORE any async operations
      storeSessionPassword(password, user.username);
      
      // Set auto-unlock and start tracking
      setIsAutoUnlocked(true);
      setRemainingTime(SESSION_TIMEOUT);
      
      // Set up timeout manually here to ensure it's tied to the right timestamp
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        clearSessionPassword();
        setIsAutoUnlocked(false);
        setCurrentSettings(null);
        setRemainingTime(0);
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        // Redirect to login page on timeout
        navigate('/login', { replace: true });
      }, SESSION_TIMEOUT * 1000);
      
      return true;
    } catch (error) {
      console.error('User creation failed:', error);
      return false;
    }
  }, [navigate]);

  // Logout function
  const logout = useCallback(() => {
    setCurrentUserState(null);
    setIsLoggedIn(false);
    setCurrentSettings(null);
    setHasSettings(false);
    setIsAutoUnlocked(false);
    clearCurrentUser();
    
    // Clear password and timers
    clearSessionPassword();
    setRemainingTime(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // Redirect to login page
    navigate('/login', { replace: true });
  }, [navigate]);

  // Load settings function
  const loadSettings = useCallback(async (password: string): Promise<boolean> => {
    if (!currentUser) return false;
    
    try {
      const settings = await loadUserSettings(currentUser, password);
      if (settings) {
        setCurrentSettings(settings);
        
        // Store password for auto-unlock
        storeSessionPassword(password, currentUser.username);
        setIsAutoUnlocked(true);
        trackActivity();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return false;
    }
  }, [currentUser, trackActivity]);

  // Save settings function
  const saveSettings = useCallback(async (settings: UserSettings, password: string): Promise<void> => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      // Use provided password or stored password from login
      let passwordToUse = password || getSessionPassword();
      
      
      
      if (!passwordToUse) {
        console.error('No password available for saving. Current state:', {
          isLoggedIn,
          hasStoredPassword: !!getSessionPassword(),
          currentUser: currentUser?.username,
          sessionActive: !!timeoutRef.current
        });
        
        throw new Error('Session expired. Please unlock your settings first.');
      }
      
      await saveUserSettings(currentUser, settings, passwordToUse);
      
      // Update local state
      setCurrentSettings(settings);
      setHasSettings(true);
      
      // If we used the stored password, ensure session remains active
      if (!password && getSessionPassword()) {
        localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());
        setRemainingTime(SESSION_TIMEOUT);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }, [currentUser, isLoggedIn, getSessionPassword]);

  // Delete settings function
  const deleteSettings = useCallback(() => {
    if (!currentUser) return;
    
    deleteUserSettings(currentUser);
    setCurrentSettings(null);
    setHasSettings(false);
    setIsAutoUnlocked(false);
    
    // Clear password and timers
    clearSessionPassword();
    setRemainingTime(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, [currentUser]);

  // Reset user data function
  const resetUserDataCallback = useCallback(() => {
    if (!currentUser) return;
    
    resetUserData(currentUser);
    setCurrentUserState(null);
    setIsLoggedIn(false);
    setCurrentSettings(null);
    setHasSettings(false);
    setIsAutoUnlocked(false);
    
    // Clear password and timers
    clearSessionPassword();
    setRemainingTime(0);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, [currentUser]);

  return {
    // User state
    currentUser,
    isLoggedIn,
    isLoading,
    
    // Settings state
    currentSettings,
    hasSettings,
    
    // Session state
    isAutoUnlocked,
    remainingTime,
    
    // Actions
    login,
    register,
    logout,
    
    // Settings actions
    loadSettings,
    saveSettings,
    deleteSettings,
    resetUserData: resetUserDataCallback,
    
    // Utility
    getAllUsers,
    hasExistingUsers
  };
} 