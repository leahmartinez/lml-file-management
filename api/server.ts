/**
 * Simple Express Server for Local Testing
 * This is a temporary solution to test the API logic locally
 * before deploying to Azure Functions
 */

import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './src/database/tableStorage';
import { getUserByEmail } from './src/database/tableStorage';
import { verifyPassword, generateToken } from './src/utils/auth';
// Response helpers (simplified for Express)
function success(data: any) {
  return { status: 200, jsonBody: data };
}

function error(message: string, status: number = 500) {
  return { status, jsonBody: { error: message } };
}
import { getAllUsers, createUser, updateUser, deleteUser } from './src/database/tableStorage';

const app = express();
const PORT = 7071;

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'https://jolly-moss-04de19b00.3.azurestaticapps.net'],
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
    await initializeDatabase();
    res.json({
      message: 'Database initialized successfully',
      info: 'Initial admin user: admin@liftwatch.com / password',
    });
  } catch (err: any) {
    console.error('Initialize error:', err);
    res.status(500).json({ error: `Initialization failed: ${err.message}` });
  }
});

// Start server
async function start() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 LiftWatch API Server Running!');
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
      console.log('🧪 Test users (password: "password"):');
      console.log('   - admin@liftwatch.com');
      console.log('   - manager@liftwatch.com');
      console.log('   - sitemanager@liftwatch.com');
      console.log('   - consultant@liftwatch.com');
      console.log('');
      console.log('Press Ctrl+C to stop');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

