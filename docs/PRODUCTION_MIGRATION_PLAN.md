# Production Migration Plan - Server-Side Authentication

## 🎯 Goal
Migrate from client-side authentication to server-side authentication with Azure Static Web Apps + Azure Functions.

---

## 📊 Current Architecture (Client-Side)

```
Browser
  ├── Login Form → Hashes password (SHA-256)
  ├── Verifies against localStorage/blob storage
  ├── Admin adds user → Saves to localStorage
  └── Data fetched from PUBLIC blob storage

⚠️ Issues:
- No server validation
- Passwords exposed in network requests
- User data in localStorage can be manipulated
- Blob storage is public
- No audit trail
```

---

## 🚀 Target Architecture (Server-Side)

```
Browser
  ↓
Azure Static Web Apps (Frontend)
  ↓ (HTTPS only)
Azure Static Web Apps Auth Provider (Microsoft/Google/GitHub)
  ↓
Azure Functions API (Backend)
  ├── POST /api/auth/login → Validates credentials
  ├── GET /api/users → Returns users (role-based)
  ├── POST /api/users → Creates user (admin only)
  ├── PUT /api/users/:id → Updates user (admin only)
  ├── DELETE /api/users/:id → Deletes user (admin only)
  ├── GET /api/data/sites → Returns site data
  └── GET /api/data/assets → Returns asset data
  ↓
Azure Cosmos DB OR Azure Table Storage (Database)
  └── Stores users, with bcrypt-hashed passwords
  
Azure Blob Storage (PRIVATE)
  └── Data files (CSV, PDF) with SAS tokens
```

---

## 🛠️ Implementation Options

### Option 1: Azure Static Web Apps Built-In Auth (RECOMMENDED)
**Pros:**
- ✅ No code needed for authentication
- ✅ Microsoft/Google/GitHub/Twitter login
- ✅ Automatic JWT token handling
- ✅ Role-based access control built-in
- ✅ Free tier available

**Cons:**
- ⚠️ Limited to supported providers
- ⚠️ Can't do fully custom UI for login

**Best For:** Enterprise apps, quick production deployment

### Option 2: Custom Azure Functions Auth
**Pros:**
- ✅ Full control over authentication flow
- ✅ Custom login UI
- ✅ Support for any auth method
- ✅ Can integrate with existing user databases

**Cons:**
- ⚠️ More code to write and maintain
- ⚠️ Need to handle JWT tokens manually
- ⚠️ More security considerations

**Best For:** Apps with existing user base, custom requirements

### Option 3: Azure AD B2C
**Pros:**
- ✅ Enterprise-grade security
- ✅ Multi-factor authentication built-in
- ✅ Password reset flows
- ✅ Customizable user journeys
- ✅ Compliance certifications

**Cons:**
- ⚠️ More expensive
- ⚠️ More complex setup
- ⚠️ Steeper learning curve

**Best For:** Enterprise customers, compliance requirements

---

## 📋 Recommended Approach: Hybrid Solution

**Use Azure Static Web Apps Auth + Custom API**

This gives you:
- Easy authentication (Microsoft/Google login)
- Custom user roles (stored in your database)
- Full control over data access
- Professional-grade security

---

## 🔨 Step-by-Step Implementation

### Phase 1: Set Up Azure Functions API (Week 1)

#### 1.1 Create Azure Functions Project
```bash
# Create API directory
mkdir api
cd api

# Initialize Functions project
func init --typescript
func new --template "HTTP trigger" --name auth
func new --template "HTTP trigger" --name users
func new --template "HTTP trigger" --name data
```

#### 1.2 Set Up Database
**Option A: Azure Cosmos DB** (Recommended for scalability)
```typescript
// Store users with roles
{
  id: "user-123",
  email: "leah@lmllift.com",
  passwordHash: "$2b$10$...", // bcrypt
  role: "admin",
  sites: [],
  createdAt: "2025-11-08T...",
  lastLogin: "2025-11-08T..."
}
```

**Option B: Azure Table Storage** (Cheaper, simpler)
```typescript
// Same structure, table-based storage
```

#### 1.3 Implement API Endpoints
```typescript
// api/auth/login.ts
export async function login(email: string, password: string) {
  // 1. Look up user in database
  // 2. Verify password with bcrypt
  // 3. Return JWT token + user info (no password)
  // 4. Log audit trail
}

// api/users/index.ts
export async function getUsers(req: HttpRequest) {
  // 1. Verify JWT token
  // 2. Check if user is admin
  // 3. Return all users (no passwords)
}

export async function createUser(req: HttpRequest) {
  // 1. Verify JWT token
  // 2. Check if user is admin
  // 3. Hash password with bcrypt
  // 4. Save to database
  // 5. Send email to new user (optional)
}
```

### Phase 2: Secure Blob Storage (Week 1)

#### 2.1 Make Blob Storage Private
```bash
# Azure CLI
az storage container set-permission \
  --name lml-data \
  --account-name lmldata \
  --public-access off
```

#### 2.2 Generate SAS Tokens
```typescript
// api/data/getSasToken.ts
export async function generateSasToken(fileName: string, userRole: string) {
  // 1. Verify user has access to this file
  // 2. Generate time-limited SAS token (1 hour)
  // 3. Return signed URL
}
```

### Phase 3: Update Frontend (Week 2)

