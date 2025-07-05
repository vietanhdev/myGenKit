import { create } from "zustand";
import { CalendarEvent, CalendarEventSummary } from "../types";
import { 
  loadCalendarEvents, 
  loadCalendarEvent, 
  createCalendarEvent, 
  deleteCalendarEvent, 
  updateCalendarEvent,
  getEventsInRange,
  startConversationFromEvent,
  completeCalendarEvent
} from "./calendar-management";

interface CalendarStore {
  // State
  events: CalendarEventSummary[];
  currentEvent: CalendarEvent | null;
  isLoading: boolean;
  error: string | null;
  
  // User session info
  userId: string | null;
  userPassword: string | null;
  
  // Actions
  initializeStore: (userId: string, password: string) => Promise<void>;
  clearStore: () => void;
  loadEvents: () => Promise<void>;
  loadEvent: (eventId: string) => Promise<CalendarEvent | null>;
  createEvent: (title: string, description?: string, systemPrompt?: string, startTime?: Date, endTime?: Date, isAllDay?: boolean) => Promise<CalendarEvent>;
  updateEvent: (eventId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'lastModified'>>) => Promise<CalendarEvent | null>;
  deleteEvent: (eventId: string) => Promise<boolean>;
  getEventsInRange: (startDate: Date, endDate: Date) => Promise<CalendarEventSummary[]>;
  startConversationFromEvent: (eventId: string, conversationId: string) => Promise<CalendarEvent | null>;
  completeEvent: (eventId: string) => Promise<CalendarEvent | null>;
  setError: (error: string | null) => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  events: [],
  currentEvent: null,
  isLoading: false,
  error: null,
  userId: null,
  userPassword: null,
  
  // Initialize store with user credentials
  initializeStore: async (userId: string, password: string) => {
    set({ 
      userId, 
      userPassword: password, 
      error: null 
    });
    
    // Load events
    await get().loadEvents();
  },
  
  // Clear store (on logout)
  clearStore: () => {
    set({
      events: [],
      currentEvent: null,
      isLoading: false,
      error: null,
      userId: null,
      userPassword: null
    });
  },
  
  // Load events list
  loadEvents: async () => {
    const { userId, userPassword } = get();
    if (!userId || !userPassword) {
      set({ error: 'User not authenticated' });
      return;
    }
    
    try {
      set({ isLoading: true, error: null });
      const events = loadCalendarEvents(userId, userPassword);
      set({ events });
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      set({ error: 'Failed to load calendar events' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Load a specific event
  loadEvent: async (eventId: string) => {
    const { userId, userPassword } = get();
    if (!userId || !userPassword) {
      set({ error: 'User not authenticated' });
      return null;
    }
    
    try {
      set({ isLoading: true, error: null });
      const event = loadCalendarEvent(userId, userPassword, eventId);
      set({ currentEvent: event });
      return event;
    } catch (error) {
      console.error('Failed to load calendar event:', error);
      set({ error: 'Failed to load calendar event' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Create a new event
  createEvent: async (title: string, description?: string, systemPrompt?: string, startTime?: Date, endTime?: Date, isAllDay?: boolean) => {
    const { userId, userPassword, loadEvents } = get();
    if (!userId || !userPassword) {
      throw new Error('User not authenticated');
    }
    
    try {
      set({ isLoading: true, error: null });
      const event = createCalendarEvent(userId, userPassword, title, description, systemPrompt, startTime, endTime, isAllDay);
      
      // Reload events list
      await loadEvents();
      
      return event;
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      set({ error: 'Failed to create calendar event' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Update an existing event
  updateEvent: async (eventId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'lastModified'>>) => {
    const { userId, userPassword, loadEvents } = get();
    if (!userId || !userPassword) {
      throw new Error('User not authenticated');
    }
    
    try {
      set({ isLoading: true, error: null });
      const event = updateCalendarEvent(userId, userPassword, eventId, updates);
      
      // Reload events list
      await loadEvents();
      
      return event;
    } catch (error) {
      console.error('Failed to update calendar event:', error);
      set({ error: 'Failed to update calendar event' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Delete an event
  deleteEvent: async (eventId: string) => {
    const { userId, userPassword, loadEvents } = get();
    if (!userId || !userPassword) {
      throw new Error('User not authenticated');
    }
    
    try {
      set({ isLoading: true, error: null });
      const success = deleteCalendarEvent(userId, userPassword, eventId);
      
      if (success) {
        // Reload events list
        await loadEvents();
      }
      
      return success;
    } catch (error) {
      console.error('Failed to delete calendar event:', error);
      set({ error: 'Failed to delete calendar event' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Get events in a specific date range
  getEventsInRange: async (startDate: Date, endDate: Date) => {
    const { userId, userPassword } = get();
    if (!userId || !userPassword) {
      throw new Error('User not authenticated');
    }
    
    try {
      return getEventsInRange(userId, userPassword, startDate, endDate);
    } catch (error) {
      console.error('Failed to get events in range:', error);
      set({ error: 'Failed to get events in range' });
      return [];
    }
  },
  
  // Start a conversation from an event
  startConversationFromEvent: async (eventId: string, conversationId: string) => {
    const { userId, userPassword, loadEvents } = get();
    if (!userId || !userPassword) {
      throw new Error('User not authenticated');
    }
    
    try {
      set({ isLoading: true, error: null });
      const event = startConversationFromEvent(userId, userPassword, eventId, conversationId);
      
      // Reload events list
      await loadEvents();
      
      return event;
    } catch (error) {
      console.error('Failed to start conversation from event:', error);
      set({ error: 'Failed to start conversation from event' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Mark event as completed
  completeEvent: async (eventId: string) => {
    const { userId, userPassword, loadEvents } = get();
    if (!userId || !userPassword) {
      throw new Error('User not authenticated');
    }
    
    try {
      set({ isLoading: true, error: null });
      const event = completeCalendarEvent(userId, userPassword, eventId);
      
      // Reload events list
      await loadEvents();
      
      return event;
    } catch (error) {
      console.error('Failed to complete calendar event:', error);
      set({ error: 'Failed to complete calendar event' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Set error
  setError: (error: string | null) => {
    set({ error });
  }
})); 