# Database Migrations

This directory contains database migration scripts for schema changes to Azure Data Tables.

## Migration Files

### 001-create-jobtypes-table.ts
Creates the JobTypes table and seeds initial job types.

**Run this first** before other migrations.

### 002-add-projects-fields.ts
Adds the `reportTemplatesFolderUrl` field to all existing projects.

Can be run independently.

### 003-add-proposals-fields.ts
Adds new fields to Proposals entity (jobTypeId, jobTypeName, generalDescription, sharePointFolderUrl).

**NOTE:** As of April 2026, proposals are stored in localStorage (frontend only). This migration will only run when the Proposals backend table exists.

## Running Migrations

### Prerequisites

1. Ensure `AZURE_STORAGE_CONNECTION_STRING` is configured in your environment
2. Install dependencies: `npm install`
3. Build TypeScript: `npm run build`

### Run Individual Migration

```bash
# From the api directory
cd api

# Run migration 001
npx ts-node migrations/001-create-jobtypes-table.ts

# Run migration 002
npx ts-node migrations/002-add-projects-fields.ts

# Run migration 003 (when Proposals backend exists)
npx ts-node migrations/003-add-proposals-fields.ts
```

### Run All Migrations

```bash
# From the api directory
npx ts-node migrations/run-all.ts
```

## Migration Order

Migrations should be run in this order:

1. **001-create-jobtypes-table.ts** - Creates JobTypes table and seeds data
2. **002-add-projects-fields.ts** - Updates Projects entity
3. **003-add-proposals-fields.ts** - Updates Proposals entity (when table exists)

## Idempotency

All migrations are **idempotent** - they can be run multiple times safely:

- If a table already exists, it won't be recreated
- If entities already have the new fields, they won't be updated again
- Migrations detect existing state and skip already-completed work

## Rollback

Each migration includes a `down()` function for rollback:

```typescript
// In the migration file
await down(); // Rolls back the migration
```

**WARNING:** Rollbacks may be destructive. Review the code before rolling back.

## Verification

Each migration includes a `verify()` function to check if it was successful:

```typescript
// In the migration file
const isValid = await verify(); // Returns true if migration was successful
```

Verification runs automatically after each migration when using the direct execution method.

## Migration Script Structure

Each migration follows this pattern:

```typescript
/**
 * Apply migration
 */
export async function up(): Promise<void> {
  // Migration logic here
}

/**
 * Rollback migration
 */
export async function down(): Promise<void> {
  // Rollback logic here
}

/**
 * Verify migration was successful
 */
export async function verify(): Promise<boolean> {
  // Verification logic here
  return true;
}

// Allow direct execution
if (require.main === module) {
  (async () => {
    await up();
    const isValid = await verify();
    process.exit(isValid ? 0 : 1);
  })();
}
```

## Error Handling

- Migrations will stop on first error
- Failed updates are logged with details
- Verification failures return exit code 1
- Successful migrations return exit code 0

## Best Practices

1. **Always backup** before running migrations in production
2. **Test migrations** on development/staging environment first
3. **Run verify()** after each migration to ensure success
4. **Review rollback** code before executing rollbacks
5. **Keep migrations small** - one logical change per migration
6. **Never modify** existing migration files after they've been run in production

## Troubleshooting

### "Table not found" error
- Ensure the table exists before running the migration
- For migration 003, the Proposals table may not exist yet (this is expected)

### "AZURE_STORAGE_CONNECTION_STRING not configured"
- Set the environment variable in your shell or `.env` file
- For local testing, use Azurite or Azure Storage Emulator

### Migration hangs or times out
- Check your Azure Storage connection
- Verify network connectivity
- Check Azure Storage account status

### Verification fails
- Review the verification output for specific issues
- Check entity structure in Azure Storage Explorer
- Re-run the migration (it's idempotent)

## Additional Resources

- [Azure Data Tables Documentation](https://docs.microsoft.com/azure/cosmos-db/table/introduction)
- [Schema Design Documentation](../SCHEMA_CHANGES_2026-04-09.md)