#### 3.1 Replace useAuth Hook
```typescript
// src/hooks/useAuth.tsx
// Remove localStorage logic
// Call API endpoints instead

async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const { token, user } = await response.json();
  // Store token in httpOnly cookie (server-side)
  return user;
}
```

#### 3.2 Update Data Fetching
```typescript
// src/services/dataService.ts
// Use SAS tokens for blob storage

async function fetchCSV(fileName: string) {
  // 1. Get SAS token from API
  const { url } = await fetch(`/api/data/sas-token?file=${fileName}`);
  // 2. Fetch CSV with signed URL
  const response = await fetch(url);
  return parseCSV(response);
}
```

#### 3.3 Update Admin User Management
```typescript
// src/pages/AdminPage.tsx
// Call API instead of localStorage

async function createUser(userData) {
  const response = await fetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  return response.json();
}
```

### Phase 4: Enable Azure Static Web Apps Auth (Week 2)

#### 4.1 Add staticwebapp.config.json Auth
```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/{tenant-id}",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/api/admin/*",
      "allowedRoles": ["admin"]
    }
  ]
}
```

#### 4.2 Handle Auth in Frontend
```typescript
// src/hooks/useStaticWebAppsAuth.tsx
export function useStaticWebAppsAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Azure Static Web Apps provides user info at /.auth/me
    fetch('/.auth/me')
      .then(r => r.json())
      .then(data => setUser(data.clientPrincipal));
  }, []);

  return { user };
}
```

### Phase 5: Testing & Deployment (Week 3)

#### 5.1 Test Locally
```bash
# Start Azure Functions locally
cd api
func start

# Start frontend
npm run dev

# Test all auth flows
```

#### 5.2 Deploy to Azure
```bash
# Deploy Functions
func azure functionapp publish <function-app-name>

# Push to main (triggers Static Web Apps deployment)
git push origin main
```

#### 5.3 Configure Secrets
```bash
# Add to Azure Static Web Apps configuration
- DATABASE_CONNECTION_STRING
- STORAGE_ACCOUNT_KEY
- JWT_SECRET
```

---

## 💰 Cost Estimate

### Development/Staging Environment
- Azure Static Web Apps: **$0/month** (Free tier)
- Azure Functions: **~$10/month** (Consumption plan)
- Azure Cosmos DB: **~$25/month** (Serverless)
- Azure Blob Storage: **~$1/month**
- **Total: ~$36/month**

### Production Environment
- Azure Static Web Apps: **$9/month** (Standard tier)
- Azure Functions: **~$50/month** (Premium plan)
- Azure Cosmos DB: **~$100/month** (Provisioned)
- Azure Blob Storage: **~$5/month**
- **Total: ~$164/month**

---

## ⏱️ Timeline

| Phase | Duration | Complexity |
|-------|----------|------------|
| Azure Functions API | 3-4 days | Medium |
| Database Setup | 1-2 days | Easy |
| Secure Blob Storage | 1 day | Easy |
| Frontend Updates | 2-3 days | Medium |
| Azure Auth Setup | 1-2 days | Medium |
| Testing | 2-3 days | Medium |
| **Total** | **2-3 weeks** | |

---

## 🎯 Quick Start vs Full Implementation

### Option A: Quick Start (1 week)
**Just make it work securely:**
- Keep current frontend mostly as-is
- Add Azure Functions for critical operations only
- Make blob storage private with SAS tokens
- Use Azure Static Web Apps built-in auth

**Pros:** Fast, minimal changes
**Cons:** Not perfect, will need refactoring later

### Option B: Full Implementation (3 weeks)
**Do it right from the start:**
- Full API layer
- Proper database
- Azure AD integration
- Complete audit trail
- Production-grade security

**Pros:** Production-ready, scalable
**Cons:** Takes longer, more complex

---

## 🤔 Which Option Should You Choose?

**Choose Quick Start (Option A) if:**
- ✅ You need to demo to stakeholders soon
- ✅ You're still validating the product
- ✅ You have limited budget
- ✅ You can accept some technical debt

**Choose Full Implementation (Option B) if:**
- ✅ You have real customers ready
- ✅ You need compliance (GDPR, HIPAA)
- ✅ You want to avoid refactoring later
- ✅ You have 3 weeks before launch

---

## 🚀 My Recommendation

**Start with Option A (Quick Start), then migrate to Option B**

### Week 1: Quick Start
1. Create minimal Azure Functions API
2. Make blob storage private
3. Implement SAS tokens
4. Test with demo data

### Week 2: Validate
1. Deploy to staging
2. Get customer feedback
3. Identify what works

### Weeks 3-4: Full Implementation
1. Add proper database
2. Implement full API
3. Add audit logging
4. Production launch

This approach:
- ✅ Gets you to production quickly
- ✅ Validates the product early
- ✅ Reduces wasted effort if pivoting
- ✅ Creates a clear upgrade path

---

## 📝 Next Steps

1. **Decide on timeline**: Quick Start or Full Implementation?
2. **Set up Azure resources**: Functions, Database, Storage
3. **I'll implement the solution**: Step-by-step with you
4. **Test thoroughly**: Security, performance, usability
5. **Deploy with confidence**: Production-ready!

---

**Ready to proceed?** Let me know which option you'd like (Quick Start or Full Implementation) and I'll start building it!


