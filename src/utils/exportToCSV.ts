/**
 * CSV Export Utility
 * Converts dashboard data to CSV format for download
 */

import { DashboardRow } from '@/hooks/useDashboardData';

export interface ExportOptions {
  filename?: string;
  selectedRows?: DashboardRow[];
  allRows?: DashboardRow[];
}

/**
 * Escape CSV values to handle commas, quotes, and newlines
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If the value contains comma, double quote, or newline, wrap it in quotes
  // and escape any existing quotes by doubling them
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Format date to readable format
 */
function formatDate(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-AU', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return isoDate;
  }
}

/**
 * Format currency
 */
function formatCurrency(value?: number): string {
  if (!value) return '';
  return `$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Export dashboard rows to CSV
 */
export function exportToCSV(options: ExportOptions): void {
  const { filename = 'projects-overview.csv', selectedRows = [], allRows = [] } = options;

  // Use selected rows if available, otherwise use all rows
  const rowsToExport = selectedRows.length > 0 ? selectedRows : allRows;

  if (rowsToExport.length === 0) {
    console.warn('No rows to export');
    return;
  }

  // CSV Headers - matching the dashboard columns
  const headers = [
    'Project Code',
    'Order Date',
    'Invoice Status',
    'Job Status',
    'Building Name',
    'Address',
    'Suburb',
    'State',
    'Postcode',
    'JW Summary',
    'Lifts/Assets',
    'General Description',
    'Client Name',
    'Client Business',
    'Value Ex GST',
    'Created Date',
    'Updated Date',
  ];

  // Build CSV rows
  const csvRows: string[] = [headers.map(escapeCSVValue).join(',')];

  rowsToExport.forEach((row) => {
    const csvRow = [
      row.projectCode,
      formatDate(row.orderDate),
      row.invoiceStatus || '',
      row.jobStatus || '',
      row.building,
      row.address || '',
      row.suburb || '',
      row.state,
      row.postcode || '',
      row.jwSummary || '',
      row.lifts || '',
      row.description || '',
      row.clientName || '',
      row.clientBusiness || '',
      formatCurrency(row.value),
      formatDate(row.project.createdAt),
      formatDate(row.project.updatedAt),
    ];

    csvRows.push(csvRow.map(escapeCSVValue).join(','));
  });

  // Combine all rows
  const csvContent = csvRows.join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Export to Excel-compatible TSV format (more robust for Excel)
 */
export function exportToExcel(options: ExportOptions): void {
  const { filename = 'projects-overview.xlsx', selectedRows = [], allRows = [] } = options;

  // Use selected rows if available, otherwise use all rows
  const rowsToExport = selectedRows.length > 0 ? selectedRows : allRows;

  if (rowsToExport.length === 0) {
    console.warn('No rows to export');
    return;
  }

  // For now, we'll use CSV format which Excel can handle
  // In the future, could use a library like xlsx or exceljs for more advanced formatting
  const filename_xlsx = filename.replace('.xlsx', '.csv');

  exportToCSV({
    filename: filename_xlsx,
    selectedRows,
    allRows,
  });
}

/**
 * Copy selected rows to clipboard in tab-separated format (Excel-friendly)
 */
export function copyToClipboard(rows: DashboardRow[]): void {
  if (rows.length === 0) {
    console.warn('No rows to copy');
    return;
  }

  const headers = [
    'Project Code',
    'Order Date',
    'Invoice Status',
    'Job Status',
    'Building Name',
    'Address',
    'Suburb',
    'State',
    'Postcode',
    'JW Summary',
    'Lifts/Assets',
    'General Description',
    'Client Name',
    'Client Business',
    'Value Ex GST',
  ];

  // Build tab-separated rows
  const tsvRows: string[] = [headers.join('\t')];

  rows.forEach((row) => {
    const tsvRow = [
      row.projectCode,
      formatDate(row.orderDate),
      row.invoiceStatus || '',
      row.jobStatus || '',
      row.building,
      row.address || '',
      row.suburb || '',
      row.state,
      row.postcode || '',
      row.jwSummary || '',
      row.lifts || '',
      row.description || '',
      row.clientName || '',
      row.clientBusiness || '',
      row.value ? `$${row.value}` : '',
    ];

    tsvRows.push(tsvRow.join('\t'));
  });

  const tsvContent = tsvRows.join('\n');

  navigator.clipboard
    .writeText(tsvContent)
    .then(() => {
      console.log('Copied to clipboard');
    })
    .catch((err) => {
      console.error('Failed to copy to clipboard:', err);
    });
}
