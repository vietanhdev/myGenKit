import React, { useState, useEffect, ReactNode } from 'react';
import { LiveAPIProvider } from '../../contexts/LiveAPIContext';
import { useUserSession } from '../../hooks/use-user-session';
import { LoginForm } from '../auth/LoginForm';
import { UserSettingsDialogFull } from '../settings-dialog/UserSettingsDialogFull';
import { Card, CardBody, useDisclosure } from '@heroui/react';
import { LiveClientOptions } from '../../types';

interface UserAPIProviderProps {
  children: ReactNode;
}

export const UserAPIProvider: React.FC<UserAPIProviderProps> = ({ children }) => {
  const userSession = useUserSession();
  const [currentApiKey, setCurrentApiKey] = useState<string>('');
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();

  // Determine which API key to use from current user settings
  useEffect(() => {
    if (userSession.currentSettings?.apiKey) {
      setCurrentApiKey(userSession.currentSettings.apiKey);
    } else {
      setCurrentApiKey('');
    }
  }, [userSession.currentSettings]);

  // Show settings dialog if user is logged in but has no API key
  useEffect(() => {
    if (userSession.isLoggedIn && !currentApiKey && !isSettingsOpen) {
      onSettingsOpen();
    }
  }, [userSession.isLoggedIn, currentApiKey, isSettingsOpen, onSettingsOpen]);

  // Loading state
  if (userSession.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardBody className="p-6 text-center space-y-4">
            <div className="text-4xl">⏳</div>
            <h2 className="text-xl font-bold">Loading...</h2>
            <p className="text-sm text-default-500">
              Initializing MyGenKit...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Show login form if user is not logged in
  if (!userSession.isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoginForm
          isOpen={true}
          onLogin={userSession.login}
          onRegister={userSession.register}
          existingUsers={userSession.getAllUsers()}
          isLoading={userSession.isLoading}
        />
      </div>
    );
  }

  // Show API key setup if user is logged in but has no API key
  if (!currentApiKey) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md">
            <CardBody className="p-6 text-center space-y-4">
              <div className="text-4xl">🔑</div>
              <h2 className="text-xl font-bold">API Key Required</h2>
              <p className="text-sm text-default-500">
                Welcome, {userSession.currentUser?.username}! To use MyGenKit, 
                you need to provide your Google AI API key.
              </p>
              
              {userSession.isAutoUnlocked && (
                <div className="p-3 bg-success-50 border border-success-200 rounded-lg">
                  <p className="text-success-700 text-sm">
                    🔓 Auto-unlock is active for the next {Math.floor(userSession.remainingTime / 60)} minutes
                  </p>
                </div>
              )}
              
              {userSession.hasSettings && (
                <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <p className="text-primary-700 text-sm">
                    💡 You have saved settings. They will be loaded automatically.
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

        {/* Settings dialog for API key entry - using comprehensive UserSettingsDialogFull */}
        <UserSettingsDialogFull
          isOpen={isSettingsOpen}
          onClose={onSettingsClose}
          forceApiKey={true}
        />
      </>
    );
  }

  // Render main app with API key
  const apiOptions: LiveClientOptions = {
    apiKey: currentApiKey,
  };

  return (
    <LiveAPIProvider options={apiOptions}>
      {children}
      
      {/* Settings dialog is now integrated with the settings button in the main app */}
    </LiveAPIProvider>
  );
}; 