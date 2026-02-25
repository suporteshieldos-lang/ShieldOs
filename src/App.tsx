import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/auth/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import NewCustomer from "@/pages/NewCustomer";
import RepairOrders from "@/pages/RepairOrders";
import Budgets from "@/pages/Budgets";
import NewRepairOrder from "@/pages/NewRepairOrder";
import Inventory from "@/pages/Inventory";
import NewInventoryItem from "@/pages/NewInventoryItem";
import Financial from "@/pages/Financial";
import CashPage from "@/pages/CashPage";
import Warranties from "@/pages/Warranties";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/SettingsPage";
import Communication from "@/pages/Communication";
import Login from "@/pages/Login";
import RecoverAccess from "@/pages/RecoverAccess";
import MasterPanel from "@/pages/MasterPanel";
import SubscriptionInactive from "@/pages/SubscriptionInactive";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-acesso" element={<RecoverAccess />} />
          <Route path="/assinatura-inativa" element={<SubscriptionInactive />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<Customers />} />
            <Route path="/clientes/novo" element={<NewCustomer />} />
            <Route path="/orcamentos" element={<Budgets />} />
            <Route path="/ordens" element={<RepairOrders />} />
            <Route path="/ordens/nova" element={<NewRepairOrder />} />
            <Route path="/estoque" element={<Inventory />} />
            <Route path="/estoque/nova" element={<NewInventoryItem />} />
            <Route path="/financeiro" element={<Financial />} />
            <Route path="/caixa" element={<CashPage />} />
            <Route path="/garantias" element={<Warranties />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/comunicacao" element={<Communication />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/master" element={<MasterPanel />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
