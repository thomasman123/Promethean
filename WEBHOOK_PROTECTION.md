# 🚨 WEBHOOK PROTECTION DOCUMENTATION

## CRITICAL SYSTEM WARNING

This document outlines the **mission-critical nature** of the webhook system in the Promethean application and the **strict protection measures** that must be followed.

## 🔐 Protected Files

The following files are **MISSION CRITICAL** and require explicit approval before any modifications:

### Primary Webhook Endpoints
- `/src/app/api/webhook/call-events/route.ts` - **MAIN WEBHOOK PROCESSOR**
- `/src/app/api/webhooks/status/route.ts` - Webhook status monitoring
- `/src/app/api/webhooks/subscribe/route.ts` - Webhook subscription management
- `/src/app/api/auth/callback/route.ts` - Contains auto-webhook subscription logic

## ⚠️ MODIFICATION RESTRICTIONS

### 🚫 NEVER MODIFY WITHOUT EXPLICIT APPROVAL:
1. **Webhook endpoint URLs** (`/api/webhook/call-events`)
2. **Event type handling** (OutboundMessage, InboundMessage, AppointmentCreate, etc.)
3. **Signature verification logic**
4. **Authentication mechanisms**
5. **Appointment linking algorithms**
6. **Dial processing and attribution logic**
7. **Database insertion patterns**
8. **Error handling for critical paths**

### 🔄 SAFE MODIFICATIONS (with caution):
- Console logging and debugging statements
- Non-critical error messages
- Performance monitoring additions
- Documentation updates

## 💥 SYSTEM DEPENDENCIES

The webhook system is critical for:

### 📞 **Revenue Attribution**
- Links phone calls to appointments
- Tracks conversion pipelines
- Calculates ROI on marketing spend

### 🎯 **Lead Quality Scoring** 
- Assigns lead values based on interaction patterns
- Tracks setter performance metrics
- Measures appointment quality

### 📊 **Real-time Analytics**
- Dashboard metrics calculations
- Performance tracking
- Business intelligence reporting

### 🔗 **CRM Synchronization**
- GoHighLevel contact management
- Appointment status updates
- Custom field mapping

## 🛡️ PROTECTION MECHANISMS

### 1. Code Comments
- Prominent warning comments at file tops
- Inline protection notices for critical sections
- Change approval requirements documented

### 2. Runtime Integrity Checks
- Webhook protection metadata validation
- Function existence verification
- Critical path monitoring

### 3. Documentation Requirements
- This protection document
- README.md warnings
- Inline code documentation

### 4. Review Process
- **MANDATORY**: Explicit approval for webhook changes
- **REQUIRED**: Staging environment testing
- **ESSENTIAL**: Post-deployment monitoring

## 🚨 EMERGENCY PROCEDURES

### If Webhooks Break:
1. **IMMEDIATE**: Revert to last known working version
2. **CHECK**: Webhook logs in Supabase `webhook_logs` table
3. **VERIFY**: GHL webhook subscription status
4. **MONITOR**: Real-time appointment processing
5. **ESCALATE**: If revenue attribution stops working

### Recovery Steps:
```bash
# 1. Check webhook status
curl -X GET "https://yourapp.com/api/webhooks/status?accountId=ACCOUNT_ID"

# 2. Re-subscribe webhooks if needed
curl -X POST "https://yourapp.com/api/webhooks/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "ACCOUNT_ID"}'

# 3. Monitor webhook logs
# Check Supabase webhook_logs table for recent entries
```

## 📋 CHANGE CHECKLIST

Before modifying ANY webhook code:

- [ ] **Explicit approval obtained** for the specific change
- [ ] **Backup created** of current working version
- [ ] **Understanding confirmed** of change impact
- [ ] **Staging environment** available for testing
- [ ] **Rollback plan** prepared
- [ ] **Monitoring strategy** defined for post-deployment
- [ ] **Documentation updated** to reflect changes

## 🕐 LAST VERIFIED WORKING

- **Date**: January 28, 2025
- **Version**: Current production deployment
- **Status**: All webhook endpoints operational
- **GHL Integration**: Fully functional
- **Attribution System**: Processing correctly

## 📞 ESCALATION CONTACTS

When webhook issues occur:
1. **Immediate**: Check webhook logs and status endpoints
2. **System-wide impact**: Follow emergency procedures above
3. **Data loss risk**: Prioritize data integrity over feature additions

---

**Remember**: The webhook system handles live customer data and revenue attribution. A single incorrect change can impact business operations immediately. When in doubt, **DO NOT MODIFY**.

**Last Updated**: January 28, 2025 