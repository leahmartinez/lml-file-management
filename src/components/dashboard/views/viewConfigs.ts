/**
 * Dashboard View Configuration System
 * Defines all 6 view types with column configurations and sorting
 */

export type ViewType = 'compact' | 'detailed' | 'by-job-status' | 'by-invoice' | 'by-stage-type' | 'timeline';

export type ColumnKey =
  | 'projectCode'
  | 'orderDate'
  | 'invoiceStatus'
  | 'jobStatus'
  | 'building'
  | 'address'
  | 'suburb'
  | 'state'
  | 'postcode'
  | 'jwSummary'
  | 'stageName'
  | 'stageStatus'
  | 'stagePrice'
  | 'client'
  | 'business'
  | 'stageConsultants';

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ViewConfig {
  id: ViewType;
  label: string;
  description: string;
  columns: ColumnKey[];
  groupBy?: string;
  defaultSort: SortConfig;
}

export const VIEW_CONFIGS: Record<ViewType, ViewConfig> = {
  compact: {
    id: 'compact',
    label: 'Compact List',
    description: 'Minimal view - essential columns only',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus'],
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  detailed: {
    id: 'detailed',
    label: 'Detailed View',
    description: 'All columns - complete information',
    columns: [
      'projectCode',
      'orderDate',
      'invoiceStatus',
      'jobStatus',
      'building',
      'address',
      'suburb',
      'state',
      'postcode',
      'jwSummary',
      'stageName',
      'stageStatus',
      'client',
      'business',
      'stagePrice',
      'stageConsultants',
    ],
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  'by-job-status': {
    id: 'by-job-status',
    label: 'By Job Status',
    description: 'Grouped by Active, On Hold, Completed, Archived',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus', 'orderDate', 'invoiceStatus', 'stageStatus', 'stagePrice'],
    groupBy: 'jobStatus',
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  'by-invoice': {
    id: 'by-invoice',
    label: 'By Invoice Status',
    description: 'Grouped by Not Ready, Ready for Invoice, Invoiced',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus', 'orderDate', 'stageStatus', 'stagePrice', 'client'],
    groupBy: 'invoiceStatus',
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  'by-stage-type': {
    id: 'by-stage-type',
    label: 'By Stage Type',
    description: 'Grouped by Feasibility, Technical Spec, Tender, Contract, PM',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus', 'stageStatus', 'orderDate', 'stagePrice'],
    groupBy: 'stageName',
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  timeline: {
    id: 'timeline',
    label: 'Timeline View',
    description: 'Chronological view - grouped by order date',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus', 'orderDate', 'invoiceStatus', 'stagePrice'],
    groupBy: 'orderDate',
    defaultSort: { field: 'orderDate', direction: 'desc' },
  },
};

export const COLUMN_DEFINITIONS: Record<ColumnKey, { label: string; width: string }> = {
  projectCode: { label: 'Project Code', width: 'w-24' },
  orderDate: { label: 'Order Date', width: 'w-28' },
  invoiceStatus: { label: 'Invoice Status', width: 'w-32' },
  jobStatus: { label: 'Job Status', width: 'w-24' },
  building: { label: 'Building Name', width: 'w-40' },
  address: { label: 'Address', width: 'auto' },
  suburb: { label: 'Suburb', width: 'w-24' },
  state: { label: 'State', width: 'w-20' },
  postcode: { label: 'Postcode', width: 'w-20' },
  jwSummary: { label: 'JW Summary', width: 'w-28' },
  stageName: { label: 'Stage Name', width: 'w-32' },
  stageStatus: { label: 'Stage Status', width: 'w-24' },
  stagePrice: { label: 'Stage Price', width: 'w-24' },
  client: { label: 'Client', width: 'w-32' },
  business: { label: 'Business', width: 'auto' },
  stageConsultants: { label: 'Consultants', width: 'w-40' },
};

/**
 * Get the order for grouping status values
 */
export const STATUS_GROUP_ORDER: Record<string, Record<string, number>> = {
  jobStatus: {
    'Active': 1,
    'On Hold': 2,
    'Completed': 3,
    'Archived': 4,
  },
  invoiceStatus: {
    'Not Ready': 1,
    'Ready for Invoice': 2,
    'Invoiced': 3,
  },
  stageName: {
    'Feasibility': 1,
    'Technical Specification': 2,
    'Tender': 3,
    'Contract Draft': 4,
    'Project Management': 5,
  },
};
