/**
 * Status formatters for plain text display
 * Replaces badge-based styling with colored text
 */

export interface FormattedStatus {
  text: string;
  className: string;
}

/**
 * Format job status as plain text with color
 */
export function formatJobStatus(status?: string): FormattedStatus {
  if (!status) return { text: '-', className: 'text-muted-foreground' };

  const statusMap: Record<string, FormattedStatus> = {
    'Active': { text: 'Active', className: 'text-green-700 font-medium' },
    'On Hold': { text: 'On Hold', className: 'text-amber-600' },
    'Completed': { text: 'Completed', className: 'text-slate-500' },
    'Archived': { text: 'Archived', className: 'text-slate-400' },
  };

  return statusMap[status] || { text: status, className: 'text-foreground' };
}

/**
 * Format invoice status as plain text with color
 */
export function formatInvoiceStatus(status?: string): FormattedStatus {
  if (!status) return { text: '-', className: 'text-muted-foreground' };

  const statusMap: Record<string, FormattedStatus> = {
    'Not Ready': { text: 'Not Ready', className: 'text-foreground' },
    'Ready for Invoice': { text: 'Ready for Invoice', className: 'text-amber-700 font-medium' },
    'Invoiced': { text: '✓ Invoiced', className: 'text-green-700 font-medium' },
  };

  return statusMap[status] || { text: status, className: 'text-foreground' };
}

/**
 * Format stage status as plain text with color
 */
export function formatStageStatus(status?: string): FormattedStatus {
  if (!status) return { text: '-', className: 'text-muted-foreground' };

  const statusMap: Record<string, FormattedStatus> = {
    'Not Started': { text: 'Not Started', className: 'text-slate-500' },
    'In Progress': { text: 'In Progress', className: 'text-blue-700 font-medium' },
    'Ready for Invoice': { text: 'Ready for Invoice', className: 'text-amber-700 font-medium' },
    'Complete': { text: 'Complete', className: 'text-green-700 font-medium' },
  };

  return statusMap[status] || { text: status, className: 'text-foreground' };
}

/**
 * Format project type (JW Summary) as plain text
 */
export function formatProjectType(type?: string): FormattedStatus {
  if (!type) return { text: '-', className: 'text-muted-foreground' };

  const typeMap: Record<string, FormattedStatus> = {
    'Upgrade': { text: 'Upgrade', className: 'text-foreground font-medium' },
    'MACA': { text: 'MACA', className: 'text-foreground font-medium' },
    'CMA': { text: 'CMA', className: 'text-foreground font-medium' },
    'Desktop Review': { text: 'Desktop Review', className: 'text-foreground font-medium' },
    'Other': { text: 'Other', className: 'text-foreground font-medium' },
  };

  return typeMap[type] || { text: type, className: 'text-foreground italic' };
}

/**
 * Format state as plain text (optionally abbreviated)
 */
export function formatState(state?: string, abbreviated?: boolean): FormattedStatus {
  if (!state) return { text: '-', className: 'text-muted-foreground' };

  const abbreviations: Record<string, string> = {
    'Victoria': 'VIC',
    'NSW': 'NSW',
    'Queensland': 'QLD',
    'South Australia': 'SA',
  };

  const text = abbreviated ? abbreviations[state] || state : state;
  return { text, className: 'text-foreground' };
}

/**
 * Format currency value
 */
export function formatCurrency(value?: number): string {
  if (!value) return '-';
  return `$${value.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU');
  } catch {
    return dateString;
  }
}

/**
 * Format date for grouping in timeline view
 */
export function formatDateForGrouping(dateString?: string): string {
  if (!dateString) return 'No Date';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { year: 'numeric', month: 'long' });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Extract year-month for grouping (YYYY-MM format for sorting)
 */
export function getDateGroupKey(dateString?: string): string {
  if (!dateString) return '0000-00';
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch {
    return '0000-00';
  }
}
