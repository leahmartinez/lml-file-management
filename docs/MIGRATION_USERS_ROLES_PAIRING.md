# Migration Guide: Users Roles & Pairing

**Target Schema:** Users table with updated roles and pairedUserId field
**Safe to Run:** Multiple times (idempotent)
**Estimated Time:** <5 minutes for typical user counts (<100 users)

---

## Pre-Migration Checklist

Before running the migration, complete the following steps:

### 1. Backup Users Table

**Option A: Azure Portal Export**
1. Navigate to Azure Portal → Storage Account → Tables → Users
2. Export Users table to Blob Storage (CSV or JSON format)
3. Store backup in a safe location with timestamp (e.g., `users-backup-2026-04-09.json`)

**Option B: Programmatic Backup**
```typescript
// Run this function to export all users to Blob Storage
async function backupUsersTable() {
  const users = await getAllUsers();
  const backupData = JSON.stringify(users, null, 2);
  const fileName = `users-backup-${new Date().toISOString().split('T')[0]}.json`;

  // Upload to Blob Storage
  await uploadToBlob('backups', fileName, backupData);

  console.log(`Backup complete: ${fileName}`);
}
```

### 2. Audit Current Users

Run this query to understand the current state:

```typescript
async function auditCurrentUsers() {
  const users = await getAllUsers();

  const roleCount: Record<string, number> = {};
  const usersWithPairing: string[] = [];

  users.forEach((user) => {
    // Count roles
    roleCount[user.role] = (roleCount[user.role] || 0) + 1;

    // Check if user already has pairedUserId (shouldn't exist yet)
    if (user.pairedUserId) {
      usersWithPairing.push(user.email);
    }
  });

  console.log('Current User Roles:');
  console.table(roleCount);

  if (usersWithPairing.length > 0) {
    console.warn('Users with existing pairedUserId field:');
    console.log(usersWithPairing);
  }

  return { roleCount, usersWithPairing };
}
```

**Expected Output:**
```
Current User Roles:
┌─────────────────┬───────┐
│     Role        │ Count │
├─────────────────┼───────┤
│ admin           │   1   │
│ consultant      │  15   │
│ subconsultant   │   5   │
│ site_manager    │   2   │
│ ...             │  ...  │
└─────────────────┴───────┘
```

### 3. Identify Consultant Pairs

Define the consultant pairings that should be set up:

**Current Known Pairings:**
- Jack (`jack@lmllift.com`) ↔ Ian (`ian@lmllift.com`) - VIC consultants
- Shayne (`shayne@lmllift.com`) ↔ Randall (`randall@lmllift.com`) - NSW consultants

**Verify these users exist:**
```typescript
async function verifyPairingUsers() {
  const pairings = [
    { user1: 'jack@lmllift.com', user2: 'ian@lmllift.com' },
    { user1: 'shayne@lmllift.com', user2: 'randall@lmllift.com' },
  ];

  for (const pair of pairings) {
    const user1 = await getUserByEmail(pair.user1);
    const user2 = await getUserByEmail(pair.user2);

    if (!user1) {
      console.error(`User not found: ${pair.user1}`);
    } else {
      console.log(`✓ ${pair.user1} exists (role: ${user1.role})`);
    }

    if (!user2) {
      console.error(`User not found: ${pair.user2}`);
    } else {
      console.log(`✓ ${pair.user2} exists (role: ${user2.role})`);
    }
  }
}
```

### 4. Review Role Mapping

Confirm the following role mapping is correct for your users:

| Old Role | New Role | Notes |
|----------|----------|-------|
| `admin` | `Admin` | Application administrator (Leah) |
| `super_admin` | `Admin` | Consolidate into Admin role |
| `consultant` | `LMLConsultant` | Standard LML consultant |
| `subconsultant` | `SubConsultant` | External contractors |
| `user` | `LMLConsultant` | **REVIEW REQUIRED** - Default assumption |
| `site_manager` | `AdminStaff` | **REVIEW REQUIRED** - Default assumption |
| `national_manager` | `Director` | **REVIEW REQUIRED** - Default assumption |

**IMPORTANT:** Users with roles `user`, `site_manager`, or `national_manager` should be manually reviewed before migration to ensure correct role assignment.

