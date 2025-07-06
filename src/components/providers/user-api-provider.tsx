import React, { useState, useEffect, ReactNode } from 'react';
import { LiveAPIProvider } from '../../contexts/LiveAPIContext';
import { useUserSession } from '../../hooks/use-user-session';
import { UserSettingsDialogFull } from '../settings-dialog/UserSettingsDialogFull';
import { Card, CardBody, useDisclosure, Spinner } from '@heroui/react';
import { ToastContainer, useToast } from '../notifications/Toast';
import { LiveClientOptions } from '../../types';

interface UserAPIProviderProps {
  children: ReactNode;
}

export const UserAPIProvider: React.FC<UserAPIProviderProps> = ({ children }) => {
  const userSession = useUserSession();
  const [currentApiKey, setCurrentApiKey] = useState<string>('');
  const [isRestarting, setIsRestarting] = useState(false);
  const [settingsDialogClosed, setSettingsDialogClosed] = useState(false);
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const { messages: toastMessages, addToast, removeToast } = useToast();

  // Simple API key detection from userSession
  useEffect(() => {
    const apiKey = userSession.currentSettings?.apiKey || '';
    if (apiKey !== currentApiKey) {
      console.log('UserAPIProvider - API key changed, updating currentApiKey');
      setCurrentApiKey(apiKey);
      if (apiKey) {
        setSettingsDialogClosed(false);
      }
    }
  }, [userSession.currentSettings?.apiKey, currentApiKey]);

  // Simple close handler
  const handleSettingsClose = () => {
    setSettingsDialogClosed(true);
    onSettingsClose();
  };

  // Handle API key changes and restart loading
  useEffect(() => {
    const newApiKey = userSession.currentSettings?.apiKey || '';
    
    // If API key is changing and we had a previous key, show restart loading
    if (currentApiKey && newApiKey && currentApiKey !== newApiKey) {
      setIsRestarting(true);
      
      // Show toast notification about API key change
      addToast({
        type: 'info',
        title: 'API Key Updated',
        message: 'Restarting service with new API key...',
        duration: 3000
      });
      
      // Clear restart state after a short delay to allow service to reinitialize
      setTimeout(() => {
        setIsRestarting(false);
        
        // Show success toast after restart
        addToast({
          type: 'success',
          title: 'Service Restarted',
          message: 'Ready to connect with new API key',
          duration: 3000
        });
      }, 2000);
    }
    
    // Update currentApiKey if different
    if (newApiKey !== currentApiKey) {
      setCurrentApiKey(newApiKey);
      if (newApiKey) {
        setSettingsDialogClosed(false);
      }
    }
  }, [userSession.currentSettings?.apiKey, currentApiKey, addToast]);

  // Show settings dialog if user is logged in but has no API key (and dialog wasn't recently closed)
  useEffect(() => {
    if (userSession.isLoggedIn && !currentApiKey && !isSettingsOpen && !settingsDialogClosed) {
      onSettingsOpen();
    }
  }, [userSession.isLoggedIn, currentApiKey, isSettingsOpen, onSettingsOpen, settingsDialogClosed]);

  // Loading state
  if (userSession.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardBody className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src="/logo.svg" 
                alt="myGenKit Logo" 
                className="w-10 h-10 shrink-0"
                onError={(e) => {
                  // Fallback to PNG if SVG fails to load
                  e.currentTarget.src = "/logo.png";
                }}
              />
              <h2 className="text-xl font-bold">myGenKit</h2>
            </div>
            <p className="text-sm text-default-500">
              Initializing myGenKit...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Service restart state
  if (isRestarting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardBody className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src="/logo.svg" 
                alt="myGenKit Logo" 
                className="w-10 h-10 shrink-0"
                onError={(e) => {
                  // Fallback to PNG if SVG fails to load
                  e.currentTarget.src = "/logo.png";
                }}
              />
              <h2 className="text-xl font-bold">myGenKit</h2>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Spinner size="sm" />
              <p className="text-sm text-primary-600">
                Restarting service with new API key...
              </p>
            </div>
            <p className="text-xs text-default-400">
              This will only take a moment
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // This component should only be used in protected routes
  // The login handling is now done at the routing level
  if (!userSession.isLoggedIn) {
    return null;
  }

  // Show API key setup if user is logged in but has no API key
  if (!currentApiKey) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
                  <Card className="max-w-md">
          <CardBody className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src="/logo.svg" 
                alt="myGenKit Logo" 
                className="w-8 h-8 shrink-0"
                onError={(e) => {
                  // Fallback to PNG if SVG fails to load
                  e.currentTarget.src = "/logo.png";
                }}
              />
              <h2 className="text-xl font-bold">API Key Required</h2>
            </div>
            <p className="text-sm text-default-500">
              Welcome, {userSession.currentUser?.username}! To use myGenKit, 
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
          onClose={handleSettingsClose}
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
      
      {/* Toast Notifications for API key changes - positioned at top-left */}
      <ToastContainer 
        messages={toastMessages}
        onClose={removeToast}
        position="top-left"
      />
    </LiveAPIProvider>
  );
}; 