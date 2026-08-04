# Users Entity Schema - Tiered Permissions & Consultant Pairing

**Version:** 2.0
**Date:** April 9, 2026
**Database:** Azure Data Tables (NoSQL)

---

## Overview

This document defines the complete user entity schema for the LML Lift Consultants Work Management Portal, including:
- Tiered role-based permissions (5 roles)
- Consultant pairing system for job visibility
- Query patterns for access control
- Migration strategy from existing schema

---

## Entity Definition

### Entity: Users

**Table Name:** `Users`

**Partition Key:** `"USER"` (constant)

**Partition Key Justification:**
All users share the same partition key (`"USER"`) because:
- User count is relatively small (<100 users expected)
- Primary query pattern is "get all users" for admin interfaces
- User lookups are by email (rowKey), which is highly efficient
- Having all users in one partition enables fast enumeration for role-based access checks
- Risk of hot partition is minimal given the user count and read-heavy workload

**Row Key:** `email` (user's email address, normalized to lowercase)

**Row Key Justification:**
Email serves as the natural unique identifier because:
- Email is already the login credential (guaranteed unique)
- Email lookups are the most common query pattern (authentication, profile access)
- Point queries by email (partition key + row key) are extremely fast in Azure Data Tables
- Email is immutable in the authentication system (users cannot change email)

---

## Properties

### Core Identity Fields

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `email` | String | Yes | User's email address (lowercase, normalized). Also used as rowKey. |
| `passwordHash` | String | Yes | bcrypt hash of user's password. Never exposed in API responses. |
| `role` | String (Enum) | Yes | User's permission role. See Role Definitions below. |
| `pairedUserId` | String | No | Email address of paired consultant (for LMLConsultant role only). Enables bidirectional work visibility. |

### Profile Fields

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `firstName` | String | No | User's first name |
| `lastName` | String | No | User's last name |
| `position` | String | No | Job title or position |
| `phone` | String | No | Mobile phone number |
| `officePhone` | String | No | Office phone number |
| `department` | String | No | Department or team |
| `photo` | String | No | Base64-encoded profile photo or URL (watch for 1MB entity limit) |
| `bio` | String | No | Biography or description (max 10,000 chars to prevent entity bloat) |
| `category` | String | No | User category or classification |

### Access Control Fields

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `sites` | String (JSON array) | Yes | JSON stringified array of site IDs this user can access. Empty array = no site restrictions. |
| `accountStatus` | String (Enum) | Yes | `'pending'` \| `'active'` \| `'suspended'`. Controls login access. |
| `emailVerified` | Boolean | Yes | Whether user has verified their email address. |
| `mustChangePassword` | Boolean | No | If true, user must change password on next login. |

### Authentication Tokens

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `emailVerificationToken` | String | No | Token for email verification (expires after 24 hours) |
| `emailVerificationExpiry` | String (ISO Date) | No | Expiry timestamp for email verification token |
| `passwordResetToken` | String | No | Token for password reset (expires after 1 hour) |
| `passwordResetExpiry` | String (ISO Date) | No | Expiry timestamp for password reset token |

### Audit Fields (Standard)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `createdAt` | String (ISO Date) | Yes | UTC timestamp when user was created |
| `updatedAt` | String (ISO Date) | No | UTC timestamp of last modification |
| `lastLogin` | String (ISO Date) | No | UTC timestamp of last successful login |
| `createdBy` | String | No | Email of admin who created this user, or `'self-registration'` or `'system'` |

---

## Role Definitions

The system supports 5 distinct roles with hierarchical permissions:

### 1. Admin (Leah - Application Administrator)

**Role Value:** `"Admin"`

**Permissions:**
- Full system access to all features and data
- Can manage all users (create, update, suspend, delete)
- Can see and manage all projects, proposals, jobs, sites
- Can see proposal pricing ($)
- Can price proposals
- Can access the map on My Work
- Can manage job types and system configuration
- Superuser role - no restrictions

**Query Scope:** All data across all sites, projects, and consultants

**Notes:**
- This role replaces the existing `'admin'` and `'super_admin'` roles (consolidation recommended)
- Only Leah (leah@lmllift.com) should have this role
- Inherits all permissions automatically

---

### 2. Director (Full Project Access)

**Role Value:** `"Director"`

**Permissions:**
- Can see all work across all consultants
- Can see all projects and proposals
- Can price proposals
- Can see proposal pricing ($)
- Can access the map on My Work
- Cannot manage users or system configuration
- Read/write access to all project data

**Query Scope:** All projects, proposals, and jobs (no site restrictions)

**Pairing:** Directors do not participate in consultant pairings

**Use Cases:**
- Senior leadership who needs visibility into all work
- Can price and manage proposals
- Cannot add/remove users

---

### 3. LMLConsultant (Standard Consultant)

**Role Value:** `"LMLConsultant"`

**Permissions:**
- Can see their own assigned work (jobs where `consultantEmails` includes their email)
- Can see work of their paired consultant (if `pairedUserId` is set)
- Can see proposal pricing ($)
- Can access the map on My Work
- Can update job status, add comments, upload files for assigned work
- Cannot manage users or system settings
- Cannot price proposals (can view prices but not set them)

**Query Scope:**
- Own jobs: `consultantEmails` contains `user.email`
- Paired jobs: `consultantEmails` contains `user.pairedUserId`
- Combined view of both sets

**Pairing:**
- Participates in bidirectional consultant pairings
- If User A has `pairedUserId = userB@example.com`, then User A can see all jobs assigned to User B
- Pairing must be bidirectional (both users must set each other as paired)

**Current Pairings:**
- Jack ↔ Ian (VIC consultants)
- Shayne ↔ Randall (NSW consultants)

**Implementation Note:** Pairing allows experienced consultants to see their pair's work for mentoring, coverage, and collaboration.

---

### 4. SubConsultant (Restricted Subcontractor)

**Role Value:** `"SubConsultant"`

**Permissions:**
- Can see only their own assigned work (jobs where `consultantEmails` includes their email)
- **Cannot see proposal pricing ($)** - prices are hidden in UI
- Can access the map on My Work
- Can update job status, add comments, upload files for assigned work
- Cannot manage users or system settings
- Cannot price proposals

**Query Scope:** Only jobs where `consultantEmails` contains `user.email`

**Pairing:** SubConsultants do NOT participate in pairings - they only see their own work

**Restrictions vs LMLConsultant:**
- No access to proposal prices
- No paired consultant visibility
- More limited scope (only own work)

**Use Cases:**
- External contractors
- Subcontractors hired for specific jobs
- Users who should not see financial information

---

### 5. AdminStaff (Internal Admin Team)

**Role Value:** `"AdminStaff"`

**Permissions:**
- Can manage all jobs (create, update, delete, assign)
- Can see all projects and proposals
- Can see proposal pricing ($)
- **Cannot see the map on My Work** (frontend restriction)
- Cannot manage users (cannot create/suspend/delete users)
- Cannot price proposals (can view prices but not set them)

**Query Scope:** All projects, proposals, and jobs (no site restrictions)

**Pairing:** AdminStaff do not participate in consultant pairings

**Use Cases:**
- Internal admin team (Ellie, Jo, Georgia)
- Can manage operational data but not users
- Map restriction is a frontend-only control (not enforced at API level)

**Implementation Note:** The map restriction is enforced in the frontend UI by checking the user's role and hiding the map component. This is not a data-level restriction.

---

## Role Hierarchy & Permission Levels

Roles are not hierarchical in a strict inheritance sense, but they have different permission scopes:

**Permission Comparison:**

| Feature | Admin | Director | LMLConsultant | SubConsultant | AdminStaff |
|---------|-------|----------|---------------|---------------|------------|
| See all projects/proposals | ✓ | ✓ | ✗ | ✗ | ✓ |
| See own assigned work | ✓ | ✓ | ✓ | ✓ | ✓ |
| See paired consultant work | ✓ | N/A | ✓ | ✗ | N/A |
| See proposal prices ($) | ✓ | ✓ | ✓ | ✗ | ✓ |
| Price proposals | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage jobs | ✓ | ✓ | ✗ | ✗ | ✓ |
| See map on My Work | ✓ | ✓ | ✓ | ✓ | ✗ |
| Manage system config | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Query Patterns Supported

### 1. User Authentication (Most Common)
```typescript
// Point query by email (partition key + row key)
getUserByEmail(email: string) → UserEntity
// Extremely fast - single partition, single row lookup
```

### 2. List All Users (Admin Interface)
```typescript
// Partition scan (all users in "USER" partition)
getAllUsers() → UserEntity[]
// Filter: PartitionKey eq 'USER'
// Fast because all users share one partition
```

### 3. Get Users by Role
```typescript
// Partition scan with filter
getUsersByRole(role: string) → UserEntity[]
// Filter: PartitionKey eq 'USER' and role eq '{role}'
// Used to list all consultants, all admins, etc.
```

### 4. Get Paired User
```typescript
// Point query using pairedUserId
getPairedUser(pairedUserId: string) → UserEntity
// Filter: PartitionKey eq 'USER' and RowKey eq '{pairedUserId}'
// Fast point query for checking paired consultant details
```

### 5. Find All Pairings
```typescript
// Partition scan with filter
getAllPairings() → UserEntity[]
// Filter: PartitionKey eq 'USER' and pairedUserId ne null
// Used to display pairing relationships in admin UI
```

---

## Pairing Storage Strategy

### How Pairing is Stored

Consultant pairing is stored using a **bidirectional reference** approach:

1. Each user has an optional `pairedUserId` field containing their paired consultant's email
2. Pairings are **bidirectional**: if Jack is paired with Ian, then:
   - Jack's record: `pairedUserId = "ian@lmllift.com"`
   - Ian's record: `pairedUserId = "jack@lmllift.com"`
3. Only users with `role = "LMLConsultant"` can have a `pairedUserId` set
4. Pairing is **1:1**: each consultant can be paired with only one other consultant

### Example Data

**Jack's User Record:**
```json
{
  "partitionKey": "USER",
  "rowKey": "jack@lmllift.com",
  "email": "jack@lmllift.com",
  "role": "LMLConsultant",
  "pairedUserId": "ian@lmllift.com",
  "sites": "[]",
  "accountStatus": "active",
  "emailVerified": true,
  "createdAt": "2026-01-15T08:30:00.000Z"
}
```

**Ian's User Record:**
```json
{
  "partitionKey": "USER",
  "rowKey": "ian@lmllift.com",
  "email": "ian@lmllift.com",
  "role": "LMLConsultant",
  "pairedUserId": "jack@lmllift.com",
  "sites": "[]",
  "accountStatus": "active",
  "emailVerified": true,
  "createdAt": "2026-01-20T09:00:00.000Z"
}
```

### Pairing Update Process

When updating pairings (e.g., pairing Jack with Ian):

1. **Validate both users:**
   - Both must exist
   - Both must have `role = "LMLConsultant"`
   - Neither should already be paired (or unpair first)

2. **Update both records:**
   - Set Jack's `pairedUserId = "ian@lmllift.com"`
   - Set Ian's `pairedUserId = "jack@lmllift.com"`
   - Set `updatedAt` on both records

3. **Transaction considerations:**
   - Azure Data Tables does not support multi-entity transactions across different row keys
   - Updates must be done sequentially (update Jack, then update Ian)
   - If second update fails, rollback first update manually
   - Consider implementing a pairing status field if eventual consistency is a concern

### Pairing Removal

When removing a pairing (e.g., Jack and Ian are no longer paired):

1. Set Jack's `pairedUserId = null` (or delete the property)
2. Set Ian's `pairedUserId = null` (or delete the property)
3. Update `updatedAt` on both records

### Pairing Validation Rules

**Backend validation rules for pairing operations:**

1. **Create Pairing:**
   - Both users must exist
   - Both users must have `role = "LMLConsultant"`
   - Neither user can already have a `pairedUserId` set
   - Users cannot be paired with themselves
   - After update, both users must reference each other

2. **Update Pairing:**
   - Same rules as create pairing
   - Must unpair existing pairing first (or handle swap atomically)

3. **Delete Pairing:**
   - Both users must have their `pairedUserId` cleared
   - Bidirectional consistency must be maintained

---

## Pairing Logic Documentation

### Application-Level Pairing Lookup

Since Azure Data Tables has no JOIN capability, pairing lookups require multiple queries:

**Query Pattern: "Get all jobs visible to user X"**

```typescript
/**
 * Get all jobs visible to a user based on their role and pairing
 *
 * @param user - The authenticated user
 * @param allJobs - All jobs in the system (or filtered by other criteria)
 * @returns Jobs that the user can see
 */
function getVisibleJobs(user: UserEntity, allJobs: StageEntity[]): StageEntity[] {
  // Admin and Director see everything
  if (user.role === 'Admin' || user.role === 'Director' || user.role === 'AdminStaff') {
    return allJobs;
  }

  // Parse user's email
  const userEmail = user.email.toLowerCase();

  // SubConsultant: only own work
  if (user.role === 'SubConsultant') {
    return allJobs.filter(job => {
      const consultantEmails = safeParseJsonArray(job.consultantEmails, []);
      return consultantEmails.some(email => email.toLowerCase() === userEmail);
    });
  }

  // LMLConsultant: own work + paired work
  if (user.role === 'LMLConsultant') {
    const pairedUserId = user.pairedUserId?.toLowerCase();

    return allJobs.filter(job => {
      const consultantEmails = safeParseJsonArray(job.consultantEmails, [])
        .map(email => email.toLowerCase());

      // Check if user is assigned to this job
      const isUserAssigned = consultantEmails.includes(userEmail);

      // Check if paired user is assigned to this job
      const isPairedUserAssigned = pairedUserId
        ? consultantEmails.includes(pairedUserId)
        : false;

      return isUserAssigned || isPairedUserAssigned;
    });
  }

  // Default: no jobs visible
  return [];
}
```

### Example: Fetching Visible Jobs for Jack

**Scenario:** Jack (LMLConsultant) is paired with Ian. Jack wants to see "My Work".

**Step 1:** Authenticate Jack and get his user record
```typescript
const jack = await getUserByEmail('jack@lmllift.com');
// jack.role = "LMLConsultant"
// jack.pairedUserId = "ian@lmllift.com"
```

**Step 2:** Fetch all jobs (stages) from the database
```typescript
const allJobs = await getAllStages(); // Or filter by project/site as needed
```

**Step 3:** Filter jobs to only those visible to Jack
```typescript
const visibleJobs = getVisibleJobs(jack, allJobs);
// Returns jobs where consultantEmails contains "jack@lmllift.com" OR "ian@lmllift.com"
```

**Result:** Jack sees:
- All jobs assigned to himself
- All jobs assigned to Ian (his paired consultant)

### Performance Considerations

**Pairing Lookup Performance:**

1. **User lookup:** O(1) - point query by email
2. **Job filtering:** O(n) - application-level filtering of all jobs
3. **No additional database queries** for pairing (pairedUserId is already on user record)

**Optimization Strategies:**

- Cache user records in memory (they change infrequently)
- Index jobs by consultant email in application layer if needed
- Consider denormalizing paired jobs if query performance becomes an issue (trade-off: data duplication vs query speed)

**Why Not Store Pairings in Separate Table?**

We store `pairedUserId` directly on the user record (not in a separate Pairings table) because:
- Pairing is 1:1, so no risk of data duplication
- Avoids extra query to fetch pairing relationship
- Simpler schema and fewer tables to manage
- Pairing changes are infrequent (set once, rarely modified)

---

## Migration Strategy

### Current State Analysis

**Existing Role Values in System:**
- `'admin'` - Application administrator (Leah)
- `'super_admin'` - Same as admin (redundant, needs consolidation)
- `'consultant'` - Standard consultant
- `'subconsultant'` - Subcontractor
- `'user'` - Generic user (unclear purpose)
- `'site_manager'` - Site-specific manager (unclear purpose)
- `'national_manager'` - National-level manager (unclear purpose)

**New Role Values:**
- `'Admin'` - Consolidates `'admin'` and `'super_admin'`
- `'Director'` - New role for full project visibility
- `'LMLConsultant'` - Replaces `'consultant'`
- `'SubConsultant'` - Replaces `'subconsultant'`
- `'AdminStaff'` - New role for internal admin team

### Migration Steps

**Migration Plan: Roles and Pairing Fields**

This migration adds the `pairedUserId` field and updates role values to the new naming convention.

**Pre-Migration Validation:**

1. Backup Users table (Azure Data Tables snapshot or export to Blob Storage)
2. Verify all users and their current roles
3. Identify users who need role mapping
4. Identify consultant pairs (Jack↔Ian, Shayne↔Randall)

**Migration Pseudo-Code:**

```typescript
/**
 * Migration: Add pairedUserId field and update role names
 * Safe to run multiple times (idempotent)
 */
async function migrateUsersAddPairingAndUpdateRoles() {
  console.log('Starting Users migration: Add pairedUserId and update roles');

  // Step 1: Get all users
  const users = await getAllUsers();
  console.log(`Found ${users.length} users to migrate`);

  // Step 2: Define role mapping (old role → new role)
  const roleMapping = {
    'admin': 'Admin',
    'super_admin': 'Admin', // Consolidate super_admin → Admin
    'consultant': 'LMLConsultant',
    'subconsultant': 'SubConsultant',
    // Note: 'user', 'site_manager', 'national_manager' - need manual review
    // Set default mapping or mark for manual intervention
    'user': 'LMLConsultant', // Default assumption - review manually
    'site_manager': 'AdminStaff', // Assumption - review manually
    'national_manager': 'Director', // Assumption - review manually
  };

  // Step 3: Define consultant pairings
  const pairings = [
    { user1: 'jack@lmllift.com', user2: 'ian@lmllift.com' },
    { user1: 'shayne@lmllift.com', user2: 'randall@lmllift.com' },
  ];

  // Step 4: Update each user
  for (const user of users) {
    const updates: any = {};

    // Update role if mapping exists
    if (roleMapping[user.role]) {
      const newRole = roleMapping[user.role];
      if (newRole !== user.role) {
        updates.role = newRole;
        console.log(`Updating ${user.email}: ${user.role} → ${newRole}`);
      }
    } else {
      console.warn(`No role mapping for ${user.email} with role ${user.role} - MANUAL REVIEW NEEDED`);
    }

    // Set pairedUserId if user is in a pairing
    const pairing = pairings.find(p =>
      p.user1.toLowerCase() === user.email.toLowerCase() ||
      p.user2.toLowerCase() === user.email.toLowerCase()
    );

    if (pairing && (updates.role === 'LMLConsultant' || user.role === 'consultant')) {
      // Determine paired user
      const pairedEmail = pairing.user1.toLowerCase() === user.email.toLowerCase()
        ? pairing.user2
        : pairing.user1;

      updates.pairedUserId = pairedEmail;
      console.log(`Setting pairing: ${user.email} ↔ ${pairedEmail}`);
    }

    // Update user if there are changes
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      await updateUser(user.email, updates);
      console.log(`Updated ${user.email}`);
    }
  }

  console.log('Migration complete');
}
```

**Post-Migration Validation:**

1. Verify all users have valid new role values
2. Verify pairedUserId is set correctly for Jack↔Ian and Shayne↔Randall
3. Verify pairedUserId is bidirectional (both users reference each other)
4. Verify pairedUserId is only set on LMLConsultant roles
5. Test authentication and authorization with new roles
6. Test "My Work" visibility for paired consultants

**Rollback Strategy:**

If migration fails or introduces issues:

1. **Re-run migration with inverse mapping:**
   - Map `'Admin'` → `'admin'`
   - Clear `pairedUserId` field on all users

2. **Restore from backup:**
   - Export Users table to Blob Storage before migration
   - Delete Users table
   - Re-import from backup

**Manual Review Required:**

After migration, manually review users with these roles:
- `'user'` - Determine if they should be LMLConsultant, SubConsultant, or AdminStaff
- `'site_manager'` - Determine if they should be AdminStaff or Director
- `'national_manager'` - Determine if they should be Director or Admin

### Default Role Assignment for New Users

**For new user registration (self-registration):**
- Default role: `'LMLConsultant'` (most common case)
- Must be approved by Admin before accountStatus becomes 'active'
- Can be changed by Admin during approval process

**For admin-created users:**
- Admin selects role during user creation
- Role options: Admin, Director, LMLConsultant, SubConsultant, AdminStaff
- Default accountStatus: `'active'` (skip email verification)

---

## Constraints & Considerations

### Azure Data Tables Constraints

1. **1MB Entity Size Limit:**
   - User entities are unlikely to approach this limit
   - `photo` field (base64) could be large - recommend storing in Blob Storage if >100KB
   - `bio` field is capped at 10,000 characters to prevent bloat

2. **No JOIN Support:**
   - Pairing lookups require fetching paired user separately
   - Job visibility filtering must be done in application code
   - Cannot query "all jobs visible to user X" in a single database query

3. **Schemaless Nature:**
   - `pairedUserId` field may not exist on older user records
   - Application code must handle missing fields gracefully (treat as null/undefined)
   - New fields can be added without schema migration (just update code)

### Denormalization Trade-offs

**Current Approach: Normalized Pairing**
- Pairing is stored as a simple field on each user (`pairedUserId`)
- Requires application-level filtering to determine visible jobs
- Minimal data duplication (just two email references)

**Alternative: Denormalized Jobs**
- Could store `visibleToEmails` array on each job (includes consultant + their pair)
- Pro: Single query for "get visible jobs"
- Con: Complex update logic when pairings change (must update all jobs)
- Con: Data duplication and risk of inconsistency
- **Decision: Not recommended** - normalized approach is simpler and more maintainable

### Security Considerations

1. **Password Hash Protection:**
   - Never return `passwordHash` in API responses
   - Always filter out in user list endpoints

2. **Pairing Validation:**
   - Backend must validate pairing updates to ensure bidirectional consistency
   - Only LMLConsultants can be paired
   - Prevent self-pairing

3. **Role-Based Access Control:**
   - Backend must enforce role permissions on all API endpoints
   - Frontend role checks are for UX only (not security)
   - Use `hasRole()` utility on all protected endpoints

4. **Pairing Bypass Prevention:**
   - Ensure SubConsultants cannot set `pairedUserId` (backend validation)
   - Ensure users cannot see paired jobs if role is changed from LMLConsultant to SubConsultant

---

## Query Cost & Performance

**Azure Data Tables Pricing:**
- Charged per transaction (read/write/query)
- Partition scans are more expensive than point queries
- Cross-partition queries are most expensive (not applicable here - all users in one partition)

**Query Cost Analysis:**

1. **Get User by Email (Authentication):**
   - Cost: 1 transaction (point query)
   - Performance: <10ms
   - Frequency: High (every API request)

2. **Get All Users (Admin UI):**
   - Cost: 1 transaction (single partition scan)
   - Performance: <50ms (for <100 users)
   - Frequency: Low (admin page loads)

3. **Get Visible Jobs (My Work):**
   - Cost: 1 transaction (fetch all jobs) + application filtering
   - Performance: <100ms (depends on job count)
   - Frequency: High (consultant My Work page)

**Optimization Recommendations:**

- Cache user records in application memory (update on change)
- Use CDN/edge caching for user list responses
- Consider pagination for job listings if count exceeds 1000
- Monitor query performance and add indexes if needed (Azure Data Tables auto-indexes partition key and row key)

---

## Future Enhancements

### Potential Schema Additions

1. **Team/Region Grouping:**
   - Add `region` field (NSW, VIC, etc.) to enable regional filtering
   - Add `teamId` field for multi-user teams beyond 1:1 pairing

2. **Multi-User Pairing:**
   - Extend pairing from 1:1 to many-to-many (teams)
   - Store `pairedUserIds` as JSON array instead of single pairedUserId
   - Requires more complex pairing management UI

3. **Role Permissions as Data:**
   - Store role permissions in a separate Permissions table
   - Enable runtime permission changes without code deployment
   - Trade-off: Increased complexity vs flexibility

4. **Audit Log:**
   - Add `changedBy` and `changedAt` fields for all updates
   - Track role changes, pairing changes, permission grants
   - Could use separate AuditLog table to avoid bloating user records

---

## Summary

This schema provides:

1. **Five distinct roles** with clear permission boundaries
2. **Bidirectional consultant pairing** for LMLConsultants to see each other's work
3. **Efficient query patterns** using Azure Data Tables partition key design
4. **Straightforward migration path** from existing roles to new roles
5. **Clear documentation** for backend implementation

**Key Design Decisions:**

- **Partition Key = "USER"**: All users in one partition for fast enumeration and small user count
- **Row Key = email**: Natural unique identifier, enables fast authentication lookups
- **Bidirectional Pairing**: Stored as `pairedUserId` on each user record (not separate table)
- **Application-Level Filtering**: Job visibility determined by application code (no database joins)
- **Role Consolidation**: `'admin'` and `'super_admin'` → `'Admin'` to reduce role complexity

**Next Steps:**

1. Review and approve this schema design
2. Implement TypeScript role constants (shared between frontend and backend)
3. Implement pairing management endpoints (create, update, delete pairing)
4. Run migration to add `pairedUserId` and update role names
5. Update authorization logic in API handlers to use new roles
6. Update frontend to check new role names and hide map for AdminStaff
