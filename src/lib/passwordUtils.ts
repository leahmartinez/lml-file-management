/**
 * Password hashing utilities using Web Crypto API
 * Note: This is client-side hashing for basic obfuscation.
 * For production, passwords should be hashed server-side.
 */

/**
 * Hash a password using SHA-256
 * @param password - Plain text password
 * @returns Hashed password as hex string
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Check if a string is a hash (hex string of 64 characters)
 * @param str - String to check
 * @returns True if string appears to be a hash
 */
export function isHashed(str: string): boolean {
  return /^[a-f0-9]{64}$/i.test(str);
}

/**
 * Migrate plain text passwords to hashed passwords
 * @param users - Array of users with potentially plain text passwords
 * @returns Array of users with hashed passwords
 */
export async function migratePasswordsToHashed(users: Array<{ username: string; password?: string; role: string; sites: string[] }>): Promise<Array<{ username: string; password?: string; role: string; sites: string[] }>> {
  const migratedUsers = await Promise.all(
    users.map(async (user) => {
      if (user.password && !isHashed(user.password)) {
        // Password is plain text, hash it
        const hashedPassword = await hashPassword(user.password);
        return { ...user, password: hashedPassword };
      }
      return user;
    })
  );
  return migratedUsers;
}

