/**
 * Migration 003: Add New Fields to Proposals Entity
 *
 * Purpose:
 * - Adds jobTypeId, jobTypeName, generalDescription, sharePointFolderUrl to proposals
 *
 * IMPORTANT NOTE:
 * As of April 2026, proposals are stored in localStorage (frontend only).
 * This migration is provided for future use when proposals backend storage is implemented.
 *
 * This migration is IDEMPOTENT - safe to run multiple times
 *
 * Dependencies:
 * - Should run AFTER migration 001 (JobTypes table must exist)
 * - Requires Proposals table to exist in Azure Data Tables
 */

import { TableClient, TableEntity } from "@azure/data-tables";

interface ProposalEntity extends TableEntity {
  partitionKey: string;
  rowKey: string;
  proposalNumber: string;
  jobTypeId?: string;
  jobTypeName?: string;
  generalDescription?: string;
  sharePointFolderUrl?: string;
  // ... other fields exist but we only care about the new ones
}

/**
 * Main migration function
 */
export async function up(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Migration 003: Add New Fields to Proposals Entity");
  console.log("=".repeat(60));

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is required");
  }

  const tableName = "Proposals";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    // Step 1: Check if Proposals table exists
    console.log(`\n[1/4] Checking if table '${tableName}' exists...`);
    let tableExists = false;
    try {
      const entities = client.listEntities<ProposalEntity>({
        queryOptions: { filter: `PartitionKey eq 'PROPOSAL'` }
      });

      // Try to iterate to see if table exists
      const firstEntity = await entities.next();
      tableExists = true;
      console.log(`✓ Table '${tableName}' exists`);
    } catch (error: any) {
      if (error.statusCode === 404 || error.message?.includes('TableNotFound')) {
        console.log(`⊘ Table '${tableName}' does not exist`);
        console.log("NOTE: Proposals are currently stored in localStorage (frontend only)");
        console.log("This migration will be needed when backend storage is implemented.");
        console.log("\n✓ Migration 003 skipped (table does not exist)\n");
        return;
      }
      throw error;
    }

    // Step 2: Fetch all proposals
    console.log(`\n[2/4] Fetching existing proposals...`);
    const entities = client.listEntities<ProposalEntity>({
      queryOptions: { filter: `PartitionKey eq 'PROPOSAL'` }
    });

    const proposalsToUpdate: ProposalEntity[] = [];
    for await (const entity of entities) {
      proposalsToUpdate.push(entity);
    }

    console.log(`✓ Found ${proposalsToUpdate.length} proposal(s) in table`);

    if (proposalsToUpdate.length === 0) {
      console.log("⊘ No proposals to migrate (empty table)");
      console.log("\n✓ Migration 003 completed (no-op)\n");
      return;
    }

    // Step 3: Check which proposals need migration
    console.log("\n[3/4] Analyzing proposals...");
    const needsMigration = proposalsToUpdate.filter(
      proposal =>
        proposal.jobTypeId === undefined ||
        proposal.jobTypeName === undefined ||
        proposal.generalDescription === undefined ||
        proposal.sharePointFolderUrl === undefined
    );
    const alreadyMigrated = proposalsToUpdate.length - needsMigration.length;

    console.log(`  Proposals needing migration: ${needsMigration.length}`);
    console.log(`  Proposals already migrated: ${alreadyMigrated}`);

    if (needsMigration.length === 0) {
      console.log("\n✓ All proposals already have new fields (migration already applied)");
      console.log("\n✓ Migration 003 completed (idempotent)\n");
      return;
    }

    // Step 4: Update proposals (add missing fields)
    console.log("\n[4/4] Updating proposals with new fields...");
    let updated = 0;
    let failed = 0;

    for (const proposal of needsMigration) {
      try {
        const updatedEntity: ProposalEntity = {
          ...proposal,
          jobTypeId: proposal.jobTypeId ?? "", // Default to empty string
          jobTypeName: proposal.jobTypeName ?? "", // Default to empty string
          generalDescription: proposal.generalDescription ?? "", // Default to empty string
          sharePointFolderUrl: proposal.sharePointFolderUrl ?? "", // Default to empty string
        };

        await client.updateEntity(updatedEntity, "Merge");
        console.log(`  ✓ Updated proposal: ${proposal.proposalNumber}`);
        updated++;
      } catch (error: any) {
        console.error(`  ✗ Failed to update proposal ${proposal.proposalNumber}:`, error.message);
        failed++;
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration 003 Summary:");
    console.log(`  Table: ${tableName}`);
    console.log(`  Total proposals: ${proposalsToUpdate.length}`);
    console.log(`  Proposals updated: ${updated}`);
    console.log(`  Proposals already migrated: ${alreadyMigrated}`);
    console.log(`  Failed updates: ${failed}`);
    console.log("=".repeat(60));

    if (failed > 0) {
      throw new Error(`Migration 003 completed with ${failed} failure(s)`);
    }

    console.log("✓ Migration 003 completed successfully\n");

  } catch (error: any) {
    console.error("\n✗ Migration 003 FAILED:", error.message);
    console.error("Full error:", error);
    throw error;
  }
}

