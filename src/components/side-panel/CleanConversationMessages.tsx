import React from "react";
import { useConversationStore } from "../../lib/store-conversation";
import { streamingLogsToConversationMessages } from "../../lib/conversation-utils";
import { ConversationMessage } from "../../types";

export interface CleanConversationMessagesProps {
  className?: string;
}

const MessageBubble = ({ message }: { message: ConversationMessage }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[80%] p-3 rounded-lg ${
          isUser 
            ? 'bg-primary text-primary-foreground ml-4' 
            : 'bg-content2 text-foreground mr-4'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </div>
        <div className={`text-xs mt-1 opacity-70 ${
          isUser ? 'text-primary-foreground' : 'text-default-400'
        }`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export default function CleanConversationMessages({ 
  className = "" 
}: CleanConversationMessagesProps) {
  const { getCurrentConversationMessages, currentConversation } = useConversationStore();
  
  const rawMessages = getCurrentConversationMessages();
  const cleanMessages = streamingLogsToConversationMessages(rawMessages);

  if (!currentConversation) {
    return (
      <div className={`clean-conversation-messages ${className}`}>
        <div className="text-center py-8 text-default-400">
          <p className="text-sm">No conversation selected</p>
          <p className="text-xs mt-1">Select a conversation or create a new one</p>
        </div>
      </div>
    );
  }

  if (cleanMessages.length === 0) {
    return (
      <div className={`clean-conversation-messages ${className}`}>
        <div className="text-center py-8 text-default-400">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Start chatting to see your conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`clean-conversation-messages ${className}`}>
      <div className="space-y-2 p-4">
        {cleanMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
} 