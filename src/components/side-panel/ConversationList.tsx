import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  CardBody, 
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@heroui/react';
import { 
  RiAddLine, 
  RiMoreLine, 
  RiDeleteBin7Line, 
  RiChat3Line,
  RiTimeLine 
} from 'react-icons/ri';
import { useConversationStore } from '../../lib/store-conversation';
import { ConversationSummary } from '../../types';

interface ConversationListProps {
  className?: string;
}

export default function ConversationList({ className = '' }: ConversationListProps) {
  const {
    conversations,
    currentConversationId,
    isLoading,
    error,
    createNewConversation,
    switchConversation,
    deleteConversation
  } = useConversationStore();
  
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const handleCreateConversation = async () => {
    await createNewConversation();
  };
  
  const handleSwitchConversation = async (conversationId: string) => {
    if (conversationId !== currentConversationId) {
      await switchConversation(conversationId);
    }
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
    setDeletingConversationId(conversationId);
    onOpen();
  };
  
  const confirmDeleteConversation = async () => {
    if (deletingConversationId) {
      await deleteConversation(deletingConversationId);
      setDeletingConversationId(null);
      onClose();
    }
  };
  
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const conversationToDelete = conversations.find(c => c.id === deletingConversationId);
  
  return (
    <div className={`conversation-list ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Conversations</h3>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={handleCreateConversation}
          isLoading={isLoading}
          className="text-primary"
          aria-label="Create new conversation"
        >
          <RiAddLine size={18} />
        </Button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-600">{error}</p>
        </div>
      )}
      
      {/* Conversations List */}
      <div className="space-y-2">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-default-400">
            <RiChat3Line size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new conversation to get started</p>
          </div>
        ) : (
          conversations
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
            .map((conversation: ConversationSummary) => (
                              <Card 
                key={conversation.id}
                className={`w-full max-w-full transition-all duration-200 hover:shadow-md group ${
                  currentConversationId === conversation.id 
                    ? 'ring-2 ring-primary border-primary' 
                    : 'hover:border-default-300'
                }`}
              >
                <CardBody className="p-3 w-full max-w-full">
                  <div className="flex justify-between items-start gap-2 w-full max-w-full">
                    <div 
                      className="flex-1 min-w-0 overflow-hidden cursor-pointer"
                      onClick={() => handleSwitchConversation(conversation.id)}
                    >
                      <h4 className="font-medium text-sm text-foreground truncate">
                        {conversation.title}
                      </h4>
                      {conversation.lastMessage && (
                        <p className="text-xs text-default-500 mt-1 truncate">
                          {conversation.lastMessage}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2 text-xs text-default-400 overflow-hidden">
                        <RiTimeLine size={12} className="shrink-0" />
                        <span className="truncate">{formatDate(conversation.lastModified)}</span>
                        <span className="shrink-0">•</span>
                        <span className="truncate">{conversation.messageCount} messages</span>
                      </div>
                    </div>
                    
                    <div className="shrink-0">
                      <Dropdown>
                        <DropdownTrigger>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Conversation options"
                          >
                            <RiMoreLine size={16} />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            startContent={<RiDeleteBin7Line size={16} />}
                            onPress={() => handleDeleteConversation(conversation.id)}
                          >
                            Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Delete Conversation
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Are you sure you want to delete "{conversationToDelete?.title}"? 
              This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={onClose}
            >
              Cancel
            </Button>
            <Button 
              color="danger" 
              onPress={confirmDeleteConversation}
              isLoading={isLoading}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
} 