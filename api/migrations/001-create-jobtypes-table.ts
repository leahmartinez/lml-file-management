/**
 * Migration 001: Create JobTypes Table and Seed Initial Data
 *
 * Purpose:
 * - Creates the JobTypes table in Azure Data Tables
 * - Seeds initial job types: MACA, Upgrade, Feasibility, Dilapidation, Water Damage Inspection
 *
 * This migration is IDEMPOTENT - safe to run multiple times
 *
 * Dependencies: None
 *
 * Run this migration FIRST before other schema changes
 */

import { TableClient } from "@azure/data-tables";

// Job type entity interface
interface JobTypeEntity {
  partitionKey: string;
  rowKey: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Initial seed data for job types
 */
const INITIAL_JOB_TYPES = [
  { name: "MACA", description: "" },
  { name: "Upgrade", description: "" },
  { name: "Feasibility", description: "" },
  { name: "Dilapidation", description: "" },
  { name: "Water Damage Inspection", description: "" },
];

/**
 * Generate a unique ID for job type
 */
function generateJobTypeId(): string {
  return `jobtype_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Main migration function
 */
export async function up(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Migration 001: Create JobTypes Table and Seed Initial Data");
  console.log("=".repeat(60));

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is required");
  }

  const tableName = "JobTypes";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    // Step 1: Create table (idempotent - ignore 409 if already exists)
    console.log(`\n[1/3] Creating table '${tableName}'...`);
    try {
      await client.createTable();
      console.log(`✓ Table '${tableName}' created successfully`);
    } catch (error: any) {
      if (error.statusCode === 409) {
        console.log(`✓ Table '${tableName}' already exists (skipping creation)`);
      } else {
        throw error;
      }
    }

    // Step 2: Check if job types already exist
    console.log("\n[2/3] Checking for existing job types...");
    const existingEntities = client.listEntities({
      queryOptions: { filter: `PartitionKey eq 'jobTypes'` }
    });

    const existingNames = new Set<string>();
    for await (const entity of existingEntities) {
      existingNames.add((entity as any).name);
    }

    console.log(`✓ Found ${existingNames.size} existing job type(s)`);

    // Step 3: Seed initial job types (skip if already exist)
    console.log("\n[3/3] Seeding initial job types...");
    const now = new Date().toISOString();
    let created = 0;
    let skipped = 0;

    for (const jobType of INITIAL_JOB_TYPES) {
      if (existingNames.has(jobType.name)) {
        console.log(`  ⊘ Skipping '${jobType.name}' (already exists)`);
        skipped++;
        continue;
      }

      const entity: JobTypeEntity = {
        partitionKey: "jobTypes",
        rowKey: generateJobTypeId(),
        name: jobType.name,
        description: jobType.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: "system",
      };

      try {
        await client.createEntity(entity);
        console.log(`  ✓ Created '${jobType.name}'`);
        created++;
      } catch (error: any) {
        console.error(`  ✗ Failed to create '${jobType.name}':`, error.message);
        throw error;
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration 001 Summary:");
    console.log(`  Table: ${tableName} ${existingNames.size === 0 ? '(created)' : '(already existed)'}`);
    console.log(`  Job types created: ${created}`);
    console.log(`  Job types skipped: ${skipped}`);
    console.log(`  Total job types: ${existingNames.size + created}`);
    console.log("=".repeat(60));
    console.log("✓ Migration 001 completed successfully\n");

  } catch (error: any) {
    console.error("\n✗ Migration 001 FAILED:", error.message);
    console.error("Full error:", error);
    throw error;
  }
}

/**
 * Rollback migration (WARNING: destructive operation!)
 *
 * This will DELETE the entire JobTypes table
 * Only run this if:
 * - You need to completely undo this migration
 * - No proposals reference job types yet
 * - You understand this is permanent data loss
 */
export async function down(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Migration 001 ROLLBACK: Delete JobTypes Table");
  console.log("WARNING: This will delete all job types permanently!");
  console.log("=".repeat(60));

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is required");
  }

  const tableName = "JobTypes";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    console.log(`\nDeleting table '${tableName}'...`);
    await client.deleteTable();
    console.log(`✓ Table '${tableName}' deleted successfully`);
    console.log("\n✓ Migration 001 rollback completed\n");
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`✓ Table '${tableName}' does not exist (already rolled back)`);
    } else {
      console.error("\n✗ Migration 001 rollback FAILED:", error.message);
      throw error;
    }
  }
}

/**
 * Verify migration was successful
 */
export async function verify(): Promise<boolean> {
  console.log("\nVerifying migration 001...");

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.error("✗ AZURE_STORAGE_CONNECTION_STRING not configured");
    return false;
  }

  const tableName = "JobTypes";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    // Check table exists
    const entities = client.listEntities({
      queryOptions: { filter: `PartitionKey eq 'jobTypes' and isActive eq true` }
    });

    const activeJobTypes: string[] = [];
    for await (const entity of entities) {
      activeJobTypes.push((entity as any).name);
    }

    console.log(`✓ Found ${activeJobTypes.length} active job type(s)`);
    console.log(`  Job types: ${activeJobTypes.join(", ")}`);

    // Verify minimum required job types exist
    const requiredJobTypes = INITIAL_JOB_TYPES.map(jt => jt.name);
    const missingJobTypes = requiredJobTypes.filter(name => !activeJobTypes.includes(name));

    if (missingJobTypes.length > 0) {
      console.error(`✗ Missing required job types: ${missingJobTypes.join(", ")}`);
      return false;
    }

    console.log("✓ All required job types present");
    console.log("✓ Migration 001 verification PASSED\n");
    return true;

  } catch (error: any) {
    console.error("✗ Verification failed:", error.message);
    return false;
  }
}

// Allow running this migration directly
if (require.main === module) {
  (async () => {
    try {
      await up();
      const isValid = await verify();
      process.exit(isValid ? 0 : 1);
    } catch (error) {
      console.error("Migration failed:", error);
      process.exit(1);
    }
  })();
}
