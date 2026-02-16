import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import RepairOrders from "@/pages/RepairOrders";
import NewRepairOrder from "@/pages/NewRepairOrder";
import Inventory from "@/pages/Inventory";
import SettingsPage from "@/pages/SettingsPage";
import Placeholder from "@/pages/Placeholder";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clientes" element={<Customers />} />
            <Route path="/ordens" element={<RepairOrders />} />
            <Route path="/ordens/nova" element={<NewRepairOrder />} />
            <Route path="/estoque" element={<Inventory />} />
            <Route path="/checklists" element={<Placeholder />} />
            <Route path="/garantias" element={<Placeholder />} />
            <Route path="/relatorios" element={<Placeholder />} />
            <Route path="/comunicacao" element={<Placeholder />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
