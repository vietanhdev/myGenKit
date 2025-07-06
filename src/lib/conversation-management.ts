import CryptoJS from 'crypto-js';
import { Conversation, ConversationSummary, StreamingLog } from '../types';
import { streamingLogsToConversationMessages, generateConversationTitle } from './conversation-utils';

const CONVERSATIONS_STORAGE_KEY = 'mygenkit-conversations';
const CURRENT_CONVERSATION_KEY = 'mygenkit-current-conversation';

/**
 * Generate a unique conversation ID
 */
function generateConversationId(): string {
  return CryptoJS.lib.WordArray.random(16).toString();
}

/**
 * Generate a conversation title from messages
 */
function generateTitle(messages: StreamingLog[]): string {
  const cleanMessages = streamingLogsToConversationMessages(messages);
  return generateConversationTitle(cleanMessages);
}

/**
 * Encrypt data with password
 */
function encryptData(data: string, password: string): string {
  return CryptoJS.AES.encrypt(data, password).toString();
}

/**
 * Decrypt data with password
 */
function decryptData(encryptedData: string, password: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedData, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Get conversations storage key for a user
 */
function getConversationsStorageKey(userId: string): string {
  return `${CONVERSATIONS_STORAGE_KEY}-${userId}`;
}

/**
 * Get current conversation storage key for a user
 */
function getCurrentConversationStorageKey(userId: string): string {
  return `${CURRENT_CONVERSATION_KEY}-${userId}`;
}

/**
 * Load conversations for a user
 */
export function loadConversations(userId: string, password: string): ConversationSummary[] {
  try {
    const storageKey = getConversationsStorageKey(userId);
    const encrypted = localStorage.getItem(storageKey);
    
    if (!encrypted) {
      return [];
    }
    
    const decrypted = decryptData(encrypted, password);
    const conversations = JSON.parse(decrypted) as Conversation[];
    
    return conversations.map(conv => {
      // Ensure dates are properly converted and messages have proper date objects
      const messagesWithDates = conv.messages.map(msg => ({
        ...msg,
        date: new Date(msg.date)
      }));
      
      return {
        id: conv.id,
        title: conv.title,
        appName: conv.appName,
        systemPrompt: conv.systemPrompt,
        createdAt: new Date(conv.createdAt),
        lastModified: new Date(conv.lastModified),
        messageCount: conv.messages.length,
        lastMessage: getLastMessagePreview(messagesWithDates)
      };
    });
  } catch (error) {
    console.error('Failed to load conversations:', error);
    return [];
  }
}

/**
 * Save conversations for a user
 */
export function saveConversations(userId: string, password: string, conversations: Conversation[]): void {
  try {
    const storageKey = getConversationsStorageKey(userId);
    const encrypted = encryptData(JSON.stringify(conversations), password);
    localStorage.setItem(storageKey, encrypted);
  } catch (error) {
    console.error('Failed to save conversations:', error);
    throw new Error('Failed to save conversations');
  }
}

/**
 * Load a specific conversation
 */
export function loadConversation(userId: string, password: string, conversationId: string): Conversation | null {
  try {
    const storageKey = getConversationsStorageKey(userId);
    const encrypted = localStorage.getItem(storageKey);
    
    if (!encrypted) {
      return null;
    }
    
    const decrypted = decryptData(encrypted, password);
    const conversations = JSON.parse(decrypted) as Conversation[];
    
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      return null;
    }
    
    return {
      ...conversation,
      createdAt: new Date(conversation.createdAt),
      lastModified: new Date(conversation.lastModified),
      messages: conversation.messages.map(msg => ({
        ...msg,
        date: new Date(msg.date)
      }))
    };
  } catch (error) {
    console.error('Failed to load conversation:', error);
    return null;
  }
}

/**
 * Create a new conversation
 */
export function createConversation(userId: string, password: string, systemPrompt?: string, appName?: string): Conversation {
  const newConversation: Conversation = {
    id: generateConversationId(),
    title: 'New Conversation',
    systemPrompt: systemPrompt,
    appName: appName,
    createdAt: new Date(),
    lastModified: new Date(),
    messages: []
  };
  
  const conversations = loadAllConversations(userId, password);
  conversations.push(newConversation);
  saveConversations(userId, password, conversations);
  
  // Set as current conversation
  setCurrentConversationId(userId, newConversation.id);
  
  return newConversation;
}

/**
 * Update a conversation
 */
