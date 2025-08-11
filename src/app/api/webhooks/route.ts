import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Store webhook IDs to prevent replay attacks
const processedWebhookIds = new Set<string>();

export async function POST(request: NextRequest) {
  console.log('📞 Received GHL webhook');
  
  try {
    // Log all headers for debugging
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('🔍 All webhook headers:', allHeaders);
    
    // Get the raw body and headers
    const body = await request.text();
    const signature = request.headers.get('x-wh-signature');
    const timestamp = request.headers.get('x-timestamp');
    const contentType = request.headers.get('content-type');
    const userAgent = request.headers.get('user-agent');
    
    console.log('📊 Webhook details:', {
      signature: signature ? 'present' : 'missing',
      timestamp: timestamp ? 'present' : 'missing',
      contentType: contentType || 'missing',
      userAgent: userAgent || 'missing',
      bodyLength: body.length,
      method: request.method,
      url: request.url
    });
    
    // Validate content type
    if (contentType && !contentType.includes('application/json')) {
      console.warn('⚠️ Unexpected content-type:', contentType);
    }
    
    // Parse the payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    console.log('Webhook payload:', {
      type: payload.type,
      messageType: payload.messageType,
      locationId: payload.locationId,
      timestamp: payload.timestamp || payload.dateAdded
    });
    
    // Basic validation
    if (!signature) {
      console.warn('Missing webhook signature, skipping verification in development');
      // In production, you should return 401 here
      // return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }
    
    // TODO: Verify signature if present (implement GHL signature verification)
    
    // Check for replay attack prevention
    const webhookId = payload.webhookId || payload.messageId;
    if (webhookId && processedWebhookIds.has(webhookId)) {
      console.log('Duplicate webhook ID detected, ignoring:', webhookId);
      return NextResponse.json({ message: 'Webhook already processed' });
    }
    
    // Validate timestamp if present
    const webhookTimestamp = payload.timestamp || payload.dateAdded;
    if (webhookTimestamp && !isTimestampValid(webhookTimestamp)) {
      console.warn('Webhook timestamp is outside acceptable window:', webhookTimestamp);
      // In production, you might want to reject old webhooks
      // return NextResponse.json({ error: 'Webhook timestamp is too old' }, { status: 400 });
    }
    
    // Process OutboundMessage webhooks for phone calls
    if (payload.type === 'OutboundMessage' && payload.messageType === 'CALL') {
      console.log('🎯 Processing phone call webhook');
      
      try {
        await processPhoneCallWebhook(payload);
        
        // Add webhook ID to processed set
        if (webhookId) {
          processedWebhookIds.add(webhookId);
          // Clean up old webhook IDs periodically (keep last 1000)
          if (processedWebhookIds.size > 1000) {
            const idsArray = Array.from(processedWebhookIds);
            const toKeep = idsArray.slice(-800); // Keep last 800
            processedWebhookIds.clear();
            toKeep.forEach(id => processedWebhookIds.add(id));
          }
        }
        
        console.log('✅ Phone call webhook processed successfully');
        return NextResponse.json({ message: 'Phone call webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process phone call webhook:', error);
        return NextResponse.json(
          { error: 'Failed to process phone call webhook' },
          { status: 500 }
        );
      }
    } 
    // Process AppointmentCreate webhooks
    else if (payload.type === 'AppointmentCreate') {
      console.log('📅 Processing appointment creation webhook');
      
      try {
        await processAppointmentWebhook(payload);
        
        // Add webhook ID to processed set
        if (webhookId) {
          processedWebhookIds.add(webhookId);
          // Clean up old webhook IDs periodically (keep last 1000)
          if (processedWebhookIds.size > 1000) {
            const idsArray = Array.from(processedWebhookIds);
            const toKeep = idsArray.slice(-800); // Keep last 800
            processedWebhookIds.clear();
            toKeep.forEach(id => processedWebhookIds.add(id));
          }
        }
        
        console.log('✅ Appointment webhook processed successfully');
        return NextResponse.json({ message: 'Appointment webhook processed successfully' });
        
      } catch (error) {
        console.error('Failed to process appointment webhook:', error);
        return NextResponse.json(
          { error: 'Failed to process appointment webhook' },
          { status: 500 }
        );
      }
    } else {
      console.log('📋 Non-supported webhook received:', {
        type: payload.type,
        messageType: payload.messageType
      });
      return NextResponse.json({ message: 'Webhook received but not supported' });
    }
    
  } catch (error) {
    console.error('GHL webhook processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Helper function to process phone call webhooks
async function processPhoneCallWebhook(payload: any) {
  console.log('🔄 Processing phone call data:', {
    messageId: payload.messageId,
    locationId: payload.locationId,
    contactId: payload.contactId,
    callDuration: payload.callDuration,
    callStatus: payload.callStatus,
    direction: payload.direction
  });
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Find account by GHL location ID
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id, ghl_api_key')
      .eq('ghl_location_id', payload.locationId)
      .single();
    
    if (accountError || !account) {
      console.error('Account not found for location ID:', payload.locationId);
      return;
    }
    
    console.log('📍 Found account:', account.name, '(', account.id, ')');
    
    // Try to find the caller user by fetching from GHL API and matching to platform users
    let callerUserId = null;
    let setterName = null;
    let setterEmail = null;
    
    if (payload.userId && account.ghl_api_key) {
      try {
        console.log('🔍 Fetching user details from GHL for userId:', payload.userId);
        
        // Fetch user from GHL API
        const userResponse = await fetch(`https://services.leadconnectorhq.com/users/${payload.userId}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setterName = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
          setterEmail = userData.email || null;
          
          console.log('✅ Successfully fetched user data:', {
            name: setterName,
            email: setterEmail,
            phone: userData.phone
          });
          
          // Try to match to existing platform user by email
          if (userData.email) {
            const { data: platformUser } = await supabase
              .from('users')
              .select('id')
              .eq('account_id', account.id)
              .eq('email', userData.email)
              .single();
            
            callerUserId = platformUser?.id || null;
            
            if (callerUserId) {
              console.log('✅ Matched GHL user to platform user:', callerUserId);
            } else {
              console.log('⚠️ GHL user not found in platform users table');
            }
          }
        } else {
          console.log('⚠️ User not found in GHL API');
        }
      } catch (error) {
        console.error('❌ Error fetching user from GHL:', error);
      }
    }
    
    // Get contact information by fetching from GHL API
    let contactName = null;
    let contactEmail = null;
    let contactPhone = null;
    
    if (payload.contactId && account.ghl_api_key) {
      try {
        console.log('🔍 Fetching contact details from GHL for contactId:', payload.contactId);
        
        const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${payload.contactId}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
          },
        });
        
        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          contactName = contactData.name || 
                       (contactData.firstName && contactData.lastName ? 
                        `${contactData.firstName} ${contactData.lastName}`.trim() : 
                        contactData.firstName || contactData.lastName) || null;
          contactEmail = contactData.email || null;
          contactPhone = contactData.phone || null;
          
          console.log('✅ Successfully fetched contact data:', {
            name: contactName,
            email: contactEmail,
            phone: contactPhone
          });
        } else {
          console.log('⚠️ Contact not found in GHL API');
        }
      } catch (error) {
        console.error('❌ Error fetching contact from GHL:', error);
      }
    }
    
    // Prepare dial data
    const dialData = {
      account_id: account.id,
      timestamp: new Date(payload.dateAdded || new Date().toISOString()).toISOString(),
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      setter_name: setterName,
      setter_email: setterEmail,
      setter_id: callerUserId,
      caller_user_id: callerUserId,
      duration_seconds: payload.callDuration || 0,
      call_recording_url: payload.attachments?.[0] || null,
      answered: payload.callDuration > 30 && payload.status === 'completed' && payload.callStatus !== 'voicemail',
      meaningful_convo: payload.callDuration > 120 && payload.status === 'completed' && payload.callStatus !== 'voicemail',
      booked_appointment_id: null,
    };
    
    console.log('💾 Saving dial data:', {
      ...dialData,
      setter_info: setterName ? { name: setterName, email: setterEmail } : null
    });
    
    // Save to dials table
    const { data: savedDial, error: dialError } = await supabase
      .from('dials')
      .insert(dialData)
      .select()
      .single();
    
    if (dialError) {
      console.error('Failed to save dial:', dialError);
      throw dialError;
    }
    
    console.log('✅ Dial saved successfully:', savedDial.id);
    
  } catch (error) {
    console.error('Error processing phone call webhook:', error);
    throw error;
  }
}

// Helper function to process appointment creation webhooks
async function processAppointmentWebhook(payload: any) {
  console.log('🔄 Processing appointment webhook:', {
    appointmentId: payload.appointment?.id,
    locationId: payload.locationId,
    calendarId: payload.appointment?.calendarId,
    title: payload.appointment?.title,
    startTime: payload.appointment?.startTime,
    contactId: payload.appointment?.contactId,
    assignedUserId: payload.appointment?.assignedUserId
  });
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);
    
    // Find account by GHL location ID
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, ghl_location_id, ghl_api_key')
      .eq('ghl_location_id', payload.locationId)
      .single();
    
    if (accountError || !account) {
      console.warn('⚠️ Webhook received for unknown location ID:', payload.locationId);
      return;
    }
    
    console.log('📍 Found account:', account.name, '(', account.id, ')');
    
    // Check if this appointment's calendar is mapped
    const { data: calendarMapping, error: mappingError } = await supabase
      .from('calendar_mappings')
      .select('*')
      .eq('account_id', account.id)
      .eq('ghl_calendar_id', payload.appointment?.calendarId)
      .single();
    
    if (mappingError || !calendarMapping) {
      console.log('📋 Calendar not mapped for appointment, skipping:', {
        calendarId: payload.appointment?.calendarId,
        appointmentId: payload.appointment?.id
      });
      return;
    }
    
    console.log('✅ Calendar mapping found:', {
      calendarId: calendarMapping.ghl_calendar_id,
      targetTable: calendarMapping.target_table,
      calendarName: calendarMapping.ghl_calendar_name
    });
    
    // Enrich with contact data if contactId exists
    let contactData = null;
    if (payload.appointment?.contactId && account.ghl_api_key) {
      try {
        console.log('🔍 Fetching contact details for ID:', payload.appointment.contactId);
        
        const contactResponse = await fetch(`https://services.leadconnectorhq.com/contacts/${payload.appointment.contactId}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
          },
        });
        
        if (contactResponse.ok) {
          contactData = await contactResponse.json();
          console.log('👤 Contact data:', contactData ? 
            { name: contactData.name, email: contactData.email, phone: contactData.phone } : 'not found');
        }
      } catch (error) {
        console.error('Failed to fetch contact data:', error);
      }
    }
    
    // Enrich with assigned user (sales rep) data
    let salesRepData = null;
    if (payload.appointment?.assignedUserId && account.ghl_api_key) {
      try {
        console.log('🔍 Fetching sales rep details for ID:', payload.appointment.assignedUserId);
        
        const userResponse = await fetch(`https://services.leadconnectorhq.com/users/${payload.appointment.assignedUserId}`, {
          headers: {
            'Authorization': `Bearer ${account.ghl_api_key}`,
            'Version': '2021-07-28',
          },
        });
        
        if (userResponse.ok) {
          salesRepData = await userResponse.json();
          console.log('👨‍💼 Sales rep data:', salesRepData ? 
            { name: salesRepData.name, email: salesRepData.email } : 'not found');
        }
      } catch (error) {
        console.error('Failed to fetch sales rep data:', error);
      }
    }

    // Determine setter name from most recent dial for this contact
    let setterName = null;
    let setterId = null;
    
    if (contactData && (contactData.email || contactData.phone)) {
      try {
        console.log('🔍 Finding setter from most recent dial for contact:', {
          email: contactData.email,
          phone: contactData.phone
        });
        
        let dialQuery = supabase
          .from('dials')
          .select('setter_name, setter_email, setter_id, timestamp, id')
          .eq('account_id', account.id)
          .order('timestamp', { ascending: false })
          .limit(10); // Check last 10 dials for this contact
        
        // Add contact matching conditions (prefer email, fallback to phone)
        if (contactData.email) {
          dialQuery = dialQuery.eq('contact_email', contactData.email);
        } else if (contactData.phone) {
          dialQuery = dialQuery.eq('contact_phone', contactData.phone);
        }
        
        const { data: recentDials, error: dialError } = await dialQuery;
        
        if (!dialError && recentDials && recentDials.length > 0) {
          // Find the most recent dial with setter information
          const dialWithSetter = recentDials.find(dial => dial.setter_name);
          
          if (dialWithSetter) {
            setterName = dialWithSetter.setter_name;
            setterId = dialWithSetter.setter_id;
            console.log('✅ Setter found from dial:', {
              name: setterName,
              email: dialWithSetter.setter_email,
              dialTime: dialWithSetter.timestamp,
              dialId: dialWithSetter.id
            });
          }
        }
      } catch (dialError) {
        console.error('Failed to find setter from dials:', dialError);
      }
    }
     
   // Map sales rep to internal user ID
   let salesRepId = null;
    if (salesRepData?.email) {
      const { data: existingSalesRep } = await supabase
        .from('users')
        .select('id')
        .eq('account_id', account.id)
        .eq('email', salesRepData.email)
        .single();
      salesRepId = existingSalesRep?.id || null;
      
      if (salesRepId) {
        console.log('✅ Mapped sales rep to internal user:', salesRepId);
      } else {
        console.log('⚠️ Sales rep not found in internal users - they would need to be manually invited');
      }
    }
    
    // Helper function to convert time to UTC
    const convertToUTC = (timeString: string): string => {
      try {
        return new Date(timeString).toISOString();
      } catch (error) {
        console.error('Failed to convert time to UTC:', timeString, error);
        return new Date().toISOString(); // Fallback to current time
      }
    };
    
    // Create base appointment data
    const baseData = {
      account_id: account.id,
      contact_name: contactData?.name || 
        (contactData?.firstName && contactData?.lastName ? 
          `${contactData.firstName} ${contactData.lastName}`.trim() : 
          payload.appointment?.title || null),
      email: contactData?.email || null,
      phone: contactData?.phone || null,
      setter: setterName || 'Webhook',
      sales_rep: salesRepData?.name || null,
      call_outcome: null,
      show_outcome: null,
      pitched: null,
      watched_assets: null,
      lead_quality: null,
      objections: null,
    };
    
    // Save to appropriate table based on mapping
    if (calendarMapping.target_table === 'appointments') {
      const appointmentData = {
        ...baseData,
        date_booked_for: payload.appointment?.startTime ? 
          convertToUTC(payload.appointment.startTime) : null,
        cash_collected: null,
        total_sales_value: null,
      };
      
      const { data: savedAppointment, error: saveError } = await supabase
        .from('appointments')
        .upsert(appointmentData, {
          onConflict: 'account_id,ghl_appointment_id',
          ignoreDuplicates: false
        })
        .select()
        .single();
      
      if (saveError) {
        console.error('Failed to save appointment:', saveError);
        throw new Error(`Failed to save appointment: ${saveError.message}`);
      }
      
      console.log('✅ Appointment saved successfully:', payload.appointment?.id);
      
      // Link this appointment back to the originating dial
      await linkAppointmentToDial(supabase, savedAppointment, contactData, account.id);
      
    } else if (calendarMapping.target_table === 'discoveries') {
      const discoveryData = {
        ...baseData,
        date_booked_for: payload.appointment?.startTime ? 
          convertToUTC(payload.appointment.startTime) : null,
      };
      
      const { data: savedDiscovery, error: saveError } = await supabase
        .from('discoveries')
        .upsert(discoveryData, {
          onConflict: 'account_id,ghl_appointment_id',
          ignoreDuplicates: false
        })
        .select()
        .single();
      
      if (saveError) {
        console.error('Failed to save discovery:', saveError);
        throw new Error(`Failed to save discovery: ${saveError.message}`);
      }
      
      console.log('✅ Discovery saved successfully:', payload.appointment?.id);
      
      // Link this discovery back to the originating dial  
      await linkAppointmentToDial(supabase, savedDiscovery, contactData, account.id);
    }
    
  } catch (error) {
    console.error('Error processing appointment webhook:', error);
    throw error;
  }
}

