# Email Service Implementation Guide

## Overview

The LML Work Management application now includes **Azure Communication Services (ACS) Email** integration for sending transactional emails. This guide explains the implementation, setup, and deployment of the email service.

---

## What's Implemented

### Email Types
The system supports the following email templates:

1. **Verification Email** - Sent when users register
2. **Password Reset Email** - Sent when users request password reset
3. **Account Approved Email** - Sent when admin approves a user's account
4. **Invitation Email** - Sent when admin invites a new user

### Features

✅ **Local Development Support**
- In local mode, emails are logged to console instead of actually sent
- No need to configure Azure services for local development

✅ **Production Email Sending**
- Uses Azure Communication Services for reliable email delivery
- Graceful error handling that doesn't break registration/password reset flows
- Professional HTML and plain text email templates

✅ **Error Resilience**
- Email failures don't block user registration or other operations
- Errors are logged but don't cause 500 responses
- Users can still proceed even if emails fail to send

---

## Setup Instructions

### Prerequisites

1. An Azure Subscription (free tier available)
2. An Azure Communication Services resource
3. A verified email address or domain in Azure Communication Services

### Step 1: Create Azure Communication Services Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Communication Services"
4. Click "Create"
5. Fill in the details:
   - **Resource Group**: `lml-rg` (or your resource group)
   - **Resource Name**: `lml-email` (or your preferred name)
   - **Data Location**: Select a region close to you
6. Click "Review + Create" → "Create"
7. Wait for deployment to complete

### Step 2: Set Up Email Domain/Sender

After creating the Communication Services resource, you have two options:

#### Option A: Use Azure Managed Domain (Easiest)
1. In your Communication Services resource, click **Domains** (left sidebar)
2. Click **+ New Domain**
3. Select **Azure Managed Domain**
4. Enter a subdomain name (e.g., `notification`)
5. Click **Create**
6. Wait for verification to complete
7. Copy the generated email address (e.g., `DoNotReply@notification.xyz.com`)

#### Option B: Use Your Own Domain (Recommended for Production)
1. In your Communication Services resource, click **Domains** (left sidebar)
2. Click **+ New Domain**
3. Select **Custom Domain**
4. Enter your domain name
5. Follow DNS verification steps
6. Copy your sender email address (e.g., `noreply@yourdomain.com`)

### Step 3: Get Connection String

1. In your Communication Services resource, click **Keys** (left sidebar)
2. Copy the **Primary Connection String**
3. This will be your `AZURE_COMMUNICATION_CONNECTION_STRING`

### Step 4: Configure Environment Variables

Add these environment variables to your Azure Function App:

**Via Azure Portal:**
1. Go to your Function App: `lml-api-flex`
2. Click **Configuration** (left sidebar)
3. Click **+ New application setting**
4. Add the following settings:

| Name | Value |
|------|-------|
| `AZURE_COMMUNICATION_CONNECTION_STRING` | `DefaultEndpointProtocol=https;EndpointSuffix=communication.azure.com;AccessKey=YOUR_KEY_HERE;Endpoint=https://YOUR_NAME.communication.azure.com/` |
| `SENDER_EMAIL` | `noreply@yourdomain.com` (or your Azure managed domain email) |
| `APP_URL` | `https://your-frontend-url.azurestaticapps.net` |

5. Click **Save**

### Step 5: Deploy Updated API

Push the `dev` branch with the email service implementation:

```bash
cd c:\Users\leahmartinez\lml-file-management
git checkout main
git merge dev
git push origin main
```

This will trigger the Azure Function App deployment with the new email service.

---

## Local Development

### Testing Emails Locally

When running locally, emails are automatically logged to the console instead of sent:

```bash
cd api
npm run dev
```

When you trigger email-sending actions (register, password reset, etc.), you'll see output like:

```
📧 ===== EMAIL (Local Development) =====
To: user@example.com
Subject: Verify Your Email - LML Work Management
------- HTML Body -------
<!DOCTYPE html>
...
=========================
```

### Configuration for Local Development

Local development automatically detects the environment and logs emails to console. No Azure configuration needed!

---

## File Structure

```
api/src/utils/
├── email.ts                 # Main email service (new)
├── auth.ts                  # Authentication utilities
├── response.ts              # HTTP response utilities
└── ...
```

### email.ts Components

- **sendEmail()** - Core function to send emails via Azure Communication Services
- **sendVerificationEmail()** - Email verification flow
- **sendPasswordResetEmail()** - Password reset flow
- **sendAccountApprovedEmail()** - Account approval notifications
- **sendInvitationEmail()** - User invitations
- **stripHtmlTags()** - Helper for plain text generation

---

## Testing

### Test Verification Email

```bash
curl -X POST https://your-api.azurewebsites.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

Check Azure Communication Services dashboard to verify email was sent.

### Monitor Email Status

1. Go to Azure Communication Services resource
2. Click **Logs** (left sidebar)
3. View sent emails and delivery status

---

## Troubleshooting

### Issue: "Email service not configured"

**Solution**: Check that `AZURE_COMMUNICATION_CONNECTION_STRING` is set in Azure Function App configuration.

### Issue: Emails not being delivered

**Possible Causes**:
- Sender email not verified in Azure Communication Services
- Invalid recipient email address
- Email domain not properly set up

**Solution**:
1. Verify sender email in Azure Portal → Communication Services → Domains
2. Check email address format (must be valid)
3. Review Azure Communication Services logs for delivery errors

### Issue: Incorrect sender address

**Solution**: Update `SENDER_EMAIL` environment variable to match your verified domain:
```
Azure Portal → Function App → Configuration → Edit SENDER_EMAIL
```

### Issue: Links in emails not working

**Solution**: Update `APP_URL` environment variable to match your frontend URL:
```
Azure Portal → Function App → Configuration → Edit APP_URL
```

Example: `https://your-app.azurestaticapps.net`

---

## Cost Estimation

**Azure Communication Services Pricing:**
- Free: First 100 emails per month
- Pay-as-you-go: ~$0.03 per email after free tier

For a small application with ~50 users per month, costs are minimal.

---

## Email Templates

All emails include:

✅ **Professional Styling**
- Consistent branding with company colors
- Responsive design for mobile devices
- Clear call-to-action buttons

✅ **Dual Format**
- HTML version for rich formatting
- Plain text version for email clients that don't support HTML

✅ **Security Features**
- Links include secure tokens
- Time-expiring verification/reset links
- Clear instructions about account security

---

## Production Deployment Checklist

- [ ] Azure Communication Services resource created
- [ ] Domain verified and email address configured
- [ ] Connection string obtained
- [ ] Environment variables set in Function App
- [ ] API deployed to production
- [ ] Test email sent successfully
- [ ] Monitor email delivery in Azure dashboard

---

## Additional Resources

- [Azure Communication Services Documentation](https://learn.microsoft.com/en-us/azure/communication-services/)
- [Email Service API Reference](https://learn.microsoft.com/en-us/javascript/api/@azure/communication-email/)
- [Email Sending Limits](https://learn.microsoft.com/en-us/azure/communication-services/concepts/email/email-limits)

---

## Summary

The email service is now fully integrated and ready for:
- ✅ User registration with verification emails
- ✅ Password reset functionality
- ✅ Admin approval notifications
- ✅ User invitations

All email sending is production-ready with Azure Communication Services and will work seamlessly once the environment variables are configured.



