import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import { RegisterForm } from "./components/RegisterForm";
import { VerifyEmail } from "./components/VerifyEmail";
import { ForgotPassword } from "./components/ForgotPassword";
import { ResetPassword } from "./components/ResetPassword";
import { AcceptInvitation } from "./components/AcceptInvitation";
import { useAuth } from "./hooks/useAuth.tsx";

// Code split heavy page components for better initial load performance
const ContactDirectory = lazy(() => import("./pages/ContactDirectory"));
const SitesPage = lazy(() => import("./pages/Sites"));

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
            path="/contact"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <ContactDirectory />
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Catch-all - 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