// Helper function to link an appointment/discovery back to its originating dial
async function linkAppointmentToDial(
  supabase: any,
  appointmentOrDiscovery: any,
  contactData: any,
  accountId: string
): Promise<void> {
  try {
    if (!contactData || (!contactData.email && !contactData.phone)) {
      console.log('⚠️ No contact data available for dial linking');
      return;
    }

    console.log('🔗 Searching for originating dial to link appointment:', {
      appointmentId: appointmentOrDiscovery.id,
      contactEmail: contactData.email,
      contactPhone: contactData.phone,
      scheduledTime: appointmentOrDiscovery.date_booked_for
    });

    // Build query to find the most recent dial that could have led to this appointment
    const webhookReceivedTime = new Date(); 
    const searchWindowStart = new Date(webhookReceivedTime.getTime() - (24 * 60 * 60 * 1000)); // 24 hours before now

    let dialQuery = supabase
      .from('dials')
      .select('id, timestamp, contact_email, contact_phone, booked_appointment_id, setter_name, setter_email')
      .eq('account_id', accountId)
      .is('booked_appointment_id', null) // Only dials that haven't been linked yet
      .gte('timestamp', searchWindowStart.toISOString()) // Within last 24 hours
      .lte('timestamp', webhookReceivedTime.toISOString()) // Up to now
      .order('timestamp', { ascending: false })
      .limit(1); // Get the most recent dial

    // Add contact matching conditions (prefer email, fallback to phone)
    if (contactData.email) {
      dialQuery = dialQuery.eq('contact_email', contactData.email);
    } else if (contactData.phone) {
      dialQuery = dialQuery.eq('contact_phone', contactData.phone);
    } else {
      console.log('⚠️ No email or phone available for contact matching');
      return;
    }

    const { data: recentDials, error: dialError } = await dialQuery;

    if (dialError) {
      console.error('Error searching for dials:', dialError);
      return;
    }

    if (!recentDials || recentDials.length === 0) {
      console.log('ℹ️ No recent dials found within 24 hours of webhook receipt');
      return;
    }

    // Use the most recent dial (first in descending order)
    const relevantDial = recentDials[0];
    
    console.log('✅ Found most recent dial for appointment booking:', {
      dialId: relevantDial.id,
      dialTime: relevantDial.timestamp,
      appointmentId: appointmentOrDiscovery.id,
      contact: contactData.email || contactData.phone
    });

    // Link the dial to the appointment
    const { error: updateError } = await supabase
      .from('dials')
      .update({ 
        booked_appointment_id: appointmentOrDiscovery.id
      })
      .eq('id', relevantDial.id);

    if (updateError) {
      console.error('Failed to link dial to appointment:', updateError);
      return;
    }

    console.log('✅ Successfully linked dial to appointment:', {
      dialId: relevantDial.id,
      dialTime: relevantDial.timestamp,
      appointmentId: appointmentOrDiscovery.id,
      contact: contactData.email || contactData.phone,
      setter: relevantDial.setter_name ? {
        name: relevantDial.setter_name,
        email: relevantDial.setter_email
      } : 'not available'
    });

    // Update the appointment/discovery with setter information from the dial
    if (relevantDial.setter_name && !appointmentOrDiscovery.setter) {
      const tableName = appointmentOrDiscovery.total_sales_value !== undefined ? 'appointments' : 'discoveries';
      const { error: setterUpdateError } = await supabase
        .from(tableName)
        .update({ 
          setter: relevantDial.setter_name
        })
        .eq('id', appointmentOrDiscovery.id);

      if (setterUpdateError) {
        console.error('Failed to update setter information from dial:', setterUpdateError);
      } else {
        console.log('✅ Updated setter information from linked dial');
      }
    }

  } catch (error) {
    console.error('Error in linkAppointmentToDial:', error);
    // Don't throw - this shouldn't fail the entire appointment processing
  }
}

// Helper function to validate timestamp
function isTimestampValid(timestamp: string): boolean {
  try {
    const webhookTime = new Date(timestamp).getTime();
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    // Allow webhooks from the last 5 minutes
    return webhookTime > fiveMinutesAgo && webhookTime <= now;
  } catch {
    return false;
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'GHL Webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
} 