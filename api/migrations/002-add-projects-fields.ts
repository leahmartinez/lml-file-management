/**
 * Migration 002: Add New Fields to Projects Entity
 *
 * Purpose:
 * - Adds reportTemplatesFolderUrl field to all existing projects
 *
 * This migration is IDEMPOTENT - safe to run multiple times
 *
 * Dependencies: None
 *
 * Can be run independently of migration 001
 */

import { TableClient, TableEntity } from "@azure/data-tables";

interface ProjectEntity extends TableEntity {
  partitionKey: string;
  rowKey: string;
  projectCode: string;
  reportTemplatesFolderUrl?: string;
  // ... other fields exist but we only care about the new one
}

/**
 * Main migration function
 */
export async function up(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Migration 002: Add New Fields to Projects Entity");
  console.log("=".repeat(60));

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is required");
  }

  const tableName = "Projects";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    // Step 1: Verify table exists
    console.log(`\n[1/3] Verifying table '${tableName}' exists...`);
    const entities = client.listEntities<ProjectEntity>({
      queryOptions: { filter: `PartitionKey eq 'PROJECT'` }
    });

    const projectsToUpdate: ProjectEntity[] = [];
    for await (const entity of entities) {
      projectsToUpdate.push(entity);
    }

    console.log(`✓ Found ${projectsToUpdate.length} project(s) in table`);

    if (projectsToUpdate.length === 0) {
      console.log("⊘ No projects to migrate (empty table)");
      console.log("\n✓ Migration 002 completed (no-op)\n");
      return;
    }

    // Step 2: Check which projects need migration
    console.log("\n[2/3] Analyzing projects...");
    const needsMigration = projectsToUpdate.filter(
      project => project.reportTemplatesFolderUrl === undefined
    );
    const alreadyMigrated = projectsToUpdate.length - needsMigration.length;

    console.log(`  Projects needing migration: ${needsMigration.length}`);
    console.log(`  Projects already migrated: ${alreadyMigrated}`);

    if (needsMigration.length === 0) {
      console.log("\n✓ All projects already have new fields (migration already applied)");
      console.log("\n✓ Migration 002 completed (idempotent)\n");
      return;
    }

    // Step 3: Update projects (add missing fields)
    console.log("\n[3/3] Updating projects with new fields...");
    let updated = 0;
    let failed = 0;

    for (const project of needsMigration) {
      try {
        const updatedEntity: ProjectEntity = {
          ...project,
          reportTemplatesFolderUrl: "", // Default to empty string
        };

        await client.updateEntity(updatedEntity, "Merge");
        console.log(`  ✓ Updated project: ${project.projectCode}`);
        updated++;
      } catch (error: any) {
        console.error(`  ✗ Failed to update project ${project.projectCode}:`, error.message);
        failed++;
      }
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration 002 Summary:");
    console.log(`  Table: ${tableName}`);
    console.log(`  Total projects: ${projectsToUpdate.length}`);
    console.log(`  Projects updated: ${updated}`);
    console.log(`  Projects already migrated: ${alreadyMigrated}`);
    console.log(`  Failed updates: ${failed}`);
    console.log("=".repeat(60));

    if (failed > 0) {
      throw new Error(`Migration 002 completed with ${failed} failure(s)`);
    }

    console.log("✓ Migration 002 completed successfully\n");

  } catch (error: any) {
    console.error("\n✗ Migration 002 FAILED:", error.message);
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
  console.log("Migration 002 ROLLBACK: Clear New Fields from Projects");
  console.log("NOTE: Fields will remain (Azure Tables limitation) but values will be cleared");
  console.log("=".repeat(60));

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING environment variable is required");
  }

  const tableName = "Projects";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    console.log(`\nClearing new fields from projects...`);

    const entities = client.listEntities<ProjectEntity>({
      queryOptions: { filter: `PartitionKey eq 'PROJECT'` }
    });

    let cleared = 0;
    for await (const entity of entities) {
      if (entity.reportTemplatesFolderUrl !== undefined && entity.reportTemplatesFolderUrl !== "") {
        const updatedEntity: ProjectEntity = {
          ...entity,
          reportTemplatesFolderUrl: "",
        };
        await client.updateEntity(updatedEntity, "Merge");
        console.log(`  ✓ Cleared fields for project: ${entity.projectCode}`);
        cleared++;
      }
    }

    console.log(`\n✓ Cleared ${cleared} project(s)`);
    console.log("✓ Migration 002 rollback completed\n");

  } catch (error: any) {
    console.error("\n✗ Migration 002 rollback FAILED:", error.message);
    throw error;
  }
}

/**
 * Verify migration was successful
 */
export async function verify(): Promise<boolean> {
  console.log("\nVerifying migration 002...");

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    console.error("✗ AZURE_STORAGE_CONNECTION_STRING not configured");
    return false;
  }

  const tableName = "Projects";
  const client = TableClient.fromConnectionString(connectionString, tableName);

  try {
    const entities = client.listEntities<ProjectEntity>({
      queryOptions: { filter: `PartitionKey eq 'PROJECT'` }
    });

    let total = 0;
    let withNewFields = 0;
    let missingFields = 0;

    for await (const entity of entities) {
      total++;
      if (entity.reportTemplatesFolderUrl !== undefined) {
        withNewFields++;
      } else {
        missingFields++;
        console.warn(`  ⚠ Project ${entity.projectCode} missing reportTemplatesFolderUrl field`);
      }
    }

    console.log(`✓ Checked ${total} project(s)`);
    console.log(`  With new fields: ${withNewFields}`);
    console.log(`  Missing new fields: ${missingFields}`);

    if (missingFields > 0) {
      console.error("✗ Some projects are missing new fields");
      return false;
    }

    if (total === 0) {
      console.log("⊘ No projects in table (empty table - verification skipped)");
      return true;
    }

    console.log("✓ All projects have new fields");
    console.log("✓ Migration 002 verification PASSED\n");
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
