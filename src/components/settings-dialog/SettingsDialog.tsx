import {
  ChangeEvent,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Textarea,
  Input,
  Card,
  CardBody,
  Divider,
  Chip,
  ButtonGroup,
} from "@heroui/react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import VoiceSelector from "./VoiceSelector";
import ResponseModalitySelector from "./ResponseModalitySelector";
import VisualizationSettings from "./VisualizationSettings";
import { PasswordDialog } from "./PasswordDialog";
import { useVisualizationSettings } from "../../hooks/use-visualization-settings";
import { useSecureSettings } from "../../hooks/use-secure-settings";
import { FunctionDeclaration, LiveConnectConfig, Tool, Modality } from "@google/genai";
import { SecureSettings } from "../../lib/secure-storage";

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

// Inner component that uses the LiveAPI context
function SettingsDialogInner() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const liveAPIContext = useLiveAPIContext();
  
  const { config: visualizationConfig, updateConfig: updateVisualizationConfig } = useVisualizationSettings();
  const secureSettings = useSecureSettings();
  
  // Local state for form
  const [apiKey, setApiKey] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Password dialog state
  const [passwordDialog, setPasswordDialog] = useState<{
    isOpen: boolean;
    mode: 'unlock' | 'create';
  }>({ isOpen: false, mode: 'unlock' });

  // Use LiveAPI context values
  const config = liveAPIContext.config;
  const setConfig = liveAPIContext.setConfig;
  const connected = liveAPIContext.connected;
  const model = liveAPIContext.model;
  const setModel = liveAPIContext.setModel;

  // Auto-open if no API key is available
  useEffect(() => {
    if (secureSettings.isLocked && !secureSettings.hasStoredSettings) {
      onOpen();
    }
  }, [secureSettings.isLocked, secureSettings.hasStoredSettings, onOpen]);

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

  // Load settings when unlocked
  useEffect(() => {
    if (!secureSettings.isLocked && secureSettings.currentSettings) {
      const settings = secureSettings.currentSettings;
      setApiKey(settings.apiKey);
      setConfig(settings.config);
      setModel(settings.model);
      updateVisualizationConfig(settings.visualizationConfig);
    }
  }, [secureSettings.isLocked, secureSettings.currentSettings, setConfig, setModel, updateVisualizationConfig]);

  // system instructions can come in many types
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

  const updateConfig = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newConfig: LiveConnectConfig = {
        ...config,
        systemInstruction: event.target.value,
      };
      setConfig(newConfig);
    },
    [config, setConfig]
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
    [config, setConfig]
  );

  // Password dialog handlers
  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    if (passwordDialog.mode === 'unlock') {
      const success = await secureSettings.unlock(password);
      if (success) {
        setCurrentPassword(password);
      }
      return success;
    } else {
      // Create mode - save current settings
      try {
        const settingsToSave: SecureSettings = {
          apiKey,
          config,
          model,
          visualizationConfig,
          lastSaved: new Date(),
        };
        await secureSettings.save(settingsToSave, password);
        setCurrentPassword(password);
        return true;
      } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
      }
    }
  };

  const handleSaveSettings = async () => {
    if (secureSettings.isLocked) {
      setPasswordDialog({ isOpen: true, mode: 'create' });
    } else {
      // Update existing settings
      const settingsToSave: SecureSettings = {
        apiKey,
        config,
        model,
        visualizationConfig,
        lastSaved: new Date(),
      };
      await secureSettings.save(settingsToSave, currentPassword);
    }
  };

  const handleLoadSettings = () => {
    if (secureSettings.hasStoredSettings) {
      setPasswordDialog({ isOpen: true, mode: 'unlock' });
    }
  };

  const handleDeleteSettings = () => {
    secureSettings.deleteSettings();
    setApiKey("");
    setCurrentPassword("");
  };

  const handleLockSettings = () => {
    secureSettings.lock();
    setCurrentPassword("");
  };

  const needsApiKey = secureSettings.isLocked && !secureSettings.hasStoredSettings;

  return (
    <>
      <Button
        isIconOnly
        variant="light"
        onPress={onOpen}
        className="hover:bg-default-100"
        size="sm"
        aria-label="Open settings"
      >
        <span className="material-symbols-outlined">settings</span>
      </Button>
      
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        size="4xl"
        scrollBehavior="inside"
        backdrop="opaque"
        isDismissable={!needsApiKey}
        hideCloseButton={needsApiKey}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="pb-2">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <h2 className="text-xl font-bold">Settings</h2>
                    <p className="text-xs text-default-500">Configure your voice assistant</p>
                  </div>
                  
                  {/* Settings Management Buttons */}
                  {!needsApiKey && (
                    <div className="flex gap-2">
                      {!secureSettings.isLocked && (
                        <div className="flex items-center gap-2">
                          <Chip 
                            color={secureSettings.isAutoUnlocked ? "success" : "primary"} 
                            variant="flat" 
                            size="sm"
                          >
                            {secureSettings.isAutoUnlocked ? "🔓 Auto-unlocked" : "🔓 Unlocked"}
                          </Chip>
                          {secureSettings.isAutoUnlocked && secureSettings.remainingTime > 0 && (
                            <Chip color="warning" variant="flat" size="sm">
                              {Math.floor(secureSettings.remainingTime / 60)}:{String(secureSettings.remainingTime % 60).padStart(2, '0')}
                            </Chip>
                          )}
                        </div>
                      )}
                      
                      <ButtonGroup size="sm" variant="bordered">
                        <Button
                          onPress={handleLoadSettings}
                          isDisabled={!secureSettings.hasStoredSettings}
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
                        {!secureSettings.isLocked && (
                          <Button
                            onPress={handleLockSettings}
                            title="Lock settings"
                          >
                            Lock
                          </Button>
                        )}
                        {secureSettings.hasStoredSettings && (
                          <Button
                            onPress={handleDeleteSettings}
                            color="danger"
                            title="Delete saved settings"
                          >
                            Delete
                          </Button>
                        )}
                      </ButtonGroup>
                    </div>
                  )}
                </div>
              </ModalHeader>
              
              <ModalBody className="gap-4 py-4">
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

                {needsApiKey && (
                  <Card className="bg-primary-50 border-primary-200">
                    <CardBody className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-primary-600 text-2xl">🔑</span>
                        <div className="flex-1">
                          <h3 className="text-primary-800 font-semibold mb-2">Welcome to MyGenKit!</h3>
                          <p className="text-primary-700 text-sm mb-3">
                            To get started, please enter your Google AI API key below. Your key will be encrypted 
                            and stored securely on your device.
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

                {/* API Key Section */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">API Configuration</h3>
                    <p className="text-xs text-default-500">Enter your Google AI API key</p>
                  </div>
                  <div className="flex gap-3 items-end">
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
                  <Card className="bg-default-50 border-default-200">
                    <CardBody className="p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-default-600">🔒</span>
                        <div className="flex-1">
                          <p className="text-default-700 text-xs">
                            Your API key is encrypted and stored locally on your device only. 
                            It is never sent to any third-party servers.
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
                
                {!needsApiKey && (
                  <>
                    <Divider className="my-1" />

                    {/* Voice & Response Settings */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold">Voice & Response</h3>
                        <p className="text-xs text-default-500">Configure response settings</p>
                      </div>
                      <div className="flex gap-3 items-end">
                        <ResponseModalitySelector />
                        <VoiceSelector />
                      </div>
                    </div>

                    <Divider className="my-1" />

                    {/* System Instructions */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold">System Instructions</h3>
                        <p className="text-xs text-default-500">Define assistant behavior</p>
                      </div>
                      <Textarea
                        label="Instructions"
                        placeholder="Enter system instructions..."
                        value={systemInstruction}
                        onChange={updateConfig}
                        minRows={3}
                        maxRows={6}
                        isDisabled={connected}
                        variant="bordered"
                        size="sm"
                        className="w-full"
                      />
                    </div>

                    <Divider className="my-1" />

                    {/* Visualization Settings */}
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-semibold">Audio Visualization</h3>
                        <p className="text-xs text-default-500">Customize visual effects</p>
                      </div>
                      <VisualizationSettings
                        config={visualizationConfig}
                        onChange={updateVisualizationConfig}
                      />
                    </div>

                    {functionDeclarations.length > 0 && (
                      <>
                        <Divider className="my-1" />

                        {/* Function Declarations */}
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-lg font-semibold">Function Declarations</h3>
                            <p className="text-xs text-default-500">Available tools and descriptions</p>
                          </div>
                          <div className="space-y-2">
                            {functionDeclarations.map((fd, fdKey) => (
                              <Card key={`function-${fdKey}`} className="w-full border-1">
                                <CardBody className="p-3">
                                  <div className="space-y-3">
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
                  </>
                )}
              </ModalBody>
              
              <ModalFooter className="pt-2">
                {needsApiKey ? (
                  <Button 
                    color="primary" 
                    onPress={handleSaveSettings}
                    isDisabled={!apiKey.trim()}
                    size="sm"
                  >
                    Save & Continue
                  </Button>
                ) : (
                  <Button 
                    color="primary" 
                    variant="light" 
                    onPress={onClose}
                    size="sm"
                  >
                    Done
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={passwordDialog.isOpen}
        onClose={() => setPasswordDialog({ ...passwordDialog, isOpen: false })}
        onSubmit={handlePasswordSubmit}
        mode={passwordDialog.mode}
      />
    </>
  );
}

// Standalone component for when no API key is set
function StandaloneSettingsDialog() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { config: visualizationConfig } = useVisualizationSettings();
  const secureSettings = useSecureSettings();
  
  // Local state for form
  const [apiKey, setApiKey] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localModel, setLocalModel] = useState("models/gemini-2.0-flash-exp");
  
  // Password dialog state
  const [passwordDialog, setPasswordDialog] = useState<{
    isOpen: boolean;
    mode: 'unlock' | 'create';
  }>({ isOpen: false, mode: 'unlock' });

  // Auto-open if no API key is available
  useEffect(() => {
    if (secureSettings.isLocked && !secureSettings.hasStoredSettings) {
      onOpen();
    }
  }, [secureSettings.isLocked, secureSettings.hasStoredSettings, onOpen]);

  // Load settings when unlocked
  useEffect(() => {
    if (!secureSettings.isLocked && secureSettings.currentSettings) {
      const settings = secureSettings.currentSettings;
      setApiKey(settings.apiKey);
      setLocalModel(settings.model);
    }
  }, [secureSettings.isLocked, secureSettings.currentSettings]);

  // Password dialog handlers
  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    if (passwordDialog.mode === 'unlock') {
      const success = await secureSettings.unlock(password);
      if (success) {
        setCurrentPassword(password);
      }
      return success;
    } else {
      // Create mode - save current settings
      try {
        const settingsToSave: SecureSettings = {
          apiKey,
          config: defaultConfig,
          model: localModel,
          visualizationConfig,
          lastSaved: new Date(),
        };
        await secureSettings.save(settingsToSave, password);
        setCurrentPassword(password);
        return true;
      } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
      }
    }
  };

  const handleSaveSettings = async () => {
    if (secureSettings.isLocked) {
      setPasswordDialog({ isOpen: true, mode: 'create' });
    } else {
      // Update existing settings
      const settingsToSave: SecureSettings = {
        apiKey,
        config: defaultConfig,
        model: localModel,
        visualizationConfig,
        lastSaved: new Date(),
      };
      await secureSettings.save(settingsToSave, currentPassword);
    }
  };

  const handleLoadSettings = () => {
    if (secureSettings.hasStoredSettings) {
      setPasswordDialog({ isOpen: true, mode: 'unlock' });
    }
  };

  const handleDeleteSettings = () => {
    secureSettings.deleteSettings();
    setApiKey("");
    setCurrentPassword("");
  };

  const needsApiKey = secureSettings.isLocked && !secureSettings.hasStoredSettings;

  return (
    <>
      <Button
        isIconOnly
        variant="light"
        onPress={onOpen}
        className="hover:bg-default-100"
        size="sm"
        aria-label="Open settings"
      >
        <span className="material-symbols-outlined">settings</span>
      </Button>
      
      <Modal 
        isOpen={isOpen} 
        onOpenChange={onOpenChange}
        size="4xl"
        scrollBehavior="inside"
        backdrop="opaque"
        isDismissable={!needsApiKey}
        hideCloseButton={needsApiKey}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="pb-2">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <h2 className="text-xl font-bold">Settings</h2>
                    <p className="text-xs text-default-500">Configure your voice assistant</p>
                  </div>
                  
                  {/* Settings Management Buttons */}
                  {!needsApiKey && (
                    <div className="flex gap-2">
                      {!secureSettings.isLocked && (
                        <div className="flex items-center gap-2">
                          <Chip 
                            color={secureSettings.isAutoUnlocked ? "success" : "primary"} 
                            variant="flat" 
                            size="sm"
                          >
                            {secureSettings.isAutoUnlocked ? "🔓 Auto-unlocked" : "🔓 Unlocked"}
                          </Chip>
                          {secureSettings.isAutoUnlocked && secureSettings.remainingTime > 0 && (
                            <Chip color="warning" variant="flat" size="sm">
                              {Math.floor(secureSettings.remainingTime / 60)}:{String(secureSettings.remainingTime % 60).padStart(2, '0')}
                            </Chip>
                          )}
                        </div>
                      )}
                      
                      <ButtonGroup size="sm" variant="bordered">
                        <Button
                          onPress={handleLoadSettings}
                          isDisabled={!secureSettings.hasStoredSettings}
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
                        {secureSettings.hasStoredSettings && (
                          <Button
                            onPress={handleDeleteSettings}
                            color="danger"
                            title="Delete saved settings"
                          >
                            Delete
                          </Button>
                        )}
                      </ButtonGroup>
                    </div>
                  )}
                </div>
              </ModalHeader>
              
              <ModalBody className="gap-4 py-4">
                {needsApiKey && (
                  <Card className="bg-primary-50 border-primary-200">
                    <CardBody className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-primary-600 text-2xl">🔑</span>
                        <div className="flex-1">
                          <h3 className="text-primary-800 font-semibold mb-2">Welcome to MyGenKit!</h3>
                          <p className="text-primary-700 text-sm mb-3">
                            To get started, please enter your Google AI API key below. Your key will be encrypted 
                            and stored securely on your device.
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

                {/* API Key Section */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">API Configuration</h3>
                    <p className="text-xs text-default-500">Enter your Google AI API key</p>
                  </div>
                  <div className="flex gap-3 items-end">
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
                      value={localModel}
                      onChange={(e) => setLocalModel(e.target.value)}
                      placeholder="models/gemini-2.0-flash-exp"
                      variant="bordered"
                      size="sm"
                      className="w-64"
                    />
                  </div>
                  <Card className="bg-default-50 border-default-200">
                    <CardBody className="p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-default-600">🔒</span>
                        <div className="flex-1">
                          <p className="text-default-700 text-xs">
                            Your API key is encrypted and stored locally on your device only. 
                            It is never sent to any third-party servers.
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              </ModalBody>
              
              <ModalFooter className="pt-2">
                {needsApiKey ? (
                  <Button 
                    color="primary" 
                    onPress={handleSaveSettings}
                    isDisabled={!apiKey.trim()}
                    size="sm"
                  >
                    Save & Continue
                  </Button>
                ) : (
                  <Button 
                    color="primary" 
                    variant="light" 
                    onPress={onClose}
                    size="sm"
                  >
                    Done
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={passwordDialog.isOpen}
        onClose={() => setPasswordDialog({ ...passwordDialog, isOpen: false })}
        onSubmit={handlePasswordSubmit}
        mode={passwordDialog.mode}
      />
    </>
  );
}

// Main component that conditionally renders the appropriate dialog
export default function SettingsDialog() {
  return <StandaloneSettingsDialog />;
}

// Export the inner component for use within LiveAPI context
export { SettingsDialogInner as SettingsDialogWithContext };
