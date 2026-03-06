import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/auth/ProtectedRoute";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Customers = lazy(() => import("@/pages/Customers"));
const NewCustomer = lazy(() => import("@/pages/NewCustomer"));
const RepairOrders = lazy(() => import("@/pages/RepairOrders"));
const Budgets = lazy(() => import("@/pages/Budgets"));
const NewRepairOrder = lazy(() => import("@/pages/NewRepairOrder"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const NewInventoryItem = lazy(() => import("@/pages/NewInventoryItem"));
const Financial = lazy(() => import("@/pages/Financial"));
const CashPage = lazy(() => import("@/pages/CashPage"));
const Warranties = lazy(() => import("@/pages/Warranties"));
const Reports = lazy(() => import("@/pages/Reports"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const Communication = lazy(() => import("@/pages/Communication"));
const Login = lazy(() => import("@/pages/Login"));
const RecoverAccess = lazy(() => import("@/pages/RecoverAccess"));
const MasterPanel = lazy(() => import("@/pages/MasterPanel"));
const SubscriptionInactive = lazy(() => import("@/pages/SubscriptionInactive"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando...</div>}>
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
