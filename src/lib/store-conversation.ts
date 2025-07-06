import { create } from "zustand";
import { Conversation, ConversationSummary, StreamingLog } from "../types";
import { 
  loadConversations, 
  loadConversation, 
  createConversation, 
  deleteConversation, 
  addMessageToConversation, 
  getCurrentConversationId, 
  setCurrentConversationId, 
  clearCurrentConversation,
  updateConversationDetails 
} from "./conversation-management";

interface ConversationStore {
  // State
  conversations: ConversationSummary[];
  currentConversation: Conversation | null;
  currentConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // User session info
  userId: string | null;
  userPassword: string | null;
  
  // Actions
  initializeStore: (userId: string, password: string) => Promise<void>;
  clearStore: () => void;
  loadConversations: () => Promise<void>;
  loadCurrentConversation: (conversationId: string) => Promise<void>;
  createNewConversation: (systemPrompt?: string, appName?: string) => Promise<void>;
  switchConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  updateConversationDetails: (conversationId: string, title?: string, systemPrompt?: string) => Promise<void>;
  addMessageToCurrentConversation: (message: StreamingLog) => Promise<void>;
  getCurrentConversationMessages: () => StreamingLog[];
  setError: (error: string | null) => void;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversation: null,
  currentConversationId: null,
  isLoading: false,
  error: null,
  userId: null,
  userPassword: null,
  
  // Initialize store with user credentials
  initializeStore: async (userId: string, password: string) => {
    set({ 
      userId, 
      userPassword: password, 
      error: null 
    });
    
    // Load conversations
    await get().loadConversations();
    
    // Load current conversation if exists
    const currentConversationId = getCurrentConversationId(userId);
    if (currentConversationId) {
      set({ currentConversationId });
      await get().loadCurrentConversation(currentConversationId);
    }
  },
  
  // Clear store (on logout)
  clearStore: () => {
    set({
      conversations: [],
      currentConversation: null,
      currentConversationId: null,
      isLoading: false,
      error: null,
      userId: null,
      userPassword: null
    });
  },
  
  // Load conversations list
  loadConversations: async () => {
    const { userId, userPassword } = get();
    if (!userId || !userPassword) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      set({ isLoading: true, error: null });
      const conversations = loadConversations(userId, userPassword);
      set({ conversations });
    } catch (error) {
      console.error('Failed to load conversations:', error);
      set({ error: 'Failed to load conversations' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Load current conversation
  loadCurrentConversation: async (conversationId: string) => {
    const { userId, userPassword } = get();
    if (!userId || !userPassword) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      set({ isLoading: true, error: null });
      const conversation = loadConversation(userId, userPassword, conversationId);
      if (conversation) {
        set({ 
          currentConversation: conversation,
          currentConversationId: conversationId
        });
        setCurrentConversationId(userId, conversationId);
      } else {
        set({ error: 'Conversation not found' });
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      set({ error: 'Failed to load conversation' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Create new conversation
  createNewConversation: async (systemPrompt?: string, appName?: string) => {
    const { userId, userPassword } = get();
    
    if (!userId || !userPassword) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      set({ isLoading: true, error: null });
      const newConversation = createConversation(userId, userPassword, systemPrompt, appName);
      
      // Reload conversations list
      await get().loadConversations();
      
      // Switch to new conversation
      await get().switchConversation(newConversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      set({ error: 'Failed to create conversation' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Switch to a conversation
  switchConversation: async (conversationId: string) => {
    const { userId, userPassword } = get();
    if (!userId || !userPassword) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      set({ isLoading: true, error: null });
      const conversation = loadConversation(userId, userPassword, conversationId);
      if (conversation) {
        set({ 
          currentConversation: conversation,
          currentConversationId: conversationId
        });
        setCurrentConversationId(userId, conversationId);
      } else {
        set({ error: 'Conversation not found' });
      }
    } catch (error) {
      console.error('Failed to switch conversation:', error);
      set({ error: 'Failed to switch conversation' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete conversation
  deleteConversation: async (conversationId: string) => {
    const { userId, userPassword, currentConversationId } = get();
    if (!userId || !userPassword) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      set({ isLoading: true, error: null });
      deleteConversation(userId, userPassword, conversationId);
      
      // Reload conversations list
      await get().loadConversations();
      
      // If we deleted the current conversation, clear it
      if (currentConversationId === conversationId) {
        set({ 
          currentConversation: null,
          currentConversationId: null
        });
        clearCurrentConversation(userId);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      set({ error: 'Failed to delete conversation' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Update conversation details
  updateConversationDetails: async (conversationId: string, title?: string, systemPrompt?: string) => {
    const { userId, userPassword, currentConversation } = get();
    if (!userId || !userPassword) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      set({ isLoading: true, error: null });
      updateConversationDetails(userId, userPassword, conversationId, title, systemPrompt);
      
      // Update current conversation if it's the one being edited
      if (currentConversation && currentConversation.id === conversationId) {
        const updatedConversation = {
          ...currentConversation,
          title: title !== undefined ? title : currentConversation.title,
          systemPrompt: systemPrompt !== undefined ? systemPrompt : currentConversation.systemPrompt,
          lastModified: new Date()
        };
        set({ currentConversation: updatedConversation });
      }
      
      // Reload conversations list
      await get().loadConversations();
    } catch (error) {
      console.error('Failed to update conversation details:', error);
      set({ error: 'Failed to update conversation details' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Add message to current conversation
  addMessageToCurrentConversation: async (message: StreamingLog) => {
    const { userId, userPassword, currentConversationId } = get();
    
    // Check if user is authenticated
    if (!userId || !userPassword) {
      console.warn('User not authenticated for conversation store');
      return;
    }
    
    // If no current conversation, create one first
    if (!currentConversationId) {
      try {
        await get().createNewConversation();
        
        // Get updated state after creating conversation
        const state = get();
        if (state.currentConversationId && state.userId && state.userPassword) {
          // Try again with the new conversation
          await get().addMessageToCurrentConversation(message);
          return;
        } else {
          console.error('Failed to create new conversation for message');
          return;
        }
      } catch (error) {
        console.error('Failed to create new conversation:', error);
        return;
      }
    }
    
    try {
      addMessageToConversation(userId, userPassword, currentConversationId, message);
      
              // Update current conversation state directly without full reload
        const currentConversation = get().currentConversation;
        if (currentConversation) {
          set({
            currentConversation: {
              ...currentConversation,
              messages: [...currentConversation.messages, message],
              lastModified: message.date
            }
          });
        }
      
      // Update conversations list (for last message preview) - do this in background
      setTimeout(() => {
        get().loadConversations();
      }, 100);
    } catch (error) {
      console.error('Failed to add message to conversation:', error);
      // Don't set error state for individual message failures to avoid disrupting the UI
    }
  },
  
  // Get current conversation messages
  getCurrentConversationMessages: () => {
    const { currentConversation } = get();
    return currentConversation?.messages || [];
  },
  
  // Set error
  setError: (error: string | null) => {
    set({ error });
  }
})); 