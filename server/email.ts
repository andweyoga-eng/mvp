import nodemailer from "nodemailer";

type MailTransporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: MailTransporter | null = null;

function getGmailUser(): string | null {
  const user = process.env.GMAIL_USER?.trim();
  return user || null;
}

function getGmailAppPassword(): string | null {
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  return pass || null;
}

/** True when Gmail SMTP env vars are set (does not verify connectivity). */
export function isEmailConfigured(): boolean {
  return !!(getGmailUser() && getGmailAppPassword());
}

function getTransporter(): MailTransporter | null {
  const user = getGmailUser();
  const pass = getGmailAppPassword();
  if (!user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Must match GMAIL_USER or a configured Workspace alias; defaults to GMAIL_USER. */
  from?: string;
}

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const result = await sendEmailDetailed(options);
  return result.ok;
}

export async function sendEmailDetailed(options: EmailOptions): Promise<SendEmailResult> {
  const mailer = getTransporter();
  const gmailUser = getGmailUser();

  if (!mailer || !gmailUser) {
    const msg =
      "Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env (Google App Password).";
    console.error("[Email]", msg);
    return { ok: false, error: msg };
  }

  const to = options.to?.trim();
  if (!to) {
    return { ok: false, error: "Recipient email is missing." };
  }

  // Gmail SMTP rejects senders that do not match the authenticated account.
  const from =
    options.from?.trim() ||
    `"andWeYoga" <${gmailUser}>`;

  try {
    const info = await mailer.sendMail({
      from,
      to,
      subject: options.subject,
      html: options.html,
    });
    console.log("[Email] Sent:", info.messageId, "→", to);
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Unknown email delivery error";
    console.error("[Email] Failed to send:", msg, error);
    return { ok: false, error: msg };
  }
}

export function createVerificationEmailHTML(
  name: string,
  verificationUrl: string,
  logoUrl: string,
): string {
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

export function createSessionConfirmationEmailHTML(params: {
  name: string;
  className: string;
  sessionDate: string;
  instructorName: string;
  meetLink: string | null;
  amountLabel: string | null;
}): string {
  const date = new Date(params.sessionDate);
  const when = `${date.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} at ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  const meetBlock = params.meetLink
    ? `<div style="text-align: center; margin: 24px 0;">
         <a href="${params.meetLink}" style="display:inline-block;background:linear-gradient(135deg,#401e9c,#e36b16);color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold;">Join your session</a>
       </div>
       <p style="font-size:14px;color:#6b46c1;word-break:break-all;">Or copy this link: <a href="${params.meetLink}">${params.meetLink}</a></p>`
    : `<p style="color:#6b46c1;">Your session link will be shared in My Account before class time.</p>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Session confirmed — andWeYoga</title></head>
    <body style="font-family:Arial,sans-serif;background:#f8f9fa;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:15px;overflow:hidden;box-shadow:0 10px 30px rgba(64,30,156,0.1);">
        <div style="background:linear-gradient(135deg,#401e9c,#e36b16);padding:36px 20px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:26px;">You're in — see you on the mat</h1>
          <p style="margin:8px 0 0;opacity:0.95;">Payment received · Session confirmed</p>
        </div>
        <div style="padding:32px 28px;">
          <p style="color:#401e9c;font-size:18px;">Hi ${params.name},</p>
          <p style="color:#333;line-height:1.7;">Your spot for <strong>${params.className}</strong> is confirmed. We can't wait to flow with you.</p>
          <div style="background:#f3e8ff;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#401e9c;font-weight:bold;">${params.className}</p>
            <p style="margin:0 0 4px;color:#6b46c1;">${when}</p>
            <p style="margin:0;color:#6b46c1;">With ${params.instructorName}</p>
            ${params.amountLabel ? `<p style="margin:12px 0 0;color:#401e9c;font-weight:bold;">Paid: ${params.amountLabel}</p>` : ""}
          </div>
          ${meetBlock}
        </div>
        <div style="background:#f8f9fa;padding:24px;text-align:center;color:#6b46c1;font-size:14px;">
          <p>Questions? Email <a href="mailto:mudit@andweyoga.com">mudit@andweyoga.com</a> · Call +91 9513022331</p>
          <p style="font-size:12px;margin-top:16px;">andWeYoga · Move with intention</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
