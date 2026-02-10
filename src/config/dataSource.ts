/**
 * Data Source Configuration
 * 
 * This file controls where data is fetched from.
 * Supports: 'csv' (from blob storage), 'api', or 'local' (for development)
 * 
 * When using blob storage, URLs are loaded from blobStorageUrls.json
 */

import { DataSourceConfig, DataSourceType } from '@/types/data';
import blobStorageUrls from './blobStorageUrls.json';

// Explicit data source selection (defaults to API in prod, CSV in dev)
const DATA_SOURCE_TYPE: DataSourceType =
  import.meta.env.VITE_DATA_SOURCE === 'api'
    ? 'api'
    : import.meta.env.VITE_DATA_SOURCE === 'csv'
      ? 'csv'
      : import.meta.env.PROD
        ? 'api'
        : 'csv';

// Use blob storage URLs only when explicitly enabled (defaults to local CSVs)
const USE_BLOB_STORAGE =
  import.meta.env.VITE_USE_BLOB_STORAGE === 'true' &&
  Object.values(blobStorageUrls).some(url => url && url.startsWith('https://'));

// API Configuration (for future use)
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '',
  endpoints: {
    sites: '/api/sites',
    projects: '/api/projects',
    assets: '/api/assets',
    contacts: '/api/contacts',
  },
};

// CSV Configuration - uses blob storage URLs if available
const CSV_CONFIG = {
  csvPaths: {
    sites: USE_BLOB_STORAGE && blobStorageUrls['sites_data.csv'] 
      ? blobStorageUrls['sites_data.csv'] 
      : '/sites_data.csv',
    projects: USE_BLOB_STORAGE && blobStorageUrls['sites_data.csv'] 
      ? blobStorageUrls['sites_data.csv'] 
      : '/sites_data.csv', // Projects are in the same file as sites
    assets: USE_BLOB_STORAGE && blobStorageUrls['master_data.csv'] 
      ? blobStorageUrls['master_data.csv'] 
      : '/master_data.csv',
    contacts: USE_BLOB_STORAGE && blobStorageUrls['contacts_data.csv'] 
      ? blobStorageUrls['contacts_data.csv'] 
      : '/contacts_data.csv',
  },
};

export const dataSourceConfig: DataSourceConfig = {
  type: DATA_SOURCE_TYPE,
  ...(DATA_SOURCE_TYPE === 'api' ? API_CONFIG : CSV_CONFIG),
};

/**
 * Helper to check if we're using API
 */
export const isUsingAPI = () => dataSourceConfig.type === 'api';

/**
 * Helper to check if we're using CSV
 */
export const isUsingCSV = () => dataSourceConfig.type === 'csv';

