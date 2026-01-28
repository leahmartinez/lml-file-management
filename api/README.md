# LML File Management API Documentation

Backend API for secure authentication and user management.

## Tech Stack

- Node.js 20+
- Azure Functions v4
- Azure Table Storage
- JWT tokens for authentication
- bcrypt for password hashing

## 📂 Project Structure

```
api/
├── src/
│   ├── database/
│   │   └── tableStorage.ts      # Database operations
│   ├── functions/
│   │   ├── auth.ts              # POST /api/auth/login
│   │   ├── users.ts             # CRUD /api/users
│   │   ├── profile.ts           # GET /api/profile
│   │   └── initialize.ts        # GET /api/initialize
│   └── utils/
│       ├── auth.ts              # JWT & password utilities
│       └── response.ts          # HTTP response helpers
├── host.json                    # Azure Functions configuration
├── package.json
└── tsconfig.json
```

## 🚀 API Endpoints

### Authentication

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "leah@lmllift.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "leah@lmllift.com",
    "role": "admin",
    "sites": [],
    "lastLogin": "2025-11-08T..."
  }
}
```

### User Management (Admin/Consultant Only)

#### GET /api/users
List all users.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "email": "leah@lmllift.com",
    "role": "admin",
    "sites": [],
    "createdAt": "2025-11-08T...",
    "lastLogin": "2025-11-08T..."
  }
]
```

#### POST /api/users
Create a new user.

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "email": "newuser@company.com",
  "password": "securePassword123",
  "role": "site_manager",
  "sites": ["Tower A", "Tower B"]
}
```

#### PUT /api/users/:email
Update user role/sites.

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "role": "national_manager",
  "sites": ["Tower A", "Tower B", "Tower C"]
}
```

#### DELETE /api/users/:email
Delete a user.

**Headers:**
```
Authorization: Bearer {token}
```

### Profile

#### GET /api/profile
Get current user's profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "email": "user@company.com",
  "role": "site_manager",
  "sites": ["Tower A"],
  "lastLogin": "2025-11-08T...",
  "createdAt": "2025-11-08T..."
}
```

### Initialization

#### GET /api/initialize
Initialize database and seed initial admin user.

**Response:**
```json
{
  "message": "Database initialized successfully",
  "info": "Initial admin user: leah@lmllift.com / password"
}
```

## 🔧 Local Development

### Prerequisites

- Node.js 20+
- Azure Functions Core Tools v4
- Azure Storage Emulator or Azure Storage Account

### Setup

1. **Install dependencies:**
```bash
cd api
npm install
```

2. **Configure local settings:**
```bash
cp local.settings.json.example local.settings.json
```

Edit `local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "JWT_SECRET": "your-dev-secret-change-in-production",
    "ALLOWED_ORIGINS": "http://localhost:8080"
  }
}
```

3. **Start Azure Storage Emulator:**
```bash
# Windows
azurite

# Or use Azure Storage Account connection string
```

4. **Build and run:**
```bash
npm run build
npm start
```

5. **Initialize database:**
```bash
curl http://localhost:7071/api/initialize
```

## 🌐 Deployment

### Deploy to Azure Functions

1. **Create Azure Resources:**
```bash
# Create resource group
az group create --name lml-rg --location australiaeast

# Create storage account
az storage account create \
  --name lmlstorage \
  --resource-group lml-rg \
  --sku Standard_LRS

# Create function app
az functionapp create \
  --resource-group lml-rg \
  --consumption-plan-location australiaeast \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name lml-api \
  --storage-account lmlstorage
```

2. **Configure application settings:**
```bash
# Get storage connection string
STORAGE_CONNECTION=$(az storage account show-connection-string \
  --name lmlstorage \
  --resource-group lml-rg \
  --query connectionString -o tsv)

# Set application settings
az functionapp config appsettings set \
  --name lml-api \
  --resource-group lml-rg \
  --settings \
    "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION" \
    "JWT_SECRET=your-production-secret-here" \
    "ALLOWED_ORIGINS=https://your-app.azurestaticapps.net"
```

3. **Deploy:**
```bash
cd api
npm run build
func azure functionapp publish lml-api
```

4. **Initialize database:**
```bash
curl https://lml-api.azurewebsites.net/api/initialize
```

## 🔒 Security

### Password Security
- Passwords hashed with bcrypt (salt rounds: 10)
- Never stored or returned in plain text
- Password hashes never included in API responses

### JWT Tokens
- 24-hour expiration
- Include user email, role, and sites
- Validated on every protected endpoint

### Authorization
- Admin/Consultant only: User management endpoints
- Role-based access control on all endpoints
- Users cannot delete their own accounts

### CORS
- Configurable allowed origins
- Credentials supported for authenticated requests
- OPTIONS preflight handling

## 🧪 Testing

### Test Authentication
```bash
# Login
curl -X POST http://localhost:7071/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leah@lmllift.com","password":"password"}'

# Save token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Get profile
curl http://localhost:7071/api/profile \
  -H "Authorization: Bearer $TOKEN"

# List users
curl http://localhost:7071/api/users \
  -H "Authorization: Bearer $TOKEN"
```

## 📊 Database Schema

### Users Table
- **Partition Key**: "USER"
- **Row Key**: email (unique)
- **Fields**:
  - email: string
  - passwordHash: string (bcrypt)
  - role: 'national_manager' | 'site_manager' | 'admin' | 'consultant'
  - sites: string (JSON array)
  - createdAt: ISO timestamp
  - lastLogin: ISO timestamp
  - createdBy: string

## 🐛 Troubleshooting

### "AZURE_STORAGE_CONNECTION_STRING not configured"
- Set in `local.settings.json` for local dev
- Set in Application Settings for Azure

### "JWT_SECRET not configured"
- Set in `local.settings.json` for local dev
- Set in Application Settings for Azure

### CORS errors
- Add your origin to `ALLOWED_ORIGINS`
- Format: comma-separated list
- Example: "http://localhost:8080,https://yourdomain.com"

### 401 Unauthorized
- Check token is included in Authorization header
- Format: `Bearer {token}`
- Token may be expired (24h limit)

## 📚 Learn More

- [Azure Functions Documentation](https://learn.microsoft.com/azure/azure-functions/)
- [Azure Table Storage](https://learn.microsoft.com/azure/storage/tables/)
- [JWT.io](https://jwt.io/)




