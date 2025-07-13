import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { usePageTracking } from '@/hooks/usePageTracking';
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
const DriverPortal = React.lazy(() => import("./pages/DriverPortal"));
const DriverLogin = React.lazy(() => import("./pages/DriverLogin"));
const CustomerDeliveryPortal = React.lazy(() => import("./pages/CustomerDeliveryPortal"));
const TrackDelivery = React.lazy(() => import("./pages/TrackDelivery"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  usePageTracking();
  
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
        <Route path="/approve-estimate/:token" element={<ApproveEstimate />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/support" element={<Support />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/calendar-auth-callback" element={<CalendarAuthCallback />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/track-delivery" element={<TrackDelivery />} />
        <Route path="/delivery-portal/:token" element={<CustomerDeliveryPortal />} />
        <Route path="/delivery-portal" element={<CustomerDeliveryPortal />} />
        <Route path="/track/:trackingToken" element={<CustomerDeliveryPortal />} />
        <Route path="/track" element={<CustomerDeliveryPortal />} />
        <Route path="/driver-login" element={<DriverLogin />} />
        <Route path="/driver-portal" element={<DriverPortal />} />
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
  console.log('App component: Starting to render');
  
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