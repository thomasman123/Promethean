import { processEventsWithLinking, SessionLinkingOptions } from "./session-linking";
import { SetterRepPair } from "./types";

export interface SetterMetrics {
  setterId: string;
  setterName: string;
  outboundDials: number;
  uniqueContactsReached: number;
  discoveriesSet: number;
  salesCallsBooked: number;
  showRate: number;
  setterWinRate: number;
  attributedRevenue: number;
}

export interface RepMetrics {
  repId: string;
  repName: string;
  salesCallsHeld: number;
  winRate: number;
  revenue: number;
  cashCollected: number;
  avgOrderValue: number;
  avgSalesCycle: number;
}

export interface PairMetrics extends SetterRepPair {
  metrics: {
    appointments: number;
    showRate: number;
    winRate: number;
    revenue: number;
    cashCollected: number;
    avgDealSize: number;
  };
}

/**
 * Calculate setter metrics from linked sessions
 */
export async function calculateSetterMetrics(
  accountId: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
    setterIds?: string[];
  },
  options: Partial<SessionLinkingOptions> = {}
): Promise<SetterMetrics[]> {
  const sessions = await processEventsWithLinking(accountId, filters, options);
  
  // Group sessions by setter
  const setterSessions = new Map<string, any[]>();
  sessions.forEach(session => {
    const setterId = session.setterId || 'INBOUND';
    if (!setterSessions.has(setterId)) {
      setterSessions.set(setterId, []);
    }
    setterSessions.get(setterId)!.push(session);
  });
  
  // Calculate metrics for each setter
  const metrics: SetterMetrics[] = [];
  
  for (const [setterId, sessions] of setterSessions.entries()) {
    // Count unique metrics
    const uniqueContacts = new Set<string>();
    let outboundDials = 0;
    let discoveries = 0;
    let appointments = 0;
    let appointmentsShowed = 0;
    let appointmentsClosed = 0;
    let revenue = 0;
    
    sessions.forEach(session => {
      session.events.forEach((event: any) => {
        uniqueContacts.add(event.contactId);
        
        if (event.type === 'dial' && !event.repId) {
          outboundDials++;
        } else if (event.type === 'discovery') {
          discoveries++;
        } else if (event.type === 'appointment') {
          appointments++;
          if (event.showed) appointmentsShowed++;
          if (event.closed) {
            appointmentsClosed++;
            revenue += event.value || 0;
          }
        }
      });
    });
    
    const showRate = appointments > 0 ? appointmentsShowed / appointments : 0;
    const winRate = appointmentsShowed > 0 ? appointmentsClosed / appointmentsShowed : 0;
    
    metrics.push({
      setterId,
      setterName: setterId === 'INBOUND' ? 'INBOUND' : `Setter ${setterId.slice(-1)}`,
      outboundDials,
      uniqueContactsReached: uniqueContacts.size,
      discoveriesSet: discoveries,
      salesCallsBooked: appointments,
      showRate,
      setterWinRate: winRate,
      attributedRevenue: revenue
    });
  }
  
  return metrics;
}

/**
 * Calculate rep metrics from linked sessions
 */
export async function calculateRepMetrics(
  accountId: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
    repIds?: string[];
  },
  options: Partial<SessionLinkingOptions> = {}
): Promise<RepMetrics[]> {
  const sessions = await processEventsWithLinking(accountId, filters, options);
  
  // Group sessions by rep
  const repSessions = new Map<string, any[]>();
  sessions.forEach(session => {
    const repId = session.repId;
    if (repId) {
      if (!repSessions.has(repId)) {
        repSessions.set(repId, []);
      }
      repSessions.get(repId)!.push(session);
    }
  });
  
  // Calculate metrics for each rep
  const metrics: RepMetrics[] = [];
  
  for (const [repId, sessions] of repSessions.entries()) {
    let appointments = 0;
    let appointmentsHeld = 0;
    let appointmentsClosed = 0;
    let revenue = 0;
    let cashCollected = 0;
    let totalCycleDays = 0;
    
    sessions.forEach(session => {
      const appointment = session.events.find((e: any) => e.type === 'appointment');
      if (appointment) {
        appointments++;
        if ((appointment as any).showed) {
          appointmentsHeld++;
          if ((appointment as any).closed) {
            appointmentsClosed++;
            revenue += (appointment as any).value || 0;
            cashCollected += (appointment as any).cashCollected || 0;
            
            // Calculate sales cycle
            const firstTouch = session.events[0].timestamp;
            const closeDate = new Date((appointment as any).closeDate || appointment.timestamp);
            const cycleDays = Math.floor((closeDate.getTime() - firstTouch.getTime()) / (1000 * 60 * 60 * 24));
            totalCycleDays += cycleDays;
          }
        }
      }
    });
    
    const winRate = appointmentsHeld > 0 ? appointmentsClosed / appointmentsHeld : 0;
    const avgOrderValue = appointmentsClosed > 0 ? revenue / appointmentsClosed : 0;
    const avgSalesCycle = appointmentsClosed > 0 ? totalCycleDays / appointmentsClosed : 0;
    
    metrics.push({
      repId,
      repName: `Rep ${repId.slice(-1)}`,
      salesCallsHeld: appointmentsHeld,
      winRate,
      revenue,
      cashCollected,
      avgOrderValue,
      avgSalesCycle
    });
  }
  
  return metrics;
}

