import React, { useState, useEffect } from 'react';
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
  Chip,
} from '@heroui/react';
import { RiEditLine, RiMagicLine } from 'react-icons/ri';
import { Conversation } from '../../types';

interface EditConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onUpdateConversation: (conversationId: string, title?: string, systemPrompt?: string) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant and answer in a friendly tone.";

export const EditConversationDialog: React.FC<EditConversationDialogProps> = ({
  isOpen,
  onClose,
  conversation,
  onUpdateConversation,
  isLoading = false,
}) => {
  const [title, setTitle] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  // Initialize form when conversation changes
  useEffect(() => {
    if (conversation) {
      setTitle(conversation.title || '');
      setSystemPrompt(conversation.systemPrompt || '');
      setUseCustomPrompt(!!conversation.systemPrompt);
    }
  }, [conversation]);

  const handleSave = async () => {
    if (!conversation) return;
    
    const finalTitle = title.trim() || undefined;
    const finalSystemPrompt = useCustomPrompt ? systemPrompt.trim() || undefined : undefined;
    
    await onUpdateConversation(conversation.id, finalTitle, finalSystemPrompt);
    onClose();
  };

  const handleCancel = () => {
    if (conversation) {
      setTitle(conversation.title || '');
      setSystemPrompt(conversation.systemPrompt || '');
      setUseCustomPrompt(!!conversation.systemPrompt);
    }
    onClose();
  };

  const getEffectiveSystemPrompt = () => {
    if (useCustomPrompt && systemPrompt.trim()) {
      return systemPrompt.trim();
    }
    return DEFAULT_SYSTEM_PROMPT;
  };

  if (!conversation) return null;

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
                <RiEditLine className="text-primary" size={20} />
                <h2 className="text-xl font-bold">Edit Conversation</h2>
              </div>
              <p className="text-xs text-default-500">
                Customize the title and system prompt for this conversation
              </p>
            </ModalHeader>
            
            <ModalBody className="gap-4 py-4">
              <div className="space-y-6">
                {/* Conversation Info */}
                <div className="flex items-center gap-2 text-sm text-default-600">
                  <span>Created:</span>
                  <Chip size="sm" variant="flat" color="default">
                    {conversation.createdAt.toLocaleDateString()}
                  </Chip>
                  <span>Messages:</span>
                  <Chip size="sm" variant="flat" color="primary">
                    {conversation.messages.length}
                  </Chip>
                </div>

                <Divider />

                {/* Title Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Title
                  </label>
                  <Input
                    placeholder="Enter conversation title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    variant="bordered"
                    size="sm"
                  />
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
                      {useCustomPrompt ? "Using Custom" : "Use Default"}
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
                    <div className="space-y-3">
                      {/* Info card about custom prompts */}
                      <Card className="bg-primary-50 border-primary-200">
                        <CardBody className="p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-primary-600">✨</span>
                            <div className="flex-1">
                              <p className="text-primary-700 text-xs">
                                This will override the default system prompt for this conversation only. 
                                Changes take effect when you reconnect.
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-default-600">
                          Custom System Prompt
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

                  {/* Current effective prompt preview */}
                  <div className="mt-4">
                    <label className="text-xs font-medium text-default-600 mb-2 block">
                      Current Effective Prompt
                    </label>
                    <Card className="bg-primary-50 border-primary-200">
                      <CardBody className="p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-primary-600">🎯</span>
                          <div className="flex-1">
                            <p className="text-primary-700 text-xs">
                              {getEffectiveSystemPrompt()}
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
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
                onPress={handleSave}
                isLoading={isLoading}
                startContent={!isLoading ? <RiEditLine size={16} /> : undefined}
                size="sm"
              >
                Save Changes
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}; 