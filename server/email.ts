import nodemailer from 'nodemailer';
import path from 'path';

// Create robust email transporter with multiple fallback strategies
let transporter: nodemailer.Transporter | null = null;
let emailInitialized = false;

async function initializeEmailTransporter() {
  if (emailInitialized) return transporter;
  
  try {
    // Primary: Gmail SMTP with app password (most reliable for deployment)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
        pool: true, // Use pooled connections for better performance
        maxConnections: 3,
        rateLimit: 10, // Send max 10 emails per second
      });
      
      // Test the connection
      await transporter.verify();
      console.log('Email transporter initialized successfully with Gmail SMTP');
      emailInitialized = true;
      return transporter;
    }
  } catch (error) {
    console.warn('Gmail SMTP initialization failed:', error.message);
  }

  try {
    // Fallback: Ethereal Email for development/testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    
    console.log('Email transporter initialized with Ethereal (development mode)');
    console.log('Preview URLs will be logged for email testing');
    emailInitialized = true;
    return transporter;
  } catch (error) {
    console.error('All email transporter initialization methods failed:', error);
    transporter = null;
    emailInitialized = true;
    return null;
  }
}

// Initialize transporter on module load
initializeEmailTransporter();

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Ensure email transporter is initialized
    if (!transporter) {
      console.log('Email transporter not initialized, attempting to initialize...');
      await initializeEmailTransporter();
    }

    if (!transporter) {
      throw new Error('Email transporter initialization failed');
    }

    // Set safe default From address
    const defaultFrom = process.env.GMAIL_USER || 'no-reply@andweyoga.test';
    const fromEmail = options.from || `"andWeYoga" <${defaultFrom}>`;
    
    // Send the email using SMTP
    const info = await transporter.sendMail({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('Email sent successfully:', info.messageId);
    
    // For development with Ethereal, log preview URL
    if (nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error.message);
    
    // Secure logging without sensitive data
    console.log('=== EMAIL DELIVERY FAILURE ===');
    console.log('To domain:', options.to.split('@')[1] || 'unknown');
    console.log('Subject:', options.subject);
    console.log('Template length:', options.html.length);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('===============================');
    
    // In development, return true to allow flows to continue
    // In production, return false to indicate actual failure
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