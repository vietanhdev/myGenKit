import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SecureSettings, 
  saveSecureSettings, 
  loadSecureSettings, 
  deleteSecureSettings
} from '../lib/secure-storage';

export interface UseSecureSettingsResult {
  currentSettings: SecureSettings | null;
  isLocked: boolean;
  hasStoredSettings: boolean;
  unlock: (password: string) => Promise<boolean>;
  save: (settings: SecureSettings, password: string) => Promise<void>;
  lock: () => void;
  deleteSettings: () => void;
  isAutoUnlocked: boolean;
  remainingTime: number;
}

const PASSWORD_TIMEOUT = 3600; // 1 hour in seconds

export function useSecureSettings(): UseSecureSettingsResult {
  const [isLocked, setIsLocked] = useState(true);
  const [hasStoredSettings, setHasStoredSettings] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<SecureSettings | null>(null);
  const [isAutoUnlocked, setIsAutoUnlocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  // Store password temporarily in memory
  const passwordRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Check if settings exist on mount
  useEffect(() => {
    const checkStoredSettings = async () => {
      try {
        await loadSecureSettings('dummy');
        setHasStoredSettings(false);
      } catch (error) {
        // Settings exist but can't be loaded without password
        setHasStoredSettings(true);
      }
    };
    
    checkStoredSettings();
  }, []);

  // Auto-unlock with stored password
  const autoUnlock = useCallback(async () => {
    if (passwordRef.current && hasStoredSettings) {
      try {
        const settings = await loadSecureSettings(passwordRef.current);
        if (settings) {
          setCurrentSettings(settings);
          setIsLocked(false);
          setIsAutoUnlocked(true);
          return true;
        }
      } catch (error) {
        // Password might be wrong or expired, clear it
        passwordRef.current = null;
        setIsAutoUnlocked(false);
      }
    }
    return false;
  }, [hasStoredSettings]);

  // Track activity and reset timeout
  const trackActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      passwordRef.current = null;
      setIsAutoUnlocked(false);
      setRemainingTime(0);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    }, PASSWORD_TIMEOUT * 1000);
    
    // Update remaining time
    setRemainingTime(PASSWORD_TIMEOUT);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (passwordRef.current && !countdownRef.current) {
      countdownRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
        const remaining = Math.max(0, PASSWORD_TIMEOUT - elapsed);
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          passwordRef.current = null;
          setIsAutoUnlocked(false);
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
        }
      }, 1000);
    }
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []);

  // Auto-unlock when password is available
  useEffect(() => {
    if (passwordRef.current && isLocked && hasStoredSettings) {
      autoUnlock();
    }
  }, [isLocked, hasStoredSettings, autoUnlock]);

  // Add activity listeners
  useEffect(() => {
    if (passwordRef.current) {
      const handleActivity = () => {
        if (passwordRef.current) {
          trackActivity();
        }
      };

      // Listen for various user activities
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true });
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleActivity);
        });
      };
    }
  }, [trackActivity]);

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

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    try {
      if (hasStoredSettings) {
        // Validate password and load settings
        const settings = await loadSecureSettings(password);
        if (settings) {
          setCurrentSettings(settings);
          setIsLocked(false);
          
          // Store password in memory
          passwordRef.current = password;
          setIsAutoUnlocked(true);
          trackActivity();
          
          return true;
        }
      } else {
        // No stored settings, just validate password format
        if (password.length >= 6) {
          passwordRef.current = password;
          setIsLocked(false);
          setIsAutoUnlocked(true);
          trackActivity();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to unlock settings:', error);
      return false;
    }
  }, [hasStoredSettings, trackActivity]);

  const save = useCallback(async (settings: SecureSettings, password: string): Promise<void> => {
    try {
      await saveSecureSettings(settings, password);
      setCurrentSettings(settings);
      setIsLocked(false);
      setHasStoredSettings(true);
      
      // Store password in memory
      passwordRef.current = password;
      setIsAutoUnlocked(true);
      trackActivity();
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }, [trackActivity]);

  const lock = useCallback(() => {
    setCurrentSettings(null);
    setIsLocked(true);
    setIsAutoUnlocked(false);
    passwordRef.current = null;
    setRemainingTime(0);
    
    // Clear timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const deleteSettings = useCallback(() => {
    deleteSecureSettings();
    setCurrentSettings(null);
    setIsLocked(true);
    setHasStoredSettings(false);
    setIsAutoUnlocked(false);
    passwordRef.current = null;
    setRemainingTime(0);
    
    // Clear timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);



  return {
    currentSettings,
    isLocked,
    hasStoredSettings,
    unlock,
    save,
    lock,
    deleteSettings,
    isAutoUnlocked,
    remainingTime,
  };
} 