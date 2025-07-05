import React, { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Divider,
  Card,
  CardBody,
} from '@heroui/react';
import { RiAddLine, RiMagicLine } from 'react-icons/ri';

interface NewConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (title?: string, systemPrompt?: string) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant and answer in a friendly tone.";

const PRESET_PROMPTS = [
  {
    name: "General Assistant",
    prompt: "You are a helpful assistant and answer in a friendly tone.",
  },
  {
    name: "Code Helper",
    prompt: "You are an expert programming assistant. Help with coding questions, debugging, and best practices. Always explain your solutions clearly.",
  },
  {
    name: "Creative Writer",
    prompt: "You are a creative writing assistant. Help with storytelling, character development, and writing techniques. Be imaginative and inspiring.",
  },
  {
    name: "Research Assistant",
    prompt: "You are a research assistant. Help analyze information, summarize findings, and provide detailed explanations. Be thorough and accurate.",
  },
  {
    name: "Language Tutor",
    prompt: "You are a language learning tutor. Help with grammar, vocabulary, pronunciation, and conversation practice. Be patient and encouraging.",
  },
];

export const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  isOpen,
  onClose,
  onCreateConversation,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  const handleCreate = async () => {
    const finalTitle = title.trim() || undefined;
    const finalSystemPrompt = useCustomPrompt ? systemPrompt.trim() || undefined : undefined;
    
    await onCreateConversation(finalTitle, finalSystemPrompt);
    
    // Reset form
    setTitle('');
    setSystemPrompt('');
    setUseCustomPrompt(false);
    onClose();
  };

  const handlePresetSelect = (preset: typeof PRESET_PROMPTS[0]) => {
    setSystemPrompt(preset.prompt);
    setUseCustomPrompt(true);
  };

  const handleCancel = () => {
    setTitle('');
    setSystemPrompt('');
    setUseCustomPrompt(false);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      backdrop="opaque"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="pb-2">
              <div className="flex items-center gap-2">
                <RiAddLine className="text-primary" size={20} />
                <h2 className="text-xl font-bold">Create New Conversation</h2>
              </div>
              <p className="text-xs text-default-500">
                Customize your conversation with a title and system prompt
              </p>
            </ModalHeader>
            
            <ModalBody className="gap-4 py-4">
              <div className="space-y-6">
                {/* Title Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Title (optional)
                  </label>
                  <Input
                    placeholder="Enter conversation title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    variant="bordered"
                    size="sm"
                  />
                  <Card className="bg-default-50 border-default-200">
                    <CardBody className="p-2">
                      <div className="flex items-start gap-2">
                        <span className="text-default-600">💡</span>
                        <p className="text-default-700 text-xs">
                          Leave empty to auto-generate from first message
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                </div>

                <Divider />

                {/* System Prompt Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        System Prompt
                      </label>
                      <p className="text-xs text-default-500 mt-1">
                        Define how the assistant should behave in this conversation
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={useCustomPrompt ? "solid" : "bordered"}
                      color={useCustomPrompt ? "primary" : "default"}
                      onPress={() => setUseCustomPrompt(!useCustomPrompt)}
                      startContent={<RiMagicLine size={16} />}
                    >
                      {useCustomPrompt ? "Using Custom" : "Use Custom"}
                    </Button>
                  </div>

                  {!useCustomPrompt && (
                    <Card className="bg-default-50 border-default-200">
                      <CardBody className="p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-default-600">💬</span>
                          <div className="flex-1">
                            <p className="text-default-700 text-sm">
                              <strong>Using Default:</strong> {DEFAULT_SYSTEM_PROMPT}
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {useCustomPrompt && (
                    <div className="space-y-4">
                      {/* Info card about custom prompts */}
                      <Card className="bg-primary-50 border-primary-200">
                        <CardBody className="p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-primary-600">✨</span>
                            <div className="flex-1">
                              <p className="text-primary-700 text-xs">
                                Custom system prompts let you define exactly how the assistant should behave in this conversation. 
                                Choose from presets or create your own.
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      {/* Preset Prompts */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-default-600">
                          Quick Presets
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {PRESET_PROMPTS.map((preset) => (
                            <Button
                              key={preset.name}
                              size="sm"
                              variant="bordered"
                              className="justify-start h-auto p-3"
                              onPress={() => handlePresetSelect(preset)}
                            >
                              <div className="text-left">
                                <div className="font-medium text-xs">{preset.name}</div>
                                <div className="text-xs text-default-500 truncate">
                                  {preset.prompt.substring(0, 50)}...
                                </div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Prompt Input */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-default-600">
                          Custom Prompt
                        </label>
                        <Textarea
                          placeholder="Enter your custom system prompt..."
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          variant="bordered"
                          size="sm"
                          minRows={3}
                          maxRows={6}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>
            
            <ModalFooter className="pt-2">
              <Button
                variant="light"
                onPress={handleCancel}
                isDisabled={isLoading}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleCreate}
                isLoading={isLoading}
                startContent={!isLoading ? <RiAddLine size={16} /> : undefined}
                size="sm"
              >
                Create Conversation
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}; 