import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import MyEstimates from "./pages/MyEstimates";
import EstimateForm from "./pages/EstimateForm";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import ApproveEstimate from "./pages/ApproveEstimate";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClient client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/estimate" element={<EstimateForm />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/my-estimates" element={
              <ProtectedRoute>
                <MyEstimates />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/approve" element={<ApproveEstimate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClient>
  );
}

export default App;
