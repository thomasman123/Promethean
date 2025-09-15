# GoHighLevel App Setup Checklist

## App Creation Checklist

### 1. Basic App Configuration
- [ ] App Name is set
- [ ] App Type: **Public** (not Private)
- [ ] Distribution: **Sub Account**
- [ ] App Logo uploaded (optional but recommended)

### 2. OAuth & Redirect Configuration
- [ ] OAuth Redirect URI: `https://www.getpromethean.com/api/auth/callback`
  - **MUST BE EXACT** - no trailing slash, correct protocol (https)
  - For local dev: `http://localhost:3000/api/auth/callback`

### 3. Required Scopes
All of these must be enabled:
- [ ] `contacts.readonly`
- [ ] `contacts.write`
- [ ] `opportunities.readonly`
- [ ] `opportunities.write`
- [ ] `calendars.readonly`
- [ ] `calendars.write`
- [ ] `conversations.readonly`
- [ ] `conversations.write`
- [ ] `locations.readonly`
- [ ] `businesses.readonly`
- [ ] `users.readonly`

### 4. App Publishing
- [ ] Click "Save" after all settings
- [ ] Click "Submit for Review" or "Publish"
- [ ] Wait for status to show "Active" or "Published"
- [ ] If there's a "Test in Sandbox" option, try that first

### 5. Webhook Configuration (Optional)
- [ ] Webhook URL: `https://www.getpromethean.com/api/webhook/call-events`
- [ ] Events to subscribe (if setting up webhooks):
  - `OutboundMessage`
  - `InboundMessage`
  - `AppointmentCreate`
  - `AppointmentUpdate`

## Common Issues & Solutions

### Still Getting 404?

1. **App Not Published**
   - Go back to marketplace
   - Find your app
   - Look for "Publish" or "Submit" button
   - Status should show "Active" not "Draft"

2. **Try Alternative URLs**
   - Instead of `/oauth/authorize`, try `/oauth/chooselocation`
   - Some apps work with one but not the other

3. **Redirect URI Mismatch**
   - Copy the EXACT redirect URI from your app
   - Make sure there's no trailing slash difference
   - Check http vs https

4. **Wait Time**
   - New apps sometimes take 5-10 minutes to propagate
   - Try again after a short wait

## Testing Your App

1. Open browser console (F12)
2. Try to connect
3. Check for the exact OAuth URL being used
4. Copy the client_id from the URL
5. Verify it matches your app in the marketplace 