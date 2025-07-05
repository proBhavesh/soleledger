import * as React from 'react';
import { Button, Hr, Text } from '@react-email/components';
import { BaseEmail, baseStyles } from './base-email';

interface ExistingUserWithBusinessEmailProps {
  accountantName: string;
  accountantEmail: string;
  clientName: string;
  businessName: string;
  accessLevel: string;
  invitationUrl: string;
  expiresAt: string;
}

export function ExistingUserWithBusinessEmail({
  accountantName,
  accountantEmail,
  clientName,
  businessName,
  accessLevel,
  invitationUrl,
  expiresAt,
}: ExistingUserWithBusinessEmailProps) {
  const preview = `${accountantName} requested access to manage ${businessName}`;

  const accessLevelDescriptions: Record<string, string> = {
    VIEW_ONLY: 'View all financial data (read-only access)',
    FULL_MANAGEMENT: 'Full access to manage all aspects of your books',
    FINANCIAL_ONLY: 'Manage transactions, accounts, and financial reports',
    DOCUMENTS_ONLY: 'Manage receipts, invoices, and document processing',
  };

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
          <strong>{accessLevel.replace(/_/g, ' ')}</strong><br />
          {accessLevelDescriptions[accessLevel] || 'Custom access level'}
        </Text>
      </div>

      <Text style={baseStyles.text}>
        If you approve this request, {accountantName} will be able to:
      </Text>

      {accessLevel === 'FULL_MANAGEMENT' && (
        <Text style={baseStyles.text}>
          • View and edit all transactions<br />
          • Manage bank accounts and connections<br />
          • Process and categorize documents<br />
          • Generate and export financial reports<br />
          • Manage chart of accounts
        </Text>
      )}

      {accessLevel === 'FINANCIAL_ONLY' && (
        <Text style={baseStyles.text}>
          • View and edit transactions<br />
          • Manage bank accounts<br />
          • Generate financial reports<br />
          • Manage chart of accounts
        </Text>
      )}

      {accessLevel === 'DOCUMENTS_ONLY' && (
        <Text style={baseStyles.text}>
          • Upload and process receipts<br />
          • Manage document categorization<br />
          • Handle invoice processing<br />
          • Perform reconciliation
        </Text>
      )}

      {accessLevel === 'VIEW_ONLY' && (
        <Text style={baseStyles.text}>
          • View all financial data<br />
          • Export reports<br />
          • No editing capabilities
        </Text>
      )}

      <div style={baseStyles.buttonContainer}>
        <Button style={baseStyles.button} href={invitationUrl}>
          Review Access Request
        </Button>
      </div>

      <Text style={{ ...baseStyles.text, fontSize: '14px', color: '#666' }}>
        This request will expire on {expiresAt}. You can approve, modify the 
        access level, or decline this request.
      </Text>

      <Hr style={baseStyles.hr} />

      <Text style={{ ...baseStyles.text, fontSize: '14px', color: '#666' }}>
        <strong>Important:</strong> Only grant access to accountants you trust. 
        You can revoke or modify access at any time from your SoleLedger dashboard 
        under Settings → Team Members.
      </Text>
    </BaseEmail>
  );
}