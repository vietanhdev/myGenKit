import { Part } from "@google/genai";
import { StreamingLog, ConversationMessage } from "../types";
import CryptoJS from 'crypto-js';

/**
 * Extract text content from message parts
 */
export function extractTextFromParts(parts: Part[]): string {
  return parts
    .filter(part => part.text && part.text.trim().length > 0)
    .map(part => part.text?.trim())
    .join(' ')
    .trim();
}

/**
 * Extract text content from a streaming log message
 */
export function extractTextFromStreamingLog(log: StreamingLog): string {
  if (typeof log.message === 'string') {
    return log.message;
  }

  if (typeof log.message === 'object') {
    // User message format
    if ('turns' in log.message && 'turnComplete' in log.message) {
      return extractTextFromParts(log.message.turns);
    }

    // Model response format
    if ('serverContent' in log.message && log.message.serverContent) {
      const serverContent = log.message.serverContent;
      if ('modelTurn' in serverContent && serverContent.modelTurn) {
        return extractTextFromParts(serverContent.modelTurn.parts || []);
      }
    }
  }

  return '';
}

/**
 * Convert a streaming log to a clean conversation message
 */
export function streamingLogToConversationMessage(log: StreamingLog): ConversationMessage | null {
  const content = extractTextFromStreamingLog(log);
  
  if (!content) {
    return null;
  }

  // Determine role based on log type
  const role = log.type.includes('user') ? 'user' : 'model';
  
  return {
    id: CryptoJS.lib.WordArray.random(8).toString(),
    role,
    content,
    timestamp: log.date,
    rawData: log
  };
}

/**
 * Check if a streaming log represents a meaningful conversation message
 */
export function isConversationMessage(log: StreamingLog): boolean {
  // Only include conversation messages (user and model text)
  if (!log.type.startsWith('conversation.')) {
    return false;
  }
  
  const content = extractTextFromStreamingLog(log);
  return content.length > 0;
}

/**
 * Filter and convert streaming logs to clean conversation messages
 */
export function streamingLogsToConversationMessages(logs: StreamingLog[]): ConversationMessage[] {
  return logs
    .filter(isConversationMessage)
    .map(streamingLogToConversationMessage)
    .filter((msg): msg is ConversationMessage => msg !== null)
    .sort((a, b) => {
      // Handle both Date objects and date strings
      const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return aTime - bTime;
    });
}

/**
 * Generate a conversation title from the first user message
 */
export function generateConversationTitle(messages: ConversationMessage[]): string {
  const firstUserMessage = messages.find(msg => msg.role === 'user');
  
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }
  
  return `Conversation ${new Date().toLocaleDateString()}`;
} 