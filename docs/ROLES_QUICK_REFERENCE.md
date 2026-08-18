# User Roles Quick Reference

**Last Updated:** April 9, 2026

This is a quick reference guide for the tiered permissions model in the LML Lift Consultants Work Management Portal.

---

## Role Summary Table

| Role | Display Name | Can See All Projects | Can See Pricing | Can Set Pricing | Can Manage Users | Can See Map | Can Be Paired |
|------|--------------|---------------------|-----------------|-----------------|------------------|-------------|---------------|
| **Admin** | Administrator | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Director** | Director | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| **LMLConsultant** | LML Consultant | Own + Paired | ✓ | ✗ | ✗ | ✓ | ✓ |
| **SubConsultant** | Sub-Consultant | Own Only | ✗ | ✗ | ✗ | ✓ | ✗ |
| **AdminStaff** | Admin Staff | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Role Details

### Admin (Application Administrator)
- **Users:** Leah
- **Scope:** Full system access
- **Use Case:** System administration, user management, full data access
- **TypeScript Value:** `UserRole.Admin`
- **Database Value:** `"Admin"`

### Director (Full Project Visibility)
- **Users:** Senior leadership
- **Scope:** All projects and proposals
- **Use Case:** High-level project oversight, proposal pricing
- **TypeScript Value:** `UserRole.Director`
- **Database Value:** `"Director"`

### LMLConsultant (Standard Consultant)
- **Users:** Jack, Ian, Shayne, Randall, and other LML consultants
- **Scope:** Own work + paired consultant work
- **Use Case:** Day-to-day consulting work with team visibility
- **TypeScript Value:** `UserRole.LMLConsultant`
- **Database Value:** `"LMLConsultant"`

### SubConsultant (External Contractor)
- **Users:** External subcontractors
- **Scope:** Own work only
- **Use Case:** External contractors who should not see pricing
- **TypeScript Value:** `UserRole.SubConsultant`
- **Database Value:** `"SubConsultant"`
- **Key Restriction:** Cannot see proposal prices

### AdminStaff (Internal Admin Team)
- **Users:** Ellie, Jo, Georgia
- **Scope:** All data except user management
- **Use Case:** Internal admin operations without user management
- **TypeScript Value:** `UserRole.AdminStaff`
- **Database Value:** `"AdminStaff"`
- **Key Restriction:** Cannot see map on My Work (frontend only)

---

## Current Consultant Pairings

### VIC Consultants
- **Jack** ↔ **Ian**
- Both can see each other's assigned jobs
- Database: `jack@lmllift.com` has `pairedUserId = "ian@lmllift.com"` (and vice versa)

### NSW Consultants
- **Shayne** ↔ **Randall**
- Both can see each other's assigned jobs
- Database: `shayne@lmllift.com` has `pairedUserId = "randall@lmllift.com"` (and vice versa)

---

## Permission Matrix - Detailed

### Data Visibility

| Feature | Admin | Director | LMLConsultant | SubConsultant | AdminStaff |
|---------|-------|----------|---------------|---------------|------------|
| See all sites | ✓ | ✓ | ✗ | ✗ | ✓ |
| See all projects | ✓ | ✓ | ✗ | ✗ | ✓ |
| See all proposals | ✓ | ✓ | ✗ | ✗ | ✓ |
| See own jobs | ✓ | ✓ | ✓ | ✓ | ✓ |
| See paired jobs | N/A | N/A | ✓ | ✗ | N/A |
| See proposal prices ($) | ✓ | ✓ | ✓ | ✗ | ✓ |

### Data Management

| Feature | Admin | Director | LMLConsultant | SubConsultant | AdminStaff |
|---------|-------|----------|---------------|---------------|------------|
| Create projects | ✓ | ✓ | ✗ | ✗ | ✓ |
| Update projects | ✓ | ✓ | ✗ | ✗ | ✓ |
| Delete projects | ✓ | ✓ | ✗ | ✗ | ✓ |
| Create proposals | ✓ | ✓ | ✗ | ✗ | ✓ |
| Price proposals | ✓ | ✓ | ✗ | ✗ | ✗ |
| Assign jobs | ✓ | ✓ | ✗ | ✗ | ✓ |
| Update job status | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ |

### User Management

| Feature | Admin | Director | LMLConsultant | SubConsultant | AdminStaff |
|---------|-------|----------|---------------|---------------|------------|
| Create users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Update user roles | ✓ | ✗ | ✗ | ✗ | ✗ |
| Suspend users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete users | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage pairings | ✓ | ✗ | ✗ | ✗ | ✗ |

### UI Features

| Feature | Admin | Director | LMLConsultant | SubConsultant | AdminStaff |
|---------|-------|----------|---------------|---------------|------------|
| See map on My Work | ✓ | ✓ | ✓ | ✓ | ✗ |
| User management UI | ✓ | ✗ | ✗ | ✗ | ✗ |
| System settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Dashboard (all data) | ✓ | ✓ | ✗ | ✗ | ✓ |

---

## Code Examples

### Backend: Check if user can see a job

```typescript
import { canUserSeeJob } from '@/shared/utils/pairingLogic';

// In API handler
const currentUser = getAuthenticatedUser(request);
const job = await getJobById(jobId);

if (!canUserSeeJob(currentUser, job)) {
  return forbidden('You do not have permission to view this job');
}
```

### Backend: Filter jobs to visible only

```typescript
import { getVisibleJobs } from '@/shared/utils/pairingLogic';

// In API handler
const currentUser = getAuthenticatedUser(request);
const allJobs = await getAllJobs();
const visibleJobs = getVisibleJobs(currentUser, allJobs);

return success(visibleJobs);
```

