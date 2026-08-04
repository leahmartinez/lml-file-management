/**
 * Simple Express Server for Local Testing
 * This is a temporary solution to test the API logic locally
 * before deploying to Azure Functions
 */

// Load environment variables from local.settings.json
import * as path from 'path';
const localSettingsPath = path.join(__dirname, 'local.settings.json');
try {
  const settings = require(localSettingsPath);
  if (settings.Values) {
    Object.keys(settings.Values).forEach((key) => {
      process.env[key] = settings.Values[key];
    });
  }
  console.log('✅ Loaded environment from local.settings.json');
  if (process.env.SANDBOX_MODE === 'true') {
    console.log('🏖️  SANDBOX_MODE enabled - Using Azurite for SharePoint');
  }
} catch (error) {
  console.warn('⚠️  Could not load local.settings.json, using existing environment variables');
}

import express from 'express';
import cors from 'cors';
import {
  getUserByEmailLocal,
  createUserLocal,
  updateUserLocal,
  deleteUserLocal,
  getAllUsersLocal,
  initializeLocalDatabase,
} from './src/database/localMockDb';
import { verifyPassword, generateToken } from './src/utils/auth';
import { getSharePointService } from './src/services/sharePointServiceFactory';

// Use local mock database for dev mode
const getUserByEmail = getUserByEmailLocal;
const createUser = createUserLocal;
const updateUser = updateUserLocal;
const deleteUser = deleteUserLocal;
const getAllUsers = getAllUsersLocal;
// Response helpers (simplified for Express)
function success(data: any) {
  return { status: 200, jsonBody: data };
}

function error(message: string, status: number = 500) {
  return { status, jsonBody: { error: message } };
}

const app = express();
const PORT = 7071;

// Middleware
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Helper to extract token from request
function extractToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  console.log('🔍 Auth header:', authHeader ? 'Present' : 'Missing');
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('⚠️  Invalid auth header format');
    return null;
  }
  return parts[1];
}

// Helper to check auth
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = extractToken(req);
  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Verify token
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'local-dev-secret-do-not-use-in-production-12345';
  
  try {
    const decoded = jwt.verify(token, secret);
    console.log('✅ Token valid for:', decoded.email);
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    console.log('❌ Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Helper to check admin role
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== 'admin' && user.role !== 'consultant')) {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  next();
}

// Routes

// GET / - Root welcome page
app.get('/', (req, res) => {
  res.json({
    message: '🚀 LML API Server is running!',
    version: '1.0.0',
    mode: process.env.SANDBOX_MODE === 'true' ? 'Sandbox (Local)' : 'Production',
    endpoints: {
      auth: [
        'POST /api/auth/login',
      ],
      user: [
        'GET /api/profile',
        'GET /api/users',
        'POST /api/users',
        'PUT /api/users/:email',
        'DELETE /api/users/:email',
      ],
      sharepoint: [
        'POST /api/sharepoint/folders',
        'POST /api/sharepoint/files',
        'GET /api/sharepoint/folders/:folderId/children',
        'GET /api/sharepoint/items/:itemId',
        'GET /api/sharepoint/items/:itemId/download-url',
        'DELETE /api/sharepoint/items/:itemId',
      ],
      utility: [
        'GET /api/initialize',
        'GET /health',
      ],
    },
    testUsers: [
      { email: 'leah@lmllift.com', password: 'password', role: 'admin' },
    ],
  });
});

// GET /health - Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Normalize email to lowercase for lookup
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Login attempt - email:', normalizedEmail);

    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      console.log('Login failed - user not found:', normalizedEmail);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Login attempt - user found, verifying password...');
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      console.log('Login failed - password incorrect');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Login successful for:', normalizedEmail);

    const token = generateToken({
      email: user.email,
      role: user.role,
      sites: JSON.parse(user.sites || '[]'),
    });

    res.json({
      token,
      user: {
        email: user.email,
        role: user.role,
        sites: JSON.parse(user.sites || '[]'),
        lastLogin: user.lastLogin,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    console.log('📋 Profile request for:', user.email);
    const dbUser = await getUserByEmail(user.email);
    
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update last login
    await updateUser(dbUser.email, {
      lastLogin: new Date().toISOString(),
    });

    res.json({
      email: dbUser.email,
      role: dbUser.role,
      sites: JSON.parse(dbUser.sites || '[]'),
      lastLogin: new Date().toISOString(),
      createdAt: dbUser.createdAt,
    });
  } catch (err: any) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await getAllUsers();
    const safeUsers = users.map(u => ({
      email: u.email,
      role: u.role,
      sites: JSON.parse(u.sites || '[]'),
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      createdBy: u.createdBy,
    }));
    res.json(safeUsers);
  } catch (err: any) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users
app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, role, sites } = req.body;
    const currentUser = (req as any).user;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      email,
      passwordHash,
      role,
      sites: sites || [],
      createdBy: currentUser.email,
    });

    res.status(201).json({
      email: newUser.email,
      role: newUser.role,
      sites: JSON.parse(newUser.sites || '[]'),
      createdAt: newUser.createdAt,
    });
  } catch (err: any) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:email
