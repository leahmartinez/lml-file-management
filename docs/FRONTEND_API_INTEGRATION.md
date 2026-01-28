# Frontend API Integration - Complete ✅

**Date**: November 8, 2025
**Status**: Frontend updated to use server-side API

---

## Summary

The frontend has been successfully updated to use the Azure Functions backend API instead of client-side authentication. All user management and authentication now goes through the secure server-side API.

---

## Changes Made

### 1. API Service Layer (`src/services/apiService.ts`)
- Created centralized API service for all backend communication
- Handles JWT token storage and management
- Provides typed interfaces for API requests/responses
- Includes error handling and authentication headers

**Key Functions:**
- `authApi.login()` - Authenticate user and get JWT token
- `authApi.logout()` - Clear token
- `authApi.getProfile()` - Get current user profile
- `usersApi.getAllUsers()` - List all users (admin/consultant only)
- `usersApi.createUser()` - Create new user
- `usersApi.updateUser()` - Update user details
- `usersApi.deleteUser()` - Delete user

### 2. Updated User Interface
- Changed from `username` to `email` to match API
- Removed `password` field from User interface (never stored client-side)
- Added optional fields: `createdAt`, `lastLogin`, `createdBy`

### 3. Authentication Hook (`src/hooks/useAuth.tsx`)
- **Before**: Used localStorage and users.json file
- **After**: Uses API for all authentication operations
- Automatically loads user profile from token on mount
- Refreshes user list from API for admin/consultant roles
- Handles token expiration and logout

**Key Changes:**
- `login()` now calls `authApi.login()` instead of checking localStorage
- `logout()` clears JWT token via `authApi.logout()`
- `refreshUsers()` fetches users from API
- Removed all password hashing/migration logic (now server-side)

### 4. Login Form (`src/components/auth/LoginForm.tsx`)
- Changed from "Username" to "Email" field
- Updated to use email for login
- Navigates to admin page for admin/consultant roles

### 5. Admin Components

#### AddUserForm (`src/components/admin/AddUserForm.tsx`)
- Changed from username to email input
- Added email validation
- Uses `usersApi.createUser()` instead of localStorage
- Refreshes user list after creation

#### UserTable (`src/components/admin/UserTable.tsx`)
- Changed "Username" column to "Email"
- Uses `usersApi.deleteUser()` for deletion
- Refreshes user list after operations
- Updated to use email instead of username for comparisons

#### EditUserModal (`src/components/admin/EditUserModal.tsx`)
- Uses `usersApi.updateUser()` for updates
- Supports updating role, sites, and password
- Refreshes user list after update

---

## API Configuration

The API base URL is configured via environment variable:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api';
```

**For local development:**
- Default: `http://localhost:7071/api`
- Set `VITE_API_BASE_URL` in `.env` to override

**For production:**
- Set `VITE_API_BASE_URL` to your Azure Functions URL
- Example: `https://lml-api.azurewebsites.net/api`

---

## Authentication Flow

### Login
1. User enters email and password
2. Frontend calls `authApi.login(email, password)`
3. API validates credentials and returns JWT token
4. Token stored in localStorage as `jwt_token`
5. User profile loaded and stored in context
6. If admin/consultant, user list is fetched

### Session Management
1. On app load, `useAuth` checks for stored token
2. If token exists, calls `authApi.getProfile()` to verify
3. If valid, user is logged in automatically
4. If invalid/expired, token is cleared and user redirected to login

### Logout
1. User clicks logout
2. `authApi.logout()` clears token from localStorage
3. User state cleared from context
4. Redirected to login page

---

## Security Improvements

✅ **Passwords never stored client-side**
- All password operations handled server-side
- JWT tokens used for session management
- Tokens expire after 24 hours

✅ **Server-side validation**
- All user operations validated on server
- Role-based access control enforced server-side
- Cannot bypass permissions via client manipulation

✅ **Secure token storage**
- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Tokens included in Authorization header for all API calls

---

## Migration Notes

### Breaking Changes
- **Username → Email**: All users must now use email addresses instead of usernames
- **API Required**: Frontend now requires backend API to be running
- **No localStorage users**: User data no longer stored in localStorage

### Backward Compatibility
- Old localStorage data will be ignored
- Users must log in again after update
- Admin must recreate users via API (or migrate existing users)

---

## Testing

### Local Testing
1. Start Azure Functions API: `cd api && npm start`
2. Start frontend: `npm run dev`
3. Login with: `leah@lmllift.com` / `password`
4. Test user management in Admin portal

### Production Testing
1. Deploy API to Azure Functions
2. Set `VITE_API_BASE_URL` environment variable
3. Deploy frontend
4. Test full authentication flow

---

## Next Steps

1. **Update Tests**: Test files still reference `username` - need to update to `email`
2. **Environment Variables**: Set up production API URL
3. **Error Handling**: Add retry logic for API failures
4. **Token Refresh**: Implement token refresh before expiration
5. **Loading States**: Add better loading indicators during API calls

---

## Files Changed

```
src/
├── services/
│   └── apiService.ts          [NEW] API service layer
├── hooks/
│   └── useAuth.tsx            [UPDATED] Use API instead of localStorage
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx     [UPDATED] Email instead of username
│   └── admin/
│       ├── AddUserForm.tsx    [UPDATED] Use API, email input
│       ├── UserTable.tsx      [UPDATED] Use API, email display
│       └── EditUserModal.tsx  [UPDATED] Use API for updates
```

---

**Status**: ✅ Frontend integration complete and ready for testing!



