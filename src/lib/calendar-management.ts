import CryptoJS from 'crypto-js';
import { CalendarEvent, CalendarEventSummary } from '../types';

const CALENDAR_STORAGE_KEY = 'mygenkit-calendar-events';

/**
 * Generate a unique calendar event ID
 */
function generateEventId(): string {
  return CryptoJS.lib.WordArray.random(16).toString();
}

/**
 * Get storage key for user's calendar events
 */
function getCalendarStorageKey(userId: string): string {
  return `${CALENDAR_STORAGE_KEY}-${userId}`;
}

/**
 * Encrypt calendar events data
 */
function encryptCalendarData(data: CalendarEvent[], password: string): string {
  const jsonData = JSON.stringify(data, (key, value) => {
    if (key === 'startTime' || key === 'endTime' || key === 'createdAt' || key === 'lastModified') {
      return value instanceof Date ? value.toISOString() : value;
    }
    return value;
  });
  return CryptoJS.AES.encrypt(jsonData, password).toString();
}

/**
 * Decrypt calendar events data
 */
function decryptCalendarData(encryptedData: string, password: string): CalendarEvent[] {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedData) {
      throw new Error('Invalid password or corrupted data');
    }
    
    const parsedData = JSON.parse(decryptedData);
    
    // Convert date strings back to Date objects
    return parsedData.map((event: any) => ({
      ...event,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      createdAt: new Date(event.createdAt),
      lastModified: new Date(event.lastModified)
    }));
  } catch (error) {
    throw new Error('Failed to decrypt calendar data');
  }
}

/**
 * Load all calendar events for a user
 */
export function loadCalendarEvents(userId: string, password: string): CalendarEventSummary[] {
  const storageKey = getCalendarStorageKey(userId);
  const encryptedData = localStorage.getItem(storageKey);
  
  if (!encryptedData) {
    return [];
  }
  
  try {
    const events = decryptCalendarData(encryptedData, password);
    return events.map(event => ({
      id: event.id,
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay,
      status: event.status
    }));
  } catch (error) {
    console.error('Failed to load calendar events:', error);
    return [];
  }
}

/**
 * Load a specific calendar event
 */
export function loadCalendarEvent(userId: string, password: string, eventId: string): CalendarEvent | null {
  const storageKey = getCalendarStorageKey(userId);
  const encryptedData = localStorage.getItem(storageKey);
  
  if (!encryptedData) {
    return null;
  }
  
  try {
    const events = decryptCalendarData(encryptedData, password);
    return events.find(event => event.id === eventId) || null;
  } catch (error) {
    console.error('Failed to load calendar event:', error);
    return null;
  }
}

/**
 * Save all calendar events for a user
 */
function saveCalendarEvents(userId: string, password: string, events: CalendarEvent[]): void {
  const storageKey = getCalendarStorageKey(userId);
  const encryptedData = encryptCalendarData(events, password);
  localStorage.setItem(storageKey, encryptedData);
}

/**
 * Create a new calendar event
 */
export function createCalendarEvent(
  userId: string,
  password: string,
  title: string,
  description?: string,
  systemPrompt?: string,
  startTime?: Date,
  endTime?: Date,
  isAllDay?: boolean
): CalendarEvent {
  const now = new Date();
  const eventStartTime = startTime || now;
  const eventEndTime = endTime || new Date(eventStartTime.getTime() + 60 * 60 * 1000); // Default 1 hour
  
  const newEvent: CalendarEvent = {
    id: generateEventId(),
    title,
    description,
    systemPrompt,
    startTime: eventStartTime,
    endTime: eventEndTime,
    isAllDay: isAllDay || false,
    status: 'scheduled',
    createdAt: now,
    lastModified: now
  };
  
  const storageKey = getCalendarStorageKey(userId);
  const encryptedData = localStorage.getItem(storageKey);
  
  let events: CalendarEvent[] = [];
  if (encryptedData) {
    try {
      events = decryptCalendarData(encryptedData, password);
    } catch (error) {
      console.error('Failed to decrypt existing calendar events:', error);
    }
  }
  
  events.push(newEvent);
  saveCalendarEvents(userId, password, events);
  
  return newEvent;
}

/**
 * Update an existing calendar event
 */
export function updateCalendarEvent(
  userId: string,
  password: string,
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt' | 'lastModified'>>
): CalendarEvent | null {
  const storageKey = getCalendarStorageKey(userId);
  const encryptedData = localStorage.getItem(storageKey);
  
  if (!encryptedData) {
    return null;
  }
  
  try {
    const events = decryptCalendarData(encryptedData, password);
    const eventIndex = events.findIndex(event => event.id === eventId);
    
    if (eventIndex === -1) {
      return null;
    }
    
    const updatedEvent = {
      ...events[eventIndex],
      ...updates,
      lastModified: new Date()
    };
    
    events[eventIndex] = updatedEvent;
    saveCalendarEvents(userId, password, events);
    
    return updatedEvent;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    return null;
  }
}

/**
 * Delete a calendar event
 */
export function deleteCalendarEvent(userId: string, password: string, eventId: string): boolean {
  const storageKey = getCalendarStorageKey(userId);
  const encryptedData = localStorage.getItem(storageKey);
  
  if (!encryptedData) {
    return false;
  }
  
  try {
    const events = decryptCalendarData(encryptedData, password);
    const filteredEvents = events.filter(event => event.id !== eventId);
    
    if (filteredEvents.length === events.length) {
      return false; // Event not found
    }
    
    saveCalendarEvents(userId, password, filteredEvents);
    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    return false;
  }
}

/**
 * Get events for a specific date range
 */
export function getEventsInRange(
  userId: string,
  password: string,
  startDate: Date,
  endDate: Date
): CalendarEventSummary[] {
  const storageKey = getCalendarStorageKey(userId);
  const encryptedData = localStorage.getItem(storageKey);
  
  if (!encryptedData) {
    return [];
  }
  
  try {
    const events = decryptCalendarData(encryptedData, password);
    return events
      .filter(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        return eventStart <= endDate && eventEnd >= startDate;
      })
      .map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        isAllDay: event.isAllDay,
        status: event.status
      }));
  } catch (error) {
    console.error('Failed to get events in range:', error);
    return [];
  }
}

/**
 * Start a conversation from a calendar event
 */
export function startConversationFromEvent(
  userId: string,
  password: string,
  eventId: string,
  conversationId: string
): CalendarEvent | null {
  return updateCalendarEvent(userId, password, eventId, {
    status: 'in-progress',
    conversationId
  });
}

/**
 * Mark event as completed
 */
export function completeCalendarEvent(
  userId: string,
  password: string,
  eventId: string
): CalendarEvent | null {
  return updateCalendarEvent(userId, password, eventId, {
    status: 'completed'
  });
} 