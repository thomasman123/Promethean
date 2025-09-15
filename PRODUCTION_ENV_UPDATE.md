# Production Environment Variables Update

Update these environment variables in your production deployment (Vercel/Netlify/etc):

```bash
# GoHighLevel OAuth Configuration - UPDATED CLIENT ID
GHL_CLIENT_ID=687ac40ba336fa240d35a751-md9dlifq
GHL_CLIENT_SECRET=e05056c2-f60f-46ec-8469-f0cb31f802f9
NEXT_PUBLIC_GHL_CLIENT_ID=687ac40ba336fa240d35a751-md9dlifq
```

## Deployment Platforms

### Vercel
1. Go to your project dashboard
2. Click on "Settings" → "Environment Variables"
3. Add or update each variable above
4. Redeploy your application

### Railway/Render/Other
1. Navigate to your project's environment settings
2. Update the variables listed above
3. Trigger a new deployment

## Important Notes

- The old client ID (`687ac40ba336fa240d35a751-me6izrdp`) is no longer valid
- Make sure to update ALL three GHL-related variables
- After updating, you may need to clear your browser cache
- Test the OAuth flow after deployment to ensure it works correctly

## Verification

After deploying with the new credentials:
1. Go to Account → GoHighLevel Connection
2. Click "Connect to GoHighLevel"
3. You should be redirected to the GHL OAuth page (not a 404)
4. Complete the authorization flow 