### Frontend: Check if user can see pricing

```typescript
import { UserRole, canSeePricing } from '@/shared/constants/roles';

// In React component
const { user } = useAuth();

return (
  <div>
    {canSeePricing(user.role as UserRole) && (
      <div>Price: ${proposal.price}</div>
    )}
  </div>
);
```

### Frontend: Hide map for AdminStaff

```typescript
import { UserRole, canSeeMap } from '@/shared/constants/roles';

// In My Work page
const { user } = useAuth();

return (
  <div>
    {canSeeMap(user.role as UserRole) && (
      <JobMap jobs={visibleJobs} />
    )}
  </div>
);
```

### Backend: Check role permissions

```typescript
import { UserRole, canManageUsers } from '@/shared/constants/roles';

// In API handler
const currentUser = getAuthenticatedUser(request);

if (!canManageUsers(currentUser.role as UserRole)) {
  return forbidden('Only administrators can manage users');
}
```

---

## Database Schema Fields

### Users Table

**Required Fields:**
- `email` (String) - rowKey, unique identifier
- `role` (String) - One of: Admin, Director, LMLConsultant, SubConsultant, AdminStaff
- `passwordHash` (String) - bcrypt hash
- `sites` (String) - JSON array of site IDs
- `accountStatus` (String) - pending | active | suspended
- `emailVerified` (Boolean)
- `createdAt` (String) - ISO timestamp

**Pairing Fields:**
- `pairedUserId` (String, optional) - Email of paired consultant (LMLConsultant only)

**Example User Record (Jack):**
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

---

## API Endpoints to Implement

### Pairing Management (Admin Only)

**Create Pairing:**
```
POST /api/pairings
Body: { user1Email: string, user2Email: string }
Auth: Admin only
```

**Delete Pairing:**
```
DELETE /api/pairings/:user1Email/:user2Email
Auth: Admin only
```

**List All Pairings:**
```
GET /api/pairings
Returns: Array of { user1: User, user2: User }
Auth: Admin only
```

### User Visibility (All Roles)

**Get My Visible Jobs:**
```
GET /api/jobs/my-work
Returns: Jobs assigned to user or their paired consultant
Auth: Any authenticated user
```

**Get My Visible Projects:**
```
GET /api/projects/my-work
Returns: Projects with jobs visible to user
Auth: Any authenticated user
```

---

## Frontend Routes & Permissions

### Route Access Control

| Route | Admin | Director | LMLConsultant | SubConsultant | AdminStaff |
|-------|-------|----------|---------------|---------------|------------|
| `/dashboard` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/my-work` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/my-work` (with map) | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/projects` (all) | ✓ | ✓ | ✗ | ✗ | ✓ |
| `/proposals` (all) | ✓ | ✓ | ✗ | ✗ | ✓ |
| `/users` | ✓ | ✗ | ✗ | ✗ | ✗ |
| `/settings` | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Migration Checklist

- [ ] Backup Users table
- [ ] Audit current users and roles
- [ ] Verify pairing users exist (Jack, Ian, Shayne, Randall)
- [ ] Run migration script
- [ ] Validate role updates
- [ ] Validate bidirectional pairings
- [ ] Test authentication
- [ ] Test "My Work" visibility
- [ ] Update backend authorization logic
- [ ] Update frontend role checks
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Manual review of ambiguous roles

---

## Common Issues & Solutions

### Issue: User cannot see paired consultant's work

**Check:**
1. Verify both users have `role = "LMLConsultant"`
2. Verify `pairedUserId` is set correctly on both users
3. Verify pairing is bidirectional
4. Check job's `consultantEmails` field includes paired user
5. Check application is using `getVisibleJobs()` function

**Solution:**
```typescript
// Manually set pairing
await updateUser('jack@lmllift.com', { pairedUserId: 'ian@lmllift.com' });
await updateUser('ian@lmllift.com', { pairedUserId: 'jack@lmllift.com' });
```

### Issue: SubConsultant can see pricing

**Check:**
1. Verify user's role is exactly `"SubConsultant"` (case-sensitive)
2. Verify frontend is using `canSeePricing()` function
3. Check for hardcoded role checks that don't exclude SubConsultant

**Solution:**
```typescript
// In frontend component
import { canSeePricing } from '@/shared/constants/roles';

{canSeePricing(user.role as UserRole) && <Price value={proposal.price} />}
```

### Issue: AdminStaff can see map

**Check:**
1. Verify frontend is checking `canSeeMap()` before rendering map
2. Verify user's role is exactly `"AdminStaff"`
3. Map restriction is frontend-only (not enforced at API level)

**Solution:**
```typescript
// In My Work page
import { canSeeMap } from '@/shared/constants/roles';

{canSeeMap(user.role as UserRole) && <MapComponent />}
```

---

## File Locations

**Schema Documentation:**
- `C:\Users\leahmartinez\lml-file-management\docs\SCHEMA_USERS_ROLES_PAIRING.md`

**Migration Guide:**
- `C:\Users\leahmartinez\lml-file-management\docs\MIGRATION_USERS_ROLES_PAIRING.md`

**Role Constants (Shared):**
- `C:\Users\leahmartinez\lml-file-management\shared\constants\roles.ts`

**Pairing Logic (Shared):**
- `C:\Users\leahmartinez\lml-file-management\shared\utils\pairingLogic.ts`

**Quick Reference:**
- `C:\Users\leahmartinez\lml-file-management\docs\ROLES_QUICK_REFERENCE.md`

---

## Support

For questions or issues with roles and permissions:
1. Check this quick reference guide
2. Review detailed schema documentation
3. Check migration guide for troubleshooting
4. Contact system administrator (Leah)
