/**
 * Production-safe logging utility
 * Logs are disabled in production builds to prevent sensitive data exposure
 */

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEV = import.meta.env.DEV;

/**
 * Safe console.log wrapper - only logs in development
 */
export const devLog = (...args: any[]) => {
  if (IS_DEV) {
    console.log(...args);
  }
};

/**
 * Safe console.error wrapper - always logs errors
 */
export const errorLog = (...args: any[]) => {
  console.error(...args);
};

/**
 * Safe console.warn wrapper - always logs warnings
 */
export const warnLog = (...args: any[]) => {
  console.warn(...args);
};

/**
 * Sensitive data logger - NEVER logs in production
 * Use for password-related, user data, or authentication logging
 */
export const sensitiveLog = (...args: any[]) => {
  if (IS_DEV && !IS_PRODUCTION) {
    console.log('[SENSITIVE]', ...args);
  }
};

/**
 * Auth-specific logger - disabled in production
 */
export const authLog = (...args: any[]) => {
  if (IS_DEV) {
    console.log('[AUTH]', ...args);
  }
};

