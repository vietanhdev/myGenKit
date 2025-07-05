import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Switch,
  Card,
  CardBody,
  Chip,
  Select,
  SelectItem
} from '@heroui/react';
import { RiCalendarEventLine, RiMagicLine, RiTimeLine, RiFileTextLine, RiSpeakLine, RiInformationLine } from 'react-icons/ri';
import { useCalendarStore } from '../../lib/store-calendar';
import { CalendarEvent } from '../../types';

interface EditEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateEvent: (eventId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'lastModified'>>) => void;
  isLoading: boolean;
  eventId: string;
}

const PRESET_PROMPTS = [
  {
    name: 'Brainstorming Session',
    prompt: 'You are a creative brainstorming partner. Help me generate innovative ideas, explore different perspectives, and think outside the box. Ask thought-provoking questions and encourage creative thinking.',
    icon: '💡'
  },
  {
    name: 'Code Review',
    prompt: 'You are an expert code reviewer. Help me review code for best practices, potential bugs, performance issues, and maintainability. Provide constructive feedback and suggest improvements.',
    icon: '👨‍💻'
  },
  {
    name: 'Learning Session',
    prompt: 'You are a patient and knowledgeable tutor. Help me learn new concepts by explaining things clearly, providing examples, and testing my understanding through questions.',
    icon: '📚'
  },
  {
    name: 'Problem Solving',
    prompt: 'You are a systematic problem solver. Help me break down complex problems into manageable parts, analyze different approaches, and find effective solutions.',
    icon: '🔍'
  },
  {
    name: 'Writing Assistant',
    prompt: 'You are a skilled writing assistant. Help me improve my writing by providing feedback on structure, clarity, grammar, and style. Suggest improvements and help refine my ideas.',
    icon: '✍️'
  },
  {
    name: 'Daily Standup',
    prompt: 'You are a project manager conducting a daily standup. Ask about yesterday\'s progress, today\'s plans, and any blockers. Keep the conversation focused and productive.',
    icon: '📊'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'primary';
    case 'in-progress':
      return 'warning';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'default';
  }
};

