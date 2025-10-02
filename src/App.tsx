import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Operators from "./pages/Dashboard/Operators";
import Events from "./pages/Dashboard/Events";
import EventForm from "./pages/Dashboard/EventForm";
import EventPublic from "./pages/EventPublic";
import Checkin from "./pages/Checkin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/operators"
              element={
                <ProtectedRoute>
                  <Operators />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/events"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/events/:eventId"
              element={
                <ProtectedRoute>
                  <EventForm />
                </ProtectedRoute>
              }
            />
            <Route path="/e/:eventId" element={<EventPublic />} />
            <Route
              path="/checkin"
              element={
                <ProtectedRoute requiredRole="checkin_operator">
                  <Checkin />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
