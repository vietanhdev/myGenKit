import React, { useState, useEffect, ReactNode } from 'react';
import { LiveAPIProvider } from '../../contexts/LiveAPIContext';
import { useSecureSettings } from '../../hooks/use-secure-settings';
import { PasswordDialog } from '../settings-dialog/PasswordDialog';
import SettingsDialog from '../settings-dialog/SettingsDialog';
import { Card, CardBody } from '@heroui/react';
import { LiveClientOptions } from '../../types';

interface APIProviderWrapperProps {
  children: ReactNode;
}

export const APIProviderWrapper: React.FC<APIProviderWrapperProps> = ({ children }) => {
  const secureSettings = useSecureSettings();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<string>('');

  // Determine which API key to use - only from secure settings
  useEffect(() => {
    if (!secureSettings.isLocked && secureSettings.currentSettings?.apiKey) {
      // Use custom API key from secure settings
      setCurrentApiKey(secureSettings.currentSettings.apiKey);
    } else {
      // No API key available
      setCurrentApiKey('');
    }
  }, [secureSettings.isLocked, secureSettings.currentSettings]);

  // Check for saved settings on mount
  useEffect(() => {
    if (secureSettings.hasStoredSettings && !currentApiKey && !secureSettings.isAutoUnlocked) {
      setShowPasswordDialog(true);
    }
  }, [secureSettings.hasStoredSettings, currentApiKey, secureSettings.isAutoUnlocked]);

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    const success = await secureSettings.unlock(password);
    if (success) {
      setShowPasswordDialog(false);
    }
    return success;
  };

  // Show API key prompt if no key is available
  if (!currentApiKey) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md">
            <CardBody className="p-6 text-center space-y-4">
              <div className="text-4xl">🔑</div>
              <h2 className="text-xl font-bold">API Key Required</h2>
              <p className="text-sm text-default-500">
                To use myGenKit, you need to provide your own Google AI API key. 
                Your key will be encrypted and stored locally on your device.
              </p>
              {secureSettings.isAutoUnlocked && (
                <div className="p-3 bg-success-50 border border-success-200 rounded-lg">
                  <p className="text-success-700 text-sm">
                    🔓 Auto-unlock is enabled. Your settings will be automatically 
                    unlocked for the next {Math.floor(secureSettings.remainingTime / 60)} minutes.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <p className="text-xs text-default-400">
                  Get your free API key from{' '}
                  <a 
                    href="https://ai.google.dev" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Always render settings dialog so user can enter API key */}
        <SettingsDialog />

        {/* Password dialog for unlocking saved settings */}
        {showPasswordDialog && (
          <PasswordDialog
            isOpen={showPasswordDialog}
            onClose={() => setShowPasswordDialog(false)}
            onSubmit={handlePasswordSubmit}
            mode="unlock"
          />
        )}
      </>
    );
  }

  // Render app with API key
  const apiOptions: LiveClientOptions = {
    apiKey: currentApiKey,
  };

  return (
    <LiveAPIProvider options={apiOptions}>
      {children}
    </LiveAPIProvider>
  );
}; 