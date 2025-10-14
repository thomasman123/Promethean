import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database-temp.types";
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';
import { startOfWeek, startOfMonth } from 'date-fns';

// SSE helper to send progress updates
function sendEvent(controller: ReadableStreamDefaultController, event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

export async function POST(req: NextRequest) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.json();
  const { accountId } = body as { accountId: string };

  if (!accountId) {
    return new Response(JSON.stringify({ error: 'accountId is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendEvent(controller, 'progress', { 
          stage: 'init', 
          message: 'Starting contact sync...',
          progress: 0
        });

        // Get account with GHL credentials and timezone
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('id, name, ghl_api_key, ghl_location_id, ghl_refresh_token, ghl_token_expires_at, ghl_auth_type, business_timezone')
          .eq('id', accountId)
          .single();

        if (accountError || !account) {
          sendEvent(controller, 'error', { error: 'Account not found' });
          controller.close();
          return;
        }

        if (!account.ghl_api_key) {
          sendEvent(controller, 'error', { error: 'Account missing GHL API key' });
          controller.close();
          return;
        }

        if (!account.ghl_location_id) {
          sendEvent(controller, 'error', { error: 'Account missing GHL location ID' });
          controller.close();
          return;
        }

        sendEvent(controller, 'progress', { 
          stage: 'fetching', 
          message: 'Connected to GHL. Fetching contacts...',
          progress: 5
        });

        // Run the sync with progress callbacks
        let syncedCount = 0;
        let totalEstimate = 0;
        let hasMore = true;
        let searchAfter: any[] = [];
        const limit = 100;
        let batchNumber = 0;

        // Get valid access token
        let accessToken = account.ghl_api_key;
        if (account.ghl_auth_type === 'oauth2' && account.ghl_token_expires_at) {
          const expiresAt = new Date(account.ghl_token_expires_at);
          if (expiresAt <= new Date()) {
            // Token expired, need to refresh
            sendEvent(controller, 'progress', { 
              stage: 'refreshing', 
              message: 'Refreshing access token...',
              progress: 8
            });
            
            // Refresh token logic
            if (account.ghl_refresh_token) {
              try {
                const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({
                    client_id: process.env.GHL_CLIENT_ID!,
                    client_secret: process.env.GHL_CLIENT_SECRET!,
                    grant_type: 'refresh_token',
                    refresh_token: account.ghl_refresh_token,
                  }),
                });

                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  accessToken = tokenData.access_token;
                  
                  // Update token in database
                  await supabase
                    .from('accounts')
                    .update({
                      ghl_api_key: tokenData.access_token,
                      ghl_refresh_token: tokenData.refresh_token,
                      ghl_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
                    })
                    .eq('id', accountId);
                }
              } catch (error) {
                console.error('Token refresh failed:', error);
              }
            }
          }
        }

        while (hasMore) {
          batchNumber++;

          const requestBody: any = {
            locationId: account.ghl_location_id,
            pageLimit: limit
          };
          
          if (searchAfter.length > 0) {
            requestBody.searchAfter = searchAfter;
          }

          sendEvent(controller, 'progress', { 
            stage: 'fetching', 
            message: `Fetching batch ${batchNumber}...`,
            syncedCount,
            totalEstimate: totalEstimate || '?',
            progress: 10 + (totalEstimate > 0 ? (syncedCount / totalEstimate) * 85 : 0)
          });

          const response = await fetch('https://services.leadconnectorhq.com/contacts/search', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            const errorText = await response.text();
            sendEvent(controller, 'error', { 
              error: `GHL API error: ${response.status}`,
              details: errorText
            });
            controller.close();
            return;
          }

          const json = await response.json();
          const contacts = json.contacts || [];
          const total = json.total || 0;
          
          if (totalEstimate === 0 && total > 0) {
            totalEstimate = total;
          }

          if (!contacts || contacts.length === 0) {
            hasMore = false;
            break;
          }

          sendEvent(controller, 'progress', { 
            stage: 'processing', 
            message: `Processing ${contacts.length} contacts from batch ${batchNumber}...`,
            syncedCount,
            totalEstimate,
            batchNumber,
            batchSize: contacts.length,
            progress: 10 + (totalEstimate > 0 ? (syncedCount / totalEstimate) * 85 : 0)
          });

          // Batch upsert all contacts at once (much faster than individual queries)
          try {
            const accountTimezone = account.business_timezone || 'UTC';
            const contactsToUpsert = contacts.map((ghlContact: any) => 
              mapGHLContactToSupabase(ghlContact, accountId, accountTimezone)
            );

            const { error: upsertError, count } = await supabase
              .from('contacts')
              .upsert(contactsToUpsert, {
                onConflict: 'account_id,ghl_contact_id',
                ignoreDuplicates: false
              })
              .select('id', { count: 'exact' });

            if (!upsertError) {
              syncedCount += contacts.length;
            } else {
              console.error('Batch upsert error:', upsertError);
            }
          } catch (error) {
            console.error('Error processing batch:', error);
          }

          // Send progress after batch
          sendEvent(controller, 'progress', { 
            stage: 'processing', 
            message: `Batch ${batchNumber} complete. ${syncedCount} contacts synced so far...`,
            syncedCount,
            totalEstimate,
            batchNumber,
            progress: 10 + (totalEstimate > 0 ? (syncedCount / totalEstimate) * 85 : 0)
          });

          // Pagination
          if (contacts.length === limit) {
            const lastContact = contacts[contacts.length - 1];
            if (lastContact.searchAfter) {
              searchAfter = lastContact.searchAfter;
            } else {
              searchAfter = [
                new Date(lastContact.dateAdded || lastContact.dateUpdated || new Date()).getTime(), 
                lastContact.id
              ];
            }
          } else {
            hasMore = false;
          }

          // Rate limiting (GHL allows 120 req/min = 2/sec, so 100ms = 10/sec is safe)
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Send completion event
        sendEvent(controller, 'complete', { 
          success: true,
          syncedCount,
          totalEstimate,
          message: `Successfully synced ${syncedCount} contacts from GoHighLevel`,
          progress: 100
        });

        controller.close();

      } catch (error: any) {
        console.error('Sync error:', error);
        sendEvent(controller, 'error', { 
          error: error.message || 'Internal server error' 
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Helper function to map GHL contact to Supabase format with timezone-aware local dates
function mapGHLContactToSupabase(ghlContact: any, accountId: string, accountTimezone: string = 'UTC') {
  const firstName = ghlContact.firstName || null;
  const lastName = ghlContact.lastName || null;
  const name = ghlContact.name || [firstName, lastName].filter(Boolean).join(' ') || null;
  
  // Use contact's timezone if available, otherwise use account timezone
  const timezone = ghlContact.timezone || accountTimezone;
  
  // Calculate local dates based on when contact was created in GHL
  const createdAtDate = ghlContact.dateAdded ? new Date(ghlContact.dateAdded) : new Date();
  const ghlCreatedAt = createdAtDate.toISOString();
  
  // Convert UTC timestamp to local timezone for date calculations
  const localDate = utcToZonedTime(createdAtDate, timezone);
  
  // Calculate local date fields (YYYY-MM-DD format)
  const ghlLocalDate = formatInTimeZone(localDate, timezone, 'yyyy-MM-dd');
  
  // Calculate start of week (Monday) in local timezone
  const weekStart = startOfWeek(localDate, { weekStartsOn: 1 }); // Monday = 1
  const ghlLocalWeek = formatInTimeZone(weekStart, timezone, 'yyyy-MM-dd');
  
  // Calculate start of month in local timezone
  const monthStart = startOfMonth(localDate);
  const ghlLocalMonth = formatInTimeZone(monthStart, timezone, 'yyyy-MM-dd');

  return {
    account_id: accountId,
    ghl_contact_id: ghlContact.id,
    first_name: firstName,
    last_name: lastName,
    name,
    email: ghlContact.email || null,
    phone: ghlContact.phone || null,
    source: ghlContact.source || null,
    timezone: timezone,
    assigned_to: ghlContact.assignedTo || null,
    date_added: ghlContact.dateAdded ? new Date(ghlContact.dateAdded).toISOString() : new Date().toISOString(),
    date_updated: ghlContact.dateUpdated ? new Date(ghlContact.dateUpdated).toISOString() : new Date().toISOString(),
    ghl_created_at: ghlCreatedAt,
    ghl_local_date: ghlLocalDate,
    ghl_local_week: ghlLocalWeek,
    ghl_local_month: ghlLocalMonth,
    tags: Array.isArray(ghlContact.tags) ? ghlContact.tags : [],
    custom_fields: ghlContact.customFields || null,
    // Address fields
    address: ghlContact.address1 || null,
    city: ghlContact.city || null,
    state: ghlContact.state || null,
    country: ghlContact.country || null,
    postal_code: ghlContact.postalCode || null,
    // Additional fields
    company: ghlContact.companyName || null,
    website: ghlContact.website || null,
    do_not_contact: ghlContact.dnd || false,
  };
}

