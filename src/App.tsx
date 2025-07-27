import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load components with proper error handling
const lazyWithErrorBoundary = (importFunc: () => Promise<any>, componentName: string) => {
  return React.lazy(() => 
    importFunc().catch((error) => {
      console.error(`Failed to load ${componentName}:`, error);
      return {
        default: () => (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Failed to load {componentName}</h2>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Refresh Page
              </button>
            </div>
          </div>
        )
      };
    })
  );
};

const Index = lazyWithErrorBoundary(() => import("./pages/Index"), "Home Page");
const Auth = lazyWithErrorBoundary(() => import("./pages/Auth"), "Authentication");
const Admin = lazyWithErrorBoundary(() => import("./pages/Admin"), "Admin Panel");
const EstimateForm = lazyWithErrorBoundary(() => import("./pages/EstimateForm"), "Estimate Form");
const MyEstimates = lazyWithErrorBoundary(() => import("./pages/MyEstimates"), "My Estimates");
const ApproveEstimate = lazyWithErrorBoundary(() => import("./pages/ApproveEstimate"), "Approve Estimate");
const NotFound = lazyWithErrorBoundary(() => import("./pages/NotFound"), "404 Page");
const TransactionHistory = lazyWithErrorBoundary(() => import("./pages/TransactionHistory"), "Transaction History");
const MobileHomeDetail = React.lazy(() => 
  import("./pages/MobileHomeDetail")
    .then(module => ({ default: module.MobileHomeDetail }))
    .catch(() => ({ 
      default: () => <div className="p-4">Error loading home details. Please refresh.</div> 
    }))
);
const FAQ = lazyWithErrorBoundary(() => import("./pages/FAQ"), "FAQ");
const Blog = lazyWithErrorBoundary(() => import("./pages/Blog"), "Blog");
const Support = lazyWithErrorBoundary(() => import("./pages/Support"), "Support");
const Appointments = lazyWithErrorBoundary(() => import("./pages/Appointments"), "Appointments");
const CalendarAuthCallback = lazyWithErrorBoundary(() => import("./pages/CalendarAuthCallback"), "Calendar Auth");
const Delivery = lazyWithErrorBoundary(() => import("./pages/Delivery"), "Delivery");
const TransactionDetails = lazyWithErrorBoundary(() => import("./pages/TransactionDetails"), "Transaction Details");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Redirect components that preserve URL parameters
const DeliveryPortalRedirect = () => {
  const { token } = useParams();
  return <Navigate to={token ? `/delivery/${token}` : "/delivery"} replace />;
};

const TrackingRedirect = () => {
  const { trackingToken } = useParams();
  return <Navigate to={trackingToken ? `/delivery/${trackingToken}` : "/delivery"} replace />;
};

function AppRoutes() {
  usePageTracking();
  usePerformanceMetrics();
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/home/:id" element={<MobileHomeDetail />} />
        <Route path="/estimate" element={<EstimateForm />} />
        <Route path="/my-estimates" element={
          <ProtectedRoute>
            <MyEstimates />
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute>
            <TransactionHistory />
          </ProtectedRoute>
        } />
        <Route path="/estimates/:transactionId" element={
          <ProtectedRoute>
            <TransactionDetails />
          </ProtectedRoute>
        } />
        <Route path="/invoices/:transactionId" element={
          <ProtectedRoute>
            <TransactionDetails />
          </ProtectedRoute>
        } />
        <Route path="/approve-estimate/:token" element={<ApproveEstimate />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/support" element={<Support />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/calendar-auth-callback" element={<CalendarAuthCallback />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/delivery/:token" element={<Delivery />} />
        <Route path="/delivery/:trackingToken" element={<Delivery />} />
        {/* Redirect old URLs to unified delivery page */}
        <Route path="/track-delivery" element={<Navigate to="/delivery" replace />} />
        <Route path="/delivery-portal/:token" element={<DeliveryPortalRedirect />} />
        <Route path="/delivery-portal" element={<Navigate to="/delivery" replace />} />
        <Route path="/track/:trackingToken" element={<TrackingRedirect />} />
        <Route path="/track" element={<Navigate to="/delivery" replace />} />
        <Route path="/driver-login" element={<Navigate to="/delivery?mode=driver" replace />} />
        <Route path="/driver-portal" element={<Navigate to="/delivery?mode=driver" replace />} />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => {
  return (
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <TooltipProvider>
              <AppRoutes />
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

export default App;