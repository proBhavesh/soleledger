import * as React from 'react';
import { Button, Hr, Text } from '@react-email/components';
import { BaseEmail, baseStyles } from './base-email';

interface ExistingUserWithBusinessEmailProps {
  accountantName: string;
  accountantEmail: string;
  clientName: string;
  businessName: string;
  invitationUrl: string;
  expiresAt: string;
}

export function ExistingUserWithBusinessEmail({
  accountantName,
  accountantEmail,
  clientName,
  businessName,
  invitationUrl,
  expiresAt,
}: ExistingUserWithBusinessEmailProps) {
  const preview = `${accountantName} requested access to manage ${businessName}`;

  return (
    <BaseEmail
      preview={preview}
      heading="New accountant access request"
    >
      <Text style={baseStyles.text}>
        Hi {clientName},
      </Text>

      <Text style={baseStyles.text}>
        <strong>{accountantName}</strong> ({accountantEmail}) has requested access 
        to manage the books for <strong>{businessName}</strong> on SoleLedger.
      </Text>

      <Hr style={baseStyles.hr} />

      <Text style={baseStyles.text}>
        <strong>Requested Access Level:</strong>
      </Text>

      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '16px',
        borderRadius: '8px',
        margin: '0 40px 20px',
      }}>
        <Text style={{ ...baseStyles.text, margin: 0, padding: 0 }}>
          <strong>FULL MANAGEMENT</strong><br />
          Full access to manage all aspects of your books
        </Text>
      </div>

      <Text style={baseStyles.text}>
        If you approve this request, {accountantName} will be able to:
      </Text>

      <Text style={baseStyles.text}>
        • View and edit all transactions<br />
        • Manage bank accounts and connections<br />
        • Process and categorize documents<br />
        • Generate and export financial reports<br />
        • Manage chart of accounts
      </Text>

      <Hr style={baseStyles.hr} />

      <Text style={baseStyles.text}>
        <strong>⚠️ Important:</strong> Only approve this request if you trust this 
        accountant to manage your financial data. They will have full access to your business information.
      </Text>

      <Button
        style={baseStyles.button}
        href={invitationUrl}
      >
        Review Access Request
      </Button>

      <Text style={{ ...baseStyles.text, fontSize: '12px', color: '#8898aa' }}>
        This access request expires on {expiresAt}. 
        If you don&apos;t want to grant access, you can safely ignore this email.
      </Text>

      <Text style={{ ...baseStyles.text, fontSize: '12px', color: '#8898aa' }}>
        If you believe this request was sent in error or you don&apos;t know this person, 
        please contact our support team immediately.
      </Text>
    </BaseEmail>
  );
}