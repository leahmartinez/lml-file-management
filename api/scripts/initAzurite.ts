/**
 * Initialize Azurite Local Storage Emulator
 *
 * This script creates the required Blob container and Table
 * for the SharePoint sandbox in the local Azurite emulator.
 *
 * Run this after starting Azurite with: npm run azurite
 */

import { BlobServiceClient } from '@azure/storage-blob';
import { TableClient } from '@azure/data-tables';

// Azurite default connection string (well-known, publicly documented)
const AZURITE_CONNECTION_STRING =
  'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;' +
  'AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;' +
  'BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;' +
  'QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;' +
  'TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;';

const CONTAINER_NAME = 'sandbox-sharepoint-drive';
const TABLE_NAME = 'SandboxDriveItems';

async function initAzurite() {
  console.log('🚀 Initializing Azurite for SharePoint Sandbox...\n');

  try {
    // Initialize Blob Container
    console.log(`📦 Creating Blob container: ${CONTAINER_NAME}`);
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURITE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    const containerExists = await containerClient.exists();
    if (containerExists) {
      console.log(`   ✅ Container already exists`);
    } else {
      await containerClient.create();
      console.log(`   ✅ Container created successfully`);
    }

    // Initialize Table
    console.log(`\n📊 Creating Table: ${TABLE_NAME}`);
    const tableClient = TableClient.fromConnectionString(AZURITE_CONNECTION_STRING, TABLE_NAME, {
      allowInsecureConnection: true,
    });

    try {
      await tableClient.createTable();
      console.log(`   ✅ Table created successfully`);
    } catch (error: any) {
      if (error.statusCode === 409) {
        console.log(`   ✅ Table already exists`);
      } else {
        throw error;
      }
    }

    console.log('\n✅ Azurite initialization complete!\n');
    console.log('📝 Configuration:');
    console.log(`   - Blob Container: ${CONTAINER_NAME}`);
    console.log(`   - Table: ${TABLE_NAME}`);
    console.log(`   - Blob Endpoint: http://127.0.0.1:10000/devstoreaccount1`);
    console.log(`   - Table Endpoint: http://127.0.0.1:10002/devstoreaccount1`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Keep Azurite running in a separate terminal: npm run azurite');
    console.log('   2. Seed test data: npm run sandbox:seed');
    console.log('   3. Start the API: npm run dev');

  } catch (error: any) {
    console.error('\n❌ Error initializing Azurite:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Azurite is not running!');
      console.error('   Start Azurite first with: npm run azurite');
      console.error('   Then run this script again.');
    }

    process.exit(1);
  }
}

// Run initialization
initAzurite();
