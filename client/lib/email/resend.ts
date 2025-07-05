import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
}

export const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SoleLedger <noreply@soleledger.com>';

export async function sendEmail({
  to,
  subject,
  react,
  text,
}: {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  text?: string;
}) {
  if (!resend) {
    console.error('Email service not configured. Please set RESEND_API_KEY.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const data = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to,
      subject,
      react,
      text,
    });

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}