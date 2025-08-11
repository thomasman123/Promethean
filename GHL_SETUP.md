# GoHighLevel Integration Setup

This guide will help you set up the GoHighLevel (GHL) v2 API connection through the marketplace app system.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# GoHighLevel API Configuration
GHL_CLIENT_ID=your_ghl_client_id_here
GHL_CLIENT_SECRET=your_ghl_client_secret_here
NEXT_PUBLIC_GHL_CLIENT_ID=your_ghl_client_id_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## GoHighLevel Marketplace App Setup

1. **Create a Marketplace App**
   - Go to [https://marketplace.gohighlevel.com](https://marketplace.gohighlevel.com)
   - Sign up for a developer account  
   - Create a new app
   - **Note**: The OAuth flow will use the GoHighLevel marketplace interface, but API calls use leadconnectorhq.com endpoints

2. **Configure App Settings**
   - **App Type**: Public
   - **Distribution Type**: Sub Account
   - **Redirect URI**: `http://localhost:3000/api/auth/callback` (or your production URL)
   - **App Name**: Your app name
   - **Description**: Brief description of your app

3. **Required Scopes**
   Add these scopes to your marketplace app (you can remove any you don't need):
   - `contacts.readonly`
   - `contacts.write`
   - `opportunities.readonly`
   - `opportunities.write`
   - `calendars.readonly`
   - `calendars.write`
   - `conversations.readonly`
   - `conversations.write`
   - `locations.readonly`
   - `businesses.readonly`
   - `users.readonly`

4. **Get Client Credentials**
   - Generate client credentials in your app settings
   - Copy the Client ID and Client Secret
   - Add them to your environment variables

## Database Migration

Run the database migration to create the GHL connections table:

```bash
# GHL integration now uses accounts.* columns instead of separate ghl_connections table
# All migrations have been updated to use accounts table for GHL data
```

## How the Integration Works

1. **Connection Process**
   - Users navigate to Account > CRM Connection
   - Click "Connect to GoHighLevel"
   - Complete OAuth flow with GHL
   - Connection is saved to the selected account

2. **Account-Based Connections**
   - Each connection is tied to a specific account in your system
   - Users must select an account before connecting
   - Only moderators and admins can manage connections

3. **OAuth Flow**
   - Uses GHL's marketplace app OAuth 2.0 flow
   - Comprehensive scopes for full API access
   - Tokens are stored securely with expiration handling

## Features

- ✅ OAuth 2.0 connection flow
- ✅ Account-based connection management
- ✅ Comprehensive scope access
- ✅ Token refresh handling
- ✅ Connection status tracking
- ✅ Error handling and user feedback
- ✅ Role-based access control

## Next Steps

After setting up the basic connection, you can:

1. **Add Webhook Endpoints**: Implement webhook handlers for real-time data sync
2. **Build API Integrations**: Use the stored tokens to make GHL API calls
3. **Add Data Sync**: Implement bidirectional data synchronization
4. **Customize Scopes**: Remove unnecessary scopes from the marketplace app

## Security Notes

- Tokens are stored encrypted in the database
- All connections use RLS (Row Level Security)
- OAuth state parameter prevents CSRF attacks
- Environment variables should never be committed to version control 