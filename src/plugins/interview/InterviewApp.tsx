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
  Tab
} from '@heroui/react';
import { 
  RiAddLine, 
  RiDeleteBin7Line, 
  RiEditLine, 
  RiUserSearchLine,
  RiQuestionLine,
  RiPlayLine,
  RiTimeLine,
  RiGroupLine,
  RiFileListLine,
  RiMicLine,
  RiUserLine
} from 'react-icons/ri';
import { PluginContext } from '../../types';
import CleanConversationMessages from '../../components/side-panel/CleanConversationMessages';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational' | 'experience' | 'culture-fit' | 'problem-solving' | 'leadership' | 'communication';
  difficulty: 'entry' | 'mid' | 'senior' | 'executive';
  department: string;
  tags: string[];
  followUp: string;
  idealAnswer: string;
  dateAdded: Date;
  usageCount: number;
}

interface InterviewRound {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  questionCategories: string[];
  difficulty: 'entry' | 'mid' | 'senior' | 'executive';
  questionCount: number;
  interviewerRole: string;
  dateCreated: Date;
  usageCount: number;
  // New fields for interview focus
  focusType: 'cv' | 'domain' | 'techniques';
  cvContent?: string; // For CV-based interviews
  domains?: string[]; // For domain-based interviews
  techniques?: string[]; // For techniques-based interviews
  // Position and job description
  position?: string; // Target position (e.g., "AI Engineer", "Backend Engineer")
  jobDescription?: string; // Job description details
}

interface InterviewSession {
  id: string;
  roundId: string;
  startTime: Date;
  endTime?: Date;
  questionsAsked: string[];
  status: 'in-progress' | 'completed' | 'cancelled';
  feedback?: string;
}

interface InterviewAppProps {
  isActive: boolean;
  context?: PluginContext;
}

const CATEGORIES = [
  { key: 'technical', label: 'Technical', color: 'primary' as const },
  { key: 'behavioral', label: 'Behavioral', color: 'secondary' as const },
  { key: 'situational', label: 'Situational', color: 'success' as const },
  { key: 'experience', label: 'Experience', color: 'warning' as const },
  { key: 'culture-fit', label: 'Culture Fit', color: 'danger' as const },
  { key: 'problem-solving', label: 'Problem Solving', color: 'default' as const },
  { key: 'leadership', label: 'Leadership', color: 'secondary' as const },
  { key: 'communication', label: 'Communication', color: 'primary' as const }
];

const DIFFICULTY_COLORS = {
  entry: 'success',
  mid: 'warning',
  senior: 'danger',
  executive: 'secondary'
} as const;

const DIFFICULTY_LABELS = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior Level',
  executive: 'Executive Level'
} as const;

