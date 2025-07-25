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
      id: Date.now().toString(),
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
    return {
      success: false,
      error: `Failed to add question: ${error}`
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
    return {
      success: false,
      error: `Failed to remove question: ${error}`
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
    return {
      success: false,
      error: `Failed to query questions: ${error}`
    };
  }
};

const handleCreateInterviewRound = async (args: any, context: PluginContext): Promise<PluginToolResponse> => {
  try {
    const rounds = await context.storage.get('interviewRounds') || [];
    
    const newRound = {
      id: Date.now().toString(),
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
    return {
      success: false,
      error: `Failed to create interview round: ${error}`
    };
  }
};

// Helper function to create example questions
const createExampleQuestions = async (context: PluginContext) => {
  console.log('Creating example interview questions...');
  
  const exampleQuestions = [
    // Technical Questions
    {
      id: 'tech-1',
      question: 'Explain the difference between var, let, and const in JavaScript.',
      category: 'technical',
      difficulty: 'entry',
      department: 'Software Engineering',
      tags: ['javascript', 'variables', 'fundamentals'],
      followUp: 'Can you give examples of when you would use each one?',
      idealAnswer: 'var is function-scoped and can be redeclared, let is block-scoped and can be reassigned, const is block-scoped and cannot be reassigned.',
      dateAdded: new Date(),
      usageCount: 0
    },
    {
      id: 'tech-2',
      question: 'How would you optimize a slow database query?',
      category: 'technical',
      difficulty: 'mid',
      department: 'Software Engineering',
      tags: ['database', 'optimization', 'performance'],
      followUp: 'What tools would you use to identify the bottleneck?',
      idealAnswer: 'Add indexes, analyze query execution plan, optimize joins, consider query rewriting, check for N+1 problems.',
      dateAdded: new Date(),
      usageCount: 0
    },
    {
      id: 'tech-3',
      question: 'Design a scalable system for a social media feed.',
      category: 'technical',
      difficulty: 'senior',
      department: 'Software Engineering',
      tags: ['system-design', 'scalability', 'architecture'],
      followUp: 'How would you handle millions of users?',
      idealAnswer: 'Discuss microservices, caching strategies, database sharding, load balancing, CDN usage.',
      dateAdded: new Date(),
      usageCount: 0
    },

    // Behavioral Questions
    {
      id: 'behavioral-1',
      question: 'Tell me about a time when you had to work with a difficult team member.',
      category: 'behavioral',
      difficulty: 'entry',
      department: 'General',
      tags: ['teamwork', 'conflict-resolution', 'communication'],
      followUp: 'What did you learn from that experience?',
      idealAnswer: 'Use STAR method: Situation, Task, Action, Result. Focus on communication and problem-solving.',
      dateAdded: new Date(),
      usageCount: 0
    },
    {
      id: 'behavioral-2',
      question: 'Describe a project where you had to learn a new technology quickly.',
      category: 'behavioral',
      difficulty: 'mid',
      department: 'Software Engineering',
      tags: ['learning', 'adaptability', 'technology'],
      followUp: 'How do you approach learning new technologies?',
      idealAnswer: 'Show learning methodology, resourcefulness, and ability to apply new knowledge effectively.',
      dateAdded: new Date(),
      usageCount: 0
    },
    {
      id: 'behavioral-3',
      question: 'Tell me about a time when you had to make a decision with incomplete information.',
      category: 'behavioral',
      difficulty: 'senior',
      department: 'Management',
      tags: ['decision-making', 'leadership', 'uncertainty'],
      followUp: 'How did you mitigate the risks?',
      idealAnswer: 'Demonstrate analytical thinking, risk assessment, and ability to act decisively under pressure.',
      dateAdded: new Date(),
      usageCount: 0
    },

    // Situational Questions
    {
      id: 'situational-1',
      question: 'How would you handle a situation where your project deadline is moved up by two weeks?',
      category: 'situational',
      difficulty: 'entry',
      department: 'General',
      tags: ['time-management', 'pressure', 'prioritization'],
      followUp: 'What if you had to cut scope?',
      idealAnswer: 'Assess current progress, prioritize features, communicate with stakeholders, consider team resources.',
      dateAdded: new Date(),
      usageCount: 0
    },
    {
      id: 'situational-2',
      question: 'What would you do if you discovered a security vulnerability in production?',
      category: 'situational',
      difficulty: 'mid',
      department: 'Software Engineering',
      tags: ['security', 'incident-response', 'communication'],
      followUp: 'How would you prevent this in the future?',
      idealAnswer: 'Immediate containment, stakeholder notification, root cause analysis, patch deployment, post-mortem.',
      dateAdded: new Date(),
      usageCount: 0
    },

    // Problem-Solving Questions
    {
      id: 'problem-1',
      question: 'How many tennis balls can fit in a school bus?',
      category: 'problem-solving',
      difficulty: 'entry',
      department: 'General',
      tags: ['estimation', 'analytical-thinking', 'creativity'],
      followUp: 'Walk me through your calculation.',
      idealAnswer: 'Break down the problem, estimate dimensions, show mathematical reasoning, state assumptions.',
      dateAdded: new Date(),
      usageCount: 0
    },
    {
      id: 'problem-2',
      question: 'A user reports that our website is slow. How would you investigate?',
      category: 'problem-solving',
      difficulty: 'mid',
      department: 'Software Engineering',
      tags: ['debugging', 'performance', 'systematic-approach'],
      followUp: 'What metrics would you look at first?',
      idealAnswer: 'Systematic approach: reproduce issue, check metrics, analyze network/server/database performance.',
      dateAdded: new Date(),
      usageCount: 0
    },

    // Experience Questions
    {
      id: 'experience-1',
      question: 'What was the most challenging project you\'ve worked on?',
      category: 'experience',
      difficulty: 'entry',
      department: 'General',
      tags: ['projects', 'challenges', 'growth'],
      followUp: 'What made it challenging?',
      idealAnswer: 'Describe specific project, challenges faced, solutions implemented, lessons learned.',
      dateAdded: new Date(),
      usageCount: 0
    },
    {
      id: 'experience-2',
      question: 'Describe your experience with agile development methodologies.',
      category: 'experience',
      difficulty: 'mid',
      department: 'Software Engineering',
      tags: ['agile', 'methodology', 'process'],
      followUp: 'What worked well and what didn\'t?',
      idealAnswer: 'Specific experience with Scrum/Kanban, ceremonies, benefits and challenges encountered.',
      dateAdded: new Date(),
      usageCount: 0
    },

    // Culture Fit Questions
    {
      id: 'culture-1',
      question: 'What motivates you in your work?',
      category: 'culture-fit',
      difficulty: 'entry',
      department: 'General',
      tags: ['motivation', 'values', 'culture'],
      followUp: 'How do you stay motivated during difficult times?',
      idealAnswer: 'Authentic response showing alignment with company values and personal drive.',
      dateAdded: new Date(),
      usageCount: 0
    },
    {
      id: 'culture-2',
      question: 'How do you handle feedback and criticism?',
      category: 'culture-fit',
      difficulty: 'mid',
      department: 'General',
      tags: ['feedback', 'growth-mindset', 'resilience'],
      followUp: 'Can you give an example?',
      idealAnswer: 'Show openness to feedback, growth mindset, and ability to act on constructive criticism.',
      dateAdded: new Date(),
      usageCount: 0
    }
  ];
  
  try {
    await context.storage.set('questions', exampleQuestions);
    console.log(`Successfully created ${exampleQuestions.length} example questions`);
  } catch (error) {
    console.error('Failed to create example questions:', error);
    throw error;
  }
};

// Helper function to create example interview rounds
const createExampleRounds = async (context: PluginContext) => {
  console.log('Creating example interview rounds...');
  
  const exampleRounds = [
    {
      id: 'round-1',
      name: 'Phone Screening',
      description: 'Initial phone screening to assess basic qualifications and interest',
      duration: 30,
      questionCategories: ['experience', 'culture-fit'],
      difficulty: 'entry',
      questionCount: 5,
      interviewerRole: 'HR Recruiter',
      dateCreated: new Date(),
      usageCount: 0,
      focusType: 'cv' as const
    },
    {
      id: 'round-2',
      name: 'Technical Interview',
      description: 'In-depth technical assessment focusing on coding and problem-solving skills',
      duration: 60,
      questionCategories: ['technical', 'problem-solving'],
      difficulty: 'mid',
      questionCount: 8,
      interviewerRole: 'Senior Software Engineer',
      dateCreated: new Date(),
      usageCount: 0,
      focusType: 'techniques' as const,
      techniques: ['JavaScript', 'React', 'Node.js', 'Algorithms', 'Data Structures']
    },
    {
      id: 'round-3',
      name: 'Behavioral Interview',
      description: 'Assessment of soft skills, teamwork, and cultural fit',
      duration: 45,
      questionCategories: ['behavioral', 'situational', 'culture-fit'],
      difficulty: 'mid',
      questionCount: 6,
      interviewerRole: 'Team Lead',
      dateCreated: new Date(),
      usageCount: 0,
      focusType: 'cv' as const
    },
    {
      id: 'round-4',
      name: 'System Design',
      description: 'High-level system design discussion for senior positions',
      duration: 90,
      questionCategories: ['technical', 'problem-solving'],
      difficulty: 'senior',
      questionCount: 3,
      interviewerRole: 'Principal Engineer',
      dateCreated: new Date(),
      usageCount: 0,
      focusType: 'domain' as const,
      domains: ['System Architecture', 'Scalability', 'Microservices', 'Cloud Computing']
    },
    {
      id: 'round-5',
      name: 'Executive Interview',
      description: 'Final round with leadership focusing on vision and strategic thinking',
      duration: 60,
      questionCategories: ['leadership', 'experience', 'culture-fit'],
      difficulty: 'executive',
      questionCount: 5,
      interviewerRole: 'VP of Engineering',
      dateCreated: new Date(),
      usageCount: 0,
      focusType: 'cv' as const
    }
  ];
  
  try {
    await context.storage.set('interviewRounds', exampleRounds);
    console.log(`Successfully created ${exampleRounds.length} example interview rounds`);
  } catch (error) {
    console.error('Failed to create example interview rounds:', error);
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