

## 🔧 ENVIRONMENT VARIABLES NEEDED:

Add these to your production environment (Vercel/hosting platform):

\`\`\`bash
# Cron Job Security
CRON_SECRET=your_secure_random_string_here

# Meta Ads API (if not already set)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=https://app.getpromethean.com/api/auth/meta-callback
NEXT_PUBLIC_META_APP_ID=your_meta_app_id

# App URL for auth redirects
NEXT_PUBLIC_APP_URL=https://app.getpromethean.com

# GHL OAuth (if not already set)
GHL_REDIRECT_URI=https://app.getpromethean.com/api/auth/callback

# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`