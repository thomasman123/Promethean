# Production Deployment Checklist

## Current Issue: `createClient is not a function` Error

This error appears even after fixing all components, which indicates an **environment or build issue** in production.

## ✅ What We Fixed
- **28 components** now use the shared Supabase client from `@/lib/supabase`
- All `createBrowserClient` instances removed except the shared client
- Added environment variable validation to the shared client

## 🔍 Troubleshooting Steps

### 1. Check Environment Variables (MOST LIKELY ISSUE)

The error happens when environment variables aren't available during build or runtime.

**Vercel:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Ensure these are set for **Production**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for API routes)

**Check if variables are accessible:**
```bash
# In production, check the browser console
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

If this returns `undefined`, the variables aren't set properly.

### 2. Clear Build Cache

Sometimes old builds get cached. Force a fresh build:

**Vercel:**
```bash
vercel --force
```

Or in the Vercel dashboard:
1. Go to Deployments
2. Click "..." on the latest deployment
3. Select "Redeploy"
4. Check "Use existing Build Cache" is **OFF**

**Other platforms:**
- Clear build cache in your CI/CD settings
- Delete `.next` folder and rebuild

### 3. Verify Package Installation

Ensure `@supabase/ssr` is in `dependencies` (not `devDependencies`):

```json
"dependencies": {
  "@supabase/ssr": "^0.6.1",
  "@supabase/supabase-js": "^2.53.0"
}
```

### 4. Check Build Logs

Look for errors in your deployment logs:
- "Module not found" errors
- Environment variable warnings
- Build failures

### 5. Test Locally in Production Mode

```bash
npm run build
npm run start
```

This simulates production and will show if the issue is local or environment-specific.

## 🚨 Quick Fix If Environment Variables Are Missing

If you can't access the deployment settings immediately, you can temporarily hardcode them (NOT RECOMMENDED FOR PRODUCTION):

```typescript
// src/lib/supabase.ts (TEMPORARY ONLY)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'
```

⚠️ **Remove this after proper environment setup!**

## 📝 Verification

After fixing, verify:
1. Clear browser cache (Cmd/Ctrl + Shift + R)
2. Open browser console
3. Navigate to account settings
4. Check for errors

## Common Issues

### Issue: "Still seeing error after redeployment"
**Solution:** Browser cache. Do a hard refresh (Ctrl+Shift+R) or open in incognito.

### Issue: "Works locally but not in production"
**Solution:** Environment variables are not set in production deployment platform.

### Issue: "Environment variables are set but still failing"
**Solution:** 
1. Variable names must be **exactly** as shown (case-sensitive)
2. Must include `NEXT_PUBLIC_` prefix for client-side access
3. Redeploy after adding variables (they're not applied to existing deployments)

## Next Steps

1. ✅ Push the latest code: `git push`
2. ✅ Verify environment variables in deployment platform
3. ✅ Trigger new deployment (or wait for auto-deploy)
4. ✅ Clear browser cache and test
5. ✅ Check browser console for better error messages (we added validation)

If you see:
```
Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.
```

This confirms the issue is missing environment variables in production.

