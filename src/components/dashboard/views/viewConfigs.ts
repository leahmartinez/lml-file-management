/**
 * Dashboard View Configuration System
 * Defines all 6 view types with column configurations and sorting
 */

export type ViewType = 'compact' | 'detailed' | 'by-job-status' | 'by-invoice' | 'by-stage-type' | 'by-consultants' | 'timeline';

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
  | 'projectType'
  | 'stageName'
  | 'stageStatus'
  | 'value'
  | 'clientName'
  | 'business'
  | 'stageConsultants';

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ColumnDefinition {
  key: string;
  label: string;
  width: string;
  sortable?: boolean;
  sortField?: string;
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
      'projectType',
      'stageName',
      'stageStatus',
      'clientName',
      'business',
      'value',
      'stageConsultants',
    ],
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  'by-job-status': {
    id: 'by-job-status',
    label: 'By Job Status',
    description: 'Grouped by Active, On Hold, Completed, Archived',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus', 'orderDate', 'invoiceStatus', 'stageStatus', 'value'],
    groupBy: 'jobStatus',
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  'by-invoice': {
    id: 'by-invoice',
    label: 'By Invoice Status',
    description: 'Grouped by Not Ready, Ready for Invoice, Invoiced',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus', 'orderDate', 'stageStatus', 'value', 'clientName'],
    groupBy: 'invoiceStatus',
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  'by-stage-type': {
    id: 'by-stage-type',
    label: 'By Stage Type',
    description: 'Grouped by Feasibility, Technical Spec, Tender, Contract, PM',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus', 'stageStatus', 'orderDate', 'value'],
    groupBy: 'stageName',
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  'by-consultants': {
    id: 'by-consultants',
    label: 'By Consultants',
    description: 'View stages grouped by assigned consultants',
    columns: ['projectCode', 'building', 'stageName', 'stageConsultants', 'jobStatus', 'orderDate', 'invoiceStatus', 'value'],
    groupBy: 'stageConsultants',
    defaultSort: { field: 'projectCode', direction: 'asc' },
  },

  timeline: {
    id: 'timeline',
    label: 'Timeline View',
    description: 'Chronological view - grouped by order date',
    columns: ['projectCode', 'building', 'stageName', 'jobStatus', 'orderDate', 'invoiceStatus', 'value'],
    groupBy: 'orderDate',
    defaultSort: { field: 'orderDate', direction: 'desc' },
  },
};

export const COLUMN_DEFINITIONS: Record<ColumnKey, ColumnDefinition> = {
  projectCode: { key: 'projectCode', label: 'Project Code', width: 'w-24', sortable: true, sortField: 'projectCode' },
  orderDate: { key: 'orderDate', label: 'Order Date', width: 'w-28', sortable: true, sortField: 'orderDate' },
  invoiceStatus: { key: 'invoiceStatus', label: 'Invoice Status', width: 'w-32', sortable: true, sortField: 'invoiceStatus' },
  jobStatus: { key: 'jobStatus', label: 'Job Status', width: 'w-24', sortable: true, sortField: 'jobStatus' },
  building: { key: 'building', label: 'Building Name', width: 'w-40', sortable: true, sortField: 'building' },
  address: { key: 'address', label: 'Address', width: 'auto', sortable: false },
  suburb: { key: 'suburb', label: 'Suburb', width: 'w-24', sortable: false },
  state: { key: 'state', label: 'State', width: 'w-20', sortable: true, sortField: 'state' },
  postcode: { key: 'postcode', label: 'Postcode', width: 'w-20', sortable: false },
  projectType: { key: 'projectType', label: 'JW Summary', width: 'w-28', sortable: false },
  stageName: { key: 'stageName', label: 'Stage Name', width: 'w-32', sortable: false },
  stageStatus: { key: 'stageStatus', label: 'Stage Status', width: 'w-24', sortable: false },
  value: { key: 'value', label: 'Stage Price', width: 'w-24', sortable: true, sortField: 'value' },
  clientName: { key: 'clientName', label: 'Client', width: 'w-32', sortable: true, sortField: 'clientName' },
  business: { key: 'business', label: 'Business', width: 'auto', sortable: false },
  stageConsultants: { key: 'stageConsultants', label: 'Consultants', width: 'w-40', sortable: false },
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
