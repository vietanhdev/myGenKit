import CryptoJS from 'crypto-js';
import { LiveConnectConfig } from '@google/genai';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin: Date;
}

export interface UserSettings {
  apiKey: string;
  config: LiveConnectConfig;
  model: string;
  visualizationConfig: any;
  lastSaved: Date;
}

export interface UserSession {
  user: User;
  settings: UserSettings | null;
  loginTime: Date;
  isAutoUnlocked: boolean;
}

const USERS_STORAGE_KEY = 'mygenkit-users';
const CURRENT_USER_KEY = 'mygenkit-current-user';

/**
 * Hash password using SHA-256
 */
function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
}

/**
 * Encrypt data using AES encryption with password
 */
function encryptData(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString();
}

/**
 * Decrypt data using AES decryption with password
 */
function decryptData(encryptedData: string, password: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption failed, the result will be empty or malformed
    if (!decrypted) {
      throw new Error('Invalid password');
    }
    
    return decrypted;
  } catch (error) {
    throw new Error('Invalid password');
  }
}

/**
 * Get all users from localStorage
 */
export function getAllUsers(): User[] {
  try {
    const usersData = localStorage.getItem(USERS_STORAGE_KEY);
    if (!usersData) return [];
    
    const users = JSON.parse(usersData) as User[];
    return users.map(user => ({
      ...user,
      createdAt: new Date(user.createdAt),
      lastLogin: new Date(user.lastLogin)
    }));
  } catch (error) {
    console.error('Failed to load users:', error);
    return [];
  }
}

/**
 * Save users to localStorage
 */
function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Failed to save users:', error);
    throw new Error('Failed to save users');
  }
}

/**
 * Create a new user
 */
export function createUser(username: string, password: string): User {
  const users = getAllUsers();
  
  // Check if username already exists
  if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already exists');
  }
  
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  
  const newUser: User = {
    id: CryptoJS.lib.WordArray.random(16).toString(),
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date(),
    lastLogin: new Date()
  };
  
  users.push(newUser);
  saveUsers(users);
  
  return newUser;
}

/**
 * Authenticate user with username and password
 */
export function authenticateUser(username: string, password: string): User | null {
  const users = getAllUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    return null;
  }
  
  const passwordHash = hashPassword(password);
  if (user.passwordHash !== passwordHash) {
    return null;
  }
  
  // Update last login
  user.lastLogin = new Date();
  saveUsers(users);
  
  return user;
}

/**
 * Save user settings encrypted with their password
 */
export function saveUserSettings(user: User, settings: UserSettings, password: string): void {
  try {
    const settingsKey = `mygenkit-settings-${user.id}`;
    const settingsWithTimestamp = {
      ...settings,
      lastSaved: new Date(),
    };
    
    const dataString = JSON.stringify(settingsWithTimestamp);
    const encrypted = encryptData(dataString, password);
    
    localStorage.setItem(settingsKey, encrypted);
  } catch (error) {
    console.error('Failed to save user settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Load user settings decrypted with their password
 */
export function loadUserSettings(user: User, password: string): UserSettings | null {
  try {
    const settingsKey = `mygenkit-settings-${user.id}`;
    const encrypted = localStorage.getItem(settingsKey);
    
    if (!encrypted) {
      return null;
    }
    
    const decrypted = decryptData(encrypted, password);
    
    let settings: UserSettings;
    try {
      settings = JSON.parse(decrypted) as UserSettings;
    } catch (parseError) {
      throw new Error('Invalid password');
    }
    
    // Validate required fields
    if (!settings.apiKey) {
      throw new Error('Invalid settings format');
    }
    
    return {
      ...settings,
      lastSaved: new Date(settings.lastSaved)
    };
  } catch (error) {
    console.error('Failed to load user settings:', error);
    if (error instanceof Error && error.message === 'Invalid password') {
      throw new Error('Invalid password. Please check your password.');
    }
    throw new Error('Failed to load settings. Please try again.');
  }
}

/**
 * Check if user has saved settings
 */
export function userHasSettings(user: User): boolean {
  const settingsKey = `mygenkit-settings-${user.id}`;
  return localStorage.getItem(settingsKey) !== null;
}

/**
 * Delete user settings
 */
export function deleteUserSettings(user: User): void {
  const settingsKey = `mygenkit-settings-${user.id}`;
  localStorage.removeItem(settingsKey);
}

/**
 * Delete user completely
 */
export function deleteUser(user: User): void {
  const users = getAllUsers();
  const filteredUsers = users.filter(u => u.id !== user.id);
  saveUsers(filteredUsers);
  
  // Delete user settings
  deleteUserSettings(user);
  
  // Clear current user if it's the deleted user
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === user.id) {
    clearCurrentUser();
  }
}

/**
 * Get current user session from localStorage
 */
export function getCurrentUser(): User | null {
  try {
    const userData = localStorage.getItem(CURRENT_USER_KEY);
    if (!userData) return null;
    
    const user = JSON.parse(userData) as User;
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      lastLogin: new Date(user.lastLogin)
    };
  } catch (error) {
    console.error('Failed to load current user:', error);
    return null;
  }
}

/**
 * Set current user session
 */
export function setCurrentUser(user: User): void {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save current user:', error);
    throw new Error('Failed to save current user');
  }
}

/**
 * Clear current user session
 */
export function clearCurrentUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

/**
 * Check if there are any existing users
 */
export function hasExistingUsers(): boolean {
  return getAllUsers().length > 0;
}

/**
 * Clear corrupted settings for a user
 */
export function clearCorruptedSettings(user: User): void {
  console.warn('Clearing corrupted settings for user:', user.username);
  const settingsKey = `mygenkit-settings-${user.id}`;
  localStorage.removeItem(settingsKey);
}

/**
 * Reset all user data - completely remove user and their settings
 */
export function resetUserData(user: User): void {
  console.warn('Resetting all data for user:', user.username);
  
  // Delete user settings
  deleteUserSettings(user);
  
  // Remove user from users list
  const users = getAllUsers();
  const filteredUsers = users.filter(u => u.id !== user.id);
  saveUsers(filteredUsers);
  
  // Clear current user if it's the one being reset
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === user.id) {
    clearCurrentUser();
  }
} 