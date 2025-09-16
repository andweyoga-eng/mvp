import { google } from 'googleapis';
import path from 'path';

if (!process.env.GMAIL_USER || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Gmail API credentials not found. Please set GMAIL_USER, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET environment variables.");
}

// Configure OAuth2 client for Gmail API
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // For service-style authentication
);

// For deployment, we'll use service account style authentication
// This requires the app password as a refresh token equivalent
oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_APP_PASSWORD, // Reusing existing secret as refresh token
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const fromEmail = options.from || `"andWeYoga" <${process.env.GMAIL_USER}>`;
    
    // Create the email message in RFC 2822 format
    const emailMessage = [
      `From: ${fromEmail}`,
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      options.html
    ].join('\n');

    // Encode the message in base64url format
    const encodedMessage = Buffer.from(emailMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send the email using Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('Email sent successfully via Gmail API:', response.data.id);
    return true;
  } catch (error) {
    console.error('Failed to send email via Gmail API:', error);
    
    // Fallback to console logging for development/debugging
    console.log('EMAIL FALLBACK - Would have sent:');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML content length:', options.html.length);
    
    // Return true for development to allow authentication flows to continue
    return process.env.NODE_ENV === 'development';
  }
}

export function createVerificationEmailHTML(name: string, verificationUrl: string, logoUrl: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to andWeYoga</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8f9fa;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(64, 30, 156, 0.1);
        }
        .header {
          background: linear-gradient(135deg, hsl(267, 84%, 40%) 0%, hsl(25, 95%, 60%) 100%);
          padding: 40px 20px;
          text-align: center;
          color: white;
        }
        .logo {
          max-width: 150px;
          height: auto;
          margin-bottom: 20px;
        }
        .content {
          padding: 40px 30px;
        }
        .welcome-text {
          color: #401e9c;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
        }
        .message {
          color: #6b46c1;
          font-size: 16px;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .cta-button {
          display: inline-block;
          background-color: #401e9c;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #5b2bbf;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          color: #6b46c1;
          font-size: 14px;
        }
        .inspiration {
          background-color: #f3f0ff;
          padding: 20px;
          border-left: 4px solid #401e9c;
          margin: 20px 0;
          font-style: italic;
          color: #6b46c1;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="andWeYoga Logo" class="logo">
          <h1 style="margin: 0; font-size: 28px;">Welcome to andWeYoga</h1>
        </div>
        
        <div class="content">
          <div class="welcome-text">Namaste, ${name}!</div>
          
          <div class="message">
            Welcome to your transformative yoga journey! We are absolutely thrilled to have you join our vibrant community of yogis.
          </div>
          
          <div class="message">
            Taking this first step towards embracing yoga is truly beautiful. You're not just signing up for classes – you're embarking on a path of self-discovery, growth, and inner transformation.
          </div>
          
          <div class="inspiration">
            "We meet, we greet, we do what we like, and we yoga too." 
            <br><br>
            Our philosophy embraces the journey of finding your best self through yoga, mindfulness, and community. We believe that yoga isn't just about poses – it's about evolving into the most authentic version of yourself, one breath at a time.
          </div>
          
          <div class="message">
            Please confirm your email address to complete your registration and start your journey with us:
          </div>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="cta-button">Confirm Your Email</a>
          </div>
          
          <div class="message">
            Once verified, you'll have full access to book your favorite classes, manage your profile, and connect with our amazing community of practitioners.
          </div>
          
          <div class="message">
            We're here to support you every step of the way as you elevate your being and discover the incredible transformation that awaits you.
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Ready to begin?</strong></p>
          <p>Visit us at andWeYoga.com | Email: mudit@andweyoga.com | Call: +91 9513022331</p>
          <p style="margin-top: 20px; font-size: 12px;">
            If you didn't create an account with andWeYoga, please ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function createPasswordResetEmailHTML(resetUrl: string, name: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your andWeYoga Password</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f8f9fa;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(64, 30, 156, 0.1);
        }
        .header {
          background: linear-gradient(135deg, hsl(267, 84%, 40%) 0%, hsl(25, 95%, 60%) 100%);
          padding: 40px 20px;
          text-align: center;
          color: white;
        }
        .content {
          padding: 40px 30px;
        }
        .title {
          color: #401e9c;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
        }
        .message {
          color: #6b46c1;
          font-size: 16px;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .cta-button {
          display: inline-block;
          background-color: #401e9c;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 50px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #5b2bbf;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          color: #6b46c1;
          font-size: 14px;
        }
        .warning {
          background-color: #fff3cd;
          padding: 15px;
          border-left: 4px solid #e36b16;
          margin: 20px 0;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">andWeYoga</h1>
          <p style="margin: 0; font-size: 16px; margin-top: 10px;">Password Reset Request</p>
        </div>
        
        <div class="content">
          <div class="title">Reset Your Password</div>
          
          <div class="message">
            Hello ${name},
          </div>
          
          <div class="message">
            We received a request to reset your password for your andWeYoga account. If you didn't make this request, you can safely ignore this email.
          </div>
          
          <div class="message">
            To reset your password, click the button below:
          </div>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="cta-button">Reset My Password</a>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons. If the link expires, you'll need to request a new password reset.
          </div>
          
          <div class="message">
            If the button doesn't work, you can copy and paste this link into your browser:
            <br><br>
            <a href="${resetUrl}" style="color: #401e9c; word-break: break-all;">${resetUrl}</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Need help?</strong></p>
          <p>Email: mudit@andweyoga.com | Call: +91 9513022331</p>
          <p style="margin-top: 20px; font-size: 12px;">
            If you didn't request this password reset, please contact us immediately.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}