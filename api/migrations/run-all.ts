/**
 * Run All Migrations
 *
 * Executes all database migrations in order
 * Stops on first failure
 */

import * as migration001 from './001-create-jobtypes-table';
import * as migration002 from './002-add-projects-fields';
import * as migration003 from './003-add-proposals-fields';

interface Migration {
  name: string;
  up: () => Promise<void>;
  verify: () => Promise<boolean>;
}

const migrations: Migration[] = [
  {
    name: "001-create-jobtypes-table",
    up: migration001.up,
    verify: migration001.verify,
  },
  {
    name: "002-add-projects-fields",
    up: migration002.up,
    verify: migration002.verify,
  },
  {
    name: "003-add-proposals-fields",
    up: migration003.up,
    verify: migration003.verify,
  },
];

async function runAllMigrations(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Running All Database Migrations");
  console.log("=".repeat(60));

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const migration of migrations) {
    try {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`Running migration: ${migration.name}`);
      console.log("=".repeat(60));

      await migration.up();

      const isValid = await migration.verify();
      if (isValid) {
        console.log(`✓ Migration ${migration.name} completed and verified\n`);
        successCount++;
      } else {
        console.error(`✗ Migration ${migration.name} verification FAILED\n`);
        failedCount++;
        break; // Stop on first failure
      }
    } catch (error: any) {
      if (error.message?.includes('skipped') || error.message?.includes('no-op')) {
        console.log(`⊘ Migration ${migration.name} skipped (not applicable)\n`);
        skippedCount++;
      } else {
        console.error(`✗ Migration ${migration.name} FAILED:`, error.message);
        failedCount++;
        break; // Stop on first failure
      }
    }
  }

  // Final summary
  console.log("\n" + "=".repeat(60));
  console.log("Migration Summary");
  console.log("=".repeat(60));
  console.log(`Total migrations: ${migrations.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log("=".repeat(60));

  if (failedCount > 0) {
    console.error("\n✗ Some migrations failed. Please review the errors above.\n");
    process.exit(1);
  } else {
    console.log("\n✓ All migrations completed successfully!\n");
    process.exit(0);
  }
}

// Run migrations
if (require.main === module) {
  runAllMigrations().catch((error) => {
    console.error("\nFatal error running migrations:", error);
    process.exit(1);
  });
}

export { runAllMigrations };
