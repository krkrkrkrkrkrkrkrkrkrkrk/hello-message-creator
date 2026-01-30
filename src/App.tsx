import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { AccentColorProvider } from "@/hooks/use-accent-color";
import { AnimatePresence } from "framer-motion";
import LoadingScreen from "@/components/LoadingScreen";
import AIChatWidget from "@/components/AIChatWidget";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import ScriptView from "./pages/ScriptView";
import PaymentSuccess from "./pages/PaymentSuccess";
import Settings from "./pages/Settings";
import AccountSettings from "./pages/AccountSettings";
import ProductSettings from "./pages/ProductSettings";
import BoosterSettings from "./pages/BoosterSettings";
import ShortURLSettings from "./pages/ShortURLSettings";
import ServiceLog from "./pages/ServiceLog";
import Developer from "./pages/Developer";
import Keys from "./pages/Keys";
import Statistics from "./pages/Statistics";
import Support from "./pages/Support";
import Documentation from "./pages/Documentation";
import Pricing from "./pages/Pricing";
import Redirect from "./pages/Redirect";
import Obfuscator from "./pages/Obfuscator";
import GetKey from "./pages/GetKey";
import NotFound from "./pages/NotFound";
import ScriptsManager from "./pages/ScriptsManager";
import MarketplacePublic from "./pages/MarketplacePublic";
import ScriptHub from "./pages/ScriptHub";
import MyPurchasesPublic from "./pages/MyPurchasesPublic";
import CodeEditor from "./pages/CodeEditor";
import VanguardCenter from "./pages/VanguardCenter";

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccentColorProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AnimatePresence mode="wait">
              {isLoading && <LoadingScreen key="loading" />}
            </AnimatePresence>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/account" element={<AccountSettings />} />
                <Route path="/settings/products" element={<ProductSettings />} />
                <Route path="/settings/boosters" element={<BoosterSettings />} />
                <Route path="/settings/urls" element={<ShortURLSettings />} />
                <Route path="/settings/developer" element={<Developer />} />
                <Route path="/service-log" element={<ServiceLog />} />
                <Route path="/keys" element={<Keys />} />
                <Route path="/keys/:scriptId" element={<Keys />} />
                <Route path="/scripts" element={<ScriptsManager />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/support" element={<Support />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/redirect" element={<Redirect />} />
                <Route path="/obfuscator" element={<Obfuscator />} />
                <Route path="/get_key" element={<GetKey />} />
                <Route path="/marketplace" element={<MarketplacePublic />} />
                <Route path="/scripthub" element={<ScriptHub />} />
                <Route path="/my-purchases" element={<MyPurchasesPublic />} />
                
                <Route path="/code-editor" element={<CodeEditor />} />
                <Route path="/vanguard" element={<VanguardCenter />} />
                
                <Route path="/script/:shareCode" element={<ScriptView />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AIChatWidget />
            </BrowserRouter>
          </TooltipProvider>
        </AccentColorProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
