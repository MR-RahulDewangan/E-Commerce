import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';
import { db } from '@/lib/db';

const VERIFICATION_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function getVerificationSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'dev-verification-secret-key-at-least-32-chars-long';
  return new TextEncoder().encode(secret);
}

export async function createEmailVerificationToken(userId: string, email: string): Promise<string> {
  const secret = getVerificationSecret();

  return new SignJWT({
    sub: userId,
    email: email.toLowerCase().trim(),
    type: 'email_verification',
    v: Date.now(),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${VERIFICATION_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyEmailToken(token: string): Promise<{ userId: string; email: string } | null> {
  if (!token) {
    return null;
  }

  try {
    const secret = getVerificationSecret();
    const { payload } = await jwtVerify(token, secret);

    if (payload.type !== 'email_verification' || !payload.sub || typeof payload.v !== 'number') {
      return null;
    }

    const user = await db.user.findUnique({
      where: { id: payload.sub as string },
    });

    if (!user || user.email !== payload.email) {
      return null;
    }

    // Verify token has not already been used (single-use validation via updatedAt check)
    if (user.updatedAt.getTime() !== payload.v) {
      return null;
    }

    return { userId: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}

/**
 * Development/Production email sender
 * In development, logs to console with verification link
 * In production, integrates with your email service (Resend, SendGrid, Nodemailer, etc.)
 */
async function sendEmailDev(to: string, subject: string, html: string): Promise<boolean> {
  const verificationUrlMatch = html.match(/href="([^"]+)"/);
  const verificationUrl = verificationUrlMatch ? verificationUrlMatch[1] : 'N/A';

  console.log('========================================');
  console.log('📧 EMAIL VERIFICATION (DEV MODE)');
  console.log('========================================');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Verification Link: ${verificationUrl}`);
  console.log('========================================');

  // In development, also write to a file for easy access
  if (process.env.NODE_ENV !== 'production') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logDir = path.join(process.cwd(), '.verification-emails');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, `${Date.now()}-${to.replace('@', '-at-')}.html`);
      fs.writeFileSync(logFile, html);
    } catch {
      // Ignore file write errors
    }
  }

  return true;
}

export async function sendVerificationEmail(userId: string, email: string, firstName: string): Promise<boolean> {
  try {
    const token = await createEmailVerificationToken(userId, email);
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fafafa; border-radius: 12px; padding: 40px; border: 1px solid #e5e5e5;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; color: #1a1a1a; margin: 0 0 8px;">BharatStore Maison</h1>
              <p style="color: #8b7d6b; font-size: 14px; margin: 0;">Handcrafted Luxury &bull; India</p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">

            <h2 style="font-size: 20px; color: #1a1a1a; margin: 0 0 16px;">Welcome, ${firstName}!</h2>

            <p style="color: #4a4a4a; margin: 0 0 24px;">Thank you for joining BharatStore Maison. Please verify your email address to activate your account and start exploring our curated collection of authentic Indian textiles and artisanal heritage.</p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: #1a1a1a; color: #f5f0e8; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.5px;">
                Verify Email Address
              </a>
            </div>

            <p style="color: #8b7d6b; font-size: 13px; margin: 24px 0 0;">Or copy this link to your browser:</p>
            <p style="color: #8b7d6b; font-size: 12px; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0 0;">${verificationUrl}</p>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;">

            <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
              This link expires in 24 hours. If you didn't create an account, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    // Use development email sender (logs to console)
    // In production, replace with actual email service integration
    return await sendEmailDev(email, 'Verify your email address - BharatStore Maison', htmlContent);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

export async function markEmailVerified(userId: string): Promise<boolean> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}