import { PluginDefinition, PluginContext, PluginToolResponse } from '../../types';
import { FunctionDeclaration, Type } from '@google/genai';
import { LanguageLearningApp } from './LanguageLearningApp';

// Tool declarations for the Language Learning plugin
const addWordTool: FunctionDeclaration = {
  name: 'add_word',
  description: 'Add a new word to the vocabulary list for language learning',
  parameters: {
    type: Type.OBJECT,
    properties: {
      word: {
        type: Type.STRING,
        description: 'The word to add to vocabulary'
      },
      translation: {
        type: Type.STRING,
        description: 'Translation of the word'
      },
      language: {
        type: Type.STRING,
        description: 'Language code (e.g., es, fr, de)'
      },
      difficulty: {
        type: Type.STRING,
        description: 'Difficulty level: beginner, intermediate, or advanced',
        enum: ['beginner', 'intermediate', 'advanced']
      },
      category: {
        type: Type.STRING,
        description: 'Category of the word (optional)'
      },
      definition: {
        type: Type.STRING,
        description: 'Definition of the word (optional)'
      },
      example: {
        type: Type.STRING,
        description: 'Example sentence using the word (optional)'
      }
    },
    required: ['word', 'translation', 'language']
  }
};

const removeWordTool: FunctionDeclaration = {
  name: 'remove_word',
  description: 'Remove a word from the vocabulary list',
  parameters: {
    type: Type.OBJECT,
    properties: {
      word: {
        type: Type.STRING,
        description: 'The word to remove from vocabulary'
      },
      language: {
        type: Type.STRING,
        description: 'Language code (e.g., es, fr, de)'
      }
    },
    required: ['word', 'language']
  }
};

const queryWordsTool: FunctionDeclaration = {
  name: 'query_words',
  description: 'Query and review vocabulary words for language learning',
  parameters: {
    type: Type.OBJECT,
    properties: {
      language: {
        type: Type.STRING,
        description: 'Language code to query (e.g., es, fr, de)'
      },
      difficulty: {
        type: Type.STRING,
        description: 'Filter by difficulty level (optional)',
        enum: ['beginner', 'intermediate', 'advanced']
      },
      category: {
        type: Type.STRING,
        description: 'Filter by category (optional)'
      },
      limit: {
        type: Type.NUMBER,
        description: 'Maximum number of words to return (default: 10)'
      },
      reviewDue: {
        type: Type.BOOLEAN,
        description: 'Only return words that need review (optional)'
      }
    },
    required: ['language']
  }
};

// Tool handlers
const handleAddWord = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    const vocabulary = await context.storage.get('vocabulary') || [];
    
    const newWord = {
      id: Date.now().toString(),
      word: args.word,
      translation: args.translation,
      language: args.language,
      difficulty: args.difficulty || 'beginner',
      category: args.category,
      definition: args.definition,
      example: args.example,
      dateAdded: new Date(),
      reviewCount: 0,
      mastery: 0
    };
    
    vocabulary.push(newWord);
    await context.storage.set('vocabulary', vocabulary);
    
    return {
      success: true,
      data: {
        message: `Added "${args.word}" to your ${args.language} vocabulary`,
        word: newWord
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to add word: ${error}`
    };
  }
};

const handleRemoveWord = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    const vocabulary = await context.storage.get('vocabulary') || [];
    
    const wordIndex = vocabulary.findIndex((w: any) => 
      w.word.toLowerCase() === args.word.toLowerCase() && 
      w.language === args.language
    );
    
    if (wordIndex === -1) {
      return {
        success: false,
        error: `Word "${args.word}" not found in ${args.language} vocabulary`
      };
    }
    
    const removedWord = vocabulary.splice(wordIndex, 1)[0];
    await context.storage.set('vocabulary', vocabulary);
    
    return {
      success: true,
      data: {
        message: `Removed "${args.word}" from your ${args.language} vocabulary`,
        word: removedWord
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to remove word: ${error}`
    };
  }
};

