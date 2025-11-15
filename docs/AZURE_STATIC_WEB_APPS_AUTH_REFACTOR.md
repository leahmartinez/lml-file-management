# Azure Static Web Apps Built-in Auth - Refactoring Requirements

## Overview

Azure Static Web Apps has built-in authentication that supports:
- Microsoft (Azure AD)
- GitHub
- Twitter
- Google
- Facebook
- Custom providers

This would replace your current custom JWT-based authentication system.

---

## What Would Need to Change

### 1. **Frontend Authentication (`src/hooks/useAuth.tsx`)**

**Current Implementation:**
- Custom login with email/password
- JWT tokens stored in localStorage
- Manual token management

**Required Changes:**
```typescript
// OLD: Custom API login
const login = async (email: string, password: string) => {
  const response = await authApi.login(email, password);
  // Store JWT token
}

// NEW: Azure Static Web Apps Auth
import { useAuth as useAzureAuth } from '@azure/static-web-apps-auth';

const { user, login, logout } = useAzureAuth();

// Login redirects to Microsoft/GitHub
await login('microsoft'); // or 'github', 'twitter', etc.
```

**Changes Needed:**
- Remove custom `login()` function
- Use Azure's `useAuth()` hook instead
- Remove JWT token management
- Handle OAuth redirect flow
- Update logout to use Azure's logout

---

### 2. **User Management System**

**Current Implementation:**
- Users stored in Azure Table Storage
- Custom user creation/management
- Email/password authentication
- Role-based access control (admin, site_manager, etc.)

**Required Changes:**

#### Option A: Map Azure Identities to Roles
```typescript
// Store role mappings in database
interface UserRoleMapping {
  azureUserId: string;  // From Azure auth
  email: string;        // From Azure auth
  role: 'admin' | 'site_manager' | ...;
  sites: string[];
}

// On login, fetch role from database
const azureUser = await getAzureUser();
const roleMapping = await getUserRole(azureUser.userId);
```

**Changes Needed:**
- Create new database table for role mappings
- API endpoint to get user role by Azure user ID
- API endpoint to assign roles (admin only)
- Remove password management entirely
- Migrate existing users to Azure identities

#### Option B: Use Azure AD Groups
- Configure Azure AD groups for each role
- Map groups to application roles
- Requires Azure AD Premium (paid)

---

### 3. **API Endpoints (`api/src/functions/`)**

**Current Implementation:**
- `/api/auth/login` - Custom login
- `/api/users` - User CRUD operations
- `/api/profile` - Get current user

**Required Changes:**

#### Remove:
- `auth.ts` - Login endpoint (not needed)
- Password hashing utilities (not needed)

#### Modify:
- `users.ts` - Change to work with Azure user IDs instead of emails
- `profile.ts` - Get user info from Azure auth context instead of JWT

#### Add:
- `/api/user-role` - Get role for current Azure user
- `/api/assign-role` - Assign role to Azure user (admin only)

**New Structure:**
```typescript
// Get current user's role
app.http('getUserRole', {
  methods: ['GET'],
  route: 'user-role',
  authLevel: 'function', // Requires Azure auth
  handler: async (req) => {
    const azureUserId = req.headers.get('x-ms-client-principal-id');
    const roleMapping = await getUserRole(azureUserId);
    return { role: roleMapping.role, sites: roleMapping.sites };
  }
});
```

---

### 4. **Admin Components**

**Current Implementation:**
- `AddUserForm` - Create user with email/password
- `UserTable` - List all users
- `EditUserModal` - Update user role/sites

**Required Changes:**

#### AddUserForm:
```typescript
// OLD: Create user with password
await usersApi.createUser({
  email: email,
  password: password,
  role: role,
  sites: sites
});

// NEW: Invite user via email (Azure handles account creation)
await usersApi.inviteUser({
  email: email,
  role: role,
  sites: sites
});
// Azure sends invitation email, user creates account
```

**Changes Needed:**
- Remove password fields
- Add "Invite User" functionality
- User must accept invitation and create Azure account
- Map Azure user ID to role after they accept

#### UserTable:
- Display Azure user IDs or emails
- Show which users have accepted invitations
- Different UI for pending vs active users

---

### 5. **Database Schema**

**Current:**
```typescript
interface UserEntity {
  email: string;           // Primary key
  passwordHash: string;    // Remove this
  role: string;
  sites: string[];
}
```

**New:**
```typescript
interface UserRoleMapping {
  azureUserId: string;     // Primary key (from Azure)
  email: string;           // From Azure profile
  role: string;
  sites: string[];
  invitedBy: string;       // Who invited them
  invitedAt: string;
  acceptedAt?: string;     // When they accepted invitation
}
```

---

