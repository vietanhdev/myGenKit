# MyGenKit Plugin System

This directory contains plugins for the MyGenKit AI assistant application. The plugin system allows you to extend the functionality of the AI assistant with custom apps, tools, and UI components.

## Current Plugins

### Language Learning Plugin (`language-learning/`)

A comprehensive language learning assistant that helps users:
- Learn new vocabulary with automatic word addition from AI suggestions
- Manage vocabulary lists with translations, categories, and difficulty levels
- Track learning progress and mastery levels
- Review vocabulary with spaced repetition (coming soon)

**Features:**
- **Vocabulary Management**: Add, edit, and delete words with translations, definitions, examples, and categories
- **AI Integration**: When the AI suggests a word to learn, it automatically calls the `add_word` function
- **Progress Tracking**: Track mastery levels and review counts for each word
- **Multi-language Support**: Support for 10+ languages including Spanish, French, German, Japanese, etc.
- **App-specific Conversations**: Conversations are automatically tagged with the Language Learning app

**AI Tools:**
- `add_word`: Add new vocabulary words with metadata
- `remove_word`: Remove words from vocabulary 
- `query_words`: Query and filter vocabulary for review

## Plugin Architecture

### Plugin Structure

Each plugin should be organized in its own directory with the following structure:

```
plugins/
├── your-plugin-name/
│   ├── index.ts          # Plugin definition and registration
│   ├── YourComponent.tsx # Main UI component
│   └── README.md         # Plugin documentation
```

### Plugin Definition

A plugin must export a `PluginDefinition` object with the following properties:

```typescript
export const yourPlugin: PluginDefinition = {
  id: 'your-plugin-id',
  name: 'Your Plugin Name',
  description: 'Description of what your plugin does',
  version: '1.0.0',
  author: 'Your Name',
  
  // React component for the plugin tab
  tabComponent: YourComponent,
  
  // Optional: System prompt for AI conversations
  systemPrompt: 'You are a helpful assistant for...',
  
  // Optional: Tools the AI can call
  tools: [
    {
      declaration: functionDeclaration,
      handler: functionHandler
    }
  ],
  
  // Optional: Lifecycle methods
  initialize: async (context) => {
    // Plugin initialization
  },
  cleanup: async () => {
    // Plugin cleanup
  }
};
```

### Plugin Context

Each plugin receives a `PluginContext` object that provides:

```typescript
interface PluginContext {
  storage: PluginStorage;        // Persistent storage for plugin data
  userId: string;                // Current user ID
  addMessage: Function;          // Add message to current conversation
  createConversation: Function;  // Create new conversation
  currentConversation: Conversation | null; // Current conversation
}
```

### Storage API

Plugins have access to a key-value storage system:

```typescript
// Save data
await context.storage.set('key', data);

// Load data
const data = await context.storage.get('key');

// Remove data
await context.storage.remove('key');

// Clear all plugin data
await context.storage.clear();
```

### AI Tool Integration

Plugins can define tools that the AI can call:

```typescript
const myTool: FunctionDeclaration = {
  name: 'my_function',
  description: 'What this function does',
  parameters: {
    type: Type.OBJECT,
    properties: {
      param1: {
        type: Type.STRING,
        description: 'Description of parameter'
      }
    },
    required: ['param1']
  }
};

const handleMyTool = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    // Process the tool call
    const result = processData(args.param1);
    
    return {
      success: true,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
```

## Creating a New Plugin

1. **Create Plugin Directory**: Create a new directory in `plugins/` for your plugin
2. **Implement Plugin Component**: Create a React component that implements the plugin UI
3. **Define Plugin**: Create an `index.ts` file that exports your plugin definition
4. **Register Plugin**: Add your plugin to the main application's plugin registry
5. **Test**: Test your plugin functionality and AI tool integration

### Example Plugin Component

```typescript
import React from 'react';
import { PluginContext } from '../../src/types';

interface YourPluginProps {
  isActive: boolean;
  context?: PluginContext;
}

export const YourPlugin: React.FC<YourPluginProps> = ({ isActive, context }) => {
  if (!isActive) return null;
  
  return (
    <div className="h-full p-4">
      <h2>Your Plugin</h2>
      {/* Your plugin UI here */}
    </div>
  );
};
```

## Best Practices

1. **Storage Management**: Use descriptive keys for storage and handle errors gracefully
2. **UI Responsiveness**: Ensure your plugin UI works well in the sidebar layout
3. **Error Handling**: Always handle errors in tool functions and provide meaningful error messages
4. **Performance**: Use React best practices like `useMemo` and `useCallback` for optimization
5. **User Experience**: Provide loading states and clear feedback for user actions
6. **Documentation**: Document your plugin's features and API clearly

## Integration with Main App

Plugins are automatically integrated with the main application's:
- **Tab System**: Each plugin gets its own tab in the sidebar
- **Conversation System**: Plugin conversations are tagged and filtered by app
- **AI System**: Plugin tools are automatically registered with the AI
- **Storage System**: Plugin data is isolated and encrypted per user

## Future Enhancements

- Plugin marketplace and discovery
- Plugin templates and scaffolding tools
- Advanced plugin permissions and security
- Plugin-to-plugin communication
- Hot reloading for plugin development 