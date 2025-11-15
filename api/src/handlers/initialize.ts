import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { initializeDatabase, seedInitialUsers } from '../database/tableStorage';
import { success, error, addCorsHeaders } from '../utils/response';

export async function initializeHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return addCorsHeaders({ status: 200 }, request.headers.get('origin') || undefined);
    }

    context.log('Initializing database...');

    // Check for required environment variables
    const storageConnection = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!storageConnection || storageConnection === 'your-connection-string-here') {
      const errorMsg = 'AZURE_STORAGE_CONNECTION_STRING environment variable is not configured. Please set it in Azure Portal → Configuration → Application settings.';
      context.error(errorMsg);
      return addCorsHeaders(
        error(errorMsg, 500),
        request.headers.get('origin') || undefined
      );
    }

    // Create tables
    await initializeDatabase();
    context.log('Tables initialized');

    // Seed initial users
    await seedInitialUsers();
    context.log('Initial users seeded');

    return addCorsHeaders(
      success({
        message: 'Database initialized successfully',
        info: 'Initial admin user: admin@liftwatch.com / password',
      }),
      request.headers.get('origin') || undefined
    );

  } catch (err: any) {
    const errorMessage = err.message || 'Unknown error';
    const errorStack = err.stack || '';
    context.error('Initialize error:', {
      message: errorMessage,
      stack: errorStack,
      name: err.name,
      code: err.code
    });
    
    // Provide more helpful error messages
    let userFriendlyMessage = `Initialization failed: ${errorMessage}`;
    if (errorMessage.includes('connection string') || errorMessage.includes('AZURE_STORAGE')) {
      userFriendlyMessage = 'Storage connection error. Please verify AZURE_STORAGE_CONNECTION_STRING is set correctly in Azure Portal → Configuration → Application settings.';
    } else if (errorMessage.includes('not configured')) {
      userFriendlyMessage = errorMessage;
    }
    
    return addCorsHeaders(
      error(userFriendlyMessage, 500),
      request.headers.get('origin') || undefined
    );
  }
}

// Default export for function.json
export default initializeHandler;
