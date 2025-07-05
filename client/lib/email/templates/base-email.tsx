import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface BaseEmailProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
}

export function BaseEmail({ preview, heading, children }: BaseEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Heading style={h1}>SoleLedger</Heading>
          </Section>
          
          <Heading style={h2}>{heading}</Heading>
          
          {children}
          
          <Text style={footer}>
            © {new Date().getFullYear()} SoleLedger. All rights reserved.
            <br />
            <Link href="https://soleledger.com" style={link}>
              soleledger.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '5px',
  maxWidth: '600px',
};

const logoContainer = {
  textAlign: 'center' as const,
  padding: '20px 0',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  margin: '30px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const link = {
  color: '#5469d4',
  textDecoration: 'underline',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  marginTop: '40px',
  textAlign: 'center' as const,
};

export const baseStyles = {
  text: {
    color: '#1a1a1a',
    fontSize: '16px',
    lineHeight: '24px',
    padding: '0 40px',
    marginBottom: '20px',
  },
  button: {
    backgroundColor: '#5469d4',
    borderRadius: '5px',
    color: '#fff',
    display: 'inline-block',
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '1',
    padding: '12px 24px',
    textDecoration: 'none',
    textAlign: 'center' as const,
  },
  buttonContainer: {
    textAlign: 'center' as const,
    margin: '30px 0',
  },
  hr: {
    borderColor: '#e6ebf1',
    margin: '30px 0',
  },
  code: {
    backgroundColor: '#f4f4f4',
    borderRadius: '4px',
    color: '#5469d4',
    fontSize: '14px',
    padding: '4px 8px',
  },
};