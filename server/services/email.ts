import nodemailer from 'nodemailer';
import { storage } from '../storage';

// Types for email notifications
export interface EmailNotification {
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter with current settings
 * This should be called whenever email settings are updated
 */
export async function initializeEmailTransporter(): Promise<boolean> {
  try {
    // Get the current settings
    const settings = await storage.getSettings();
    
    // If email is not enabled, don't initialize
    if (!settings.enableEmails) {
      console.log('Email notifications are disabled');
      transporter = null;
      return false;
    }
    
    // Check if required settings are available
    if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPassword) {
      console.log('Missing required email settings');
      transporter = null;
      return false;
    }
    
    // Create transporter
    transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    });
    
    // Verify connection
    await transporter.verify();
    console.log('Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    transporter = null;
    return false;
  }
}

/**
 * Send an email notification
 */
export async function sendEmailNotification(notification: EmailNotification): Promise<boolean> {
  try {
    // Get current settings
    const settings = await storage.getSettings();
    
    // If email is not enabled or missing required settings, don't send
    if (!settings.enableEmails || !settings.emailAddress || !transporter) {
      console.log('Email notifications are disabled or not configured');
      return false;
    }
    
    // Send email
    const info = await transporter.sendMail({
      from: settings.smtpSender || `"Tech Portal" <${settings.smtpUser}>`,
      to: settings.emailAddress,
      subject: notification.subject,
      text: notification.text || notification.html.replace(/<[^>]*>/g, ''), // Strip HTML as fallback
      html: notification.html,
    });
    
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    
    // Reinitialize transporter in case settings changed
    await initializeEmailTransporter();
    return false;
  }
}

/**
 * Send app status change notification
 */
export async function sendAppStatusChangeNotification(
  appName: string, 
  prevStatus: string, 
  newStatus: string
): Promise<boolean> {
  const subject = `App Status Change: ${appName} is now ${newStatus}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">App Status Change</h1>
      <p>The status of <strong>${appName}</strong> has changed from <strong>${prevStatus}</strong> to <strong>${newStatus}</strong>.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: ${getStatusColor(newStatus)}; color: white; border-radius: 5px;">
        <strong>Current Status: ${newStatus}</strong>
      </div>
      <p>This notification was sent automatically by Tech Portal.</p>
      <p style="font-size: 12px; color: #777; margin-top: 30px;">
        You're receiving this email because you've enabled email notifications in Tech Portal settings.
      </p>
    </div>
  `;
  
  return sendEmailNotification({ subject, html });
}

/**
 * Send endpoint status change notification
 */
export async function sendEndpointStatusChangeNotification(
  appName: string,
  endpointPath: string,
  prevStatus: string,
  newStatus: string
): Promise<boolean> {
  const subject = `Endpoint Status Change: ${appName} - ${endpointPath}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Endpoint Status Alert</h1>
      <p>The endpoint <strong>${endpointPath}</strong> for <strong>${appName}</strong> has changed status from <strong>${prevStatus}</strong> to <strong>${newStatus}</strong>.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: ${getStatusColor(newStatus)}; color: white; border-radius: 5px;">
        <strong>Current Status: ${newStatus}</strong>
      </div>
      <p>This notification was sent automatically by Tech Portal.</p>
      <p style="font-size: 12px; color: #777; margin-top: 30px;">
        You're receiving this email because you've enabled email notifications in Tech Portal settings.
      </p>
    </div>
  `;
  
  return sendEmailNotification({ subject, html });
}

/**
 * Send a test email notification
 */
export async function sendTestEmailNotification(emailAddress: string): Promise<boolean> {
  const subject = 'Tech Portal: Test Email Notification';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Test Email from Tech Portal</h1>
      <p>This is a test email from Tech Portal to verify that your email notification settings are working correctly.</p>
      <div style="margin: 20px 0; padding: 15px; background-color: #4CAF50; color: white; border-radius: 5px;">
        <strong>Success! If you're reading this, your email settings are configured correctly.</strong>
      </div>
      <p>You can now receive important notifications about your applications.</p>
      <p style="font-size: 12px; color: #777; margin-top: 30px;">
        You're receiving this email because you've enabled email notifications in Tech Portal settings.
      </p>
    </div>
  `;
  
  // Override the recipient address for testing
  try {
    // Get current settings
    const settings = await storage.getSettings();
    
    // If email is disabled or transporter not initialized, initialize it
    if (!transporter) {
      await initializeEmailTransporter();
    }
    
    // If still not initialized, return false
    if (!transporter) {
      return false;
    }
    
    // Send test email
    const info = await transporter.sendMail({
      from: settings.smtpSender || `"Tech Portal" <${settings.smtpUser}>`,
      to: emailAddress,
      subject,
      html,
    });
    
    console.log('Test email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send test email:', error);
    return false;
  }
}

// Helper function to get color for status
function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
    case 'up':
      return '#4CAF50'; // Green
    case 'stopped':
      return '#2196F3'; // Blue
    case 'unreachable':
    case 'down':
    case 'degraded':
      return '#FF9800'; // Orange
    case 'error':
      return '#F44336'; // Red
    default:
      return '#9E9E9E'; // Grey
  }
}