app.put('/api/users/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { role, sites, password } = req.body;

    const existing = await getUserByEmail(email);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates: any = {};
    if (role) updates.role = role;
    if (sites) updates.sites = sites;
    if (password) {
      const bcrypt = require('bcryptjs');
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await updateUser(email, updates);

    res.json({
      email: updated.email,
      role: updated.role,
      sites: JSON.parse(updated.sites || '[]'),
    });
  } catch (err: any) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:email
app.delete('/api/users/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const currentUser = (req as any).user;

    if (email === currentUser.email) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const existing = await getUserByEmail(email);
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    await deleteUser(email);

    res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/initialize
app.get('/api/initialize', async (req, res) => {
  try {
    await initializeLocalDatabase();
    res.json({
      message: 'Local database initialized successfully',
      info: 'Initial admin user: leah@lmllift.com / password',
    });
  } catch (err: any) {
    console.error('Initialize error:', err);
    res.status(500).json({ error: `Initialization failed: ${err.message}` });
  }
});

// =============================================================================
// SHAREPOINT ROUTES
// =============================================================================

// POST /api/sharepoint/folders - Create folder
app.post('/api/sharepoint/folders', requireAuth, async (req, res) => {
  try {
    const { parentId, folderName } = req.body;
    const service = getSharePointService();
    const result = await service.createFolder(parentId || 'root', folderName);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('Create folder error:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// POST /api/sharepoint/files - Upload file
app.post('/api/sharepoint/files', requireAuth, async (req, res) => {
  try {
    const { parentId, fileName, fileContentBase64, mimeType, workOrderId } = req.body;
    const currentUser = (req as any).user;

    // Decode base64 to buffer
    const fileBuffer = Buffer.from(fileContentBase64, 'base64');

    const service = getSharePointService();
    const result = await service.uploadFile(
      parentId || 'root',
      fileName,
      fileBuffer,
      mimeType,
      {
        originalName: fileName,
        mimeType,
        uploadedBy: currentUser.email,
        workOrderId,
        createdAt: new Date().toISOString(),
      }
    );
    res.status(201).json(result);
  } catch (err: any) {
    console.error('Upload file error:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/sharepoint/folders/:folderId/children - List folder contents
app.get('/api/sharepoint/folders/:folderId/children', requireAuth, async (req, res) => {
  try {
    const { folderId } = req.params;
    const service = getSharePointService();
    const result = await service.listFolderChildren(folderId);
    res.json(result);
  } catch (err: any) {
    console.error('List folder error:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/sharepoint/items/:itemId - Get item metadata
app.get('/api/sharepoint/items/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const service = getSharePointService();
    const result = await service.getFolderOrFile(itemId);
    res.json(result);
  } catch (err: any) {
    console.error('Get item error:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// GET /api/sharepoint/items/:itemId/download-url - Get download URL
app.get('/api/sharepoint/items/:itemId/download-url', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const service = getSharePointService();
    const result = await service.getDownloadUrl(itemId);
    res.json(result);
  } catch (err: any) {
    console.error('Get download URL error:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// DELETE /api/sharepoint/items/:itemId - Delete item
app.delete('/api/sharepoint/items/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const service = getSharePointService();
    await service.deleteItem(itemId);
    res.status(204).send();
  } catch (err: any) {
    console.error('Delete item error:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Start server
async function start() {
  try {
    // Initialize local mock database
    await initializeLocalDatabase();
    console.log('✅ Local mock database initialized');
    
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 LML API Server Running!');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log('');
      console.log('📋 Available Endpoints:');
      console.log('   POST   /api/auth/login');
      console.log('   GET    /api/profile');
      console.log('   GET    /api/users');
      console.log('   POST   /api/users');
      console.log('   PUT    /api/users/:email');
      console.log('   DELETE /api/users/:email');
      console.log('   GET    /api/initialize');
      console.log('');
      console.log('📁 SharePoint Endpoints:');
      console.log('   POST   /api/sharepoint/folders');
      console.log('   POST   /api/sharepoint/files');
      console.log('   GET    /api/sharepoint/folders/:folderId/children');
      console.log('   GET    /api/sharepoint/items/:itemId');
      console.log('   GET    /api/sharepoint/items/:itemId/download-url');
      console.log('   DELETE /api/sharepoint/items/:itemId');
      console.log('');
      console.log('🧪 Test users (password: "password"):');
      console.log('   - leah@lmllift.com');
      console.log('');
      if (process.env.SANDBOX_MODE === 'true') {
        console.log('🏖️  SANDBOX MODE: Using Azurite (local storage)');
        console.log('   Make sure Azurite is running: npm run azurite');
        console.log('');
      }
      console.log('Press Ctrl+C to stop');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

