import { EventEmitter } from 'eventemitter3';
import { PluginDefinition, PluginRegistry, PluginContext, PluginStorage } from '../types';
import { FunctionDeclaration } from '@google/genai';

interface PluginRegistryEvents {
  'plugin:registered': (plugin: PluginDefinition) => void;
  'plugin:unregistered': (pluginId: string) => void;
  'plugin:initialized': (pluginId: string) => void;
  'plugin:error': (pluginId: string, error: Error) => void;
}

/**
 * Plugin-specific storage implementation
 */
class PluginStorageImpl implements PluginStorage {
  private userId: string;
  private pluginId: string;
  private userPassword: string;

  constructor(userId: string, pluginId: string, userPassword: string) {
    this.userId = userId;
    this.pluginId = pluginId;
    this.userPassword = userPassword;
  }

  private getStorageKey(key: string): string {
    return `plugin-${this.pluginId}-${this.userId}-${key}`;
  }

  async get(key: string): Promise<any> {
    try {
      const storageKey = this.getStorageKey(key);
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Plugin storage get error for ${this.pluginId}:`, error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.error(`Plugin storage set error for ${this.pluginId}:`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(key);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`Plugin storage remove error for ${this.pluginId}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const prefix = `plugin-${this.pluginId}-${this.userId}-`;
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error(`Plugin storage clear error for ${this.pluginId}:`, error);
      throw error;
    }
  }
}

/**
 * Plugin Registry Implementation
 */
class PluginRegistryImpl extends EventEmitter<PluginRegistryEvents> implements PluginRegistry {
  private plugins: Map<string, PluginDefinition> = new Map();
  private initializedPlugins: Set<string> = new Set();
  private contexts: Map<string, PluginContext> = new Map();

  register(plugin: PluginDefinition): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin ${plugin.id} is already registered, skipping re-registration`);
      return;
    }

    this.plugins.set(plugin.id, plugin);
    this.emit('plugin:registered', plugin);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      // Cleanup plugin if it was initialized
      if (this.initializedPlugins.has(pluginId)) {
        this.cleanupPlugin(pluginId);
      }
      
      this.plugins.delete(pluginId);
      this.contexts.delete(pluginId);
      this.emit('plugin:unregistered', pluginId);
    }
  }

  getPlugin(pluginId: string): PluginDefinition | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): PluginDefinition[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      this.initializedPlugins.has(plugin.id)
    );
  }

  async initializePlugin(
    pluginId: string, 
    userId: string, 
    userPassword: string,
    addMessage: (message: any) => Promise<void>,
    createConversation: (systemPrompt?: string, appName?: string, title?: string, description?: string) => Promise<void>,
    currentConversation: any
  ): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (this.initializedPlugins.has(pluginId)) {
      return; // Already initialized
    }

    try {
      const storage = new PluginStorageImpl(userId, pluginId, userPassword);
      
      // Create a wrapper function that automatically passes the plugin ID as the app name
      const createConversationForPlugin = async (systemPrompt?: string, appName?: string, title?: string, description?: string) => {
        // If appName is not provided, use the plugin ID as the app name
        const finalAppName = appName || pluginId;
        return createConversation(systemPrompt, finalAppName, title, description);
      };
      
      const context: PluginContext = {
        storage,
        userId,
        addMessage,
        createConversation: createConversationForPlugin,
        currentConversation
      };

      this.contexts.set(pluginId, context);

      if (plugin.initialize) {
        await plugin.initialize(context);
      }

      this.initializedPlugins.add(pluginId);
      this.emit('plugin:initialized', pluginId);
    } catch (error) {
      this.emit('plugin:error', pluginId, error as Error);
      throw error;
    }
  }

  async cleanupPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !this.initializedPlugins.has(pluginId)) {
      return;
    }

    try {
      if (plugin.cleanup) {
        await plugin.cleanup();
      }
    } catch (error) {
      console.error(`Error cleaning up plugin ${pluginId}:`, error);
    }

    this.initializedPlugins.delete(pluginId);
    this.contexts.delete(pluginId);
  }

  getPluginContext(pluginId: string): PluginContext | undefined {
    return this.contexts.get(pluginId);
  }

  getPluginTools(): Array<{ pluginId: string; declaration: FunctionDeclaration; handler: Function }> {
    const tools: Array<{ pluginId: string; declaration: FunctionDeclaration; handler: Function }> = [];
    
    for (const [pluginId, plugin] of this.plugins) {
      if (this.initializedPlugins.has(pluginId) && plugin.tools) {
        for (const tool of plugin.tools) {
          tools.push({
            pluginId,
            declaration: tool.declaration,
            handler: tool.handler
          });
        }
      }
    }
    
    return tools;
  }

  async handleToolCall(toolName: string, args: any): Promise<any> {
    const pluginTools = this.getPluginTools();
    const tool = pluginTools.find(t => t.declaration.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    const context = this.getPluginContext(tool.pluginId);
    if (!context) {
      throw new Error(`Plugin context not found for ${tool.pluginId}`);
    }

    return await tool.handler(args, context);
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistryImpl(); 