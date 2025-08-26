# Promethean - Lead Attribution & Analytics Platform

This is a [Next.js](https://nextjs.org) project for lead attribution, appointment booking analytics, and GoHighLevel CRM integration.

## 🚨 CRITICAL SYSTEM WARNING

**Before making ANY changes to this codebase**, please read the [WEBHOOK_PROTECTION.md](./WEBHOOK_PROTECTION.md) document.

### 🔐 Mission-Critical Files
The following files control live revenue attribution and **MUST NOT** be modified without explicit approval:
- `/src/app/api/webhook/call-events/route.ts` - **MAIN WEBHOOK PROCESSOR**
- `/src/app/api/webhooks/status/route.ts` - Webhook monitoring
- `/src/app/api/webhooks/subscribe/route.ts` - Webhook subscription
- `/src/app/api/auth/callback/route.ts` - Auto-webhook setup

**⚠️ Modifying webhook code without approval can break:**
- Revenue attribution systems
- Customer appointment tracking  
- Lead quality scoring
- Real-time analytics dashboard
- GoHighLevel CRM synchronization

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## System Architecture

### Core Features
- **Lead Attribution**: Tracks marketing source attribution with UTM parameters
- **Appointment Analytics**: Real-time appointment booking and outcome tracking
- **Phone Call Integration**: Links outbound calls to appointments for conversion tracking
- **GoHighLevel Sync**: Bidirectional synchronization with GHL CRM
- **Multi-tenant**: Account-based separation with role-based access

### Key Technologies
- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Integrations**: GoHighLevel API, OAuth2, Webhooks
- **Authentication**: Supabase Auth with RLS policies

## 📋 Development Guidelines

### Safe Development Areas
✅ UI components in `/src/components/`
✅ Dashboard visualizations 
✅ Authentication flows
✅ Database queries (non-webhook related)
✅ Styling and layout improvements

### Restricted Areas (Approval Required)
🚫 Webhook processing logic
🚫 GHL API integration endpoints
🚫 Attribution calculation algorithms
🚫 Critical database triggers and functions

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