export function updateConversation(userId: string, password: string, updatedConversation: Conversation): void {
  const conversations = loadAllConversations(userId, password);
  const index = conversations.findIndex(conv => conv.id === updatedConversation.id);
  
  if (index !== -1) {
    conversations[index] = {
      ...updatedConversation,
      lastModified: new Date()
    };
    
    // Update title if it's still the default and we have messages
    if (conversations[index].title === 'New Conversation' && updatedConversation.messages.length > 0) {
      conversations[index].title = generateTitle(updatedConversation.messages);
    }
    
    saveConversations(userId, password, conversations);
  }
}

/**
 * Update conversation title and system prompt
 */
export function updateConversationDetails(
  userId: string, 
  password: string, 
  conversationId: string, 
  title?: string, 
  systemPrompt?: string
): void {
  const conversations = loadAllConversations(userId, password);
  const index = conversations.findIndex(conv => conv.id === conversationId);
  
  if (index !== -1) {
    if (title !== undefined) {
      conversations[index].title = title;
    }
    if (systemPrompt !== undefined) {
      conversations[index].systemPrompt = systemPrompt;
    }
    conversations[index].lastModified = new Date();
    
    saveConversations(userId, password, conversations);
  }
}

/**
 * Delete a conversation
 */
export function deleteConversation(userId: string, password: string, conversationId: string): void {
  const conversations = loadAllConversations(userId, password);
  const filteredConversations = conversations.filter(conv => conv.id !== conversationId);
  saveConversations(userId, password, filteredConversations);
  
  // Clear current conversation if it's the deleted one
  const currentConversationId = getCurrentConversationId(userId);
  if (currentConversationId === conversationId) {
    clearCurrentConversation(userId);
  }
}

/**
 * Add message to conversation
 */
export function addMessageToConversation(
  userId: string, 
  password: string, 
  conversationId: string, 
  message: StreamingLog
): void {
  const conversation = loadConversation(userId, password, conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }
  
  conversation.messages.push(message);
  updateConversation(userId, password, conversation);
}

/**
 * Get current conversation ID for a user
 */
export function getCurrentConversationId(userId: string): string | null {
  try {
    const storageKey = getCurrentConversationStorageKey(userId);
    return localStorage.getItem(storageKey);
  } catch (error) {
    console.error('Failed to get current conversation ID:', error);
    return null;
  }
}

/**
 * Set current conversation ID for a user
 */
export function setCurrentConversationId(userId: string, conversationId: string): void {
  try {
    const storageKey = getCurrentConversationStorageKey(userId);
    localStorage.setItem(storageKey, conversationId);
  } catch (error) {
    console.error('Failed to set current conversation ID:', error);
    throw new Error('Failed to set current conversation');
  }
}

/**
 * Clear current conversation for a user
 */
export function clearCurrentConversation(userId: string): void {
  try {
    const storageKey = getCurrentConversationStorageKey(userId);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear current conversation:', error);
  }
}

/**
 * Load all conversations (full data) for a user
 */
function loadAllConversations(userId: string, password: string): Conversation[] {
  try {
    const storageKey = getConversationsStorageKey(userId);
    const encrypted = localStorage.getItem(storageKey);
    
    if (!encrypted) {
      return [];
    }
    
    const decrypted = decryptData(encrypted, password);
    const conversations = JSON.parse(decrypted) as Conversation[];
    
    return conversations.map(conv => ({
      ...conv,
      createdAt: new Date(conv.createdAt),
      lastModified: new Date(conv.lastModified),
      messages: conv.messages.map(msg => ({
        ...msg,
        date: new Date(msg.date)
      }))
    }));
  } catch (error) {
    console.error('Failed to load all conversations:', error);
    return [];
  }
}

/**
 * Get preview of last message in a conversation
 */
function getLastMessagePreview(messages: StreamingLog[]): string | undefined {
  if (messages.length === 0) return undefined;
  
  try {
    const cleanMessages = streamingLogsToConversationMessages(messages);
    if (cleanMessages.length === 0) return undefined;
    
    const lastMessage = cleanMessages[cleanMessages.length - 1];
    const content = lastMessage.content.trim();
    
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  } catch (error) {
    console.error('Error generating message preview:', error);
    return undefined;
  }
}

/**
 * Clear all conversations for a user
 */
export function clearAllConversations(userId: string): void {
  try {
    const storageKey = getConversationsStorageKey(userId);
    localStorage.removeItem(storageKey);
    clearCurrentConversation(userId);
  } catch (error) {
    console.error('Failed to clear all conversations:', error);
  }
} 