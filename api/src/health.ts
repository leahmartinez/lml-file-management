import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

// Default export for function.json handler
export default async function handler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log("Health check endpoint called");
  return {
    status: 200,
    body: JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      runtime: "Node.js v4 Functions"
    }),
    headers: {
      "Content-Type": "application/json"
    }
  };
}

// Also export as named export for code-first model
export async function healthHandler(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return handler(request, context);
}
