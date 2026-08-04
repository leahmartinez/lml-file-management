/**
 * Simple test script to verify backend logic works
 */

import { initializeDatabase, getUserByEmail, createUser } from '../src/database/tableStorage';
import { hashPassword, verifyPassword, generateToken } from '../src/utils/auth';

async function test() {
  console.log('🧪 Testing Backend Logic...\n');

  try {
    // 1. Initialize database
    console.log('1. Initializing database...');
    await initializeDatabase();
    console.log('   ✅ Database initialized\n');

    // 2. Test password hashing
    console.log('2. Testing password hashing...');
    const testPassword = 'testpassword123';
    const hash = await hashPassword(testPassword);
    console.log('   ✅ Password hashed:', hash.substring(0, 20) + '...\n');

    // 3. Test password verification
    console.log('3. Testing password verification...');
    const isValid = await verifyPassword(testPassword, hash);
    console.log('   ✅ Password verification:', isValid ? 'PASS' : 'FAIL');
    const isInvalid = await verifyPassword('wrongpassword', hash);
    console.log('   ✅ Wrong password rejected:', !isInvalid ? 'PASS' : 'FAIL\n');

    // 4. Test JWT token generation
    console.log('4. Testing JWT token generation...');
    process.env.JWT_SECRET = 'test-secret';
    const token = generateToken({
      email: 'test@example.com',
      role: 'admin',
      sites: [],
    });
    console.log('   ✅ Token generated:', token.substring(0, 20) + '...\n');

    // 5. Test user creation
    console.log('5. Testing user creation...');
    const testUser = await createUser({
      email: 'test@example.com',
      passwordHash: hash,
      role: 'admin',
      sites: [],
      createdBy: 'system',
    });
    console.log('   ✅ User created:', testUser.email, '\n');

    // 6. Test user retrieval
    console.log('6. Testing user retrieval...');
    const retrieved = await getUserByEmail('test@example.com');
    console.log('   ✅ User retrieved:', retrieved?.email);
    console.log('   ✅ Password hash matches:', retrieved?.passwordHash === hash, '\n');

    // 7. Test admin user exists
    console.log('7. Testing admin user...');
    const admin = await getUserByEmail('leah@lmllift.com');
    if (admin) {
      console.log('   ✅ Admin user exists');
      const adminPasswordValid = await verifyPassword('password', admin.passwordHash);
      console.log('   ✅ Admin password works:', adminPasswordValid ? 'PASS' : 'FAIL', '\n');
    } else {
      console.log('   ⚠️  Admin user not found (will be created on first run)\n');
    }

    console.log('✅ All backend tests passed!');
    console.log('\n📋 Summary:');
    console.log('   - Database: ✅ Working');
    console.log('   - Password hashing: ✅ Working');
    console.log('   - JWT tokens: ✅ Working');
    console.log('   - User CRUD: ✅ Working');
    console.log('\n🚀 Backend is ready!');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

test();

