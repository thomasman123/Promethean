import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database-temp.types";
import { backfillContactGHLDates } from "@/lib/contact-sync-strategy";

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
          message: 'Starting contact dates backfill...',
          progress: 0
        });

        // Get account with GHL credentials
        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('id, name, ghl_api_key, ghl_location_id, ghl_refresh_token, ghl_token_expires_at, ghl_auth_type')
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
          stage: 'preparing', 
          message: 'Checking for contacts that need backfill...',
          progress: 5
        });

        // Get valid access token
        let accessToken = account.ghl_api_key;
        if (account.ghl_auth_type === 'oauth2' && account.ghl_token_expires_at) {
          const expiresAt = new Date(account.ghl_token_expires_at);
          if (expiresAt <= new Date()) {
            sendEvent(controller, 'progress', { 
              stage: 'refreshing', 
              message: 'Refreshing access token...',
              progress: 8
            });
            
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

        sendEvent(controller, 'progress', { 
          stage: 'backfilling', 
          message: 'Starting backfill process...',
          progress: 10
        });

        // Run the backfill with progress callbacks
        const processedCount = await backfillContactGHLDates(
          accountId,
          accessToken,
          account.ghl_location_id,
          (current, total, message) => {
            const progress = 10 + ((current / total) * 85);
            sendEvent(controller, 'progress', { 
              stage: 'backfilling', 
              message,
              current,
              total,
              progress: Math.min(progress, 95)
            });
          }
        );

        // Send completion event
        sendEvent(controller, 'complete', { 
          success: true,
          processedCount,
          message: `Successfully updated ${processedCount} contacts with GHL creation dates`,
          progress: 100
        });

        controller.close();

      } catch (error: any) {
        console.error('Backfill error:', error);
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

