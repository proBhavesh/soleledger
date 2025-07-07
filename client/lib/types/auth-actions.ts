/**
 * Types for authentication-related actions and responses
 */

export interface AuthActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export interface PasswordResetResponse {
  success: boolean;
  error?: string;
}

export interface PasswordResetValidationResponse {
  valid: boolean;
  error?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  businessName?: string;
  invitationToken?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

// Error messages for better UX and consistency
export const AUTH_ERROR_MESSAGES = {
  unauthorized: "You must be logged in to perform this action",
  invalidCredentials: "Invalid email or password",
  emailExists: "An account with this email already exists",
  userNotFound: "No user found with this email address",
  invalidToken: "Invalid or expired reset token",
  tokenExpired: "This password reset link has expired",
  weakPassword: "Password must be at least 8 characters long",
  serverError: "An error occurred. Please try again later.",
  invalidInvitation: "Invalid or expired invitation token",
  businessCreationFailed: "Failed to create business account",
  emailVerificationRequired: "Please verify your email address",
  accountLocked: "Account has been locked due to too many failed attempts",
  sessionExpired: "Your session has expired. Please sign in again.",
  passwordResetSent: "Password reset instructions have been sent to your email",
  passwordResetSuccess: "Your password has been successfully reset",
} as const;