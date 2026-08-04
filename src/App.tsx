import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";

import { VerifyEmail } from "./components/VerifyEmail";
import { ForgotPassword } from "./components/ForgotPassword";
import { ResetPassword } from "./components/ResetPassword";
import { AcceptInvitation } from "./components/AcceptInvitation";
import { useAuth } from "./hooks/useAuth.tsx";
import { usePermissions } from "./hooks/usePermissions";
import { initializeMockProjectUnits } from "./utils/initMockData";
import { SharePointAuthProvider } from "./contexts/SharePointAuthContext";
import { FileClipboardProvider } from "./contexts/FileClipboardContext";

// Code split heavy page components for better initial load performance
const ContactDirectory = lazy(() => import("./pages/ContactDirectory"));
const SitesPage = lazy(() => import("./pages/Sites"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Proposals = lazy(() => import("./pages/Proposals"));
const Admin = lazy(() => import("./pages/Admin"));
const UserPortal = lazy(() => import("./pages/UserPortal"));
const ForcePasswordReset = lazy(() => import("./pages/ForcePasswordReset"));

// Loading placeholder component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

/**
 * Admin-only route guard
 * Redirects non-admin users to home page
 */
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const { canAccessAdmin } = usePermissions();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdmin) {
    // Non-admin users trying to access admin routes are redirected
    return <Navigate to="/sites" replace />;
  }

  return children;
};

const AppContent = () => {
  // Initialize mock project units on app startup
  useEffect(() => {
    initializeMockProjectUnits();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/force-password-reset"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ForcePasswordReset />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />

          {/* Default landing page - Projects/Sites */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/sites" replace />
              </ProtectedRoute>
            }
          />

          {/* Main application routes */}
          <Route
            path="/my-work"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <UserPortal />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sites"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <SitesPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectCode"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ProjectDetail />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/contact"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ContactDirectory />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/proposals"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <Proposals />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Suspense fallback={<PageLoader />}>
                  <Admin />
                </Suspense>
              </AdminRoute>
            }
          />

          {/* Catch-all - 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

const App = () => (
  <SharePointAuthProvider>
    <FileClipboardProvider>
      <AppContent />
    </FileClipboardProvider>
  </SharePointAuthProvider>
);

export default App;
