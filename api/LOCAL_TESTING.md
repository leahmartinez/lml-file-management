# Local API Testing Guide

Quick guide to test the backend API locally before deploying.

## Setup (Already Done! ✅)

- ✅ Dependencies installed
- ✅ Local configuration set up
- ✅ API server starting on http://localhost:7071

## Test Users (Auto-Created)

All test users have password: `password`

- `leah@lmllift.com` - Admin role
- `user@lmllift.com` - User role

---

## Testing with PowerShell

### 1. Test Login

```powershell
# Test admin login
$response = Invoke-RestMethod -Uri 'http://localhost:7071/api/auth/login' `
  -Method POST `
  -ContentType 'application/json' `
  -Body '{"email":"leah@lmllift.com","password":"password"}'

# View response
$response

# Save token for next requests
$token = $response.token
echo "Token: $token"
```

**Expected output:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "leah@lmllift.com",
    "role": "admin",
    "sites": []
  }
}
```

### 2. Test Get Profile

```powershell
# Get current user profile
$headers = @{ Authorization = "Bearer $token" }
$profile = Invoke-RestMethod -Uri 'http://localhost:7071/api/profile' `
  -Method GET `
  -Headers $headers

$profile
```

**Expected output:**
```json
{
  "email": "leah@lmllift.com",
  "role": "admin",
  "sites": [],
  "lastLogin": "2025-11-08T..."
}
```

### 3. Test List Users (Admin Only)

```powershell
# List all users
$users = Invoke-RestMethod -Uri 'http://localhost:7071/api/users' `
  -Method GET `
  -Headers $headers

$users
```

**Expected output:**
```json
[
  {
    "email": "leah@lmllift.com",
    "role": "admin",
    "sites": []
  },
  {
    "email": "manager@lmllift.com",
    "role": "national_manager",
    "sites": []
  },
  ...
]
```

### 4. Test Create User (Admin Only)

```powershell
# Create a new user
$newUser = Invoke-RestMethod -Uri 'http://localhost:7071/api/users' `
  -Method POST `
  -ContentType 'application/json' `
  -Headers $headers `
  -Body '{"email":"testuser@company.com","password":"test123","role":"site_manager","sites":["Tower B"]}'

$newUser
```

**Expected output:**
```json
{
  "email": "testuser@company.com",
  "role": "site_manager",
  "sites": ["Tower B"],
  "createdAt": "2025-11-08T..."
}
```

### 5. Test Update User (Admin Only)

```powershell
# Update user role
$updated = Invoke-RestMethod -Uri 'http://localhost:7071/api/users/testuser@company.com' `
  -Method PUT `
  -ContentType 'application/json' `
  -Headers $headers `
  -Body '{"role":"national_manager","sites":["Tower A","Tower B","Tower C"]}'

$updated
```

### 6. Test Delete User (Admin Only)

```powershell
# Delete user
$result = Invoke-RestMethod -Uri 'http://localhost:7071/api/users/testuser@company.com' `
  -Method DELETE `
  -Headers $headers

$result
```

**Expected output:**
```json
{
  "message": "User deleted successfully"
}
```

---

## Testing with curl (Alternative)

If you prefer curl:

```bash
# Login
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"leah@lmllift.com\",\"password\":\"password\"}"

# Save token
TOKEN="paste-token-here"

# Get profile
curl http://localhost:7071/api/profile \
  -H "Authorization: Bearer $TOKEN"

# List users
curl http://localhost:7071/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## What to Check

### ✅ Security Checks

1. **Passwords NOT in responses**:
   - Login response should NOT include passwordHash
   - User list should NOT include passwords
   - Profile should NOT include password

2. **Authorization works**:
   - Login as `user@lmllift.com`
   - Try to create user (should fail with 403 Forbidden)
   - Try to list users (should fail with 403 Forbidden)

3. **Self-deletion prevention**:
   - Login as admin
   - Try to delete leah@lmllift.com (should fail)

### 🔍 Test Scenarios

1. **Login with wrong password**:
   ```powershell
   Invoke-RestMethod -Uri 'http://localhost:7071/api/auth/login' `
     -Method POST `
     -ContentType 'application/json' `
     -Body '{"email":"leah@lmllift.com","password":"wrong"}'
   ```
   Expected: 401 error

2. **Access endpoint without token**:
   ```powershell
   Invoke-RestMethod -Uri 'http://localhost:7071/api/users'
   ```
   Expected: 401 error

3. **Create duplicate user**:
   ```powershell
   # Try to create admin again
   Invoke-RestMethod -Uri 'http://localhost:7071/api/users' `
     -Method POST `
     -ContentType 'application/json' `
     -Headers $headers `
     -Body '{"email":"leah@lmllift.com","password":"test","role":"admin","sites":[]}'
   ```
   Expected: 400 error "User already exists"

---

## Common Issues

### "Connection refused"
- API server not started yet
- Wait a few seconds for startup
- Check for error messages

### "401 Unauthorized"
- Token expired (24 hours)
- Token not in request
- Login again to get new token

### "403 Forbidden"
- User doesn't have required role
- Only admin/consultant can manage users
- Check user role in JWT token

---

## Server Info

**URL**: http://localhost:7071  
**Endpoints**:
- POST /api/auth/login
- GET /api/profile
- GET /api/users
- POST /api/users
- PUT /api/users/:email
- DELETE /api/users/:email
- GET /api/initialize

**Database**: In-memory (data lost on restart)  
**CORS**: Enabled for localhost:8080

---

## Next Steps After Testing

1. If everything works → Deploy to Azure
2. If issues found → Fix and retest
3. Once deployed → Update frontend to use API
4. Test full integration
5. Merge to main

---

Happy testing! 🚀

