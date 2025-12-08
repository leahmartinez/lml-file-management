/**
 * Utility for parsing @mentions from comment HTML
 * Extracts email addresses and names of mentioned users
 */

/**
 * Extract mentioned email addresses from HTML or plain text
 * Supports formats: @firstName.lastName or @email@domain.com
 *
 * @param html - HTML or plain text content to parse
 * @returns Array of mentioned email addresses
 */
export const parseMentions = (html: string): string[] => {
  if (!html) return [];

  const mentions: string[] = [];

  // Pattern 1: Match @firstName.lastName format (used in mentions)
  // This is a placeholder format that will be converted to actual emails
  const namePattern = /@([a-zA-Z]+\.[a-zA-Z]+)/g;
  const nameMatches = html.matchAll(namePattern);
  for (const match of nameMatches) {
    mentions.push(match[1]); // Extract the firstName.lastName part
  }

  // Pattern 2: Match actual email addresses in mentions
  // Format: @email@domain.com or data-email="email@domain.com"
  const emailPattern = /data-email="([^"]+)"/g;
  const emailMatches = html.matchAll(emailPattern);
  for (const match of emailMatches) {
    const email = match[1];
    if (email && !mentions.includes(email)) {
      mentions.push(email);
    }
  }

  return mentions;
};

/**
 * Extract mentioned user information from HTML
 * Looks for span elements with mention class and data attributes
 *
 * @param html - HTML content to parse
 * @returns Array of mentioned user info {name, email}
 */
export const parseMentionedUsers = (
  html: string
): Array<{ name: string; email: string }> => {
  if (!html) return [];

  const mentionedUsers: Array<{ name: string; email: string }> = [];
  const regex = /<span[^>]*class="[^"]*mention[^"]*"[^>]*data-email="([^"]*)"[^>]*>@?([^<]*)<\/span>/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    const email = match[1];
    const name = match[2].replace('@', '').trim();

    if (email && !mentionedUsers.find(u => u.email === email)) {
      mentionedUsers.push({ name, email });
    }
  }

  return mentionedUsers;
};

/**
 * Create a formatted mention HTML span
 * Used when inserting mentions into the editor
 *
 * @param name - Display name for the mention (e.g., "John.Doe")
 * @param email - Email address of the mentioned user
 * @returns HTML span element for the mention
 */
export const createMentionHtml = (name: string, email: string): string => {
  return `<span class="mention" data-email="${email}" contenteditable="false">@${name}</span>&nbsp;`;
};

/**
 * Render mentions in HTML for display
 * Converts mention spans to styled elements
 *
 * @param html - HTML content with mention data
 * @returns HTML with styled mentions
 */
export const renderMentions = (html: string): string => {
  if (!html) return '';

  // Replace mention spans with styled versions
  return html.replace(
    /<span[^>]*class="[^"]*mention[^"]*"[^>]*data-email="([^"]*)"[^>]*>@?([^<]*)<\/span>/g,
    '<span class="mention-display" title="$1">@$2</span>'
  );
};
