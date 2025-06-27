/**
 * Simple logger utility for server-side logging
 * In production, this could be replaced with a proper logging service
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  error: (message: string, error?: unknown, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, error, ...args);
    
    // In production, send to error tracking service
    if (!isDevelopment && error) {
      // TODO: Send to Sentry, LogRocket, etc.
    }
  },
};