export const InterviewApp: React.FC<InterviewAppProps> = ({ isActive, context }) => {
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [activeTab, setActiveTab] = useState<string>('interview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  
  // Access to LiveAPI for audio streaming
  const { connect, connected } = useLiveAPIContext();
  
  // Add/Edit Question Modal
  const { isOpen: isAddQuestionOpen, onOpen: onAddQuestionOpen, onClose: onAddQuestionClose } = useDisclosure();
  const [editingQuestion, setEditingQuestion] = useState<InterviewQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState<{
    question: string;
    category: string;
    difficulty: string;
    department: string;
    tags: string;
    followUp: string;
    idealAnswer: string;
  }>({
    question: '',
    category: 'technical',
    difficulty: 'entry',
    department: '',
    tags: '',
    followUp: '',
    idealAnswer: ''
  });

  // Add/Edit Round Modal
  const { isOpen: isAddRoundOpen, onOpen: onAddRoundOpen, onClose: onAddRoundClose } = useDisclosure();
  const [editingRound, setEditingRound] = useState<InterviewRound | null>(null);
  const [newRound, setNewRound] = useState<{
    name: string;
    description: string;
    duration: number;
    questionCategories: string[];
    difficulty: string;
    questionCount: number;
    interviewerRole: string;
    focusType: string;
    cvContent: string;
    domains: string;
    techniques: string;
    position: string;
    jobDescription: string;
  }>({
    name: '',
    description: '',
    duration: 60,
    questionCategories: [],
    difficulty: 'entry',
    questionCount: 5,
    interviewerRole: '',
    focusType: 'cv',
    cvContent: '',
    domains: '',
    techniques: '',
    position: '',
    jobDescription: ''
  });

  const loadQuestions = useCallback(async () => {
    if (!context) return;
    
    try {
      const savedQuestions = await context.storage.get('questions');
      if (savedQuestions) {
        setQuestions(savedQuestions.map((q: any) => ({
          ...q,
          dateAdded: new Date(q.dateAdded)
        })));
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  }, [context]);

  const loadRounds = useCallback(async () => {
    if (!context) return;
    
    try {
      const savedRounds = await context.storage.get('interviewRounds');
      if (savedRounds) {
        setRounds(savedRounds.map((r: any) => ({
          ...r,
          dateCreated: new Date(r.dateCreated)
        })));
      }
    } catch (error) {
      console.error('Failed to load rounds:', error);
    }
  }, [context]);

  const loadSessions = useCallback(async () => {
    if (!context) return;
    
    try {
      const savedSessions = await context.storage.get('interviewSessions');
      if (savedSessions) {
        setSessions(savedSessions.map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : undefined
        })));
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, [context]);

  // Load data from plugin storage
  useEffect(() => {
    if (context && isActive) {
      loadQuestions();
      loadRounds();
      loadSessions();
    }
  }, [context, isActive, loadQuestions, loadRounds, loadSessions]);

  const saveQuestions = async (newQuestions: InterviewQuestion[]) => {
    if (!context) return;
    
    try {
      await context.storage.set('questions', newQuestions);
      setQuestions(newQuestions);
    } catch (error) {
      console.error('Failed to save questions:', error);
    }
  };

  const saveRounds = async (newRounds: InterviewRound[]) => {
    if (!context) return;
    
    try {
      await context.storage.set('interviewRounds', newRounds);
      setRounds(newRounds);
    } catch (error) {
      console.error('Failed to save rounds:', error);
    }
  };

  const addQuestion = async () => {
    if (!context) return;
    
    const question: InterviewQuestion = {
      id: editingQuestion?.id || Date.now().toString(),
      question: newQuestion.question,
      category: newQuestion.category as any,
      difficulty: newQuestion.difficulty as any,
      department: newQuestion.department,
      tags: newQuestion.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      followUp: newQuestion.followUp,
      idealAnswer: newQuestion.idealAnswer,
      dateAdded: editingQuestion?.dateAdded || new Date(),
      usageCount: editingQuestion?.usageCount || 0
    };
    
    const updatedQuestions = editingQuestion 
      ? questions.map(q => q.id === editingQuestion.id ? question : q)
      : [...questions, question];
    
    await saveQuestions(updatedQuestions);
    
    // Reset form
    setNewQuestion({
      question: '',
      category: 'technical',
      difficulty: 'entry',
      department: '',
      tags: '',
      followUp: '',
      idealAnswer: ''
    });
    setEditingQuestion(null);
    onAddQuestionClose();
  };

  const deleteQuestion = async (questionId: string) => {
    if (!context) return;
    
    const updatedQuestions = questions.filter(q => q.id !== questionId);
    await saveQuestions(updatedQuestions);
  };

  const handleEditQuestion = (question: InterviewQuestion) => {
    setEditingQuestion(question);
    setNewQuestion({
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,
      department: question.department,
      tags: question.tags.join(', '),
      followUp: question.followUp,
      idealAnswer: question.idealAnswer
    });
    onAddQuestionOpen();
  };

  const addRound = async () => {
    if (!context) return;
    
    const round: InterviewRound = {
      id: editingRound?.id || Date.now().toString(),
      name: newRound.name,
      description: newRound.description,
      duration: newRound.duration,
      questionCategories: newRound.questionCategories,
      difficulty: newRound.difficulty as any,
      questionCount: newRound.questionCount,
      interviewerRole: newRound.interviewerRole,
      dateCreated: editingRound?.dateCreated || new Date(),
      usageCount: editingRound?.usageCount || 0,
      focusType: newRound.focusType as any,
      cvContent: newRound.cvContent,
      domains: newRound.domains ? newRound.domains.split(',').map(d => d.trim()).filter(d => d) : undefined,
      techniques: newRound.techniques ? newRound.techniques.split(',').map(t => t.trim()).filter(t => t) : undefined,
      position: newRound.position || undefined,
      jobDescription: newRound.jobDescription || undefined
    };
    
    const updatedRounds = editingRound 
      ? rounds.map(r => r.id === editingRound.id ? round : r)
      : [...rounds, round];
    
    await saveRounds(updatedRounds);
    
    // Reset form
    setNewRound({
      name: '',
      description: '',
      duration: 60,
      questionCategories: [],
      difficulty: 'entry',
      questionCount: 5,
      interviewerRole: '',
      focusType: 'cv',
      cvContent: '',
      domains: '',
      techniques: '',
      position: '',
      jobDescription: ''
    });
    setEditingRound(null);
    onAddRoundClose();
  };

  const deleteRound = async (roundId: string) => {
    if (!context) return;
    
    const updatedRounds = rounds.filter(r => r.id !== roundId);
    await saveRounds(updatedRounds);
  };

  const handleEditRound = (round: InterviewRound) => {
    setEditingRound(round);
    setNewRound({
      name: round.name,
      description: round.description,
      duration: round.duration,
      questionCategories: round.questionCategories,
      difficulty: round.difficulty,
      questionCount: round.questionCount,
      interviewerRole: round.interviewerRole,
      focusType: round.focusType,
      cvContent: round.cvContent || '',
      domains: round.domains?.join(', ') || '',
      techniques: round.techniques?.join(', ') || '',
      position: round.position || '',
      jobDescription: round.jobDescription || ''
    });
    onAddRoundOpen();
  };

  const startInterview = async (round: InterviewRound) => {
    if (!context) return;
    
    try {
      // Update round usage count
      const updatedRound = {
        ...round,
        usageCount: round.usageCount + 1
      };
      const updatedRounds = rounds.map(r => r.id === round.id ? updatedRound : r);
      await saveRounds(updatedRounds);
      
      // Create interview session
      const session: InterviewSession = {
        id: Date.now().toString(),
        roundId: round.id,
        startTime: new Date(),
        questionsAsked: [],
        status: 'in-progress'
      };
      
      const updatedSessions = [...sessions, session];
      await context.storage.set('interviewSessions', updatedSessions);
      setSessions(updatedSessions);
      
      // Create system prompt for the interview
      let focusSection = '';
      
      if (round.focusType === 'cv' && round.cvContent) {
        focusSection = `
Candidate's CV Information:
${round.cvContent}

IMPORTANT: Base your questions on the candidate's actual experience, skills, and career progression mentioned in their CV. Ask about specific projects, technologies, and accomplishments listed. Probe deeper into their roles and responsibilities.`;
      } else if (round.focusType === 'domain' && round.domains && round.domains.length > 0) {
        focusSection = `
Business Domain Focus: ${round.domains.join(', ')}

IMPORTANT: Focus questions on domain-specific challenges, industry knowledge, business logic, and real-world applications in these domains. Ask about scaling challenges, regulatory requirements, and domain-specific technical decisions.`;
      } else if (round.focusType === 'techniques' && round.techniques && round.techniques.length > 0) {
        focusSection = `
Technical Focus Areas: ${round.techniques.join(', ')}

IMPORTANT: Deep-dive into the candidate's expertise with these specific technologies and techniques. Ask about implementation details, best practices, performance considerations, and real-world usage scenarios.`;
      }

      // Add position and job description information
      let positionSection = '';
      if (round.position) {
        positionSection = `
Target Position: ${round.position}`;
        
        if (round.jobDescription) {
          positionSection += `

Job Description:
${round.jobDescription}

IMPORTANT: Tailor your questions to assess the candidate's fit for this specific role. Focus on the skills, experience, and qualifications mentioned in the job description. Ask about their experience with similar responsibilities and how they would approach the challenges described in the JD.`;
        } else {
          positionSection += `

IMPORTANT: Focus your questions on skills and experience relevant to the ${round.position} role. Ask about technical competencies, relevant experience, and problem-solving approaches typical for this position.`;
        }
      }

      const systemPrompt = `You are conducting a ${round.name} interview round. 

Round Details:
- Duration: ${round.duration} minutes
- Your Role: ${round.interviewerRole}
- Question Categories: ${round.questionCategories.join(', ')}
- Difficulty Level: ${DIFFICULTY_LABELS[round.difficulty]}
- Target Questions: ${round.questionCount}

Description: ${round.description}${focusSection}${positionSection}

Interview Instructions:
1. Start by introducing yourself as the ${round.interviewerRole}
2. Explain the format and duration of the interview
3. Ask questions from the specified categories at the appropriate difficulty level
4. Listen carefully to responses and ask relevant follow-up questions
5. Provide constructive feedback using the STAR method (Situation, Task, Action, Result)
6. Maintain a professional but friendly demeanor
7. Help the candidate improve their answers when needed
8. Wrap up the interview within the time limit

Remember to:
- Ask behavioral questions that can be answered using STAR method
- Probe deeper on technical topics when appropriate
- Assess both technical competency and cultural fit
- Give specific, actionable feedback
- Encourage detailed responses that demonstrate experience

Begin the interview now by introducing yourself and setting expectations.`;
      
      // Create a new conversation with the interview system prompt
      const conversationTitle = `${round.name} - Mock Interview`;
      const conversationDescription = `Mock interview session: ${round.description}`;
      
      await context.createConversation(systemPrompt, undefined, conversationTitle, conversationDescription);
      
      // Switch to Interview tab to show the conversation
      setActiveTab('interview');
      
      // Start audio streaming for voice interview
      if (!connected) {
        console.log('Starting audio streaming for interview...');
        try {
          await connect();
          console.log('Audio streaming started successfully');
        } catch (error) {
          console.error('Failed to start audio streaming:', error);
          alert('Could not start voice interview. Please check your microphone permissions and internet connection.');
        }
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      alert('Failed to start interview session. Please try again.');
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         question.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || question.category === filterCategory;
    const matchesDifficulty = !filterDifficulty || question.difficulty === filterDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getStats = () => {
    const totalQuestions = questions.length;
    const totalRounds = rounds.length;
    const recentSessions = sessions.filter(s => 
      s.startTime.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    
    return { totalQuestions, totalRounds, recentSessions, completedSessions };
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
            <RiUserSearchLine className="text-2xl text-primary" />
            <h2 className="text-xl font-semibold">Interview Practice</h2>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalQuestions}</div>
              <div className="text-sm text-default-500">Questions</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">{stats.totalRounds}</div>
              <div className="text-sm text-default-500">Rounds</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.completedSessions}</div>
              <div className="text-sm text-default-500">Completed</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.recentSessions}</div>
              <div className="text-sm text-default-500">Recent (7d)</div>
            </div>
          </Card>
        </div>

        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          className="w-full"
        >
          <Tab key="interview" title="Interview" />
          <Tab key="rounds" title="Rounds" />
          <Tab key="questions" title="Question Bank" />
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'interview' && (
          <div className="h-full">
            <CleanConversationMessages />
          </div>
        )}

        {activeTab === 'rounds' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RiGroupLine className="text-primary" />
                Interview Rounds
              </h3>
              <Button
                color="primary"
                startContent={<RiAddLine />}
                onPress={onAddRoundOpen}
              >
                Create Round
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {rounds.map((round) => (
                <Card key={round.id} className="h-full">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start w-full">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{round.name}</h4>
                        <p className="text-sm text-default-500 mt-1">{round.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Chip
                          size="sm"
                          color={DIFFICULTY_COLORS[round.difficulty]}
                          variant="flat"
                        >
                          {DIFFICULTY_LABELS[round.difficulty]}
                        </Chip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="pt-0">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <RiTimeLine className="text-primary" />
                          <span>{round.duration} minutes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <RiQuestionLine className="text-secondary" />
                          <span>{round.questionCount} questions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <RiUserLine className="text-success" />
                          <span>{round.interviewerRole}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <RiPlayLine className="text-warning" />
                          <span>Used {round.usageCount} times</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2">Question Categories:</div>
                        <div className="flex flex-wrap gap-1">
                          {round.questionCategories.map((category) => {
                            const categoryInfo = CATEGORIES.find(c => c.key === category);
                            return (
                              <Chip
                                key={category}
                                size="sm"
                                color={categoryInfo?.color || 'default'}
                                variant="flat"
                              >
                                {categoryInfo?.label || category}
                              </Chip>
                            );
                          })}
                        </div>
                      </div>

                      {/* Focus Type Information */}
                      <div>
                        <div className="text-sm font-medium mb-2">Interview Focus:</div>
                        <div className="space-y-2">
                          <Chip
                            size="sm"
                            color={round.focusType === 'cv' ? 'primary' : round.focusType === 'domain' ? 'secondary' : 'success'}
                            variant="flat"
                          >
                            {round.focusType === 'cv' ? '📄 CV-based' : 
                             round.focusType === 'domain' ? '🏢 Domain-based' : 
                             '⚡ Techniques-based'}
                          </Chip>
                          
                          {round.focusType === 'cv' && round.cvContent && (
                            <div className="text-xs text-default-600 bg-default-100 p-2 rounded">
                              CV provided - Questions will be personalized based on candidate's experience
                            </div>
                          )}
                          
                          {round.focusType === 'domain' && round.domains && round.domains.length > 0 && (
                            <div className="text-xs text-default-600">
                              <span className="font-medium">Domains:</span> {round.domains.join(', ')}
                            </div>
                          )}
                          
                          {round.focusType === 'techniques' && round.techniques && round.techniques.length > 0 && (
                            <div className="text-xs text-default-600">
                              <span className="font-medium">Technologies:</span> {round.techniques.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                  <CardBody className="pt-0">
                    <div className="flex gap-2">
                      <Button
                        color="primary"
                        variant="solid"
                        startContent={connected ? <RiPlayLine /> : <RiMicLine />}
                        onPress={() => startInterview(round)}
                        className="flex-1"
                      >
                        {connected ? 'Start Interview' : 'Start Voice Interview'}
                      </Button>
                      <Button
                        variant="light"
                        isIconOnly
                        onPress={() => handleEditRound(round)}
                      >
                        <RiEditLine />
                      </Button>
                      <Button
                        variant="light"
                        color="danger"
                        isIconOnly
                        onPress={() => deleteRound(round.id)}
                      >
                        <RiDeleteBin7Line />
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RiFileListLine className="text-primary" />
                Question Bank
              </h3>
              <Button
                color="primary"
                startContent={<RiAddLine />}
                onPress={onAddQuestionOpen}
              >
                Add Question
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-64"
              />
              <Select
                placeholder="Category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-48"
              >
                <SelectItem key="">All Categories</SelectItem>
                <SelectItem key="technical">Technical</SelectItem>
                <SelectItem key="behavioral">Behavioral</SelectItem>
                <SelectItem key="situational">Situational</SelectItem>
                <SelectItem key="experience">Experience</SelectItem>
                <SelectItem key="culture-fit">Culture Fit</SelectItem>
                <SelectItem key="problem-solving">Problem Solving</SelectItem>
                <SelectItem key="leadership">Leadership</SelectItem>
                <SelectItem key="communication">Communication</SelectItem>
              </Select>
              <Select
                placeholder="Difficulty"
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="w-48"
              >
                <SelectItem key="">All Levels</SelectItem>
                <SelectItem key="entry">Entry Level</SelectItem>
                <SelectItem key="mid">Mid Level</SelectItem>
                <SelectItem key="senior">Senior Level</SelectItem>
                <SelectItem key="executive">Executive Level</SelectItem>
              </Select>
            </div>

            <Table aria-label="Questions table">
              <TableHeader>
                <TableColumn>Question</TableColumn>
                <TableColumn>Category</TableColumn>
                <TableColumn>Difficulty</TableColumn>
                <TableColumn>Department</TableColumn>
                <TableColumn>Usage</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => {
                  const categoryInfo = CATEGORIES.find(c => c.key === question.category);
                  return (
                    <TableRow key={question.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <div className="font-medium text-sm">{question.question}</div>
                          {question.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {question.tags.slice(0, 3).map((tag, index) => (
                                <Chip key={index} size="sm" variant="flat" className="text-xs">
                                  {tag}
                                </Chip>
                              ))}
                              {question.tags.length > 3 && (
                                <Chip size="sm" variant="flat" className="text-xs">
                                  +{question.tags.length - 3}
                                </Chip>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={categoryInfo?.color || 'default'}
                          variant="flat"
                        >
                          {categoryInfo?.label || question.category}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={DIFFICULTY_COLORS[question.difficulty]}
                          variant="flat"
                        >
                          {DIFFICULTY_LABELS[question.difficulty]}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-default-600">
                          {question.department || 'General'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-default-600">
                          {question.usageCount} times
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="light"
                            isIconOnly
                            onPress={() => handleEditQuestion(question)}
                          >
                            <RiEditLine />
                          </Button>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            isIconOnly
                            onPress={() => deleteQuestion(question.id)}
                          >
                            <RiDeleteBin7Line />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add/Edit Question Modal */}
      <Modal isOpen={isAddQuestionOpen} onClose={onAddQuestionClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            {editingQuestion ? 'Edit Question' : 'Add New Question'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Textarea
                label="Question"
                value={newQuestion.question}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Enter the interview question..."
                required
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Category"
                  selectedKeys={[newQuestion.category]}
                  onSelectionChange={(keys) => setNewQuestion(prev => ({ ...prev, category: Array.from(keys)[0] as string }))}
                >
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </Select>
                
                <Select
                  label="Difficulty"
                  selectedKeys={[newQuestion.difficulty]}
                  onSelectionChange={(keys) => setNewQuestion(prev => ({ ...prev, difficulty: Array.from(keys)[0] as string }))}
                >
                  <SelectItem key="entry">Entry Level</SelectItem>
                  <SelectItem key="mid">Mid Level</SelectItem>
                  <SelectItem key="senior">Senior Level</SelectItem>
                  <SelectItem key="executive">Executive Level</SelectItem>
                </Select>
              </div>

              <Input
                label="Department (optional)"
                value={newQuestion.department}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Software Engineering, Sales, Marketing"
              />
              
              <Input
                label="Tags (optional)"
                value={newQuestion.tags}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Comma-separated tags (e.g., javascript, react, frontend)"
              />
              
              <Textarea
                label="Follow-up Questions (optional)"
                value={newQuestion.followUp}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, followUp: e.target.value }))}
                placeholder="Additional questions to ask based on the answer..."
              />
              
              <Textarea
                label="Ideal Answer (optional)"
                value={newQuestion.idealAnswer}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, idealAnswer: e.target.value }))}
                placeholder="Key points that should be covered in a good answer..."
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onAddQuestionClose}>
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={addQuestion}
              isDisabled={!newQuestion.question}
            >
              {editingQuestion ? 'Update' : 'Add'} Question
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add/Edit Round Modal */}
      <Modal isOpen={isAddRoundOpen} onClose={onAddRoundClose} size="xl">
        <ModalContent>
          <ModalHeader>
            {editingRound ? 'Edit Interview Round' : 'Create New Interview Round'}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Round Name"
                value={newRound.name}
                onChange={(e) => setNewRound(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Technical Interview, HR Screening"
                required
              />
              
              <Textarea
                label="Description"
                value={newRound.description}
                onChange={(e) => setNewRound(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this interview round..."
              />
              
              <div className="grid grid-cols-3 gap-4">
                <Input
                  type="number"
                  label="Duration (minutes)"
                  value={newRound.duration.toString()}
                  onChange={(e) => setNewRound(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                  min={15}
                  max={180}
                />
                
                <Input
                  type="number"
                  label="Question Count"
                  value={newRound.questionCount.toString()}
                  onChange={(e) => setNewRound(prev => ({ ...prev, questionCount: parseInt(e.target.value) || 5 }))}
                  min={1}
                  max={20}
                />
                
                <Select
                  label="Difficulty Level"
                  selectedKeys={[newRound.difficulty]}
                  onSelectionChange={(keys) => setNewRound(prev => ({ ...prev, difficulty: Array.from(keys)[0] as string }))}
                >
                  <SelectItem key="entry">Entry Level</SelectItem>
                  <SelectItem key="mid">Mid Level</SelectItem>
                  <SelectItem key="senior">Senior Level</SelectItem>
                  <SelectItem key="executive">Executive Level</SelectItem>
                </Select>
              </div>
              
              <Input
                label="Interviewer Role"
                value={newRound.interviewerRole}
                onChange={(e) => setNewRound(prev => ({ ...prev, interviewerRole: e.target.value }))}
                placeholder="e.g., Senior Software Engineer, HR Manager"
                required
              />

              {/* Position and Job Description */}
              <div className="space-y-4 p-4 bg-default-50 rounded-lg">
                <div className="text-sm font-medium">Position Information</div>
                
                <Input
                  label="Target Position (optional)"
                  value={newRound.position}
                  onChange={(e) => setNewRound(prev => ({ ...prev, position: e.target.value }))}
                  placeholder="e.g., AI Engineer, Backend Engineer, Full Stack Developer"
                />
                
                <Textarea
                  label="Job Description (optional)"
                  value={newRound.jobDescription}
                  onChange={(e) => setNewRound(prev => ({ ...prev, jobDescription: e.target.value }))}
                  placeholder="Paste the job description here to make questions more targeted to the role requirements..."
                  minRows={4}
                  maxRows={8}
                />
                <p className="text-xs text-default-500">
                  Adding a job description will make the AI tailor questions specifically to assess fit for this role and its requirements.
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Question Categories</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((category) => (
                    <label key={category.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newRound.questionCategories.includes(category.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRound(prev => ({
                              ...prev,
                              questionCategories: [...prev.questionCategories, category.key]
                            }));
                          } else {
                            setNewRound(prev => ({
                              ...prev,
                              questionCategories: prev.questionCategories.filter(c => c !== category.key)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{category.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Interview Focus Configuration */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Interview Focus</label>
                  <Select
                    selectedKeys={[newRound.focusType]}
                    onSelectionChange={(keys) => setNewRound(prev => ({ ...prev, focusType: Array.from(keys)[0] as string }))}
                    placeholder="Select interview focus type"
                  >
                    <SelectItem key="cv">CV-based (Upload your CV for personalized questions)</SelectItem>
                    <SelectItem key="domain">Domain-based (Focus on specific business domains)</SelectItem>
                    <SelectItem key="techniques">Techniques-based (Focus on specific technologies/skills)</SelectItem>
                  </Select>
                </div>

                {newRound.focusType === 'cv' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Upload Your CV</label>
                    <Textarea
                      value={newRound.cvContent}
                      onChange={(e) => setNewRound(prev => ({ ...prev, cvContent: e.target.value }))}
                      placeholder="Paste your CV content here, or upload a file..."
                      minRows={6}
                      maxRows={12}
                    />
                    <p className="text-xs text-default-500 mt-1">
                      The AI will generate questions based on your experience, skills, and career progression mentioned in your CV.
                    </p>
                  </div>
                )}

                {newRound.focusType === 'domain' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Business Domains</label>
                    <Input
                      value={newRound.domains}
                      onChange={(e) => setNewRound(prev => ({ ...prev, domains: e.target.value }))}
                      placeholder="e.g., E-commerce, FinTech, Healthcare, Gaming, SaaS"
                    />
                    <p className="text-xs text-default-500 mt-1">
                      Comma-separated list of business domains. Questions will focus on domain-specific challenges and solutions.
                    </p>
                  </div>
                )}

                {newRound.focusType === 'techniques' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Technologies & Techniques</label>
                    <Textarea
                      value={newRound.techniques}
                      onChange={(e) => setNewRound(prev => ({ ...prev, techniques: e.target.value }))}
                      placeholder="e.g., React, Node.js, Python, Machine Learning, Docker, Kubernetes, AWS, System Design"
                      minRows={3}
                    />
                    <p className="text-xs text-default-500 mt-1">
                      Comma-separated list of technologies, frameworks, and techniques. Questions will test your expertise in these areas.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onAddRoundClose}>
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={addRound}
              isDisabled={!newRound.name || !newRound.interviewerRole || newRound.questionCategories.length === 0}
            >
              {editingRound ? 'Update' : 'Create'} Round
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}; 