import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Progress
} from '@heroui/react';
import { 
  RiAddLine, 
  RiDeleteBin7Line, 
  RiEditLine, 
  RiBookOpenLine,
  RiTranslate,
  RiStarLine,
  RiGamepadLine,
  RiPlayLine,
  RiUser3Line,
  RiRobotLine,
  RiMicLine
} from 'react-icons/ri';
import { PluginContext } from '../../types';
import CleanConversationMessages from '../../components/side-panel/CleanConversationMessages';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';

interface VocabularyWord {
  id: string;
  word: string;
  translation: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  definition?: string;
  example?: string;
  category?: string;
  dateAdded: Date;
  lastReviewed?: Date;
  reviewCount: number;
  mastery: number; // 0-100
  notes?: string;
}

interface LearningSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  wordsReviewed: number;
  correctAnswers: number;
  type: 'vocabulary' | 'conversation' | 'grammar';
}

interface RolePlayingScenario {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  context: string; // The role-playing context/situation
  userRole: string; // What role the user will play
  assistantRole: string; // What role the assistant will play
  objectives: string[]; // Learning objectives for this scenario
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
}

interface LanguageLearningAppProps {
  isActive: boolean;
  context?: PluginContext;
}

const LANGUAGES = [
  { key: 'en', label: 'English' },
];

const DIFFICULTY_COLORS = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger'
} as const;

