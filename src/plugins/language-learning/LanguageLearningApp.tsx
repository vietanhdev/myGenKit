import React, { useState, useEffect } from 'react';
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
  Divider,
  Progress,
  Badge,
  Spacer
} from '@heroui/react';
import { 
  RiAddLine, 
  RiDeleteBin7Line, 
  RiEditLine, 
  RiBookOpenLine,
  RiTranslate,
  RiStarLine,
  RiCheckLine,
  RiTimeLine,
  RiBarChartLine,
  RiChat3Line,
  RiCalendarLine
} from 'react-icons/ri';
import { PluginContext } from '../../types';
import CleanConversationMessages from '../../components/side-panel/CleanConversationMessages';

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

interface LanguageLearningAppProps {
  isActive: boolean;
  context?: PluginContext;
}

const LANGUAGES = [
  { key: 'en', label: 'English' },
  // { key: 'es', label: 'Spanish' },
  // { key: 'fr', label: 'French' },
  // { key: 'de', label: 'German' },
  // { key: 'it', label: 'Italian' },
  // { key: 'pt', label: 'Portuguese' },
  // { key: 'ru', label: 'Russian' },
  // { key: 'ja', label: 'Japanese' },
  // { key: 'ko', label: 'Korean' },
  // { key: 'zh', label: 'Chinese' },
];

const DIFFICULTY_COLORS = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger'
} as const;

export const LanguageLearningApp: React.FC<LanguageLearningAppProps> = ({ isActive, context }) => {
  const [vocabulary, setVocabulary] = useState<VocabularyWord[]>([]);
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [activeTab, setActiveTab] = useState<string>('conversation');
  const [searchTerm, setSearchTerm] = useState('');
  
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

  // Load data from plugin storage
  useEffect(() => {
    if (context && isActive) {
      loadVocabulary();
      loadSessions();
    }
  }, [context, isActive]);

  const loadVocabulary = async () => {
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
  };

  const loadSessions = async () => {
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
  };

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
          </div>
          <Select
            size="sm"
            selectedKeys={[selectedLanguage]}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0];
              if (typeof selectedKey === 'string') {
                setSelectedLanguage(selectedKey);
              }
            }}
            className="w-32"
          >
            {LANGUAGES.map(lang => (
              <SelectItem key={lang.key}>
                {lang.label}
              </SelectItem>
            ))}
          </Select>
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
          <Tab key="calendar" title="Learning Calendar" />
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

        {activeTab === 'calendar' && (
          <div className="text-center py-8">
            <RiCalendarLine className="text-4xl text-default-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Learning Calendar</h3>
            <p className="text-default-500 mb-4">
              Track your language learning progress over time
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <Card>
                <CardHeader>
                  <h4 className="font-semibold">This Week</h4>
                </CardHeader>
                <CardBody>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">5</div>
                    <div className="text-sm text-default-500">Study Sessions</div>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h4 className="font-semibold">Streak</h4>
                </CardHeader>
                <CardBody>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">12</div>
                    <div className="text-sm text-default-500">Days</div>
                  </div>
                </CardBody>
              </Card>
            </div>
            <p className="text-sm text-default-400 mt-4">
              Calendar view coming soon
            </p>
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
    </div>
  );
}; 