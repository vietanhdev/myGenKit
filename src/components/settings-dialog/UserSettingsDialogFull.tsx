import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Textarea,
  Divider,
  Chip,
  Select,
  SelectItem,
} from '@heroui/react';
import { UserSettings } from '../../lib/user-management';
import { useUserSession } from '../../hooks/use-user-session';
import { useVisualizationSettings } from '../../hooks/use-visualization-settings';
import { PasswordDialog } from './PasswordDialog';
import VisualizationSettings, { VisualizationConfig } from './VisualizationSettings';
import { Modality, LiveConnectConfig, Tool, FunctionDeclaration } from '@google/genai';

interface UserSettingsDialogFullProps {
  isOpen: boolean;
  onClose: () => void;
  forceApiKey?: boolean;
}

type FunctionDeclarationsTool = Tool & {
  functionDeclarations: FunctionDeclaration[];
};

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

const defaultVisualizationConfig: VisualizationConfig = {
  type: 'css',
  intensity: 'medium',
  opacity: 0.3,
  color: 'blue',
  enabled: true,
};

export const UserSettingsDialogFull: React.FC<UserSettingsDialogFullProps> = ({
  isOpen,
  onClose,
  forceApiKey = false
}) => {
  const userSession = useUserSession();
  const { config: visualizationConfig, updateConfig: updateVisualizationConfig, isLoaded: vizConfigLoaded } = useVisualizationSettings();
  
  // Local state for form
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('models/gemini-2.0-flash-exp');
  const [config, setConfig] = useState<LiveConnectConfig>(defaultConfig);
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
      setConfig(userSession.currentSettings.config || defaultConfig);
      
      // Ensure visualization config is always valid
      const vizConfig = userSession.currentSettings.visualizationConfig;
      if (vizConfig && typeof vizConfig === 'object') {
        updateVisualizationConfig({ ...defaultVisualizationConfig, ...vizConfig });
      } else {
        updateVisualizationConfig(defaultVisualizationConfig);
      }
    } else if (isOpen) {
      // Reset to defaults if no settings
      setApiKey('');
      setModel('models/gemini-2.0-flash-exp');
      setConfig(defaultConfig);
      updateVisualizationConfig(defaultVisualizationConfig);
    }
    setError('');
  }, [isOpen, userSession.currentSettings, updateVisualizationConfig]);

  // Get function declarations from config
  const functionDeclarations: FunctionDeclaration[] = useMemo(() => {
    if (!Array.isArray(config.tools)) {
      return [];
    }
    return (config.tools as Tool[])
      .filter((t: Tool): t is FunctionDeclarationsTool =>
        Array.isArray((t as any).functionDeclarations)
      )
      .map((t) => t.functionDeclarations)
      .filter((fc) => !!fc)
      .flat();
  }, [config]);

  // System instructions helper
  const systemInstruction = useMemo(() => {
    if (!config.systemInstruction) {
      return "";
    }
    if (typeof config.systemInstruction === "string") {
      return config.systemInstruction;
    }
    if (Array.isArray(config.systemInstruction)) {
      return config.systemInstruction
        .map((p) => (typeof p === "string" ? p : p.text))
        .join("\n");
    }
    if (
      typeof config.systemInstruction === "object" &&
      "parts" in config.systemInstruction
    ) {
      return (
        config.systemInstruction.parts?.map((p) => p.text).join("\n") || ""
      );
    }
    return "";
  }, [config]);

  const updateSystemInstruction = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newConfig: LiveConnectConfig = {
        ...config,
        systemInstruction: event.target.value,
      };
      setConfig(newConfig);
    },
    [config]
  );

  const updateFunctionDescription = useCallback(
    (editedFdName: string, newDescription: string) => {
      const newConfig: LiveConnectConfig = {
        ...config,
        tools:
          config.tools?.map((tool) => {
            const fdTool = tool as FunctionDeclarationsTool;
            if (!Array.isArray(fdTool.functionDeclarations)) {
              return tool;
            }
            return {
              ...tool,
              functionDeclarations: fdTool.functionDeclarations.map((fd) =>
                fd.name === editedFdName
                  ? { ...fd, description: newDescription }
                  : fd
              ),
            };
          }) || [],
      };
      setConfig(newConfig);
    },
    [config]
  );

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    try {
      const success = await userSession.loadSettings(password);
      if (success) {
        setPasswordDialog({ isOpen: false });
        
        // If we have pending settings to save (API key entered), try to save them now
        if (apiKey.trim()) {
          try {
            const settings: UserSettings = {
              apiKey,
              config,
              model,
              visualizationConfig,
              lastSaved: new Date()
            };
            
            await userSession.saveSettings(settings, password);
            console.log('Settings saved after unlock');
            
            if (!forceApiKey) {
              onClose();
            }
          } catch (saveErr: any) {
            console.error('Failed to save after unlock:', saveErr);
            setError('Settings unlocked but failed to save: ' + (saveErr.message || 'Unknown error'));
          }
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
        config,
        model,
        visualizationConfig,
        lastSaved: new Date()
      };
      
      // Save using the stored password from login
      await userSession.saveSettings(settings, '');
      
      // Note: LiveAPI context updates are handled by the parent provider
      // No direct LiveAPI context manipulation needed here
      
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
  const connected = false; // Always allow editing in this standalone component

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        size="4xl"
        scrollBehavior="inside"
        backdrop="opaque"
        isDismissable={!needsApiKey}
        hideCloseButton={needsApiKey}
      >
        <ModalContent>
          <ModalHeader className="pb-2">
            <div className="flex justify-between items-center w-full">
              <div>
                <h2 className="text-xl font-bold">Settings</h2>
                <p className="text-xs text-default-500">
                  Welcome, {userSession.currentUser?.username}! Configure your voice assistant
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
          
          <ModalBody className="gap-3 py-3">
            {connected && (
              <Card className="bg-warning-50 border-warning-200">
                <CardBody className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-warning-600">⚠️</span>
                    <p className="text-warning-700 text-xs">
                      Settings can only be applied before connecting.
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Welcome message for new users */}
            {needsApiKey && (
              <Card className="bg-primary-50 border-primary-200">
                <CardBody className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-primary-600 text-2xl">🔑</span>
                    <div className="flex-1">
                      <h3 className="text-primary-800 font-semibold mb-2">Welcome to MyGenKit!</h3>
                      <p className="text-primary-700 text-sm mb-3">
                        To get started, please enter your Google AI API key below. Your key will be encrypted 
                        and stored securely with your account.
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
            <div className="space-y-2">
              <div>
                <h3 className="text-base font-semibold">API Configuration</h3>
                <p className="text-xs text-default-500">Configure your Google AI API settings</p>
              </div>
              
              <div className="flex gap-2 items-end">
                <Input
                  label="API Key"
                  type={showPassword ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Google AI API key"
                  variant="bordered"
                  size="sm"
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
                  size="sm"
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
            
            <Divider className="my-1" />

            {/* Voice & Response Settings */}
            <div className="space-y-2">
              <div>
                <h3 className="text-base font-semibold">Voice & Response</h3>
                <p className="text-xs text-default-500">Configure response settings</p>
              </div>
              <div className="flex gap-2 items-end">
                {/* Response Modality Selector */}
                <Select
                  label="Response"
                  placeholder="Select response"
                  selectedKeys={[config.responseModalities?.[0] === Modality.AUDIO ? 'audio' : 'text']}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setConfig({
                      ...config,
                      responseModalities: [
                        selected === 'audio' ? Modality.AUDIO : Modality.TEXT,
                      ],
                    });
                  }}
                  variant="bordered"
                  size="sm"
                  className="w-36"
                >
                  <SelectItem key="audio">Audio</SelectItem>
                  <SelectItem key="text">Text</SelectItem>
                </Select>
                
                {/* Voice Selector */}
                <Select
                  label="Voice"
                  placeholder="Select voice"
                  selectedKeys={[config.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName || 'Aoede']}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setConfig({
                      ...config,
                      speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: {
                            voiceName: selected,
                          },
                        },
                      },
                    });
                  }}
                  variant="bordered"
                  size="sm"
                  className="w-36"
                >
                  <SelectItem key="Puck">Puck</SelectItem>
                  <SelectItem key="Charon">Charon</SelectItem>
                  <SelectItem key="Kore">Kore</SelectItem>
                  <SelectItem key="Fenrir">Fenrir</SelectItem>
                  <SelectItem key="Aoede">Aoede</SelectItem>
                </Select>
              </div>
            </div>

            <Divider className="my-1" />

            {/* System Instructions */}
            <div className="space-y-2">
              <div>
                <h3 className="text-base font-semibold">System Instructions</h3>
                <p className="text-xs text-default-500">Define assistant behavior</p>
              </div>
              <Textarea
                label="Instructions"
                placeholder="Enter system instructions..."
                value={systemInstruction}
                onChange={updateSystemInstruction}
                minRows={2}
                maxRows={4}
                isDisabled={connected}
                variant="bordered"
                size="sm"
                className="w-full"
              />
            </div>

            <Divider className="my-1" />

            {/* Visualization Settings */}
            <div className="space-y-2">
              <div>
                <h3 className="text-base font-semibold">Audio Visualization</h3>
                <p className="text-xs text-default-500">Customize visual effects</p>
              </div>
              {vizConfigLoaded && visualizationConfig ? (
                <VisualizationSettings
                  config={visualizationConfig}
                  onChange={updateVisualizationConfig}
                />
              ) : (
                <div className="text-center py-2">
                  <div className="text-sm text-default-500">Loading visualization settings...</div>
                </div>
              )}
            </div>

            {functionDeclarations.length > 0 && (
              <>
                <Divider className="my-1" />

                {/* Function Declarations */}
                <div className="space-y-2">
                  <div>
                    <h3 className="text-base font-semibold">Function Declarations</h3>
                    <p className="text-xs text-default-500">Available tools and descriptions</p>
                  </div>
                  <div className="space-y-1">
                    {functionDeclarations.map((fd, fdKey) => (
                      <Card key={`function-${fdKey}`} className="w-full border-1">
                        <CardBody className="p-2">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Chip color="primary" variant="flat" size="sm">
                                {fd.name}
                              </Chip>
                              <div className="flex gap-1 flex-wrap">
                                {Object.keys(fd.parameters?.properties || {}).map(
                                  (item, k) => (
                                    <Chip key={k} size="sm" variant="bordered" color="default">
                                      {item}
                                    </Chip>
                                  )
                                )}
                              </div>
                            </div>
                            <Input
                              key={`fd-${fd.description}`}
                              label="Description"
                              placeholder="Describe what this function does..."
                              defaultValue={fd.description}
                              onBlur={(e) =>
                                updateFunctionDescription(fd.name!, e.target.value)
                              }
                              isDisabled={connected}
                              variant="bordered"
                              size="sm"
                              className="w-full"
                            />
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </ModalBody>
          
          <ModalFooter className="pt-2">
            {needsApiKey ? (
              <Button 
                color="primary" 
                onPress={handleSaveSettings}
                isDisabled={!apiKey.trim()}
                isLoading={isSaving}
                size="sm"
              >
                Save & Continue
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  color="primary" 
                  variant="light" 
                  onPress={onClose}
                  size="sm"
                >
                  Done
                </Button>
                <Button 
                  color="primary" 
                  onPress={handleSaveSettings}
                  isDisabled={!apiKey.trim()}
                  isLoading={isSaving}
                  size="sm"
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