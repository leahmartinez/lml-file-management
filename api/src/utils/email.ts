import { InvocationContext } from '@azure/functions';
import { EmailClient } from '@azure/communication-email';

// Check if running locally or in production
const IS_LOCAL = !process.env.AZURE_COMMUNICATION_CONNECTION_STRING ||
                 process.env.AZURE_COMMUNICATION_CONNECTION_STRING === 'your-connection-string-here';

// Email client for Azure Communication Services
let emailClient: EmailClient | null = null;

// Initialize email client
function getEmailClient(): EmailClient | null {
  if (IS_LOCAL) {
    console.log('📧 Running in LOCAL mode - email will not be sent');
    return null;
  }

  if (!emailClient) {
    const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
    console.log(`📧 Connection string present: ${!!connectionString}`);
    console.log(`📧 Connection string is not placeholder: ${connectionString !== 'your-connection-string-here'}`);

    if (connectionString && connectionString !== 'your-connection-string-here') {
      try {
        emailClient = new EmailClient(connectionString);
        console.log('📧 EmailClient created successfully');
      } catch (error: any) {
        console.error('❌ Failed to create EmailClient:', error.message);
        throw new Error(`Failed to initialize EmailClient: ${error.message}`);
      }
    } else {
      console.error('❌ No valid connection string found');
    }
  }

  return emailClient;
}

// Sender email address - must be a verified sender in Azure Communication Services
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@lmllift.com';

export interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

/**
 * Send an email
 * In local mode: logs to console
 * In production: uses Azure Communication Services
 */
export async function sendEmail(options: EmailOptions, context?: InvocationContext): Promise<void> {
  if (IS_LOCAL) {
    // Local development - log to console
    console.log('\n📧 ===== EMAIL (Local Development) =====');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('------- HTML Body -------');
    console.log(options.htmlBody);
    console.log('=========================\n');

    if (context) {
      context.log(`📧 Email would be sent to: ${options.to}`);
      context.log(`Subject: ${options.subject}`);
    }
    return;
  }

  try {
    if (!process.env.SENDER_EMAIL) {
      throw new Error('SENDER_EMAIL is not configured');
    }
    const client = getEmailClient();
    if (!client) {
      throw new Error('Email service not configured. Please set AZURE_COMMUNICATION_CONNECTION_STRING.');
    }

    context?.log(`📧 Preparing to send email from ${SENDER_EMAIL} to ${options.to}`);
    context?.log(`Subject: ${options.subject}`);

    const poller = await client.beginSend({
      senderAddress: SENDER_EMAIL,
      content: {
        subject: options.subject,
        html: options.htmlBody,
        plainText: options.textBody || stripHtmlTags(options.htmlBody),
      },
      recipients: {
        to: [{ address: options.to }],
      },
    });

    context?.log(`📧 Email send initiated, polling for completion...`);

    // Wait for the email to be sent
    const result = await poller.pollUntilDone();

    context?.log(`✅ Email sent successfully to ${options.to}. Message ID: ${result.id}`);
    console.log(`✅ Email sent successfully to ${options.to}. Message ID: ${result.id}`);
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error sending email';
    const errorDetails = JSON.stringify(error, null, 2);
    console.error(`❌ Failed to send email to ${options.to}: ${errorMessage}`);
    console.error(`Error details: ${errorDetails}`);

    if (context) {
      context.error(`❌ Failed to send email to ${options.to}: ${errorMessage}`);
      context.error(`Error details: ${errorDetails}`);
    }

    throw new Error(errorMessage);
  }
}

/**
 * Strip HTML tags from a string
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  context?: InvocationContext
): Promise<void> {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:8080'}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
          <p>Welcome to LML File Management!</p>
          <p>Please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <p>Once verified, your account will be pending admin approval before you can access the system.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>LML File Management - LML Lift Consultants</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Verify Your Email Address

    Welcome to LML File Management!

    Please verify your email address by visiting this link:
    ${verificationUrl}

    This link will expire in 24 hours.

    Once verified, your account will be pending admin approval before you can access the system.

    If you didn't create an account, you can safely ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: 'Verify Your Email - LML File Management',
    htmlBody,
    textBody,
  }, context);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  context?: InvocationContext
): Promise<void> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:8080'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background-color: #DC2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>We received a request to reset your password for your LML File Management account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #DC2626;">${resetUrl}</p>
          <div class="warning">
            <p><strong>⚠️ Important:</strong></p>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>For security reasons, you can only use this link once</li>
            </ul>
          </div>
          <p>If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.</p>
        </div>
        <div class="footer">
          <p>LML File Management - LML Lift Consultants</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Reset Your Password

    We received a request to reset your password for your LML File Management account.

    Visit this link to reset your password:
    ${resetUrl}

    IMPORTANT:
    - This link will expire in 1 hour
    - For security reasons, you can only use this link once

    If you didn't request a password reset, please ignore this email or contact support if you're concerned about your account security.
  `;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - LML File Management',
    htmlBody,
    textBody,
  }, context);
}

/**
 * Send account approved email
 */
export async function sendAccountApprovedEmail(
  email: string,
  context?: InvocationContext
): Promise<void> {
  const loginUrl = `${process.env.APP_URL || 'http://localhost:8080'}/login`;

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background-color: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Account Approved!</h1>
        </div>
        <div class="content">
          <p>Good news! Your LML File Management account has been approved by an administrator.</p>
          <p>You can now log in and access the system:</p>
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Log In Now</a>
          </p>
          <p>If you have any questions, please contact your system administrator.</p>
        </div>
        <div class="footer">
          <p>LML File Management - LML Lift Consultants</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    Account Approved!

    Good news! Your LML File Management account has been approved by an administrator.

    You can now log in at:
    ${loginUrl}

    If you have any questions, please contact your system administrator.
  `;

  await sendEmail({
    to: email,
    subject: 'Account Approved - LML File Management',
    htmlBody,
    textBody,
  }, context);
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  email: string,
  invitationToken: string,
  role: string,
  context?: InvocationContext
): Promise<void> {
  const invitationUrl = `${process.env.APP_URL || 'http://localhost:8080'}/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(email)}`;

  const formatRole = (role: string) => {
    return role.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .info-box { background-color: #EEF2FF; border-left: 4px solid #4F46E5; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited to LML File Management!</h1>
        </div>
        <div class="content">
          <p>You've been invited to join LML File Management as a <strong>${formatRole(role)}</strong>.</p>
          <p>Click the button below to accept your invitation and set up your account:</p>
          <p style="text-align: center;">
            <a href="${invitationUrl}" class="button">Accept Invitation</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #4F46E5;">${invitationUrl}</p>
          <div class="info-box">
            <p><strong>What happens next:</strong></p>
            <ol>
              <li>Click the invitation link above</li>
              <li>Set your password for the account</li>
              <li>Your account will be pending admin approval</li>
              <li>You'll receive an email when approved and can log in</li>
            </ol>
          </div>
          <p><strong>This invitation link will expire in 7 days.</strong></p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>LML File Management - LML Lift Consultants</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textBody = `
    You're Invited to LML File Management!

    You've been invited to join LML File Management as a ${formatRole(role)}.

    Accept your invitation by visiting this link:
    ${invitationUrl}

    What happens next:
    1. Click the invitation link above
    2. Set your password for the account
    3. Your account will be pending admin approval
    4. You'll receive an email when approved and can log in

    This invitation link will expire in 7 days.

    If you didn't expect this invitation, you can safely ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: 'Invitation to LML File Management',
    htmlBody,
    textBody,
  }, context);
}
