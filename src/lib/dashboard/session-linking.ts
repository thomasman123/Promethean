import { supabase } from "@/lib/supabase";

interface Event {
  id: string;
  type: 'dial' | 'discovery' | 'appointment';
  contactId: string;
  setterId?: string;
  repId?: string;
  callSid?: string;
  timestamp: Date;
  value?: number;
}

interface LinkedSession {
  sessionId: string;
  events: Event[];
  primaryEvent: Event;
  isInferred: boolean;
  setterId?: string;
  repId?: string;
}

export interface SessionLinkingOptions {
  excludeInCallDials: boolean;
  excludeRepDials: boolean;
  attributionMode: 'primary' | 'last-touch' | 'assist';
  timeWindowDays: number; // Default 14 days
  sameCallWindowMinutes: number; // Default 30 minutes
}

const DEFAULT_OPTIONS: SessionLinkingOptions = {
  excludeInCallDials: true,
  excludeRepDials: true,
  attributionMode: 'primary',
  timeWindowDays: 14,
  sameCallWindowMinutes: 30
};

/**
 * Links events into sessions based on call_sid or time proximity
 */
export function linkEventsIntoSessions(
  events: Event[],
  options: Partial<SessionLinkingOptions> = {}
): LinkedSession[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sessions: Map<string, LinkedSession> = new Map();
  
  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  // First pass: Group by call_sid if available
  sortedEvents.forEach(event => {
    if (event.callSid) {
      const sessionId = `sid_${event.callSid}`;
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          sessionId,
          events: [],
          primaryEvent: event,
          isInferred: false,
          setterId: event.setterId,
          repId: event.repId
        });
      }
      sessions.get(sessionId)!.events.push(event);
    }
  });
  
  // Second pass: Infer sessions for events without call_sid
  const unlinkedEvents = sortedEvents.filter(e => !e.callSid);
  
  unlinkedEvents.forEach(event => {
    // Try to find a related event within the time window
    const windowStart = new Date(event.timestamp.getTime() - opts.timeWindowDays * 24 * 60 * 60 * 1000);
    const sameCallWindow = opts.sameCallWindowMinutes * 60 * 1000;
    
    let linkedSession: LinkedSession | null = null;
    
    // Look for prior dials/discoveries for the same contact
    if (event.type === 'appointment' || event.type === 'discovery') {
      const priorEvents = sortedEvents.filter(e => 
        e.contactId === event.contactId &&
        e.timestamp < event.timestamp &&
        e.timestamp >= windowStart &&
        (e.type === 'dial' || (e.type === 'discovery' && event.type === 'appointment'))
      );
      
      if (priorEvents.length > 0) {
        const closestPrior = priorEvents[priorEvents.length - 1];
        const timeDiff = event.timestamp.getTime() - closestPrior.timestamp.getTime();
        
        // Check if it's within same call window
        if (timeDiff <= sameCallWindow) {
          // Find or create session for this inferred link
          const sessionId = `inferred_${closestPrior.id}_${event.id}`;
          if (!sessions.has(sessionId)) {
            sessions.set(sessionId, {
              sessionId,
              events: [closestPrior],
              primaryEvent: event, // The conversion is primary
              isInferred: true,
              setterId: closestPrior.setterId || event.setterId,
              repId: event.repId
            });
          }
          linkedSession = sessions.get(sessionId)!;
        }
      }
    }
    
    // If no linked session found, create standalone session
    if (!linkedSession) {
      const sessionId = `standalone_${event.id}`;
      sessions.set(sessionId, {
        sessionId,
        events: [event],
        primaryEvent: event,
        isInferred: false,
        setterId: event.setterId,
        repId: event.repId
      });
    } else {
      linkedSession.events.push(event);
    }
  });
  
  return Array.from(sessions.values());
}

/**
 * Applies de-duplication rules to sessions
 */