---

## Migration Script

### Migration Pseudo-Code

This pseudo-code should be implemented as an Azure Function or standalone script.

```typescript
/**
 * Migration: Add pairedUserId and update role names
 *
 * This migration:
 * 1. Updates all user role values from old naming to new naming
 * 2. Adds pairedUserId field for consultant pairings
 * 3. Sets bidirectional pairing for specified consultant pairs
 *
 * Safe to run multiple times (idempotent).
 */
async function migrateUsersRolesAndPairing() {
  console.log('=== Starting Users Migration ===');
  console.log('Timestamp:', new Date().toISOString());

  // Step 1: Get all users
  const users = await getAllUsers();
  console.log(`Found ${users.length} users to migrate`);

  // Step 2: Define role mapping
  const roleMapping: Record<string, string> = {
    'admin': 'Admin',
    'super_admin': 'Admin', // Consolidate
    'consultant': 'LMLConsultant',
    'subconsultant': 'SubConsultant',
    // These require manual review - using default assumptions:
    'user': 'LMLConsultant',
    'site_manager': 'AdminStaff',
    'national_manager': 'Director',
  };

  // Step 3: Define consultant pairings
  const pairings = [
    { user1: 'jack@lmllift.com', user2: 'ian@lmllift.com' },
    { user1: 'shayne@lmllift.com', user2: 'randall@lmllift.com' },
  ];

  // Normalize pairing emails
  const normalizedPairings = pairings.map(p => ({
    user1: p.user1.toLowerCase().trim(),
    user2: p.user2.toLowerCase().trim(),
  }));

  // Step 4: Track migration results
  const results = {
    totalUsers: users.length,
    rolesUpdated: 0,
    pairingsSet: 0,
    errors: [] as string[],
    warnings: [] as string[],
    skipped: [] as string[],
  };

  // Step 5: Process each user
  for (const user of users) {
    const userEmail = user.email.toLowerCase().trim();
    const updates: any = {};

    try {
      // --- Update Role ---
      const currentRole = user.role;
      const newRole = roleMapping[currentRole];

      if (!newRole) {
        results.warnings.push(
          `No role mapping for ${userEmail} with role "${currentRole}" - skipping role update`
        );
      } else if (newRole !== currentRole) {
        updates.role = newRole;
        console.log(`  ${userEmail}: role ${currentRole} → ${newRole}`);
        results.rolesUpdated++;
      } else {
        // Role already matches new naming
        console.log(`  ${userEmail}: role already correct (${currentRole})`);
      }

      // --- Set pairedUserId if user is in a pairing ---
      const pairing = normalizedPairings.find(
        p => p.user1 === userEmail || p.user2 === userEmail
      );

      if (pairing) {
        // Determine paired user email
        const pairedEmail = pairing.user1 === userEmail ? pairing.user2 : pairing.user1;

        // Verify this user should have pairing (role must be LMLConsultant)
        const finalRole = updates.role || currentRole;
        if (finalRole === 'LMLConsultant' || currentRole === 'consultant') {
          // Only set pairedUserId if it's different from current value
          const currentPairedUserId = user.pairedUserId?.toLowerCase().trim();
          if (currentPairedUserId !== pairedEmail) {
            updates.pairedUserId = pairedEmail;
            console.log(`  ${userEmail}: pairing set → ${pairedEmail}`);
            results.pairingsSet++;
          } else {
            console.log(`  ${userEmail}: pairing already correct`);
          }
        } else {
          results.warnings.push(
            `User ${userEmail} is in pairing list but has role ${finalRole} (not LMLConsultant) - skipping pairing`
          );
        }
      }

      // --- Apply Updates ---
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await updateUser(userEmail, updates);
        console.log(`  ✓ Updated ${userEmail}`);
      } else {
        results.skipped.push(userEmail);
        console.log(`  - Skipped ${userEmail} (no changes needed)`);
      }

    } catch (error: any) {
      results.errors.push(`Error updating ${userEmail}: ${error.message}`);
      console.error(`  ✗ Error updating ${userEmail}:`, error);
    }
  }

  // Step 6: Verify bidirectional pairings
  console.log('\n=== Verifying Bidirectional Pairings ===');
  for (const pairing of normalizedPairings) {
    const user1 = await getUserByEmail(pairing.user1);
    const user2 = await getUserByEmail(pairing.user2);

    if (!user1 || !user2) {
      results.errors.push(`Pairing verification failed: User not found`);
      continue;
    }

    const user1PairedEmail = user1.pairedUserId?.toLowerCase().trim();
    const user2PairedEmail = user2.pairedUserId?.toLowerCase().trim();

    if (user1PairedEmail === pairing.user2 && user2PairedEmail === pairing.user1) {
      console.log(`✓ Pairing verified: ${pairing.user1} ↔ ${pairing.user2}`);
    } else {
      results.errors.push(
        `Pairing not bidirectional: ${pairing.user1} (paired: ${user1PairedEmail}) ` +
        `↔ ${pairing.user2} (paired: ${user2PairedEmail})`
      );
    }
  }

  // Step 7: Print migration summary
  console.log('\n=== Migration Summary ===');
  console.log(`Total users processed: ${results.totalUsers}`);
  console.log(`Roles updated: ${results.rolesUpdated}`);
  console.log(`Pairings set: ${results.pairingsSet}`);
  console.log(`Skipped (no changes): ${results.skipped.length}`);
  console.log(`Warnings: ${results.warnings.length}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.warnings.length > 0) {
    console.warn('\nWarnings:');
    results.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (results.errors.length > 0) {
    console.error('\nErrors:');
    results.errors.forEach(e => console.error(`  - ${e}`));
  }

  console.log('\n=== Migration Complete ===');

  return results;
}
```

---

## Post-Migration Validation

After running the migration, validate the results:

### 1. Verify Role Updates

```typescript
async function validateRoleUpdates() {
  const users = await getAllUsers();
  const newRoles = ['Admin', 'Director', 'LMLConsultant', 'SubConsultant', 'AdminStaff'];

  const roleCount: Record<string, number> = {};
  const invalidRoles: string[] = [];

  users.forEach((user) => {
    roleCount[user.role] = (roleCount[user.role] || 0) + 1;

    if (!newRoles.includes(user.role)) {
      invalidRoles.push(`${user.email}: ${user.role}`);
    }
  });

  console.log('Updated Role Distribution:');
  console.table(roleCount);

  if (invalidRoles.length > 0) {
    console.error('Users with invalid roles (manual review required):');
    invalidRoles.forEach(r => console.error(`  - ${r}`));
  } else {
    console.log('✓ All users have valid roles');
  }
}
```

### 2. Verify Bidirectional Pairings

```typescript
async function validatePairings() {
  const expectedPairings = [
    { user1: 'jack@lmllift.com', user2: 'ian@lmllift.com' },
    { user1: 'shayne@lmllift.com', user2: 'randall@lmllift.com' },
  ];

  for (const pair of expectedPairings) {
    const user1 = await getUserByEmail(pair.user1);
    const user2 = await getUserByEmail(pair.user2);

    if (!user1 || !user2) {
      console.error(`✗ Pairing users not found: ${pair.user1} ↔ ${pair.user2}`);
      continue;
    }

    const user1Paired = user1.pairedUserId?.toLowerCase();
    const user2Paired = user2.pairedUserId?.toLowerCase();

    if (user1Paired === pair.user2.toLowerCase() && user2Paired === pair.user1.toLowerCase()) {
      console.log(`✓ Pairing correct: ${pair.user1} ↔ ${pair.user2}`);
    } else {
      console.error(
        `✗ Pairing incorrect: ${pair.user1} (paired: ${user1Paired}) ` +
        `↔ ${pair.user2} (paired: ${user2Paired})`
      );
    }
  }
}
```

### 3. Verify Only LMLConsultants Have Pairings

```typescript
async function validatePairingRoles() {
  const users = await getAllUsers();
  const invalidPairings: string[] = [];

  users.forEach((user) => {
    if (user.pairedUserId && user.role !== 'LMLConsultant') {
      invalidPairings.push(`${user.email} (role: ${user.role}) has pairedUserId: ${user.pairedUserId}`);
    }
  });

  if (invalidPairings.length > 0) {
    console.error('Users with invalid pairing (non-LMLConsultant roles):');
    invalidPairings.forEach(p => console.error(`  - ${p}`));
  } else {
    console.log('✓ All pairings are on LMLConsultant roles only');
  }
}
```

### 4. Test Authentication

Verify that authentication still works with new role values:

```typescript
async function testAuthentication() {
  // Test login for a few users
  const testUsers = [
    { email: 'leah@lmllift.com', expectedRole: 'Admin' },
    { email: 'jack@lmllift.com', expectedRole: 'LMLConsultant' },
    // Add more test users as needed
  ];

  for (const testUser of testUsers) {
    try {
      // Attempt to fetch user
      const user = await getUserByEmail(testUser.email);

      if (!user) {
        console.error(`✗ User not found: ${testUser.email}`);
        continue;
      }

      if (user.role === testUser.expectedRole) {
        console.log(`✓ ${testUser.email}: role ${user.role}`);
      } else {
        console.error(
          `✗ ${testUser.email}: expected role ${testUser.expectedRole}, got ${user.role}`
        );
      }
    } catch (error: any) {
      console.error(`✗ Error fetching ${testUser.email}:`, error.message);
    }
  }
}
```

### 5. Test "My Work" Visibility

Verify that paired consultants can see each other's work:

```typescript
async function testPairingVisibility() {
  // Test Jack's visibility
  const jack = await getUserByEmail('jack@lmllift.com');
  const allJobs = await getAllStages(); // Fetch all jobs

  // Import pairing logic
  const visibleJobs = getVisibleJobs(jack, allJobs);

  console.log(`Jack can see ${visibleJobs.length} jobs`);

  // Check if Jack can see Ian's jobs
  const ianJobs = allJobs.filter(job =>
    parseConsultantEmails(job.consultantEmails).includes('ian@lmllift.com')
  );

  const jackCanSeeIanJobs = ianJobs.every(job => canUserSeeJob(jack, job));

  if (jackCanSeeIanJobs) {
    console.log(`✓ Jack can see all of Ian's jobs (${ianJobs.length} jobs)`);
  } else {
    console.error(`✗ Jack cannot see some of Ian's jobs`);
  }
}
```

---

## Rollback Plan

If the migration fails or introduces issues, rollback using one of these strategies:

### Option 1: Reverse Migration Script

```typescript
async function rollbackUsersRolesAndPairing() {
  console.log('=== Rolling Back Users Migration ===');

  const users = await getAllUsers();

  // Reverse role mapping
  const reverseRoleMapping: Record<string, string> = {
    'Admin': 'admin',
    'Director': 'national_manager', // Or manually set based on backup
    'LMLConsultant': 'consultant',
    'SubConsultant': 'subconsultant',
    'AdminStaff': 'site_manager', // Or manually set based on backup
  };

  for (const user of users) {
    const updates: any = {};

    // Revert role
    const oldRole = reverseRoleMapping[user.role];
    if (oldRole) {
      updates.role = oldRole;
    }

    // Remove pairedUserId
    if (user.pairedUserId) {
      updates.pairedUserId = null; // Or undefined to delete property
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      await updateUser(user.email, updates);
      console.log(`Rolled back ${user.email}`);
    }
  }

  console.log('Rollback complete');
}
```

### Option 2: Restore from Backup

If you created a backup before migration:

```typescript
async function restoreFromBackup(backupFileName: string) {
  console.log(`Restoring from backup: ${backupFileName}`);

  // Download backup from Blob Storage
  const backupData = await downloadFromBlob('backups', backupFileName);
  const backupUsers = JSON.parse(backupData);

  console.log(`Found ${backupUsers.length} users in backup`);

  // Delete all current users
  const currentUsers = await getAllUsers();
  for (const user of currentUsers) {
    await deleteUser(user.email);
    console.log(`Deleted ${user.email}`);
  }

  // Restore users from backup
  for (const userData of backupUsers) {
    await createUser({
      email: userData.email,
      passwordHash: userData.passwordHash,
      role: userData.role,
      sites: JSON.parse(userData.sites || '[]'),
      createdBy: userData.createdBy,
      accountStatus: userData.accountStatus,
      emailVerified: userData.emailVerified,
      mustChangePassword: userData.mustChangePassword,
    });

    // Restore profile fields if present
    if (userData.firstName || userData.lastName || userData.photo) {
      await updateUser(userData.email, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        position: userData.position,
        phone: userData.phone,
        officePhone: userData.officePhone,
        department: userData.department,
        photo: userData.photo,
        bio: userData.bio,
        category: userData.category,
      });
    }

    console.log(`Restored ${userData.email}`);
  }

  console.log('Restore complete');
}
```

---

## Manual Review Required

After migration, manually review and potentially update users with these old roles:

### 1. Users with `user` role
- **Default migration:** → `LMLConsultant`
- **Review reason:** "user" is ambiguous - could be consultant, admin staff, or other
- **Action:** Check each user's actual responsibilities and update role if needed

### 2. Users with `site_manager` role
- **Default migration:** → `AdminStaff`
- **Review reason:** Site managers could be either AdminStaff or Directors depending on responsibilities
- **Action:** Verify if they need to see all projects or just manage jobs

### 3. Users with `national_manager` role
- **Default migration:** → `Director`
- **Review reason:** National managers likely need full visibility but may not need user management
- **Action:** Confirm they should be Directors (not Admins)

---

## Timeline & Execution

**Recommended Execution Plan:**

1. **Day 1 - Preparation (30 minutes)**
   - Run pre-migration checklist
   - Backup Users table
   - Audit current users and verify pairings
   - Review role mapping and identify manual review cases

2. **Day 2 - Migration (1 hour)**
   - Run migration script in development/staging environment
   - Validate results
   - Test authentication and pairing visibility
   - Fix any issues identified

3. **Day 3 - Production Migration (30 minutes)**
   - Run migration script in production
   - Validate results immediately
   - Monitor for any authentication failures
   - Keep rollback script ready

4. **Day 4-7 - Manual Review (2 hours)**
   - Review users with ambiguous roles (`user`, `site_manager`, `national_manager`)
   - Update roles manually if needed
   - Confirm all users have correct permissions

**Maintenance Window:** Consider running production migration during off-hours to minimize user impact.

---

## Troubleshooting

### Issue: Migration script fails partway through

**Solution:**
- Migration is idempotent - safe to re-run
- Script will skip users that already have correct values
- Check error logs to identify problematic users
- Fix individual users manually if needed

### Issue: Pairing not bidirectional after migration

**Solution:**
```typescript
// Manually fix pairing for Jack and Ian
await updateUser('jack@lmllift.com', {
  pairedUserId: 'ian@lmllift.com',
  updatedAt: new Date().toISOString(),
});

