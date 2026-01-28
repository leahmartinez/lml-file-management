/**
 * Generate function.json stubs for Azure Functions v4
 * These are required for Azure to recognize HTTP triggers
 */

const fs = require('fs');
const path = require('path');

const functions = [
  { name: 'initialize', methods: ['GET', 'OPTIONS'], route: 'initialize' },
  { name: 'profile', methods: ['GET'], route: 'profile' },
  { name: 'users', methods: ['GET', 'POST', 'OPTIONS'], route: 'users' },
  { name: 'sites', methods: ['GET', 'OPTIONS'], route: 'sites' },
  { name: 'projects', methods: ['GET', 'OPTIONS'], route: 'projects' },
  { name: 'contacts', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], route: 'contacts' },
  { name: 'businesses', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], route: 'businesses' },
  { name: 'auth-login', methods: ['POST', 'OPTIONS'], route: 'auth/login' },
  { name: 'auth-register', methods: ['POST', 'OPTIONS'], route: 'auth/register' },
  { name: 'auth-forgot-password', methods: ['POST', 'OPTIONS'], route: 'auth/forgot-password' },
  { name: 'auth-reset-password', methods: ['POST', 'OPTIONS'], route: 'auth/reset-password' },
  { name: 'auth-verify-email', methods: ['POST', 'OPTIONS'], route: 'auth/verify-email' },
  { name: 'auth-resend-verification', methods: ['POST', 'OPTIONS'], route: 'auth/resend-verification' },
  { name: 'auth-send-invitation', methods: ['POST', 'OPTIONS'], route: 'auth/send-invitation' },
  { name: 'auth-accept-invitation', methods: ['POST', 'OPTIONS'], route: 'auth/accept-invitation' },
  { name: 'users-approve', methods: ['POST', 'OPTIONS'], route: 'users/approve' },
  { name: 'users-suspend', methods: ['POST', 'OPTIONS'], route: 'users/suspend' },
  { name: 'users-delete', methods: ['DELETE', 'OPTIONS'], route: 'users/delete' },
  { name: 'users-update', methods: ['PUT', 'OPTIONS'], route: 'users/update' },
  { name: 'projects-delete', methods: ['DELETE', 'OPTIONS'], route: 'projects/delete' },
  { name: 'sites-delete', methods: ['DELETE', 'OPTIONS'], route: 'sites/delete' }
];

const distDir = path.join(__dirname, 'dist');

functions.forEach(({ name, methods, route }) => {
  const funcDir = path.join(distDir, name);

  // Create directory if it doesn't exist
  if (!fs.existsSync(funcDir)) {
    fs.mkdirSync(funcDir, { recursive: true });
  }

  // Create function.json with HTTP trigger binding
  const functionJson = {
    scriptFile: '../src/functions.js',
    bindings: [
      {
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        methods: methods,
        route: route,
        authLevel: 'anonymous'
      },
      {
        type: 'http',
        direction: 'out',
        name: '$return'
      }
    ]
  };

  const functionJsonPath = path.join(funcDir, 'function.json');
  fs.writeFileSync(functionJsonPath, JSON.stringify(functionJson, null, 2));
  console.log(`Created ${name}/function.json`);
});

console.log(`Generated ${functions.length} function.json stubs`);
