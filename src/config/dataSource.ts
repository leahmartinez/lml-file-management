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

// Change this to switch between CSV (blob storage), API, or local
const DATA_SOURCE_TYPE: DataSourceType = 'csv';

// Use blob storage URLs if available, otherwise fall back to local paths
const USE_BLOB_STORAGE = Object.values(blobStorageUrls).some(url => url && url.startsWith('https://'));

// API Configuration (for future use)
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.example.com',
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

