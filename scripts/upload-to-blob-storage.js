/**
 * Script to upload data files to Azure Blob Storage
 * 
 * Usage:
 *   node scripts/upload-to-blob-storage.js
 * 
 * Requires environment variables:
 *   AZURE_STORAGE_ACCOUNT_NAME
 *   AZURE_STORAGE_ACCOUNT_KEY
 *   AZURE_STORAGE_CONTAINER_NAME (optional, defaults to 'liftwatch-data')
 */

import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const STORAGE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'liftwatch-data';

if (!STORAGE_ACCOUNT_NAME || !STORAGE_ACCOUNT_KEY) {
  console.error('Error: AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY must be set');
  process.exit(1);
}

// Files to upload from public folder
const FILES_TO_UPLOAD = [
  'master_data.csv',
  'sites_data.csv',
  'contacts_data.csv',
  'users.json',
  'PW154 Progress Report 1.pdf', // Example PDF - remove if not needed
];

async function uploadFiles() {
  try {
    // Create BlobServiceClient
    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${STORAGE_ACCOUNT_NAME};AccountKey=${STORAGE_ACCOUNT_KEY};EndpointSuffix=core.windows.net`;
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    // Get container client
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    // Create container if it doesn't exist
    const exists = await containerClient.exists();
    if (!exists) {
      console.log(`Creating container: ${CONTAINER_NAME}`);
      await containerClient.create({
        access: 'blob', // Public read access
      });
      console.log(`Container ${CONTAINER_NAME} created`);
    }

    // Upload each file
    const publicDir = path.join(__dirname, '..', 'public');
    const uploadedUrls = {};

    for (const fileName of FILES_TO_UPLOAD) {
      const filePath = path.join(publicDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${fileName} not found, skipping...`);
        continue;
      }

      const blobName = `data/${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      console.log(`Uploading ${fileName}...`);
      await blockBlobClient.uploadFile(filePath, {
        blobHTTPHeaders: {
          blobContentType: getContentType(fileName),
        },
      });

      // Get the public URL
      const url = blockBlobClient.url;
      uploadedUrls[fileName] = url;
      console.log(`✓ Uploaded: ${url}`);
    }

    // Save URLs to a config file
    const configPath = path.join(__dirname, '..', 'src', 'config', 'blobStorageUrls.json');
    fs.writeFileSync(configPath, JSON.stringify(uploadedUrls, null, 2));
    console.log(`\n✓ URLs saved to ${configPath}`);

    console.log('\n=== Upload Complete ===');
    console.log('Files uploaded:');
    Object.entries(uploadedUrls).forEach(([file, url]) => {
      console.log(`  ${file}: ${url}`);
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    process.exit(1);
  }
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const contentTypes = {
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

uploadFiles();