await updateUser('ian@lmllift.com', {
  pairedUserId: 'jack@lmllift.com',
  updatedAt: new Date().toISOString(),
});
```

### Issue: Users cannot log in after migration

**Solution:**
- Check JWT token generation - ensure it uses new role values
- Check `hasRole()` function - ensure it accepts new role values
- Verify frontend role checks use new role constants
- Users may need to log out and log back in to get new JWT token

### Issue: Some users have `null` or `undefined` for pairedUserId

**Solution:**
- This is expected for users who are not paired
- Azure Data Tables treats missing properties as null/undefined
- Application code should handle this gracefully with optional chaining (`user.pairedUserId?.toLowerCase()`)

---

## Next Steps After Migration

1. **Update Backend Authorization Logic**
   - Update all `hasRole()` checks to use new role values
   - Import `UserRole` enum from `shared/constants/roles.ts`
   - Update Zod schema to accept new role values

2. **Update Frontend Role Checks**
   - Import `UserRole` enum in frontend components
   - Update role-based UI rendering (e.g., hide map for AdminStaff)
   - Update user management UI to show new role names

3. **Implement Pairing Management UI**
   - Create admin UI to view current pairings
   - Create admin UI to create/update/delete pairings
   - Validate pairing changes on backend

4. **Update Documentation**
   - Update user guide with new role names
   - Document pairing feature for consultants
   - Update admin guide with pairing management instructions

5. **Monitor & Iterate**
   - Monitor authentication logs for any role-related errors
   - Gather user feedback on pairing visibility
   - Adjust permissions if needed based on real-world usage