/**
 * Rollback migration
 *
 * NOTE: Azure Data Tables does not support removing properties from entities
 * The fields will remain but can be set to empty strings
 *
 * This is a non-destructive rollback that clears the field values
 */
export async function down(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Migration 003 ROLLBACK: Clear New Fields from Proposals");
  console.log("NOTE: Fields will remain (Azure Tables limitation) but values will be cleared");
  console.log("=".repeat(60));

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is required");
  }

  const tableName = "Proposals";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    console.log(`\nClearing new fields from proposals...`);

    let tableExists = false;
    try {
      const entities = client.listEntities<ProposalEntity>({
        queryOptions: { filter: `PartitionKey eq 'PROPOSAL'` }
      });
      await entities.next();
      tableExists = true;
    } catch (error: any) {
      if (error.statusCode === 404 || error.message?.includes('TableNotFound')) {
        console.log(`⊘ Table '${tableName}' does not exist (rollback skipped)`);
        return;
      }
      throw error;
    }

    const entities = client.listEntities<ProposalEntity>({
      queryOptions: { filter: `PartitionKey eq 'PROPOSAL'` }
    });

    let cleared = 0;
    for await (const entity of entities) {
      const needsClearing =
        (entity.jobTypeId !== undefined && entity.jobTypeId !== "") ||
        (entity.jobTypeName !== undefined && entity.jobTypeName !== "") ||
        (entity.generalDescription !== undefined && entity.generalDescription !== "") ||
        (entity.sharePointFolderUrl !== undefined && entity.sharePointFolderUrl !== "");

      if (needsClearing) {
        const updatedEntity: ProposalEntity = {
          ...entity,
          jobTypeId: "",
          jobTypeName: "",
          generalDescription: "",
          sharePointFolderUrl: "",
        };
        await client.updateEntity(updatedEntity, "Merge");
        console.log(`  ✓ Cleared fields for proposal: ${entity.proposalNumber}`);
        cleared++;
      }
    }

    console.log(`\n✓ Cleared ${cleared} proposal(s)`);
    console.log("✓ Migration 003 rollback completed\n");

  } catch (error: any) {
    console.error("\n✗ Migration 003 rollback FAILED:", error.message);
    throw error;
  }
}

/**
 * Verify migration was successful
 */
export async function verify(): Promise<boolean> {
  console.log("\nVerifying migration 003...");

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.error("✗ AZURE_STORAGE_CONNECTION_STRING not configured");
    return false;
  }

  const tableName = "Proposals";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    // Check if table exists
    let tableExists = false;
    try {
      const entities = client.listEntities<ProposalEntity>({
        queryOptions: { filter: `PartitionKey eq 'PROPOSAL'` }
      });
      await entities.next();
      tableExists = true;
    } catch (error: any) {
      if (error.statusCode === 404 || error.message?.includes('TableNotFound')) {
        console.log("⊘ Table does not exist (verification skipped - not yet implemented)");
        return true; // Not an error - table doesn't exist yet
      }
      throw error;
    }

    const entities = client.listEntities<ProposalEntity>({
      queryOptions: { filter: `PartitionKey eq 'PROPOSAL'` }
    });

    let total = 0;
    let withNewFields = 0;
    let missingFields = 0;

    for await (const entity of entities) {
      total++;
      const hasAllFields =
        entity.jobTypeId !== undefined &&
        entity.jobTypeName !== undefined &&
        entity.generalDescription !== undefined &&
        entity.sharePointFolderUrl !== undefined;

      if (hasAllFields) {
        withNewFields++;
      } else {
        missingFields++;
        console.warn(`  ⚠ Proposal ${entity.proposalNumber} missing some new fields`);
      }
    }

    console.log(`✓ Checked ${total} proposal(s)`);
    console.log(`  With all new fields: ${withNewFields}`);
    console.log(`  Missing some new fields: ${missingFields}`);

    if (missingFields > 0) {
      console.error("✗ Some proposals are missing new fields");
      return false;
    }

    if (total === 0) {
      console.log("⊘ No proposals in table (empty table - verification skipped)");
      return true;
    }

    console.log("✓ All proposals have new fields");
    console.log("✓ Migration 003 verification PASSED\n");
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