### 6. **Configuration**

**Current:**
- `local.settings.json` - JWT_SECRET, connection strings
- `host.json` - Function app config

**New:**
- Azure Portal → Static Web App → Authentication
- Configure identity providers (Microsoft, GitHub, etc.)
- Set up redirect URLs
- Configure role assignments (if using Azure AD groups)

**Remove:**
- JWT_SECRET (not needed)
- Password hashing (not needed)

---

### 7. **Login Flow**

**Current:**
```
User enters email/password
  → Frontend sends to API
  → API validates password
  → API returns JWT token
  → Frontend stores token
```

**New:**
```
User clicks "Login with Microsoft"
  → Redirect to Azure login page
  → User authenticates with Microsoft
  → Azure redirects back with token
  → Frontend gets user info from Azure
  → Frontend calls API to get role
  → API looks up role by Azure user ID
```

---

### 8. **Migration Path**

**Steps to Migrate:**

1. **Set up Azure Static Web Apps Auth**
   - Enable authentication in Azure Portal
   - Configure Microsoft/GitHub provider
   - Test login flow

2. **Create Role Mapping Database**
   - New table: `UserRoleMappings`
   - Migrate existing users:
     - For each user, create Azure account or map to existing
     - Create role mapping entry
   - Remove password hashes

3. **Update API**
   - Remove login endpoint
   - Update all endpoints to use Azure user ID
   - Add role lookup endpoint
   - Update authorization checks

4. **Update Frontend**
   - Replace `useAuth` hook
   - Update login UI (button instead of form)
   - Update admin components
   - Remove password fields

5. **Test & Deploy**
   - Test with Microsoft account
   - Test role assignments
   - Test admin functions
   - Deploy to production

---

## Pros and Cons

### Pros ✅
- **No password management** - Azure handles it
- **Enterprise SSO** - Users can use existing Microsoft accounts
- **Better security** - OAuth 2.0, MFA support
- **Less code** - No password hashing, JWT management
- **Free tier available** - For small apps

### Cons ❌
- **Significant refactoring** - Most of auth code needs rewriting
- **User experience** - Users must have Microsoft/GitHub account
- **Less control** - Can't customize login flow as much
- **Role management complexity** - Need to map Azure identities to roles
- **Migration effort** - Existing users need to be migrated
- **Invitation flow** - More complex user onboarding

---

## Estimated Effort

- **Frontend changes**: 2-3 days
- **API changes**: 2-3 days
- **Database migration**: 1 day
- **Testing**: 2 days
- **Total**: ~1-2 weeks

---

## Recommendation

**Stick with your current custom API approach** because:

1. ✅ **Already implemented** - Everything is working
2. ✅ **More flexible** - Full control over user management
3. ✅ **Better UX** - Simple email/password login
4. ✅ **No migration needed** - Just deploy what you have
5. ✅ **Works offline** - Can test locally easily

**Only consider Azure Static Web Apps auth if:**
- You need enterprise SSO (Microsoft accounts)
- You want to eliminate password management
- You have time for the refactor
- Your users already have Microsoft/GitHub accounts

---

## Hybrid Approach (Best of Both Worlds)

You could support **both**:

1. Keep custom API for regular users (email/password)
2. Add Azure auth as an **optional** login method
3. Map Azure users to same role system
4. Users choose their preferred login method

This gives you:
- ✅ Flexibility for users
- ✅ Enterprise SSO option
- ✅ Keep existing functionality
- ❌ More complex to maintain

---

## Code Examples

### Current Login (What You Have)
```typescript
// Frontend
const handleLogin = async () => {
  const user = await login(email, password);
  // Stores JWT token
};

// API
app.http('authLogin', {
  handler: async (req) => {
    const { email, password } = await req.json();
    const user = await getUserByEmail(email);
    const isValid = await verifyPassword(password, user.passwordHash);
    if (isValid) {
      return { token: generateToken(user) };
    }
  }
});
```

### Azure Static Web Apps Auth (What You'd Need)
```typescript
// Frontend
import { useAuth } from '@azure/static-web-apps-auth';

const { user, login, logout } = useAuth();

const handleLogin = async () => {
  await login('microsoft'); // Redirects to Microsoft
  // User comes back with Azure token
  const role = await getUserRole(user.userId);
};

// API
app.http('getUserRole', {
  authLevel: 'function', // Requires Azure auth
  handler: async (req) => {
    const azureUserId = req.headers.get('x-ms-client-principal-id');
    const mapping = await getUserRoleMapping(azureUserId);
    return { role: mapping.role, sites: mapping.sites };
  }
});
```

---

**Bottom Line**: Your current implementation is solid. Only switch if you specifically need Microsoft account login or want to eliminate password management.

