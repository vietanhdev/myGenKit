import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  useDisclosure
} from '@heroui/react';
import { 
  RiAddLine, 
  RiArrowLeftLine, 
  RiArrowRightLine, 
  RiMoreLine,
  RiCalendarEventLine,
  RiPlayLine,
  RiEditLine,
  RiDeleteBin7Line,
  RiCheckLine
} from 'react-icons/ri';
import { useCalendarStore } from '../../lib/store-calendar';
import { CalendarEventSummary } from '../../types';
import { CreateEventDialog } from './CreateEventDialog';
import { EditEventDialog } from './EditEventDialog';
import { useConversationStore } from '../../lib/store-conversation';

interface CalendarProps {
  className?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];



const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

const EventCard: React.FC<{
  event: CalendarEventSummary;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  onStart: (eventId: string) => void;
  onComplete: (eventId: string) => void;
}> = ({ event, onEdit, onDelete, onStart, onComplete }) => {
  const isAllDay = event.isAllDay;
  const canStart = event.status === 'scheduled';
  const canComplete = event.status === 'in-progress';

  const getStatusIndicator = () => {
    switch (event.status) {
      case 'scheduled':
        return null; // No indicator for scheduled (default state)
      case 'in-progress':
        return <div className="w-2 h-2 bg-warning rounded-full flex-shrink-0" title="In Progress" />;
      case 'completed':
        return <RiCheckLine size={12} className="text-success flex-shrink-0" title="Completed" />;
      case 'cancelled':
        return <div className="w-2 h-2 bg-danger rounded-full flex-shrink-0" title="Cancelled" />;
      default:
        return null;
    }
  };

  const getCardBorder = () => {
    switch (event.status) {
      case 'in-progress':
        return 'border-warning-200';
      case 'completed':
        return 'border-success-200';
      case 'cancelled':
        return 'border-danger-200';
      default:
        return 'border-divider';
    }
  };

  return (
    <Card className={`w-full mb-1 hover:shadow-sm transition-all duration-200 ${getCardBorder()} group`}>
      <CardBody className="p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getStatusIndicator()}
              <h5 className={`text-xs font-medium truncate ${
                event.status === 'completed' ? 'text-success line-through' : 
                event.status === 'cancelled' ? 'text-danger line-through' : 
                'text-foreground'
              }`}>
                {event.title}
              </h5>
            </div>
            <div className="text-xs text-default-500">
              {isAllDay ? (
                'All day'
              ) : (
                `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`
              )}
            </div>
          </div>
          
          <Dropdown>
            <DropdownTrigger>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Event options"
              >
                <RiMoreLine size={12} />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              {canStart ? (
                <DropdownItem
                  key="start"
                  startContent={<RiPlayLine size={14} />}
                  onPress={() => onStart(event.id)}
                >
                  Start Conversation
                </DropdownItem>
              ) : null}
              {canComplete ? (
                <DropdownItem
                  key="complete"
                  startContent={<RiCheckLine size={14} />}
                  onPress={() => onComplete(event.id)}
                >
                  Mark Complete
                </DropdownItem>
              ) : null}
              <DropdownItem
                key="edit"
                startContent={<RiEditLine size={14} />}
                onPress={() => onEdit(event.id)}
              >
                Edit
              </DropdownItem>
              <DropdownItem
                key="delete"
                className="text-danger"
                color="danger"
                startContent={<RiDeleteBin7Line size={14} />}
                onPress={() => onDelete(event.id)}
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </CardBody>
    </Card>
  );
};

