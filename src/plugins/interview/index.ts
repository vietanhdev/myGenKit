import { PluginDefinition, PluginContext, PluginToolResponse } from '../../types';
import { FunctionDeclaration, Type } from '@google/genai';
import { InterviewApp } from './InterviewApp';

// Tool declarations for the Interview plugin
const addQuestionTool: FunctionDeclaration = {
  name: 'add_question',
  description: 'Add a new question to the interview question bank',
  parameters: {
    type: Type.OBJECT,
    properties: {
      question: {
        type: Type.STRING,
        description: 'The interview question text'
      },
      category: {
        type: Type.STRING,
        description: 'Category of the question (e.g., technical, behavioral, situational)',
        enum: ['technical', 'behavioral', 'situational', 'experience', 'culture-fit', 'problem-solving', 'leadership', 'communication']
      },
      difficulty: {
        type: Type.STRING,
        description: 'Difficulty level of the question',
        enum: ['entry', 'mid', 'senior', 'executive']
      },
      department: {
        type: Type.STRING,
        description: 'Department or field this question is relevant for (optional)'
      },
      tags: {
        type: Type.STRING,
        description: 'Comma-separated tags for the question (optional)'
      },
      followUp: {
        type: Type.STRING,
        description: 'Follow-up questions or notes (optional)'
      },
      idealAnswer: {
        type: Type.STRING,
        description: 'Example of an ideal answer or key points to cover (optional)'
      }
    },
    required: ['question', 'category', 'difficulty']
  }
};

const removeQuestionTool: FunctionDeclaration = {
  name: 'remove_question',
  description: 'Remove a question from the interview question bank',
  parameters: {
    type: Type.OBJECT,
    properties: {
      questionId: {
        type: Type.STRING,
        description: 'The ID of the question to remove'
      }
    },
    required: ['questionId']
  }
};

const queryQuestionsTool: FunctionDeclaration = {
  name: 'query_questions',
  description: 'Query and retrieve interview questions from the question bank',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: 'Filter by question category (optional)',
        enum: ['technical', 'behavioral', 'situational', 'experience', 'culture-fit', 'problem-solving', 'leadership', 'communication']
      },
      difficulty: {
        type: Type.STRING,
        description: 'Filter by difficulty level (optional)',
        enum: ['entry', 'mid', 'senior', 'executive']
      },
      department: {
        type: Type.STRING,
        description: 'Filter by department (optional)'
      },
      tags: {
        type: Type.STRING,
        description: 'Filter by tags (optional)'
      },
      limit: {
        type: Type.NUMBER,
        description: 'Maximum number of questions to return (default: 10)'
      }
    }
  }
};

const createInterviewRoundTool: FunctionDeclaration = {
  name: 'create_interview_round',
  description: 'Create a new interview round configuration',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: 'Name of the interview round (e.g., "Technical Round", "HR Round")'
      },
      description: {
        type: Type.STRING,
        description: 'Description of the round'
      },
      duration: {
        type: Type.NUMBER,
        description: 'Duration of the round in minutes'
      },
      questionCategories: {
        type: Type.STRING,
        description: 'Comma-separated list of question categories for this round'
      },
      difficulty: {
        type: Type.STRING,
        description: 'Target difficulty level for this round',
        enum: ['entry', 'mid', 'senior', 'executive']
      },
      questionCount: {
        type: Type.NUMBER,
        description: 'Number of questions to ask in this round'
      },
      interviewerRole: {
        type: Type.STRING,
        description: 'Role of the interviewer (e.g., "Technical Lead", "HR Manager")'
      }
    },
    required: ['name', 'duration', 'questionCategories', 'difficulty', 'questionCount', 'interviewerRole']
  }
};

// Tool handlers
const handleAddQuestion = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    const questions = await context.storage.get('questions') || [];
    
    const newQuestion = {
      id: crypto.randomUUID(),
      question: args.question,
      category: args.category,
      difficulty: args.difficulty,
      department: args.department || '',
      tags: args.tags ? args.tags.split(',').map((tag: string) => tag.trim()) : [],
      followUp: args.followUp || '',
      idealAnswer: args.idealAnswer || '',
      dateAdded: new Date(),
      usageCount: 0
    };
    
    questions.push(newQuestion);
    await context.storage.set('questions', questions);
    
    return {
      success: true,
      data: {
        message: `Added question "${args.question.substring(0, 50)}..." to the question bank`,
        question: newQuestion
      }
    };
  } catch (error) {
    console.error('Error in handleAddQuestion:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while adding the question.'
    };
  }
};

const handleRemoveQuestion = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    const questions = await context.storage.get('questions') || [];
    
    const questionIndex = questions.findIndex((q: any) => q.id === args.questionId);
    
    if (questionIndex === -1) {
      return {
        success: false,
        error: `Question with ID "${args.questionId}" not found`
      };
    }
    
    const removedQuestion = questions.splice(questionIndex, 1)[0];
    await context.storage.set('questions', questions);
    
    return {
      success: true,
      data: {
        message: `Removed question from the question bank`,
        question: removedQuestion
      }
    };
  } catch (error) {
    console.error('Error removing question:', error);
    return {
      success: false,
      error: 'Failed to remove question due to an unexpected error.'
    };
  }
};