const handleQueryWords = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    const vocabulary = await context.storage.get('vocabulary') || [];
    
    let filtered = vocabulary.filter((w: any) => w.language === args.language);
    
    if (args.difficulty) {
      filtered = filtered.filter((w: any) => w.difficulty === args.difficulty);
    }
    
    if (args.category) {
      filtered = filtered.filter((w: any) => 
        w.category?.toLowerCase().includes(args.category.toLowerCase())
      );
    }
    
    if (args.reviewDue) {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter((w: any) => 
        !w.lastReviewed || new Date(w.lastReviewed) < oneDayAgo
      );
    }
    
    const limit = args.limit || 10;
    const result = filtered.slice(0, limit);
    
    return {
      success: true,
      data: {
        words: result,
        count: result.length,
        total: vocabulary.filter((w: any) => w.language === args.language).length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to query words: ${error}`
    };
  }
};

// Helper function to create example scenarios
const createExampleScenariosInPlugin = async (context: PluginContext) => {
  console.log('Starting to create example scenarios in plugin...');
  
  const exampleScenarios = [
    {
      id: 'restaurant-ordering',
      title: 'Restaurant Ordering',
      description: 'Practice ordering food and drinks at a restaurant',
      language: 'en',
      difficulty: 'beginner' as const,
      context: 'You are at a nice restaurant and want to order food. The waiter will help you choose dishes and take your order.',
      userRole: 'Customer',
      assistantRole: 'Friendly waiter',
      objectives: [
        'Practice food vocabulary',
        'Learn polite expressions for ordering',
        'Practice asking questions about menu items',
        'Learn how to make special requests'
      ],
      createdAt: new Date(),
      usageCount: 0
    },
    {
      id: 'job-interview',
      title: 'Job Interview',
      description: 'Practice answering common job interview questions',
      language: 'en',
      difficulty: 'intermediate' as const,
      context: 'You are interviewing for a position at a company. The interviewer will ask about your experience, skills, and goals.',
      userRole: 'Job candidate',
      assistantRole: 'Professional interviewer',
      objectives: [
        'Practice describing work experience',
        'Learn to highlight strengths and skills',
        'Practice answering behavioral questions',
        'Learn professional communication'
      ],
      createdAt: new Date(),
      usageCount: 0
    },
    {
      id: 'hotel-checkin',
      title: 'Hotel Check-in',
      description: 'Practice checking into a hotel and asking for information',
      language: 'en',
      difficulty: 'beginner' as const,
      context: 'You have arrived at your hotel and need to check in. You may also want to ask about hotel amenities and local recommendations.',
      userRole: 'Hotel guest',
      assistantRole: 'Hotel receptionist',
      objectives: [
        'Practice travel vocabulary',
        'Learn to handle reservation issues',
        'Practice asking for hotel services',
        'Learn to ask for local recommendations'
      ],
      createdAt: new Date(),
      usageCount: 0
    }
  ];
  
  try {
    console.log('Attempting to save scenarios to storage...');
    await context.storage.set('rolePlayingScenarios', exampleScenarios);
    console.log(`Successfully created ${exampleScenarios.length} example scenarios`);
    
    // Verify they were saved
    const saved = await context.storage.get('rolePlayingScenarios');
    console.log('Verification - scenarios saved:', saved ? saved.length : 'null');
  } catch (error) {
    console.error('Failed to create example scenarios:', error);
    throw error;
  }
};

// Plugin definition
export const languageLearningPlugin: PluginDefinition = {
  id: 'language-learning',
  name: 'Language Learning',
  description: 'AI-powered language learning assistant with vocabulary management',
  version: '1.0.0',
  author: 'myGenKit',
  icon: 'RiTranslate',
  
  tabComponent: LanguageLearningApp,
  
  systemPrompt: `You are a helpful language learning assistant. You help users learn new languages by:

1. When I mention a word I want to learn, automatically add it to my vocabulary using the add_word tool
2. Providing translations, definitions, and examples
3. Suggesting related words and phrases
4. Creating practice exercises and conversations
5. Tracking learning progress
6. Encouraging consistent practice

When you suggest adding a word to vocabulary, always call the add_word function with appropriate details. When users ask about their vocabulary, use query_words to show their current words.

Be encouraging and supportive in your responses. Adapt your language level to match the user's proficiency.`,
  
  tools: [
    {
      declaration: addWordTool,
      handler: handleAddWord
    },
    {
      declaration: removeWordTool,
      handler: handleRemoveWord
    },
    {
      declaration: queryWordsTool,
      handler: handleQueryWords
    }
  ],
  
  initialize: async (context: PluginContext) => {
    // Initialize vocabulary storage if it doesn't exist
    const vocabulary = await context.storage.get('vocabulary');
    if (!vocabulary) {
      await context.storage.set('vocabulary', []);
    }
    
    // Initialize sessions storage if it doesn't exist
    const sessions = await context.storage.get('sessions');
    if (!sessions) {
      await context.storage.set('sessions', []);
    }
    
    // Initialize role-playing scenarios with examples
    const scenarios = await context.storage.get('rolePlayingScenarios');
    if (!scenarios || scenarios.length === 0) {
      console.log('Creating example role-playing scenarios...');
      await createExampleScenariosInPlugin(context);
    }
    
    console.log('Language Learning plugin initialized');
  },
  
  cleanup: async () => {
    console.log('Language Learning plugin cleanup');
  }
}; 