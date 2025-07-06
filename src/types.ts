import {
  GoogleGenAIOptions,
  LiveClientToolResponse,
  LiveServerMessage,
  Part,
  FunctionDeclaration,
} from "@google/genai";

/**
 * the options to initiate the client, ensure apiKey is required
 */
export type LiveClientOptions = GoogleGenAIOptions & { apiKey: string };

/** log types */
export type StreamingLog = {
  date: Date;
  type: string;
  count?: number;
  message:
    | string
    | ClientContentLog
    | Omit<LiveServerMessage, "text" | "data">
    | LiveClientToolResponse;
};

export type ClientContentLog = {
  turns: Part[];
  turnComplete: boolean;
};

/** conversation types */
export type Conversation = {
  id: string;
  title: string;
  systemPrompt?: string; // Custom system prompt for this conversation
  appName?: string; // Which app this conversation belongs to
  createdAt: Date;
  lastModified: Date;
  messages: StreamingLog[];
};

export type ConversationSummary = {
  id: string;
  title: string;
  systemPrompt?: string; // Custom system prompt for this conversation
  appName?: string; // Which app this conversation belongs to
  createdAt: Date;
  lastModified: Date;
  messageCount: number;
  lastMessage?: string;
};

/** clean conversation message types */
export type ConversationMessage = {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  rawData?: StreamingLog; // Keep reference to original log for debugging
};

export type CleanConversation = {
  id: string;
  title: string;
  createdAt: Date;
  lastModified: Date;
  messages: ConversationMessage[];
};

/** calendar event types */
export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  systemPrompt?: string; // Custom system prompt for this scheduled conversation
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: Date;
  lastModified: Date;
  conversationId?: string; // Link to conversation if started
};

export type CalendarEventSummary = {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
};

/** Plugin System Types */
export interface PluginStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export interface PluginToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface PluginContext {
  storage: PluginStorage;
  userId: string;
  addMessage: (message: StreamingLog) => Promise<void>;
  createConversation: (systemPrompt?: string) => Promise<void>;
  currentConversation: Conversation | null;
}

export interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon?: string;
  
  // Plugin lifecycle
  initialize?: (context: PluginContext) => Promise<void>;
  cleanup?: () => Promise<void>;
  
  // UI Components
  tabComponent: React.ComponentType<{ isActive: boolean; context?: PluginContext }>;
  
  // AI Configuration
  systemPrompt?: string;
  tools?: Array<{
    declaration: FunctionDeclaration;
    handler: (args: any, context: PluginContext) => Promise<PluginToolResponse>;
  }>;
  
  // Plugin-specific settings
  settings?: {
    [key: string]: any;
  };
}

export interface PluginRegistry {
  register: (plugin: PluginDefinition) => void;
  unregister: (pluginId: string) => void;
  getPlugin: (pluginId: string) => PluginDefinition | undefined;
  getAllPlugins: () => PluginDefinition[];
  getActivePlugins: () => PluginDefinition[];
}