/**
 * Calculate setter-rep pair metrics
 */
export async function calculatePairMetrics(
  accountId: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
    setterIds?: string[];
    repIds?: string[];
  },
  options: Partial<SessionLinkingOptions> = {}
): Promise<PairMetrics[]> {
  const sessions = await processEventsWithLinking(accountId, filters, options);
  
  // Group sessions by setter-rep pair
  const pairSessions = new Map<string, any[]>();
  sessions.forEach(session => {
    const setterId = session.setterId || 'INBOUND';
    const repId = session.repId;
    
    if (repId) {
      const pairKey = `${setterId}_${repId}`;
      if (!pairSessions.has(pairKey)) {
        pairSessions.set(pairKey, []);
      }
      pairSessions.get(pairKey)!.push(session);
    }
  });
  
  // Calculate metrics for each pair
  const metrics: PairMetrics[] = [];
  
  // Get setter and rep names (in real app, fetch from DB)
  const setterNames = new Map<string, string>([
    ['INBOUND', 'INBOUND'],
    ...Array.from({ length: 10 }, (_, i) => [`setter${i + 1}`, `Setter ${i + 1}`] as [string, string])
  ]);
  
  const repNames = new Map<string, string>(
    Array.from({ length: 10 }, (_, i) => [`rep${i + 1}`, `Rep ${i + 1}`] as [string, string])
  );
  
  for (const [pairKey, sessions] of pairSessions.entries()) {
    const [setterId, repId] = pairKey.split('_');
    
    let appointments = 0;
    let appointmentsShowed = 0;
    let appointmentsClosed = 0;
    let revenue = 0;
    let cashCollected = 0;
    
    sessions.forEach(session => {
      const appointment = session.events.find((e: any) => e.type === 'appointment');
      if (appointment) {
        appointments++;
        if ((appointment as any).showed) {
          appointmentsShowed++;
          if ((appointment as any).closed) {
            appointmentsClosed++;
            revenue += (appointment as any).value || 0;
            cashCollected += (appointment as any).cashCollected || 0;
          }
        }
      }
    });
    
    const showRate = appointments > 0 ? appointmentsShowed / appointments : 0;
    const winRate = appointmentsShowed > 0 ? appointmentsClosed / appointmentsShowed : 0;
    const avgDealSize = appointmentsClosed > 0 ? revenue / appointmentsClosed : 0;
    
    metrics.push({
      setterId,
      setterName: setterNames.get(setterId) || setterId,
      repId,
      repName: repNames.get(repId) || repId,
      metrics: {
        appointments,
        showRate,
        winRate,
        revenue,
        cashCollected,
        avgDealSize
      }
    });
  }
  
  return metrics;
}

/**
 * Aggregate metrics for the dashboard
 */
export async function aggregateMetricsForDashboard(
  accountId: string,
  filters: {
    startDate?: Date;
    endDate?: Date;
    setterIds?: string[];
    repIds?: string[];
  },
  compareSettings: {
    scope: 'setter' | 'rep' | 'pair';
    attributionMode: 'primary' | 'last-touch' | 'assist';
    excludeInCallDials: boolean;
    excludeRepDials: boolean;
  }
) {
  const linkingOptions: Partial<SessionLinkingOptions> = {
    attributionMode: compareSettings.attributionMode,
    excludeInCallDials: compareSettings.excludeInCallDials,
    excludeRepDials: compareSettings.excludeRepDials
  };
  
  switch (compareSettings.scope) {
    case 'setter':
      return {
        type: 'setter',
        data: await calculateSetterMetrics(accountId, filters, linkingOptions)
      };
      
    case 'rep':
      return {
        type: 'rep',
        data: await calculateRepMetrics(accountId, filters, linkingOptions)
      };
      
    case 'pair':
      return {
        type: 'pair',
        data: await calculatePairMetrics(accountId, filters, linkingOptions)
      };
      
    default:
      throw new Error(`Unknown compare scope: ${compareSettings.scope}`);
  }
} 