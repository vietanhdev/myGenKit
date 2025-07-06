import React, { useState, useMemo } from 'react';
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
  useDisclosure,
  Chip,
} from '@heroui/react';
import { 
  RiAddLine, 
  RiMoreLine, 
  RiDeleteBin7Line, 
  RiChat3Line,
  RiTimeLine,
  RiEditLine, 
  RiMagicLine,
  RiAppsLine
} from 'react-icons/ri';
import { useConversationStore } from '../../lib/store-conversation';
import { ConversationSummary, Conversation } from '../../types';
import { NewConversationDialog } from './NewConversationDialog';
import { EditConversationDialog } from './EditConversationDialog';

interface ConversationListWithAppFilterProps {
  className?: string;
  currentAppId?: string; // Current app context to filter conversations
  onCreateAppConversation?: (appId: string) => void;
}

export default function ConversationListWithAppFilter({ 
  className = '', 
  currentAppId,
  onCreateAppConversation
}: ConversationListWithAppFilterProps) {
  const {
    conversations,
    currentConversationId,
    currentConversation,
    isLoading,
    error,
    createNewConversation,
    switchConversation,
    deleteConversation,
    updateConversationDetails
  } = useConversationStore();
  
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterByApp, setFilterByApp] = useState<string>('all');
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isNewConversationOpen, onOpen: onNewConversationOpen, onClose: onNewConversationClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  
  // Filter conversations based on app
  const filteredConversations = useMemo(() => {
    if (currentAppId) {
      // When inside an app, show only conversations for that app
      return conversations.filter(conv => conv.appName === currentAppId);
    } else {
      // When in general conversations tab, show filtered conversations
      if (filterByApp === 'all') {
        return conversations;
      } else if (filterByApp === 'general') {
        return conversations.filter(conv => !conv.appName);
      } else {
        return conversations.filter(conv => conv.appName === filterByApp);
      }
    }
  }, [conversations, currentAppId, filterByApp]);

  // Note: Unique app names logic removed as it's not currently used
  // Can be re-added when app filtering UI is implemented

  const handleCreateConversation = async (title?: string, systemPrompt?: string) => {
    const appName = currentAppId || undefined;
    await createNewConversation(systemPrompt, appName);
    if (title && currentConversation) {
      await updateConversationDetails(currentConversation.id, title);
    }
  };
  
  const handleCreateAppConversation = () => {
    if (currentAppId && onCreateAppConversation) {
      onCreateAppConversation(currentAppId);
    } else {
      onNewConversationOpen();
    }
  };
  
  const handleSwitchConversation = async (conversationId: string) => {
    if (conversationId !== currentConversationId) {
      await switchConversation(conversationId);
    }
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
    setDeletingConversationId(conversationId);
    onDeleteOpen();
  };
  
  const handleEditConversation = async (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      // Load full conversation details
      await switchConversation(conversationId);
      setEditingConversation(currentConversation);
      onEditOpen();
    }
  };
  
  const confirmDeleteConversation = async () => {
    if (deletingConversationId) {
      await deleteConversation(deletingConversationId);
      setDeletingConversationId(null);
      onDeleteClose();
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
        <h3 className="text-lg font-semibold text-foreground">
          Conversations
        </h3>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={handleCreateAppConversation}
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
        {filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-default-400">
            <RiChat3Line size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {currentAppId ? `No ${currentAppId} conversations yet` : 'No conversations yet'}
            </p>
            <p className="text-xs mt-1">Start a new conversation to get started</p>
          </div>
        ) : (
          filteredConversations
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
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {conversation.title}
                        </h4>
                        {/* Show app indicator */}
                        {conversation.appName && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="secondary"
                            className="text-xs px-2"
                            startContent={<RiAppsLine size={10} />}
                          >
                            {conversation.appName}
                          </Chip>
                        )}
                        {/* Show indicator if conversation has custom system prompt */}
                        {conversation.systemPrompt && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color="primary"
                            className="text-xs px-2"
                            startContent={<RiMagicLine size={10} />}
                          >
                            Custom
                          </Chip>
                        )}
                      </div>
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
                            key="edit"
                            startContent={<RiEditLine size={16} />}
                            onPress={() => handleEditConversation(conversation.id)}
                          >
                            Edit
                          </DropdownItem>
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
      
      {/* New Conversation Dialog */}
      <NewConversationDialog
        isOpen={isNewConversationOpen}
        onClose={onNewConversationClose}
        onCreateConversation={handleCreateConversation}
        isLoading={isLoading}
      />
      
      {/* Edit Conversation Dialog */}
      <EditConversationDialog
        isOpen={isEditOpen}
        onClose={onEditClose}
        conversation={editingConversation}
        onUpdateConversation={updateConversationDetails}
        isLoading={isLoading}
      />
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="sm">
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
              onPress={onDeleteClose}
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