const handleQueryQuestions = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    const questions = await context.storage.get('questions') || [];
    
    let filtered = [...questions];
    
    if (args.category) {
      filtered = filtered.filter((q: any) => q.category === args.category);
    }
    
    if (args.difficulty) {
      filtered = filtered.filter((q: any) => q.difficulty === args.difficulty);
    }
    
    if (args.department) {
      filtered = filtered.filter((q: any) => 
        q.department?.toLowerCase().includes(args.department.toLowerCase())
      );
    }
    
    if (args.tags) {
      const searchTags = args.tags.split(',').map((tag: string) => tag.trim().toLowerCase());
      filtered = filtered.filter((q: any) => 
        q.tags?.some((tag: string) => 
          searchTags.some((searchTag: string) => tag.toLowerCase().includes(searchTag))
        )
      );
    }
    
    const limit = args.limit || 10;
    const result = filtered.slice(0, limit);
    
    return {
      success: true,
      data: {
        questions: result,
        count: result.length,
        total: questions.length
      }
    };
  } catch (error) {
    console.error('Error querying questions:', error);
    return {
      success: false,
      error: 'Failed to query questions. Please try again later.'
    };
  }
};

const handleCreateInterviewRound = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    const rounds = await context.storage.get('interviewRounds') || [];
    
    const newRound = {
      id: crypto.randomUUID(),
      name: args.name,
      description: args.description || '',
      duration: args.duration,
      questionCategories: args.questionCategories.split(',').map((cat: string) => cat.trim()),
      difficulty: args.difficulty,
      questionCount: args.questionCount,
      interviewerRole: args.interviewerRole,
      dateCreated: new Date(),
      usageCount: 0
    };
    
    rounds.push(newRound);
    await context.storage.set('interviewRounds', rounds);
    
    return {
      success: true,
      data: {
        message: `Created interview round "${args.name}"`,
        round: newRound
      }
    };
  } catch (error) {
    console.error('Error creating interview round:', error);
    return {
      success: false,
      error: 'Failed to create interview round due to an internal error. Please try again later.'
    };
  }
};

// Helper function to create example questions
const createExampleQuestions = async (context: PluginContext) => {
  console.log('Loading example interview questions from JSON...');
  
  try {
    // Import the questions from JSON file
    const questionsData = await import('./data/example-questions.json');
    const exampleQuestions = questionsData.default.map((question: any) => ({
      ...question,
      dateAdded: new Date()
    }));
    
    await context.storage.set('questions', exampleQuestions);
    console.log(`Successfully loaded ${exampleQuestions.length} example questions from JSON`);
  } catch (error) {
    console.error('Failed to load example questions from JSON:', error);
    throw error;
  }
};

// Helper function to create example interview rounds
const createExampleRounds = async (context: PluginContext) => {
  console.log('Loading example interview rounds from JSON...');
  
  try {
    // Import the rounds from JSON file
    const roundsData = await import('./data/example-rounds.json');
    const exampleRounds = roundsData.default.map((round: any) => ({
      ...round,
      dateCreated: new Date()
    }));
    
    await context.storage.set('interviewRounds', exampleRounds);
    console.log(`Successfully loaded ${exampleRounds.length} example interview rounds from JSON`);
  } catch (error) {
    console.error('Failed to load example interview rounds from JSON:', error);
    throw error;
  }
};

// Plugin definition
export const interviewPlugin: PluginDefinition = {
  id: 'interview',
  name: 'Interview Practice',
  description: 'AI-powered interview preparation with question banks and customizable rounds',
  version: '1.0.0',
  author: 'myGenKit',
  icon: 'RiUserSearchLine',
  
  tabComponent: InterviewApp,
  
  systemPrompt: `You are a professional interview coach and hiring expert. You help users prepare for job interviews by:

1. Managing interview question banks with categorized questions
2. Creating and customizing interview rounds for different roles and levels
3. Conducting mock interview sessions with realistic scenarios
4. Providing constructive feedback on answers using the STAR method (Situation, Task, Action, Result)
5. Offering tips on interview preparation, body language, and communication skills

When conducting interviews:
- Ask follow-up questions to dive deeper
- Provide specific, actionable feedback
- Adjust difficulty based on the target role level
- Encourage comprehensive answers that demonstrate competency
- Help identify areas for improvement

Use the available tools to manage questions and create interview rounds. Be supportive and professional while maintaining interview realism.`,
  
  tools: [
    {
      declaration: addQuestionTool,
      handler: handleAddQuestion
    },
    {
      declaration: removeQuestionTool,
      handler: handleRemoveQuestion
    },
    {
      declaration: queryQuestionsTool,
      handler: handleQueryQuestions
    },
    {
      declaration: createInterviewRoundTool,
      handler: handleCreateInterviewRound
    }
  ],
  
  initialize: async (context: PluginContext) => {
    // Initialize question bank storage
    const questions = await context.storage.get('questions');
    if (!questions || questions.length === 0) {
      console.log('Creating example interview questions...');
      await createExampleQuestions(context);
    }
    
    // Initialize interview rounds storage
    const rounds = await context.storage.get('interviewRounds');
    if (!rounds || rounds.length === 0) {
      console.log('Creating example interview rounds...');
      await createExampleRounds(context);
    }
    
    // Initialize interview sessions storage
    const sessions = await context.storage.get('interviewSessions');
    if (!sessions) {
      await context.storage.set('interviewSessions', []);
    }
    
    console.log('Interview plugin initialized');
  },
  
  cleanup: async () => {
    console.log('Interview plugin cleanup');
  }
}; 