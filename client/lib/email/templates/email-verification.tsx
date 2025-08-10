import React from "react";
import { baseStyles } from "./base-email";

interface EmailVerificationEmailProps {
  userName: string;
  verificationUrl: string;
}

export function EmailVerificationEmail({
  userName,
  verificationUrl,
}: EmailVerificationEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ ...baseStyles.text, fontSize: "24px", fontWeight: "bold" }}>Verify Your Email</h1>
      
      <p style={baseStyles.text}>Hi {userName},</p>
      
      <p style={baseStyles.text}>
        Please click the button below to verify your email address and complete your SoleLedger account setup:
      </p>
      
      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <a
          href={verificationUrl}
          style={{
            ...baseStyles.button,
            display: "inline-block",
            padding: "12px 24px",
            backgroundColor: "#10b981",
            color: "white",
            textDecoration: "none",
            borderRadius: "6px",
          }}
        >
          Verify Email Address
        </a>
      </div>
      
      <p style={baseStyles.text}>
        Or copy and paste this link into your browser:
      </p>
      
      <p style={{ ...baseStyles.text, wordBreak: "break-all", color: "#666" }}>
        {verificationUrl}
      </p>
      
      <p style={baseStyles.text}>
        This link will expire in 24 hours for security reasons.
      </p>
      
      <p style={baseStyles.text}>
        If you didn&apos;t create a SoleLedger account, you can safely ignore this email.
      </p>
      
      <p style={baseStyles.text}>
        Best regards,<br />
        The SoleLedger Team
      </p>
    </div>
  );
}