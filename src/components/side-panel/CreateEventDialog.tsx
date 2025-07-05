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
  CardBody
} from '@heroui/react';
import { RiCalendarEventLine, RiMagicLine, RiTimeLine, RiFileTextLine, RiSpeakLine } from 'react-icons/ri';

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateEvent: (title: string, description?: string, systemPrompt?: string, startTime?: Date, endTime?: Date, isAllDay?: boolean) => void;
  isLoading: boolean;
  selectedDate?: Date | null;
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

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({
  isOpen,
  onClose,
  onCreateEvent,
  isLoading,
  selectedDate
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [useDefaultPrompt, setUseDefaultPrompt] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('');

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const defaultDate = selectedDate || now;
      const defaultStartTime = new Date(defaultDate);
      defaultStartTime.setHours(now.getHours() + 1, 0, 0, 0); // Next hour
      const defaultEndTime = new Date(defaultStartTime);
      defaultEndTime.setHours(defaultStartTime.getHours() + 1); // 1 hour later

      setTitle('');
      setDescription('');
      setSystemPrompt('');
      setUseDefaultPrompt(true);
      setIsAllDay(false);
      setSelectedPreset('');
      
      // Set date and time
      setStartDate(defaultDate.toISOString().split('T')[0]);
      setEndDate(defaultDate.toISOString().split('T')[0]);
      setStartTime(defaultStartTime.toTimeString().slice(0, 5));
      setEndTime(defaultEndTime.toTimeString().slice(0, 5));
    }
  }, [isOpen, selectedDate]);

  const handlePresetSelect = (presetName: string) => {
    const preset = PRESET_PROMPTS.find(p => p.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      setSystemPrompt(preset.prompt);
      setUseDefaultPrompt(false);
      if (!title) {
        setTitle(preset.name);
      }
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

    onCreateEvent(
      title.trim(),
      description.trim() || undefined,
      finalSystemPrompt,
      startDateTime,
      endDateTime,
      isAllDay
    );
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSystemPrompt('');
    setUseDefaultPrompt(true);
    setSelectedPreset('');
    onClose();
  };

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
              <h2 className="text-xl font-bold">Schedule AI Conversation</h2>
              <p className="text-xs text-default-500">
                Plan your upcoming conversation with AI
              </p>
            </div>
          </div>
        </ModalHeader>
        
        <ModalBody className="gap-4 py-4">
          {/* Info Card */}
          <Card className="bg-primary-50 border-primary-200">
            <CardBody className="p-4">
              <div className="flex items-start gap-3">
                <RiCalendarEventLine size={20} className="text-primary-600 mt-0.5" />
                <div>
                  <h3 className="text-primary-800 font-bold mb-1">Plan Your AI Session</h3>
                  <p className="text-primary-700 text-sm">
                    Schedule a focused conversation with AI. Set a specific time, define your goals, 
                    and customize the AI's behavior with a system prompt.
                  </p>
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
            Schedule Event
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 