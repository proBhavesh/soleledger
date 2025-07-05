import * as React from 'react';
import { Button, Hr, Text } from '@react-email/components';
import { BaseEmail, baseStyles } from './base-email';

interface ExistingUserNoBusinessEmailProps {
  accountantName: string;
  clientName: string;
  businessName: string;
  invitationUrl: string;
  expiresAt: string;
}

export function ExistingUserNoBusinessEmail({
  accountantName,
  clientName,
  businessName,
  invitationUrl,
  expiresAt,
}: ExistingUserNoBusinessEmailProps) {
  const preview = `${accountantName} wants to manage your bookkeeping`;

  return (
    <BaseEmail
      preview={preview}
      heading="Your accountant is ready to manage your books"
    >
      <Text style={baseStyles.text}>
        Hi {clientName},
      </Text>

      <Text style={baseStyles.text}>
        Great news! {accountantName} is ready to start managing the bookkeeping 
        for <strong>{businessName}</strong> using your existing SoleLedger account.
      </Text>

      <Text style={baseStyles.text}>
        Since you already have a SoleLedger account but haven&apos;t set up a business 
        yet, accepting this invitation will:
      </Text>

      <Text style={baseStyles.text}>
        • Create your business profile for {businessName}<br />
        • Grant {accountantName} access to manage your books<br />
        • Enable automated bookkeeping and financial reporting<br />
        • Keep all your financial data secure and organized
      </Text>

      <div style={baseStyles.buttonContainer}>
        <Button style={baseStyles.button} href={invitationUrl}>
          Accept & Set Up Business
        </Button>
      </div>

      <Text style={{ ...baseStyles.text, fontSize: '14px', color: '#666' }}>
        This invitation will expire on {expiresAt}.
      </Text>

      <Hr style={baseStyles.hr} />

      <Text style={{ ...baseStyles.text, fontSize: '14px', color: '#666' }}>
        By accepting this invitation, you&apos;re authorizing {accountantName} to 
        manage your financial records. You can adjust their permissions or 
        revoke access at any time from your dashboard.
      </Text>
    </BaseEmail>
  );
}