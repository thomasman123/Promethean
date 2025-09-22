

## 🔧 ENVIRONMENT VARIABLES NEEDED:

Add these to your production environment (Vercel/hosting platform):

\`\`\`bash
# Cron Job Security
CRON_SECRET=your_secure_random_string_here

# Meta Ads API (if not already set)
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_REDIRECT_URI=https://www.getpromethean.com/api/auth/meta-callback
NEXT_PUBLIC_META_APP_ID=your_meta_app_id

# Supabase (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
\`\`\`

## 🎯 CRON_SECRET Generation:
You can generate a secure CRON_SECRET with:
\`\`\`bash
openssl rand -hex 32
\`\`\`

Or use any random string like: \`cron_secret_1758521201_5ce2d1d3d2edc6554e89796206af19b5\`


