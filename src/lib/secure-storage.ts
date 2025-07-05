import CryptoJS from 'crypto-js';
import { LiveConnectConfig } from '@google/genai';

export interface SecureSettings {
  apiKey: string;
  config: LiveConnectConfig;
  model: string;
  visualizationConfig: any;
  lastSaved: Date;
}

const STORAGE_KEY = 'mygenkit_secure_settings';

/**
 * Encrypts data using AES encryption with password
 */
function encrypt(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString();
}

/**
 * Decrypts data using AES decryption with password
 */
function decrypt(encryptedData: string, password: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Saves settings to local storage with password encryption
 */
export function saveSecureSettings(settings: SecureSettings, password: string): void {
  try {
    const settingsWithTimestamp = {
      ...settings,
      lastSaved: new Date(),
    };
    
    const dataString = JSON.stringify(settingsWithTimestamp);
    const encrypted = encrypt(dataString, password);
    
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save secure settings:', error);
    throw new Error('Failed to save settings');
  }
}

/**
 * Loads settings from local storage with password decryption
 */
export function loadSecureSettings(password: string): SecureSettings | null {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    
    if (!encrypted) {
      return null;
    }
    
    const decrypted = decrypt(encrypted, password);
    
    if (!decrypted) {
      throw new Error('Invalid password');
    }
    
    const settings = JSON.parse(decrypted) as SecureSettings;
    
    // Validate required fields
    if (!settings.apiKey || !settings.config) {
      throw new Error('Invalid settings format');
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to load secure settings:', error);
    throw new Error('Failed to load settings. Please check your password.');
  }
}

/**
 * Checks if secure settings exist in local storage
 */
export function hasSecureSettings(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * Deletes secure settings from local storage
 */
export function deleteSecureSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Validates password by attempting to decrypt settings
 */
export function validatePassword(password: string): boolean {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return false;
    
    const decrypted = decrypt(encrypted, password);
    return decrypted.length > 0;
  } catch {
    return false;
  }
}

/**
 * Generates a secure random password
 */
export function generateSecurePassword(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
} 