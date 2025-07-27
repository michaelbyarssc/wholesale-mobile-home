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

// Lazy load components for better performance
const Index = React.lazy(() => import("./pages/Index"));
const Auth = React.lazy(() => import("./pages/Auth"));
const Admin = React.lazy(() => import("./pages/Admin"));
const EstimateForm = React.lazy(() => import("./pages/EstimateForm"));
const MyEstimates = React.lazy(() => import("./pages/MyEstimates"));
const ApproveEstimate = React.lazy(() => import("./pages/ApproveEstimate"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const TransactionHistory = React.lazy(() => import("./pages/TransactionHistory"));
const MobileHomeDetail = React.lazy(() => 
  import("./pages/MobileHomeDetail").then(module => ({ 
    default: module.MobileHomeDetail 
  }))
);
const FAQ = React.lazy(() => import("./pages/FAQ"));
const Blog = React.lazy(() => import("./pages/Blog"));
const Support = React.lazy(() => import("./pages/Support"));
const Appointments = React.lazy(() => import("./pages/Appointments"));
const CalendarAuthCallback = React.lazy(() => import("./pages/CalendarAuthCallback"));
const Delivery = React.lazy(() => import("./pages/Delivery"));
const TransactionDetails = React.lazy(() => import("./pages/TransactionDetails"));

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