export default function Calendar({ className = '' }: CalendarProps) {
  const { 
    isLoading, 
    error, 
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsInRange,
    startConversationFromEvent,
    completeEvent
  } = useCalendarStore();
  
  const { createNewConversation } = useConversationStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthEvents, setMonthEvents] = useState<CalendarEventSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Modal controls
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();

  // Load events for the current month
  useEffect(() => {
    const loadMonthEvents = async () => {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      try {
        const eventsInRange = await getEventsInRange(startOfMonth, endOfMonth);
        setMonthEvents(eventsInRange);
      } catch (error) {
        console.error('Failed to load month events:', error);
      }
    };
    
    loadMonthEvents();
  }, [currentDate, getEventsInRange]);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
    
    const days = [];
    const currentDateForComparison = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 weeks
      const dateKey = new Date(currentDateForComparison);
      const dayEvents = monthEvents.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === dateKey.toDateString();
      });
      
      days.push({
        date: dateKey,
        isCurrentMonth: dateKey.getMonth() === month,
        isToday: dateKey.toDateString() === new Date().toDateString(),
        events: dayEvents
      });
      
      currentDateForComparison.setDate(currentDateForComparison.getDate() + 1);
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleCreateEvent = async (title: string, description?: string, systemPrompt?: string, startTime?: Date, endTime?: Date, isAllDay?: boolean) => {
    try {
      await createEvent(title, description, systemPrompt, startTime, endTime, isAllDay);
      onCreateClose();
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleEditEvent = (eventId: string) => {
    setEditingEventId(eventId);
    onEditOpen();
  };

  const handleUpdateEvent = async (eventId: string, updates: any) => {
    try {
      await updateEvent(eventId, updates);
      onEditClose();
      setEditingEventId(null);
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleStartConversation = async (eventId: string) => {
    try {
      // Create a new conversation first
      const event = monthEvents.find(e => e.id === eventId);
      if (!event) return;
      
      // Find the full event details to get system prompt
      const fullEvent = await useCalendarStore.getState().loadEvent(eventId);
      const systemPrompt = fullEvent?.systemPrompt;
      
      await createNewConversation(systemPrompt);
      
      // Get the newly created conversation ID
      const conversationId = useConversationStore.getState().currentConversationId;
      if (conversationId) {
        await startConversationFromEvent(eventId, conversationId);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleCompleteEvent = async (eventId: string) => {
    try {
      await completeEvent(eventId);
    } catch (error) {
      console.error('Failed to complete event:', error);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    onCreateOpen();
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className={`calendar ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => navigateMonth('prev')}
              aria-label="Previous month"
            >
              <RiArrowLeftLine size={16} />
            </Button>
            <h3 className="text-lg font-semibold">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => navigateMonth('next')}
              aria-label="Next month"
            >
              <RiArrowRightLine size={16} />
            </Button>
          </div>
          
          <Button
            size="sm"
            color="primary"
            startContent={<RiAddLine size={16} />}
            onPress={onCreateOpen}
          >
            New Event
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-content1 rounded-lg border border-divider overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-divider bg-content2">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-default-600">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[80px] p-1 border-r border-b border-divider cursor-pointer hover:bg-content2 transition-colors ${
                  !day.isCurrentMonth ? 'bg-content2/50 text-default-400' : ''
                } ${day.isToday ? 'bg-primary-50 border-primary-200' : ''}`}
                onClick={() => handleDateClick(day.date)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm ${day.isToday ? 'font-bold text-primary' : ''}`}>
                    {day.date.getDate()}
                  </span>
                  {day.events.length > 0 && (
                    <Chip size="sm" variant="flat" color="primary" className="text-xs">
                      {day.events.length}
                    </Chip>
                  )}
                </div>
                
                <div className="space-y-1 group">
                  {day.events.slice(0, 3).map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                      onStart={handleStartConversation}
                      onComplete={handleCompleteEvent}
                    />
                  ))}
                  {day.events.length > 3 && (
                    <div className="text-xs text-primary-500 text-center py-1 cursor-pointer hover:text-primary-600">
                      +{day.events.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
            <p className="text-danger-700 text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && monthEvents.length === 0 && (
          <div className="text-center py-8 text-default-400">
            <RiCalendarEventLine size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">No events scheduled this month</p>
            <p className="text-xs mt-1">Click on any day to schedule a new AI conversation</p>
          </div>
        )}
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onCreateEvent={handleCreateEvent}
        isLoading={isLoading}
        selectedDate={selectedDate}
      />

      {/* Edit Event Dialog */}
      {editingEventId && (
        <EditEventDialog
          isOpen={isEditOpen}
          onClose={onEditClose}
          onUpdateEvent={handleUpdateEvent}
          isLoading={isLoading}
          eventId={editingEventId}
        />
      )}
    </div>
  );
} 