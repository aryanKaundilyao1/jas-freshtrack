import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Pantry from "@/pages/Pantry";
import Recipes from "@/pages/Recipes";
import Scan from "@/pages/Scan";
import Settings from "@/pages/Settings";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="pantry" element={<Pantry />} />
                  <Route path="recipes" element={<Recipes />} />
                  <Route path="scan" element={<Scan />} />
                  
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