export function applyDeduplicationRules(
  sessions: LinkedSession[],
  options: Partial<SessionLinkingOptions> = {}
): LinkedSession[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return sessions.map(session => {
    let filteredEvents = [...session.events];
    
    if (opts.excludeInCallDials) {
      // If session has a conversion (discovery/appointment), exclude the dial
      const hasConversion = filteredEvents.some(e => 
        e.type === 'discovery' || e.type === 'appointment'
      );
      
      if (hasConversion) {
        filteredEvents = filteredEvents.filter(e => e.type !== 'dial');
      }
    }
    
    if (opts.excludeRepDials) {
      // Exclude dials made by reps (where dial.repId exists)
      filteredEvents = filteredEvents.filter(e => 
        !(e.type === 'dial' && e.repId)
      );
    }
    
    // Update primary event based on remaining events
    const primaryEvent = filteredEvents.find(e => 
      e.type === 'appointment' || e.type === 'discovery'
    ) || filteredEvents[0];
    
    return {
      ...session,
      events: filteredEvents,
      primaryEvent
    };
  });
}

/**
 * Attributes sessions to setters based on attribution mode
 */
export function attributeSessions(
  sessions: LinkedSession[],
  options: Partial<SessionLinkingOptions> = {}
): LinkedSession[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return sessions.map(session => {
    let attributedSetterId = session.setterId;
    
    switch (opts.attributionMode) {
      case 'primary':
        // Use setter from primary event (appointment/discovery)
        attributedSetterId = session.primaryEvent.setterId || 'INBOUND';
        break;
        
      case 'last-touch':
        // Find last setter interaction before conversion
        const setterEvents = session.events
          .filter(e => e.setterId && e.setterId !== 'INBOUND')
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        attributedSetterId = setterEvents[0]?.setterId || 'INBOUND';
        break;
        
      case 'assist':
        // Keep all setter touches (implementation depends on UI needs)
        // For now, use primary but mark assists
        attributedSetterId = session.primaryEvent.setterId || 'INBOUND';
        break;
    }
    
    return {
      ...session,
      setterId: attributedSetterId
    };
  });
}

/**
 * Main function to process events with full linking and de-duplication
 */
export async function processEventsWithLinking(
  accountId: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
    repIds?: string[];
    setterIds?: string[];
  },
  options: Partial<SessionLinkingOptions> = {}
): Promise<LinkedSession[]> {
  // Fetch events from database
  const { data: dials } = await supabase
    .from('dials')
    .select('*')
    .eq('account_id', accountId)
    .gte('created_at', filters.startDate?.toISOString() || '1900-01-01')
    .lte('created_at', filters.endDate?.toISOString() || '2100-01-01');
    
  const { data: discoveries } = await supabase
    .from('discoveries')
    .select('*')
    .eq('account_id', accountId)
    .gte('created_at', filters.startDate?.toISOString() || '1900-01-01')
    .lte('created_at', filters.endDate?.toISOString() || '2100-01-01');
    
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('account_id', accountId)
    .gte('appointment_date', filters.startDate?.toISOString() || '1900-01-01')
    .lte('appointment_date', filters.endDate?.toISOString() || '2100-01-01');
    
  // Convert to common Event format
  const events: Event[] = [
    ...(dials || []).map(d => ({
      id: d.id,
      type: 'dial' as const,
      contactId: d.contact_id,
      setterId: d.setter_id,
      repId: d.rep_id,
      callSid: d.call_sid,
      timestamp: new Date(d.created_at)
    })),
    ...(discoveries || []).map(d => ({
      id: d.id,
      type: 'discovery' as const,
      contactId: d.contact_id,
      setterId: d.setter_id,
      callSid: d.call_sid,
      timestamp: new Date(d.created_at)
    })),
    ...(appointments || []).map(a => ({
      id: a.id,
      type: 'appointment' as const,
      contactId: a.contact_id,
      setterId: a.setter_id,
      repId: a.rep_id,
      callSid: a.call_sid,
      timestamp: new Date(a.appointment_date),
      value: a.appointment_value
    }))
  ];
  
  // Apply filters
  let filteredEvents = events;
  if (filters.repIds && filters.repIds.length > 0) {
    filteredEvents = filteredEvents.filter(e => 
      !e.repId || filters.repIds!.includes(e.repId)
    );
  }
  if (filters.setterIds && filters.setterIds.length > 0) {
    filteredEvents = filteredEvents.filter(e => 
      !e.setterId || filters.setterIds!.includes(e.setterId)
    );
  }
  
  // Process with linking and de-duplication
  const linkedSessions = linkEventsIntoSessions(filteredEvents, options);
  const deduplicatedSessions = applyDeduplicationRules(linkedSessions, options);
  const attributedSessions = attributeSessions(deduplicatedSessions, options);
  
  return attributedSessions;
} 