export const EditEventDialog: React.FC<EditEventDialogProps> = ({
  isOpen,
  onClose,
  onUpdateEvent,
  isLoading,
  eventId
}) => {
  const { loadEvent } = useCalendarStore();
  
  const [currentEvent, setCurrentEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [useDefaultPrompt, setUseDefaultPrompt] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [status, setStatus] = useState<'scheduled' | 'in-progress' | 'completed' | 'cancelled'>('scheduled');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [eventLoading, setEventLoading] = useState(false);

  // Load event data when dialog opens
  useEffect(() => {
    if (isOpen && eventId) {
      const loadEventData = async () => {
        setEventLoading(true);
        try {
          const event = await loadEvent(eventId);
          if (event) {
            setCurrentEvent(event);
            setTitle(event.title);
            setDescription(event.description || '');
            setSystemPrompt(event.systemPrompt || '');
            setUseDefaultPrompt(!event.systemPrompt);
            setIsAllDay(event.isAllDay || false);
            setStatus(event.status);
            
            // Set date and time
            setStartDate(event.startTime.toISOString().split('T')[0]);
            setEndDate(event.endTime.toISOString().split('T')[0]);
            setStartTime(event.startTime.toTimeString().slice(0, 5));
            setEndTime(event.endTime.toTimeString().slice(0, 5));
            
            // Check if system prompt matches a preset
            const matchingPreset = PRESET_PROMPTS.find(p => p.prompt === event.systemPrompt);
            if (matchingPreset) {
              setSelectedPreset(matchingPreset.name);
            }
          }
        } catch (error) {
          console.error('Failed to load event:', error);
        } finally {
          setEventLoading(false);
        }
      };
      
      loadEventData();
    }
  }, [isOpen, eventId, loadEvent]);

  const handlePresetSelect = (presetName: string) => {
    const preset = PRESET_PROMPTS.find(p => p.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      setSystemPrompt(preset.prompt);
      setUseDefaultPrompt(false);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    let startDateTime: Date | undefined;
    let endDateTime: Date | undefined;

    if (!isAllDay) {
      startDateTime = new Date(`${startDate}T${startTime}`);
      endDateTime = new Date(`${endDate}T${endTime}`);
    } else {
      startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
    }

    const finalSystemPrompt = useDefaultPrompt ? undefined : systemPrompt.trim() || undefined;

    const updates = {
      title: title.trim(),
      description: description.trim() || undefined,
      systemPrompt: finalSystemPrompt,
      startTime: startDateTime,
      endTime: endDateTime,
      isAllDay,
      status
    };

    onUpdateEvent(eventId, updates);
  };

  const handleClose = () => {
    setCurrentEvent(null);
    setTitle('');
    setDescription('');
    setSystemPrompt('');
    setUseDefaultPrompt(true);
    setSelectedPreset('');
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (eventLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalContent>
          <ModalBody className="p-8">
            <div className="text-center">
              <div className="text-sm text-default-500">Loading event...</div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  if (!currentEvent) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose}>
        <ModalContent>
          <ModalBody className="p-8">
            <div className="text-center">
              <div className="text-sm text-danger-500">Failed to load event</div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="3xl"
      scrollBehavior="inside"
      backdrop="opaque"
    >
      <ModalContent>
        <ModalHeader className="pb-2">
          <div className="flex items-center gap-2">
            <RiCalendarEventLine size={24} className="text-primary" />
            <div>
              <h2 className="text-xl font-bold">Edit Event</h2>
              <p className="text-xs text-default-500">
                Modify your scheduled AI conversation
              </p>
            </div>
          </div>
        </ModalHeader>
        
        <ModalBody className="gap-4 py-4">
          {/* Event Info */}
          <Card className="bg-default-50 border-default-200">
            <CardBody className="p-4">
              <div className="flex items-start gap-3">
                <RiInformationLine size={20} className="text-default-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-default-800 font-bold mb-1">Event Information</h3>
                  <div className="space-y-1 text-xs text-default-600">
                    <p>Created: {formatDate(currentEvent.createdAt)}</p>
                    <p>Last Modified: {formatDate(currentEvent.lastModified)}</p>
                    <div className="flex items-center gap-2">
                      <span>Status:</span>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={getStatusColor(currentEvent.status)}
                        className="text-xs"
                      >
                        {currentEvent.status}
                      </Chip>
                    </div>
                    {currentEvent.conversationId && (
                      <p>Linked to conversation: {currentEvent.conversationId}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Basic Details */}
          <div className="space-y-3">
            <div>
              <h3 className="font-bold pb-2">Event Details</h3>
              <p className="text-xs text-default-500 pb-2">Basic information about your scheduled conversation</p>
            </div>
            
            <Input
              label="Event Title"
              placeholder="e.g., Code Review Session, Creative Writing Time"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="bordered"
              size="sm"
              isRequired
                             startContent={<RiFileTextLine size={16} className="text-default-400" />}
            />

            <Textarea
              label="Description (Optional)"
              placeholder="What do you want to discuss or work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              variant="bordered"
              size="sm"
              minRows={2}
              maxRows={4}
            />

            <Select
              label="Status"
              selectedKeys={[status]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setStatus(selected as 'scheduled' | 'in-progress' | 'completed' | 'cancelled');
              }}
              variant="bordered"
              size="sm"
            >
              <SelectItem key="scheduled">Scheduled</SelectItem>
              <SelectItem key="in-progress">In Progress</SelectItem>
              <SelectItem key="completed">Completed</SelectItem>
              <SelectItem key="cancelled">Cancelled</SelectItem>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div>
              <h3 className="font-bold pb-2">Schedule</h3>
              <p className="text-xs text-default-500 pb-2">When would you like to have this conversation?</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                isSelected={isAllDay}
                onValueChange={setIsAllDay}
              >
                All day
              </Switch>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                variant="bordered"
                size="sm"
                isRequired
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                variant="bordered"
                size="sm"
                isRequired
              />
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  variant="bordered"
                  size="sm"
                  isRequired
                  startContent={<RiTimeLine size={16} className="text-default-400" />}
                />
                <Input
                  label="End Time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  variant="bordered"
                  size="sm"
                  isRequired
                  startContent={<RiTimeLine size={16} className="text-default-400" />}
                />
              </div>
            )}
          </div>

          {/* System Prompt */}
          <div className="space-y-3">
            <div>
              <h3 className="font-bold pb-2">AI Behavior</h3>
              <p className="text-xs text-default-500 pb-2">Customize how the AI should behave during this conversation</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                size="sm"
                isSelected={useDefaultPrompt}
                onValueChange={setUseDefaultPrompt}
              >
                Use default system prompt
              </Switch>
            </div>

            {!useDefaultPrompt && (
              <>
                {/* Preset Prompts */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Quick Presets:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_PROMPTS.map((preset) => (
                      <Button
                        key={preset.name}
                        variant={selectedPreset === preset.name ? "solid" : "bordered"}
                        color={selectedPreset === preset.name ? "primary" : "default"}
                        size="sm"
                        className="justify-start"
                        onPress={() => handlePresetSelect(preset.name)}
                        startContent={
                          <span className="text-base">{preset.icon}</span>
                        }
                      >
                        <span className="truncate">{preset.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Textarea
                  label="Custom System Prompt"
                  placeholder="Define how the AI should behave during this conversation..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  variant="bordered"
                  size="sm"
                  minRows={3}
                  maxRows={6}
                  startContent={<RiMagicLine size={16} className="text-default-400" />}
                />

                <Card className="bg-default-50 border-default-200">
                  <CardBody className="p-3">
                    <div className="flex items-start gap-2">
                      <RiSpeakLine size={16} className="text-default-600 mt-0.5" />
                      <div>
                        <p className="text-default-700 text-xs">
                          The system prompt defines the AI's personality, expertise, and behavior. 
                          Be specific about the role you want the AI to play and how it should interact with you.
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </>
            )}
          </div>
        </ModalBody>
        
        <ModalFooter className="pt-2">
          <Button 
            variant="light" 
            onPress={handleClose}
            size="sm"
          >
            Cancel
          </Button>
          <Button 
            color="primary" 
            onPress={handleSubmit}
            isDisabled={!title.trim()}
            isLoading={isLoading}
            size="sm"
          >
            Update Event
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 