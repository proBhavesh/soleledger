import * as React from 'react';
import {
  Button,
  Hr,
  Link,
  Section,
  Text,
} from '@react-email/components';
import { BaseEmail, baseStyles } from './base-email';

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiresAt: string;
}

export function PasswordResetEmail({
  userName,
  resetUrl,
  expiresAt,
}: PasswordResetEmailProps) {
  return (
    <BaseEmail
      preview="Reset your SoleLedger password"
      heading="Password Reset Request"
    >
      <Text style={baseStyles.text}>
        Hi {userName},
      </Text>
      
      <Text style={baseStyles.text}>
        We received a request to reset your password for your SoleLedger account. 
        If you didn&apos;t make this request, you can safely ignore this email.
      </Text>

      <Section style={baseStyles.buttonContainer}>
        <Button
          style={baseStyles.button}
          href={resetUrl}
        >
          Reset Password
        </Button>
      </Section>

      <Text style={baseStyles.text}>
        Or copy and paste this link into your browser:
        <br />
        <Link href={resetUrl} style={linkStyle}>
          {resetUrl}
        </Link>
      </Text>

      <Hr style={baseStyles.hr} />

      <Text style={warningStyle}>
        <strong>Important:</strong> This link will expire on {expiresAt}. 
        After that, you&apos;ll need to request a new password reset link.
      </Text>

      <Text style={baseStyles.text}>
        For security reasons, we recommend:
      </Text>
      <ul style={listStyle}>
        <li>Using a strong, unique password</li>
        <li>Not sharing your password with anyone</li>
        <li>Enabling two-factor authentication when available</li>
      </ul>

      <Text style={baseStyles.text}>
        If you didn&apos;t request this password reset, please contact our support team immediately.
      </Text>
    </BaseEmail>
  );
}

const linkStyle = {
  ...baseStyles.code,
  wordBreak: 'break-all' as const,
};

const warningStyle = {
  ...baseStyles.text,
  backgroundColor: '#fff4e5',
  border: '1px solid #feb272',
  borderRadius: '4px',
  padding: '12px',
  marginBottom: '20px',
};

const listStyle = {
  ...baseStyles.text,
  paddingLeft: '20px',
  marginBottom: '20px',
};