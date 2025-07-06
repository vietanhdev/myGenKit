import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button,
  Input,
  Card,
  CardBody,
  ButtonGroup,
} from '@heroui/react';
import { UserSettings } from '../../lib/user-management';
import { useUserSession } from '../../hooks/use-user-session';
import { PasswordDialog } from './PasswordDialog';
import { Modality, LiveConnectConfig } from '@google/genai';

interface UserSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  forceApiKey?: boolean;
}

const defaultConfig: LiveConnectConfig = {
  responseModalities: [Modality.AUDIO],
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: "Aoede",
      },
    },
  },
};

export const UserSettingsDialog: React.FC<UserSettingsDialogProps> = ({
  isOpen,
  onClose,
  forceApiKey = false
}) => {
  const userSession = useUserSession();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('models/gemini-2.0-flash-exp');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Password dialog for settings (only unlock mode needed)
  const [passwordDialog, setPasswordDialog] = useState<{
    isOpen: boolean;
  }>({ isOpen: false });

  // Load current settings when user changes or dialog opens
  useEffect(() => {
    if (isOpen && userSession.currentSettings) {
      setApiKey(userSession.currentSettings.apiKey || '');
      setModel(userSession.currentSettings.model || 'models/gemini-2.0-flash-exp');
    } else if (isOpen) {
      // Reset to defaults if no settings
      setApiKey('');
      setModel('models/gemini-2.0-flash-exp');
    }
    setError('');
  }, [isOpen, userSession.currentSettings]);

  // Check for session expiration when dialog opens
  useEffect(() => {
    if (isOpen && userSession.hasSettings && !userSession.currentSettings && !userSession.isAutoUnlocked) {
      // Session has expired but we have saved settings - show password dialog
      setPasswordDialog({ isOpen: true });
      setError('Session expired. Please enter your password to unlock settings.');
    }
  }, [isOpen, userSession.hasSettings, userSession.currentSettings, userSession.isAutoUnlocked]);

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    try {
      // Only handle unlock mode now - save is automatic using stored password
      const success = await userSession.loadSettings(password);
      if (success) {
        setPasswordDialog({ isOpen: false });
        
        // Update form state with loaded settings
        if (userSession.currentSettings) {
          setApiKey(userSession.currentSettings.apiKey || '');
          setModel(userSession.currentSettings.model || 'models/gemini-2.0-flash-exp');
          
          // Clear any error messages
          setError('');
        }
        
        // Settings are now loaded and available, close dialog if not forcing API key
        if (!forceApiKey && userSession.currentSettings?.apiKey) {
          onClose();
        }
      }
      return success;
    } catch (err: any) {
      setError(err.message || 'Failed to process password');
      return false;
    }
  };

  const handleSaveSettings = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }
    
    setError('');
    setIsSaving(true);
    
    try {
      const settings: UserSettings = {
        apiKey,
        config: defaultConfig,
        model,
        visualizationConfig: {}, // TODO: Add visualization settings
        lastSaved: new Date()
      };
      
      // Always save directly using the stored password from login
      await userSession.saveSettings(settings, ''); // Empty password - hook will use stored login password
      
      // Close dialog after successful save
      onClose();
    } catch (err: any) {
      console.error('Save settings error:', err);
      
      // If session expired, show unlock dialog
      if (err.message && err.message.includes('Session expired')) {
        setPasswordDialog({ isOpen: true });
        setError('Session expired. Please enter your password to unlock settings.');
      } else {
        setError(err.message || 'Failed to save settings');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSettings = () => {
    if (userSession.hasSettings) {
      setPasswordDialog({ isOpen: true });
    }
  };

  const needsApiKey = !userSession.currentSettings?.apiKey || forceApiKey;

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="lg"
        scrollBehavior="inside"
        backdrop="opaque"
        isDismissable={!needsApiKey}
        hideCloseButton={needsApiKey}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Settings</h2>
                <p className="text-sm text-default-500">
                  Welcome, {userSession.currentUser?.username}!
                </p>
              </div>
              
              {userSession.currentUser && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onPress={userSession.logout}
                    className="text-danger"
                  >
                    Logout
                  </Button>
                  
                  {userSession.isAutoUnlocked && (
                    <div className="text-xs text-success-600">
                      Auto-unlock: {Math.floor(userSession.remainingTime / 60)}m
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Settings Management */}
            {!needsApiKey && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-default-500">Settings:</span>
                <ButtonGroup size="sm" variant="bordered">
                  <Button
                    onPress={handleLoadSettings}
                    isDisabled={!userSession.hasSettings}
                    title="Load saved settings"
                  >
                    Load
                  </Button>
                  <Button
                    onPress={handleSaveSettings}
                    isDisabled={!apiKey.trim()}
                    title="Save current settings"
                  >
                    Save
                  </Button>
                  {userSession.hasSettings && (
                    <Button
                      onPress={userSession.deleteSettings}
                      color="danger"
                      title="Delete saved settings"
                    >
                      Delete
                    </Button>
                  )}
                </ButtonGroup>
              </div>
            )}
          </ModalHeader>
          
          <ModalBody className="gap-4">
            {/* Welcome message for new users */}
            {needsApiKey && (
              <Card className="bg-primary-50 border-primary-200">
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-primary-600 text-2xl">🔑</span>
                    <div className="flex-1">
                      <h3 className="text-primary-800 font-semibold mb-2">
                        API Key Required
                      </h3>
                      <p className="text-primary-700 text-sm mb-3">
                        To use myGenKit, you need to provide your Google AI API key. 
                        Your key will be encrypted and stored securely with your account.
                      </p>
                      <p className="text-primary-600 text-xs">
                        Don't have an API key yet? Get one for free from{' '}
                        <a 
                          href="https://ai.google.dev" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="underline font-medium"
                        >
                          Google AI Studio
                        </a>
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
            
            {/* Auto-unlock status */}
            {userSession.isAutoUnlocked && (
              <Card className="bg-success-50 border-success-200">
                <CardBody className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-success-600">🔓</span>
                    <p className="text-success-700 text-sm">
                      Settings auto-unlock is active for the next {Math.floor(userSession.remainingTime / 60)} minutes
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
            
            {/* API Key Section */}
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">API Configuration</h3>
                <p className="text-xs text-default-500">Configure your Google AI API settings</p>
              </div>
              
              <div className="flex gap-3 items-end">
                <Input
                  label="API Key"
                  type={showPassword ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Google AI API key"
                  variant="bordered"
                  className="flex-1"
                  isRequired={needsApiKey}
                  color={needsApiKey && !apiKey.trim() ? "danger" : "default"}
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </Button>
                  }
                />
                
                <Input
                  label="Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="models/gemini-2.0-flash-exp"
                  variant="bordered"
                  className="w-64"
                />
              </div>
              
              {error && (
                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                  <p className="text-danger-700 text-sm">{error}</p>
                </div>
              )}
              
              <Card className="bg-default-50 border-default-200">
                <CardBody className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-default-600">🔒</span>
                    <div className="flex-1">
                      <p className="text-default-700 text-xs">
                        Your API key is encrypted with your password and stored locally on your device only. 
                        It is never sent to any third-party servers.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </ModalBody>
          
          <ModalFooter>
            {needsApiKey ? (
              <Button 
                color="primary" 
                onPress={handleSaveSettings}
                isDisabled={!apiKey.trim()}
                isLoading={isSaving}
              >
                Save & Continue
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="light" 
                  onPress={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleSaveSettings}
                  isDisabled={!apiKey.trim()}
                  isLoading={isSaving}
                >
                  Save Settings
                </Button>
              </div>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={passwordDialog.isOpen}
        onClose={() => setPasswordDialog({ isOpen: false })}
        onSubmit={handlePasswordSubmit}
        mode="unlock"
        title="Unlock Settings"
        description="Enter your password to unlock your settings"
        onReset={userSession.resetUserData}
        showReset={true}
      />
    </>
  );
}; 