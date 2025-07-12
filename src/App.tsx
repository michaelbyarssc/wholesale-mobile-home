
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { usePageTracking } from '@/hooks/usePageTracking';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import EstimateForm from "./pages/EstimateForm";
import MyEstimates from "./pages/MyEstimates";
import ApproveEstimate from "./pages/ApproveEstimate";
import NotFound from "./pages/NotFound";
import { MobileHomeDetail } from "./pages/MobileHomeDetail";
import FAQ from "./pages/FAQ";
import Blog from "./pages/Blog";
import Support from "./pages/Support";
import Appointments from "./pages/Appointments";
import CalendarAuthCallback from "./pages/CalendarAuthCallback";
import Delivery from "./pages/Delivery";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

function AppContent() {
  usePageTracking();
  
  return (
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
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <Admin />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
