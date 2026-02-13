const fs = require('fs');
const path = require('path');

// Define all functions with their routes and methods
const functions = [
  { name: 'health', route: 'health', methods: ['GET'], script: '../health.js' },
  { name: 'initialize', route: 'initialize', methods: ['GET', 'OPTIONS'], script: '../handlers/initialize.js' },
  { name: 'profile', route: 'profile', methods: ['GET'], script: '../handlers/profile.js' },
  { name: 'users', route: 'users', methods: ['GET', 'POST', 'OPTIONS'], script: '../handlers/users.js' },
  { name: 'sites', route: 'sites', methods: ['GET', 'POST', 'PUT', 'OPTIONS'], script: '../handlers/sites.js' },
  { name: 'projects', route: 'projects', methods: ['GET', 'POST', 'PUT', 'OPTIONS'], script: '../handlers/projects.js' },
  { name: 'contacts', route: 'contacts', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], script: '../handlers/contacts.js' },
  { name: 'businesses', route: 'businesses', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], script: '../handlers/businesses.js' },
  { name: 'auth-login', route: 'auth/login', methods: ['POST', 'OPTIONS'], script: '../handlers/auth-login.js' },
  { name: 'auth-register', route: 'auth/register', methods: ['POST', 'OPTIONS'], script: '../handlers/auth-register.js' },
  { name: 'auth-forgot-password', route: 'auth/forgot-password', methods: ['POST', 'OPTIONS'], script: '../handlers/auth-forgot-password.js' },
  { name: 'auth-reset-password', route: 'auth/reset-password', methods: ['POST', 'OPTIONS'], script: '../handlers/auth-reset-password.js' },
  { name: 'auth-verify-email', route: 'auth/verify-email', methods: ['POST', 'OPTIONS'], script: '../handlers/auth-verify-email.js' },
  { name: 'auth-resend-verification', route: 'auth/resend-verification', methods: ['POST', 'OPTIONS'], script: '../handlers/auth-resend-verification.js' },
  { name: 'auth-send-invitation', route: 'auth/send-invitation', methods: ['POST', 'OPTIONS'], script: '../handlers/auth-send-invitation.js' },
  { name: 'auth-accept-invitation', route: 'auth/accept-invitation', methods: ['POST', 'OPTIONS'], script: '../handlers/auth-accept-invitation.js' },
  { name: 'users-approve', route: 'users/approve', methods: ['POST', 'OPTIONS'], script: '../handlers/users-approve.js' },
  { name: 'users-suspend', route: 'users/suspend', methods: ['POST', 'OPTIONS'], script: '../handlers/users-suspend.js' },
  { name: 'users-delete', route: 'users/delete', methods: ['DELETE', 'OPTIONS'], script: '../handlers/users-delete.js' },
  { name: 'users-update', route: 'users/update', methods: ['PUT', 'OPTIONS'], script: '../handlers/users-update.js' },
  { name: 'projects-delete', route: 'projects/delete', methods: ['DELETE', 'OPTIONS'], script: '../handlers/projects-delete.js' },
  { name: 'sites-delete', route: 'sites/delete', methods: ['DELETE', 'OPTIONS'], script: '../handlers/sites-delete.js' },
  { name: 'user-profile', route: 'user/profile', methods: ['GET', 'PUT', 'OPTIONS'], script: '../handlers/user-profile.js' },
  { name: 'projects-rename', route: 'projects/rename', methods: ['PUT', 'OPTIONS'], script: '../handlers/projects-rename.js' },
  { name: 'profiles', route: 'profiles/{email}', methods: ['GET', 'PUT', 'OPTIONS'], script: '../handlers/profiles.js' }
];

// Generate function.json for each function in dist directory
functions.forEach(func => {
  const dir = path.join('dist', func.name);
  fs.mkdirSync(dir, { recursive: true });
  
  const functionJson = {
    scriptFile: func.script,
    entryPoint: 'default',
    bindings: [
      {
        authLevel: 'anonymous',
        type: 'httpTrigger',
        direction: 'in',
        name: 'req',
        methods: func.methods.map(m => m.toLowerCase()),
        route: func.route
      },
      {
        type: 'http',
        direction: 'out',
        name: '$return'
      }
    ]
  };
  
  fs.writeFileSync(path.join(dir, 'function.json'), JSON.stringify(functionJson, null, 2));
  console.log(`Created ${dir}/function.json (scriptFile: ${func.script})`);
});