export const LanguageLearningApp: React.FC<LanguageLearningAppProps> = ({ isActive, context }) => {
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [rolePlayingScenarios, setRolePlayingScenarios] = useState<RolePlayingScenario[]>([]);
  const selectedLanguage = 'en'; // English-only for v1
  const [activeTab, setActiveTab] = useState<string>('conversation');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Access to LiveAPI for audio streaming
  const { connect, connected } = useLiveAPIContext();
  
  // Add/Edit Word Modal
  const { isOpen: isAddWordOpen, onOpen: onAddWordOpen, onClose: onAddWordClose } = useDisclosure();
  const [editingWord, setEditingWord] = useState<VocabularyWord | null>(null);
  const [newWord, setNewWord] = useState<{
    word: string;
    translation: string;
    language: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    definition: string;
    example: string;
    category: string;
    notes: string;
  }>({
    word: '',
    translation: '',
    language: selectedLanguage,
    difficulty: 'beginner',
    definition: '',
    example: '',
    category: '',
    notes: ''
  });

  // Add/Edit Role Playing Scenario Modal
  const { isOpen: isAddScenarioOpen, onOpen: onAddScenarioOpen, onClose: onAddScenarioClose } = useDisclosure();
  const [editingScenario, setEditingScenario] = useState<RolePlayingScenario | null>(null);
  const [newScenario, setNewScenario] = useState<{
    title: string;
    description: string;
    language: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    context: string;
    userRole: string;
    assistantRole: string;
    objectives: string;
  }>({
    title: '',
    description: '',
    language: 'en',
    difficulty: 'beginner',
    context: '',
    userRole: '',
    assistantRole: '',
    objectives: ''
  });

  // Note: useEffect moved after function definitions to avoid hoisting issues

  const loadVocabulary = useCallback(async () => {
    if (!context) return;
    
    try {
      const savedVocabulary = await context.storage.get('vocabulary');
      if (savedVocabulary) {
        setVocabulary(savedVocabulary.map((word: any) => ({
          ...word,
          dateAdded: new Date(word.dateAdded),
          lastReviewed: word.lastReviewed ? new Date(word.lastReviewed) : undefined
        })));
      }
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
    }
  }, [context]);

  const loadSessions = useCallback(async () => {
    if (!context) return;
    
    try {
      const savedSessions = await context.storage.get('sessions');
      if (savedSessions) {
        setSessions(savedSessions.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: session.endTime ? new Date(session.endTime) : undefined
        })));
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, [context]);

  const createExampleScenarios = useCallback(async () => {
    if (!context) return;
    
    const exampleScenarios: RolePlayingScenario[] = [
      {
        id: 'restaurant-ordering',
        title: 'Restaurant Ordering',
        description: 'Practice ordering food and drinks at a restaurant',
        language: 'en',
        difficulty: 'beginner',
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
        difficulty: 'intermediate',
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
        difficulty: 'beginner',
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
      },
      {
        id: 'shopping-assistance',
        title: 'Shopping for Clothes',
        description: 'Practice shopping for clothes and asking for help',
        language: 'en',
        difficulty: 'beginner',
        context: 'You are at a clothing store looking for something specific. The sales assistant will help you find what you need.',
        userRole: 'Customer',
        assistantRole: 'Helpful sales assistant',
        objectives: [
          'Practice clothing vocabulary',
          'Learn to describe sizes and colors',
          'Practice asking for different options',
          'Learn to discuss prices and payment'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'doctor-visit',
        title: 'Doctor Visit',
        description: 'Practice describing symptoms and health concerns',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You are visiting a doctor because you are not feeling well. You need to describe your symptoms and understand the doctor\'s advice.',
        userRole: 'Patient',
        assistantRole: 'Doctor',
        objectives: [
          'Practice health and body vocabulary',
          'Learn to describe symptoms clearly',
          'Practice asking health-related questions',
          'Learn to understand medical advice'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'phone-conversation',
        title: 'Phone Conversation',
        description: 'Practice making phone calls and appointments',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You need to call a business to make an appointment or ask for information. Practice clear phone communication.',
        userRole: 'Caller',
        assistantRole: 'Business representative',
        objectives: [
          'Practice phone etiquette',
          'Learn to schedule appointments',
          'Practice asking for information clearly',
          'Learn to handle misunderstandings'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'grocery-shopping',
        title: 'Grocery Shopping',
        description: 'Practice shopping for groceries and asking for help',
        language: 'en',
        difficulty: 'beginner',
        context: 'You are at a grocery store looking for specific items. You may need help finding products or asking about prices.',
        userRole: 'Shopper',
        assistantRole: 'Store employee',
        objectives: [
          'Practice food and grocery vocabulary',
          'Learn to ask for directions in stores',
          'Practice quantity and measurement words',
          'Learn to compare prices and products'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'bank-visit',
        title: 'Bank Visit',
        description: 'Practice banking transactions and financial conversations',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You need to visit the bank to open an account, make transactions, or ask about services.',
        userRole: 'Bank customer',
        assistantRole: 'Bank teller',
        objectives: [
          'Practice banking vocabulary',
          'Learn to discuss financial services',
          'Practice formal conversation',
          'Learn to ask about fees and requirements'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'airport-checkin',
        title: 'Airport Check-in',
        description: 'Practice checking in for flights and airport procedures',
        language: 'en',
        difficulty: 'beginner',
        context: 'You are at the airport and need to check in for your flight. You may also need to ask about baggage and gate information.',
        userRole: 'Passenger',
        assistantRole: 'Airport agent',
        objectives: [
          'Practice travel vocabulary',
          'Learn airline terminology',
          'Practice asking for information',
          'Learn to handle travel issues'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'coffee-shop-order',
        title: 'Coffee Shop Order',
        description: 'Practice ordering coffee and snacks at a café',
        language: 'en',
        difficulty: 'beginner',
        context: 'You are at a coffee shop and want to order drinks and food. The barista will help you choose from the menu.',
        userRole: 'Customer',
        assistantRole: 'Barista',
        objectives: [
          'Practice beverage vocabulary',
          'Learn to customize orders',
          'Practice asking about ingredients',
          'Learn casual conversation'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'apartment-rental',
        title: 'Apartment Rental',
        description: 'Practice inquiring about renting an apartment',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You are looking for an apartment to rent and need to ask about details, terms, and schedule a viewing.',
        userRole: 'Prospective tenant',
        assistantRole: 'Landlord or real estate agent',
        objectives: [
          'Practice housing vocabulary',
          'Learn to ask about rental terms',
          'Practice negotiating',
          'Learn to describe living preferences'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'taxi-ride',
        title: 'Taxi Ride',
        description: 'Practice giving directions and talking to taxi drivers',
        language: 'en',
        difficulty: 'beginner',
        context: 'You need to take a taxi to your destination. Practice giving clear directions and making conversation.',
        userRole: 'Passenger',
        assistantRole: 'Taxi driver',
        objectives: [
          'Practice direction vocabulary',
          'Learn to give clear instructions',
          'Practice small talk',
          'Learn to discuss payment'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'tech-support',
        title: 'Tech Support Call',
        description: 'Practice explaining technical problems and getting help',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You are having problems with your computer or device and need to call technical support for help.',
        userRole: 'Customer',
        assistantRole: 'Tech support representative',
        objectives: [
          'Practice technology vocabulary',
          'Learn to describe problems clearly',
          'Practice following instructions',
          'Learn to ask for clarification'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'library-visit',
        title: 'Library Visit',
        description: 'Practice asking for help at the library',
        language: 'en',
        difficulty: 'beginner',
        context: 'You are at the library and need help finding books, using computers, or learning about services.',
        userRole: 'Library visitor',
        assistantRole: 'Librarian',
        objectives: [
          'Practice library vocabulary',
          'Learn to ask for assistance',
          'Practice describing research needs',
          'Learn about library services'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'gym-membership',
        title: 'Gym Membership',
        description: 'Practice signing up for a gym membership',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You want to join a gym and need to ask about membership options, facilities, and pricing.',
        userRole: 'Potential member',
        assistantRole: 'Gym staff',
        objectives: [
          'Practice fitness vocabulary',
          'Learn to ask about services',
          'Practice comparing options',
          'Learn to discuss contracts'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'post-office',
        title: 'Post Office Visit',
        description: 'Practice sending mail and packages',
        language: 'en',
        difficulty: 'beginner',
        context: 'You need to send a package or mail at the post office and ask about different shipping options.',
        userRole: 'Customer',
        assistantRole: 'Postal worker',
        objectives: [
          'Practice shipping vocabulary',
          'Learn to compare delivery options',
          'Practice asking about costs',
          'Learn to fill out forms'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'movie-theater',
        title: 'Movie Theater',
        description: 'Practice buying movie tickets and concessions',
        language: 'en',
        difficulty: 'beginner',
        context: 'You want to watch a movie and need to buy tickets, choose seats, and maybe get snacks.',
        userRole: 'Movie-goer',
        assistantRole: 'Theater employee',
        objectives: [
          'Practice entertainment vocabulary',
          'Learn to ask about showtimes',
          'Practice making preferences known',
          'Learn to handle transactions'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'car-rental',
        title: 'Car Rental',
        description: 'Practice renting a car and understanding rental terms',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You need to rent a car for your trip and want to understand the options, insurance, and rental agreement.',
        userRole: 'Renter',
        assistantRole: 'Rental agent',
        objectives: [
          'Practice vehicle vocabulary',
          'Learn to ask about rental terms',
          'Practice understanding contracts',
          'Learn to discuss insurance options'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'pharmacy-visit',
        title: 'Pharmacy Visit',
        description: 'Practice getting prescriptions and asking about medications',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You need to pick up a prescription and ask about medication instructions and side effects.',
        userRole: 'Patient',
        assistantRole: 'Pharmacist',
        objectives: [
          'Practice medical vocabulary',
          'Learn to ask about medications',
          'Practice understanding instructions',
          'Learn to discuss health concerns'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'haircut-salon',
        title: 'Hair Salon Visit',
        description: 'Practice getting a haircut and communicating with stylists',
        language: 'en',
        difficulty: 'beginner',
        context: 'You are at a hair salon and need to explain what kind of haircut or styling you want.',
        userRole: 'Client',
        assistantRole: 'Hair stylist',
        objectives: [
          'Practice appearance vocabulary',
          'Learn to describe desired changes',
          'Practice giving feedback',
          'Learn salon terminology'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'school-enrollment',
        title: 'School Enrollment',
        description: 'Practice enrolling in classes or educational programs',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You want to enroll in a course or program and need to ask about requirements, schedules, and costs.',
        userRole: 'Student',
        assistantRole: 'School administrator',
        objectives: [
          'Practice education vocabulary',
          'Learn to ask about requirements',
          'Practice discussing schedules',
          'Learn about academic procedures'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'restaurant-complaint',
        title: 'Restaurant Complaint',
        description: 'Practice handling problems at a restaurant diplomatically',
        language: 'en',
        difficulty: 'advanced',
        context: 'There is a problem with your meal or service at a restaurant and you need to address it politely but firmly.',
        userRole: 'Dissatisfied customer',
        assistantRole: 'Restaurant manager',
        objectives: [
          'Practice complaint vocabulary',
          'Learn to express dissatisfaction politely',
          'Practice problem-solving language',
          'Learn to negotiate solutions'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'business-meeting',
        title: 'Business Meeting',
        description: 'Practice participating in professional meetings',
        language: 'en',
        difficulty: 'advanced',
        context: 'You are attending a business meeting and need to present ideas, ask questions, and participate in discussions.',
        userRole: 'Meeting participant',
        assistantRole: 'Meeting facilitator',
        objectives: [
          'Practice business vocabulary',
          'Learn to express opinions professionally',
          'Practice asking clarifying questions',
          'Learn meeting etiquette'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'emergency-room',
        title: 'Emergency Room Visit',
        description: 'Practice explaining urgent medical situations',
        language: 'en',
        difficulty: 'advanced',
        context: 'You are in the emergency room and need to explain your symptoms quickly and clearly to medical staff.',
        userRole: 'Emergency patient',
        assistantRole: 'Emergency room nurse',
        objectives: [
          'Practice emergency vocabulary',
          'Learn to describe urgent situations',
          'Practice pain and symptom descriptions',
          'Learn to understand medical questions'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'neighbor-conversation',
        title: 'Neighbor Conversation',
        description: 'Practice casual conversations with neighbors',
        language: 'en',
        difficulty: 'beginner',
        context: 'You meet your neighbor and want to have a friendly conversation about the neighborhood and daily life.',
        userRole: 'Neighbor',
        assistantRole: 'Friendly neighbor',
        objectives: [
          'Practice casual conversation',
          'Learn small talk topics',
          'Practice neighborhood vocabulary',
          'Learn to be friendly and polite'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'weather-conversation',
        title: 'Weather Small Talk',
        description: 'Practice making small talk about weather and seasons',
        language: 'en',
        difficulty: 'beginner',
        context: 'You are making casual conversation with someone about the weather, seasonal changes, and related activities.',
        userRole: 'Conversation partner',
        assistantRole: 'Friendly person',
        objectives: [
          'Practice weather vocabulary',
          'Learn seasonal expressions',
          'Practice making predictions',
          'Learn to express preferences about weather'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'pet-store-visit',
        title: 'Pet Store Visit',
        description: 'Practice asking about pets and pet care products',
        language: 'en',
        difficulty: 'beginner',
        context: 'You are at a pet store looking for a pet or pet supplies and need advice from the staff.',
        userRole: 'Pet owner/prospective owner',
        assistantRole: 'Pet store employee',
        objectives: [
          'Practice animal vocabulary',
          'Learn to ask about pet care',
          'Practice describing pet needs',
          'Learn about pet products'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'sports-conversation',
        title: 'Sports Discussion',
        description: 'Practice talking about sports and games',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You are having a conversation about sports, teams, games, and athletic activities with a sports fan.',
        userRole: 'Sports enthusiast',
        assistantRole: 'Fellow sports fan',
        objectives: [
          'Practice sports vocabulary',
          'Learn to express opinions about games',
          'Practice discussing team performance',
          'Learn sports-related expressions'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'cooking-class',
        title: 'Cooking Class',
        description: 'Practice following cooking instructions and asking questions',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You are taking a cooking class and need to follow instructions, ask questions, and discuss cooking techniques.',
        userRole: 'Cooking student',
        assistantRole: 'Cooking instructor',
        objectives: [
          'Practice cooking vocabulary',
          'Learn to follow instructions',
          'Practice asking for clarification',
          'Learn cooking techniques and terms'
        ],
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'travel-planning',
        title: 'Travel Planning',
        description: 'Practice planning a trip with a travel agent',
        language: 'en',
        difficulty: 'intermediate',
        context: 'You want to plan a vacation and need help choosing destinations, accommodations, and activities.',
        userRole: 'Traveler',
        assistantRole: 'Travel agent',
        objectives: [
          'Practice travel vocabulary',
          'Learn to express preferences',
          'Practice asking about options',
          'Learn to discuss budgets and timelines'
        ],
        createdAt: new Date(),
        usageCount: 0
      }
    ];
    
    try {
      await context.storage.set('rolePlayingScenarios', exampleScenarios);
      setRolePlayingScenarios(exampleScenarios);
    } catch (error) {
      console.error('Failed to create example scenarios:', error);
    }
  }, [context]);

  const loadRolePlayingScenarios = useCallback(async () => {
    if (!context) {
      console.log('No plugin context available for loading scenarios');
      return;
    }
    
    try {
      console.log('Loading role-playing scenarios...');
      const savedScenarios = await context.storage.get('rolePlayingScenarios');
      console.log('Loaded scenarios from storage:', savedScenarios ? savedScenarios.length : 'null');
      
      if (savedScenarios && savedScenarios.length > 0) {
        const processedScenarios = savedScenarios.map((scenario: any) => ({
          ...scenario,
          createdAt: new Date(scenario.createdAt),
          lastUsed: scenario.lastUsed ? new Date(scenario.lastUsed) : undefined
        }));
        setRolePlayingScenarios(processedScenarios);
        console.log('Set scenarios in state:', processedScenarios.length);
      } else {
        console.log('No scenarios found, they should have been created during plugin initialization');
        // Scenarios should have been created during plugin initialization
        // If they're still not there, we'll create them as a fallback
        await createExampleScenarios();
      }
    } catch (error) {
      console.error('Failed to load role-playing scenarios:', error);
    }
  }, [context, createExampleScenarios]);

  // Load data from plugin storage
  useEffect(() => {
    if (context && isActive) {
      loadVocabulary();
      loadSessions();
      loadRolePlayingScenarios();
    }
  }, [context, isActive, loadVocabulary, loadSessions, loadRolePlayingScenarios]);

  const saveVocabulary = async (newVocabulary: VocabularyWord[]) => {
    if (!context) return;
    
    try {
      await context.storage.set('vocabulary', newVocabulary);
      setVocabulary(newVocabulary);
    } catch (error) {
      console.error('Failed to save vocabulary:', error);
    }
  };

  const addWord = async () => {
    if (!context) return;
    
    const word: VocabularyWord = {
      id: Date.now().toString(),
      ...newWord,
      dateAdded: new Date(),
      reviewCount: 0,
      mastery: 0
    };
    
    const updatedVocabulary = [...vocabulary, word];
    await saveVocabulary(updatedVocabulary);
    
    // Reset form
    setNewWord({
      word: '',
      translation: '',
      language: selectedLanguage,
      difficulty: 'beginner',
      definition: '',
      example: '',
      category: '',
      notes: ''
    });
    
    onAddWordClose();
  };

  const updateWord = async (updatedWord: VocabularyWord) => {
    if (!context) return;
    
    const updatedVocabulary = vocabulary.map(w => 
      w.id === updatedWord.id ? updatedWord : w
    );
    await saveVocabulary(updatedVocabulary);
  };

  const deleteWord = async (wordId: string) => {
    if (!context) return;
    
    const updatedVocabulary = vocabulary.filter(w => w.id !== wordId);
    await saveVocabulary(updatedVocabulary);
  };

  const handleEditWord = (word: VocabularyWord) => {
    setEditingWord(word);
    setNewWord({
      word: word.word,
      translation: word.translation,
      language: word.language,
      difficulty: word.difficulty,
      definition: word.definition || '',
      example: word.example || '',
      category: word.category || '',
      notes: word.notes || ''
    });
    onAddWordOpen();
  };

  const saveRolePlayingScenarios = async (newScenarios: RolePlayingScenario[]) => {
    if (!context) return;
    
    try {
      await context.storage.set('rolePlayingScenarios', newScenarios);
      setRolePlayingScenarios(newScenarios);
    } catch (error) {
      console.error('Failed to save role-playing scenarios:', error);
    }
  };

  const addScenario = async () => {
    if (!context) return;
    
    const scenario: RolePlayingScenario = {
      id: Date.now().toString(),
      ...newScenario,
      objectives: newScenario.objectives.split('\n').filter(obj => obj.trim() !== ''),
      createdAt: new Date(),
      usageCount: 0
    };
    
    const updatedScenarios = [...rolePlayingScenarios, scenario];
    await saveRolePlayingScenarios(updatedScenarios);
    
    // Reset form
    setNewScenario({
      title: '',
      description: '',
      language: 'en',
      difficulty: 'beginner',
      context: '',
      userRole: '',
      assistantRole: '',
      objectives: ''
    });
    
    setEditingScenario(null);
    onAddScenarioClose();
  };

  const updateScenario = async (updatedScenario: RolePlayingScenario) => {
    if (!context) return;
    
    const updatedScenarios = rolePlayingScenarios.map(s => 
      s.id === updatedScenario.id ? updatedScenario : s
    );
    await saveRolePlayingScenarios(updatedScenarios);
  };

  const deleteScenario = async (scenarioId: string) => {
    if (!context) return;
    
    const updatedScenarios = rolePlayingScenarios.filter(s => s.id !== scenarioId);
    await saveRolePlayingScenarios(updatedScenarios);
  };

  const handleEditScenario = (scenario: RolePlayingScenario) => {
    setEditingScenario(scenario);
    setNewScenario({
      title: scenario.title,
      description: scenario.description,
      language: scenario.language,
      difficulty: scenario.difficulty,
      context: scenario.context,
      userRole: scenario.userRole,
      assistantRole: scenario.assistantRole,
      objectives: scenario.objectives.join('\n')
    });
    onAddScenarioOpen();
  };

  const handleCloseScenarioModal = () => {
    setEditingScenario(null);
    setNewScenario({
      title: '',
      description: '',
      language: 'en',
      difficulty: 'beginner',
      context: '',
      userRole: '',
      assistantRole: '',
      objectives: ''
    });
    onAddScenarioClose();
  };

  const startRolePlayingConversation = async (scenario: RolePlayingScenario) => {
    if (!context) return;
    
    try {
      // Update usage count
      const updatedScenario = {
        ...scenario,
        usageCount: scenario.usageCount + 1,
        lastUsed: new Date()
      };
      await updateScenario(updatedScenario);
      
      // Create system prompt for role-playing
      const systemPrompt = `You are practicing ${scenario.language} language learning through role-playing. 

Context: ${scenario.context}

Your role: ${scenario.assistantRole}
User's role: ${scenario.userRole}

Learning objectives:
${scenario.objectives.map(obj => `- ${obj}`).join('\n')}

Please respond in ${scenario.language} at a ${scenario.difficulty} level. Be encouraging and help the user practice the language naturally through this role-playing scenario. Correct any mistakes gently and provide helpful suggestions when appropriate.

Start the conversation by setting the scene and welcoming the user into their role.`;
      
      // Create a new conversation with the role-playing system prompt and scenario details
      const conversationTitle = `Role Play: ${scenario.title}`;
      const conversationDescription = `${scenario.description} - Practice conversation as ${scenario.userRole} with ${scenario.assistantRole}`;
      
      await context.createConversation(systemPrompt, undefined, conversationTitle, conversationDescription);
      
      // Switch to Conversation tab to show the new conversation
      setActiveTab('conversation');
      
      // Start audio streaming for voice conversation
      if (!connected) {
        console.log('Starting audio streaming for role-playing conversation...');
        try {
          await connect();
          console.log('Audio streaming started successfully');
        } catch (error) {
          console.error('Failed to start audio streaming:', error);
          // Show user-friendly error message
          alert('Could not start voice conversation. Please check your microphone permissions and internet connection.');
        }
      } else {
        console.log('Audio streaming already active');
      }
    } catch (error) {
      console.error('Failed to start role-playing conversation:', error);
      alert('Failed to start role-playing conversation. Please try again.');
    }
  };

  const filteredVocabulary = vocabulary.filter(word => 
    word.language === selectedLanguage &&
    (word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
     word.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
     word.category?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStats = () => {
    const languageWords = vocabulary.filter(w => w.language === selectedLanguage);
    const totalWords = languageWords.length;
    const masteredWords = languageWords.filter(w => w.mastery >= 80).length;
    const recentSessions = sessions.filter(s => 
      s.startTime.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    
    return { totalWords, masteredWords, recentSessions };
  };

  const stats = getStats();

  if (!isActive) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-divider">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RiTranslate className="text-2xl text-primary" />
            <h2 className="text-xl font-semibold">Language Learning</h2>
            <div className="text-sm text-default-500 ml-2">English Practice</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalWords}</div>
              <div className="text-sm text-default-500">Total Words</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.masteredWords}</div>
              <div className="text-sm text-default-500">Mastered</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.recentSessions}</div>
              <div className="text-sm text-default-500">Sessions (7d)</div>
            </div>
          </Card>
        </div>

        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="w-full"
        >
          <Tab key="conversation" title="Conversations" />
          <Tab key="roleplaying" title="Role Playing" />
          <Tab key="vocabulary" title="Vocabulary" />
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'conversation' && (
          <div className="h-full">
            <CleanConversationMessages />
          </div>
        )}

        {activeTab === 'roleplaying' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RiGamepadLine className="text-primary" />
                Role Playing Scenarios
              </h3>
              <Button
                color="primary"
                startContent={<RiAddLine />}
                onPress={onAddScenarioOpen}
              >
                Create Scenario
              </Button>
            </div>

            {rolePlayingScenarios.filter(s => s.language === selectedLanguage).length === 0 ? (
              <div className="text-center py-8">
                <RiGamepadLine className="text-4xl text-default-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Loading Role Playing Scenarios</h3>
                <p className="text-default-500 mb-4">
                  Setting up example scenarios for English conversation practice...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rolePlayingScenarios
                  .filter(s => s.language === selectedLanguage)
                  .map((scenario) => (
                    <Card key={scenario.id} className="h-full">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start w-full">
                          <div className="flex-1">
                            <h4 className="font-semibold">{scenario.title}</h4>
                            <p className="text-sm text-default-500 mt-1">{scenario.description}</p>
                          </div>
                          <Chip
                            size="sm"
                            color={DIFFICULTY_COLORS[scenario.difficulty]}
                            variant="flat"
                          >
                            {scenario.difficulty}
                          </Chip>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <div className="space-y-3">
                          <div className="text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <RiUser3Line className="text-primary" />
                              <span className="font-medium">Your Role:</span>
                            </div>
                            <p className="text-default-600 ml-6">{scenario.userRole}</p>
                          </div>
                          
                          <div className="text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <RiRobotLine className="text-secondary" />
                              <span className="font-medium">Assistant Role:</span>
                            </div>
                            <p className="text-default-600 ml-6">{scenario.assistantRole}</p>
                          </div>

                          <div className="text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <RiBookOpenLine className="text-success" />
                              <span className="font-medium">Context:</span>
                            </div>
                            <p className="text-default-600 ml-6">{scenario.context}</p>
                          </div>

                          {scenario.objectives.length > 0 && (
                            <div className="text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <RiStarLine className="text-warning" />
                                <span className="font-medium">Objectives:</span>
                              </div>
                              <ul className="text-default-600 ml-6 list-disc list-inside">
                                {scenario.objectives.map((objective, index) => (
                                  <li key={index}>{objective}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-default-400 pt-2 border-t">
                            <span>Used {scenario.usageCount} times</span>
                            {scenario.lastUsed && (
                              <span>Last used: {scenario.lastUsed.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </CardBody>
                      <CardBody className="pt-0">
                        <div className="flex gap-2">
                          <Button
                            color="primary"
                            variant="solid"
                            startContent={connected ? <RiPlayLine /> : <RiMicLine />}
                            onPress={() => startRolePlayingConversation(scenario)}
                            className="flex-1"
                          >
                            {connected ? 'Start Role Play' : 'Start Voice Role Play'}
                          </Button>
                          <Button
                            variant="light"
                            isIconOnly
                            onPress={() => handleEditScenario(scenario)}
                          >
                            <RiEditLine />
                          </Button>
                          <Button
                            variant="light"
                            color="danger"
                            isIconOnly
                            onPress={() => deleteScenario(scenario.id)}
                          >
                            <RiDeleteBin7Line />
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'vocabulary' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search words..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button
                color="primary"
                startContent={<RiAddLine />}
                onPress={onAddWordOpen}
              >
                Add Word
              </Button>
            </div>

            <Table aria-label="Vocabulary table">
              <TableHeader>
                <TableColumn>Word</TableColumn>
                <TableColumn>Translation</TableColumn>
                <TableColumn>Difficulty</TableColumn>
                <TableColumn>Mastery</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {filteredVocabulary.map((word) => (
                  <TableRow key={word.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{word.word}</div>
                        {word.category && (
                          <Chip size="sm" variant="flat" className="mt-1">
                            {word.category}
                          </Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{word.translation}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={DIFFICULTY_COLORS[word.difficulty]}
                        variant="flat"
                      >
                        {word.difficulty}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={word.mastery}
                          size="sm"
                          className="w-16"
                          color={word.mastery >= 80 ? 'success' : word.mastery >= 50 ? 'warning' : 'danger'}
                        />
                        <span className="text-sm">{word.mastery}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="light"
                          isIconOnly
                          onPress={() => handleEditWord(word)}
                        >
                          <RiEditLine />
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          isIconOnly
                          onPress={() => deleteWord(word.id)}
                        >
                          <RiDeleteBin7Line />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}


      </div>

      {/* Add/Edit Word Modal */}
      <Modal isOpen={isAddWordOpen} onClose={onAddWordClose} size="lg">
        <ModalContent>
          <ModalHeader>
            {editingWord ? 'Edit Word' : 'Add New Word'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Word"
                  value={newWord.word}
                  onChange={(e) => setNewWord(prev => ({ ...prev, word: e.target.value }))}
                  required
                />
                <Input
                  label="Translation"
                  value={newWord.translation}
                  onChange={(e) => setNewWord(prev => ({ ...prev, translation: e.target.value }))}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Language"
                  selectedKeys={[newWord.language]}
                  onSelectionChange={(keys) => setNewWord(prev => ({ ...prev, language: Array.from(keys)[0] as string }))}
                >
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.key}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </Select>
                
                <Select
                  label="Difficulty"
                  selectedKeys={[newWord.difficulty]}
                  onSelectionChange={(keys) => setNewWord(prev => ({ ...prev, difficulty: Array.from(keys)[0] as any }))}
                >
                  <SelectItem key="beginner">Beginner</SelectItem>
                  <SelectItem key="intermediate">Intermediate</SelectItem>
                  <SelectItem key="advanced">Advanced</SelectItem>
                </Select>
              </div>

              <Input
                label="Category (optional)"
                value={newWord.category}
                onChange={(e) => setNewWord(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Food, Travel, Business"
              />
              
              <Textarea
                label="Definition (optional)"
                value={newWord.definition}
                onChange={(e) => setNewWord(prev => ({ ...prev, definition: e.target.value }))}
                placeholder="Enter definition..."
              />
              
              <Textarea
                label="Example (optional)"
                value={newWord.example}
                onChange={(e) => setNewWord(prev => ({ ...prev, example: e.target.value }))}
                placeholder="Enter example sentence..."
              />
              
              <Textarea
                label="Notes (optional)"
                value={newWord.notes}
                onChange={(e) => setNewWord(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Personal notes..."
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onAddWordClose}>
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={editingWord ? () => updateWord({ ...editingWord, ...newWord }) : addWord}
              isDisabled={!newWord.word || !newWord.translation}
            >
              {editingWord ? 'Update' : 'Add'} Word
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add/Edit Role Playing Scenario Modal */}
      <Modal isOpen={isAddScenarioOpen} onClose={handleCloseScenarioModal} size="xl">
        <ModalContent>
          <ModalHeader>
            {editingScenario ? 'Edit Role Playing Scenario' : 'Create New Role Playing Scenario'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
                             <Input
                 label="Title"
                 value={newScenario.title}
                 onChange={(e) => setNewScenario(prev => ({ ...prev, title: e.target.value }))}
                 placeholder="e.g., Restaurant Ordering"
                 required
               />
                             
               <Select
                 label="Difficulty"
                 selectedKeys={[newScenario.difficulty]}
                 onSelectionChange={(keys) => setNewScenario(prev => ({ ...prev, difficulty: Array.from(keys)[0] as any }))}
                 className="w-48"
               >
                 <SelectItem key="beginner">Beginner</SelectItem>
                 <SelectItem key="intermediate">Intermediate</SelectItem>
                 <SelectItem key="advanced">Advanced</SelectItem>
               </Select>

              <Textarea
                label="Description"
                value={newScenario.description}
                onChange={(e) => setNewScenario(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the scenario..."
                required
              />
              
              <Textarea
                label="Context/Situation"
                value={newScenario.context}
                onChange={(e) => setNewScenario(prev => ({ ...prev, context: e.target.value }))}
                placeholder="Describe the setting and situation (e.g., You are at a restaurant and want to order food...)"
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Textarea
                  label="Your Role"
                  value={newScenario.userRole}
                  onChange={(e) => setNewScenario(prev => ({ ...prev, userRole: e.target.value }))}
                  placeholder="What role will you play? (e.g., Customer, Tourist, Student)"
                  required
                />
                <Textarea
                  label="Assistant's Role"
                  value={newScenario.assistantRole}
                  onChange={(e) => setNewScenario(prev => ({ ...prev, assistantRole: e.target.value }))}
                  placeholder="What role will the assistant play? (e.g., Waiter, Hotel clerk, Teacher)"
                  required
                />
              </div>
              
              <Textarea
                label="Learning Objectives"
                value={newScenario.objectives}
                onChange={(e) => setNewScenario(prev => ({ ...prev, objectives: e.target.value }))}
                placeholder="Enter objectives, one per line:&#10;Practice food vocabulary&#10;Learn polite expressions&#10;Improve pronunciation"
                description="Enter each objective on a new line"
              />
            </div>
          </ModalBody>
                     <ModalFooter>
             <Button variant="light" onPress={handleCloseScenarioModal}>
               Cancel
             </Button>
            <Button 
              color="primary" 
              onPress={editingScenario ? () => updateScenario({ ...editingScenario, ...newScenario, objectives: newScenario.objectives.split('\n').filter(obj => obj.trim() !== '') }) : addScenario}
              isDisabled={!newScenario.title || !newScenario.description || !newScenario.context || !newScenario.userRole || !newScenario.assistantRole}
            >
              {editingScenario ? 'Update' : 'Create'} Scenario
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}; 