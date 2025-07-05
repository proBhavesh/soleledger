import * as React from 'react';
import { Button, Hr, Text } from '@react-email/components';
import { BaseEmail, baseStyles } from './base-email';

interface NewUserInvitationEmailProps {
  accountantName: string;
  clientName: string;
  businessName: string;
  invitationUrl: string;
  expiresAt: string;
}

export function NewUserInvitationEmail({
  accountantName,
  clientName,
  businessName,
  invitationUrl,
  expiresAt,
}: NewUserInvitationEmailProps) {
  const preview = `${accountantName} has invited you to join SoleLedger`;

  return (
    <BaseEmail
      preview={preview}
      heading="You've been invited to SoleLedger"
    >
      <Text style={baseStyles.text}>
        Hi {clientName},
      </Text>

      <Text style={baseStyles.text}>
        {accountantName} has invited you to join SoleLedger as their client. 
        They&apos;ll help manage the bookkeeping for <strong>{businessName}</strong>.
      </Text>

      <Text style={baseStyles.text}>
        SoleLedger is an automated bookkeeping platform that simplifies financial 
        management for small businesses. Your accountant will handle your financial 
        records, transactions, and reports through our secure platform.
      </Text>

      <Hr style={baseStyles.hr} />

      <Text style={baseStyles.text}>
        <strong>What happens next?</strong>
      </Text>

      <Text style={baseStyles.text}>
        1. Click the button below to create your account<br />
        2. Set up your password<br />
        3. Access your financial dashboard<br />
        4. Your accountant will manage your books
      </Text>

      <div style={baseStyles.buttonContainer}>
        <Button style={baseStyles.button} href={invitationUrl}>
          Accept Invitation & Create Account
        </Button>
      </div>

      <Text style={{ ...baseStyles.text, fontSize: '14px', color: '#666' }}>
        This invitation will expire on {expiresAt}. If you have any questions, 
        please contact your accountant directly.
      </Text>

      <Hr style={baseStyles.hr} />

      <Text style={{ ...baseStyles.text, fontSize: '14px', color: '#666' }}>
        If you didn&apos;t expect this invitation or believe it was sent in error, 
        you can safely ignore this email.
      </Text>
    </BaseEmail>
  );
}