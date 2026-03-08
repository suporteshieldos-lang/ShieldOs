import { useEffect, useMemo, useState } from "react";
import { BarChart3, Users, Wrench } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createId } from "@/lib/id";
import { DEFAULT_CUSTOMER, formatCurrency, getOrderTotal, useAppStore } from "@/store/appStore";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/features/customers/components/PageHeader";
import { MetricCard } from "@/features/customers/components/MetricCard";
import { ClientsTable, type ClientRow } from "@/features/customers/components/ClientsTable";
import { Pagination } from "@/features/customers/components/Pagination";

type CustomerSummary = {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  activeWarranties: number;
  lastVisit: string;
};

type ViewMode = "list" | "cards";
type QuickFilter = "all" | "withOrders" | "withoutOrders";

function parseBrDate(value?: string) {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function getClientStatus(customer: CustomerSummary): "active" | "inactive" {
  if (customer.totalOrders === 0) return "inactive";
  const lastVisit = parseBrDate(customer.lastVisit);
  if (!lastVisit) return "inactive";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 90 ? "active" : "inactive";
}

const PAGE_SIZE = 10;

export default function Customers() {
  const navigate = useNavigate();
  const { hydrated, orders, customers: manualCustomers, addCustomer, updateCustomer, updateOrder, deleteCustomer } = useAppStore();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [editing, setEditing] = useState<CustomerSummary | null>(null);
  const [page, setPage] = useState(1);

  const normalizeIdentity = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  const customerSummaries = useMemo(() => {
    const customerMap = new Map<string, CustomerSummary>();

    orders.forEach((order) => {
      const key = order.customerCpf || `${order.customerName}|${order.customerPhone}`;
      const existing = customerMap.get(key);
      const total = order.paymentStatus === "pago" ? getOrderTotal(order) : 0;

      let hasActiveWarranty = false;
      if (order.completedDate && order.status === "delivered") {
        const parts = order.completedDate.split("/");
        if (parts.length === 3) {
          const completed = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          const expiry = new Date(completed);
          expiry.setDate(expiry.getDate() + order.warrantyDays);
          hasActiveWarranty = expiry.getTime() > Date.now();
        }
      }

      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += total;
        if (hasActiveWarranty) existing.activeWarranties += 1;
        existing.lastVisit = order.date;
      } else {
        customerMap.set(key, {
          id: `derived-${key}`,
          name: order.customerName,
          cpf: order.customerCpf,
          phone: order.customerPhone,
          email: order.customerEmail,
          totalOrders: 1,
          totalSpent: total,
          activeWarranties: hasActiveWarranty ? 1 : 0,
          lastVisit: order.date,
        });
      }
    });

    manualCustomers.forEach((customer) => {
      const key = customer.cpf || `${customer.name}|${customer.phone}`;
      const existing = customerMap.get(key);
      if (existing) {
        if (!existing.phone && customer.phone) existing.phone = customer.phone;
        if (!existing.email && customer.email) existing.email = customer.email;
        if (!existing.cpf && customer.cpf) existing.cpf = customer.cpf;
        existing.id = customer.id;
        return;
      }

      customerMap.set(key, {
        id: customer.id,
        name: customer.name,
        cpf: customer.cpf,
        phone: customer.phone,
        email: customer.email,
        totalOrders: 0,
        totalSpent: 0,
        activeWarranties: 0,
        lastVisit: customer.createdAt,
      });
    });

    return Array.from(customerMap.values());
  }, [orders, manualCustomers]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    const digitsSearch = search.replace(/\D/g, "");

    return customerSummaries.filter((customer) => {
      if (quickFilter === "withOrders" && customer.totalOrders === 0) return false;
      if (quickFilter === "withoutOrders" && customer.totalOrders > 0) return false;

      if (!normalizedSearch) return true;
      const byName = customer.name.toLowerCase().includes(normalizedSearch);
      const byCpf = customer.cpf.includes(digitsSearch || normalizedSearch);
      const byPhone = customer.phone.replace(/\D/g, "").includes(digitsSearch);
      return byName || byCpf || byPhone;
    });
  }, [customerSummaries, quickFilter, search]);

  useEffect(() => setPage(1), [search, quickFilter]);

  const rows: ClientRow[] = useMemo(
    () =>
      filteredCustomers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        cpf: customer.cpf,
        lastVisit: customer.lastVisit,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        status: getClientStatus(customer),
      })),
    [filteredCustomers]
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const stats = useMemo(() => {
    const totalCustomers = customerSummaries.length;
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const withOrdersThisMonth = customerSummaries.filter((customer) =>
      orders.some((order) => {
        const sameCustomer =
          (!!customer.cpf && order.customerCpf === customer.cpf) ||
          (order.customerName === customer.name && order.customerPhone === customer.phone);
        if (!sameCustomer) return false;
        const date = parseBrDate(order.date);
        return !!date && date.getMonth() === month && date.getFullYear() === year;
      })
    ).length;

    const totalRevenue = customerSummaries.reduce((sum, customer) => sum + customer.totalSpent, 0);
    const payingCustomers = customerSummaries.filter((customer) => customer.totalSpent > 0).length;
    const avgTicket = payingCustomers > 0 ? totalRevenue / payingCustomers : 0;

    return { totalCustomers, withOrdersThisMonth, totalRevenue, avgTicket };
  }, [customerSummaries, orders]);

  const handleSave = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.phone.trim()) {
      toast.error("Nome e telefone sao obrigatorios.");
      return;
    }

    const persistedId = editing.id.startsWith("derived-") ? createId() : editing.id;
    const payload = {
      id: persistedId,
      name: editing.name.trim(),
      cpf: editing.cpf.trim(),
      phone: editing.phone.trim(),
      email: editing.email.trim(),
      createdAt: editing.lastVisit || new Date().toLocaleDateString("pt-BR"),
    };

    if (editing.id.startsWith("derived-")) addCustomer(payload);
    else updateCustomer(persistedId, payload);

    orders
      .filter((order) => order.customerCpf === editing.cpf || (order.customerName === editing.name && order.customerPhone === editing.phone))
      .forEach((order) =>
        updateOrder(order.id, {
          customerName: payload.name,
          customerPhone: payload.phone,
          customerEmail: payload.email,
          customerCpf: payload.cpf,
        })
      );

    toast.success("Cliente atualizado.");
    setEditing(null);
  };

  const handleDeleteCustomer = () => {
    if (!editing) return;
    if (editing.id === DEFAULT_CUSTOMER.id) {
      toast.error("O cliente padrao nao pode ser excluido.");
      return;
    }

    if (!window.confirm("Deseja realmente excluir este cliente? As OS vinculadas serao movidas para 'Nao Identificado'.")) return;

    const targetName = normalizeIdentity(editing.name);
    const targetPhone = normalizePhone(editing.phone);
    const targetCpf = editing.cpf.trim();

    orders
      .filter((order) => {
        const sameCpf = !!targetCpf && order.customerCpf === targetCpf;
        const sameNamePhone = normalizeIdentity(order.customerName) === targetName && normalizePhone(order.customerPhone) === targetPhone;
        return sameCpf || sameNamePhone;
      })
      .forEach((order) =>
        updateOrder(order.id, {
          customerName: DEFAULT_CUSTOMER.name,
          customerPhone: DEFAULT_CUSTOMER.phone,
          customerEmail: DEFAULT_CUSTOMER.email,
          customerCpf: DEFAULT_CUSTOMER.cpf,
        })
      );

    manualCustomers
      .filter((customer) => {
        if (customer.id === DEFAULT_CUSTOMER.id) return false;
        const sameCpf = !!targetCpf && customer.cpf === targetCpf;
        const sameNamePhone = normalizeIdentity(customer.name) === targetName && normalizePhone(customer.phone) === targetPhone;
        return sameCpf || sameNamePhone || customer.id === editing.id;
      })
      .forEach((customer) => deleteCustomer(customer.id));

    toast.success("Cliente excluido.");
    setEditing(null);
  };

  return (
    <div className="w-full">
      <PageHeader search={search} onSearchChange={setSearch} onCreateCustomer={() => navigate("/clientes/novo")} />

      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        <MetricCard icon={<Users className="h-5 w-5" />} label="Total de clientes" value={stats.totalCustomers} />
        <MetricCard icon={<Wrench className="h-5 w-5" />} label="OS este mes" value={stats.withOrdersThisMonth} />
        <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Faturamento" value={formatCurrency(stats.totalRevenue)} />
        <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="Ticket medio" value={formatCurrency(stats.avgTicket)} />
      </section>

      <section className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex flex-wrap gap-2">
            {[
              { id: "all", label: "Todos" },
              { id: "withOrders", label: "Com OS" },
              { id: "withoutOrders", label: "Sem OS" },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-sm transition-all duration-150 ${
                  quickFilter === filter.id ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]"
                }`}
                onClick={() => setQuickFilter(filter.id as QuickFilter)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="hidden rounded-lg border border-[#E5E7EB] bg-white p-1 md:inline-flex">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm transition-all duration-150 ${
                viewMode === "list" ? "bg-[#2563EB] text-white" : "text-[#111827] hover:bg-[#F9FAFB]"
              }`}
              onClick={() => setViewMode("list")}
            >
              Lista
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm transition-all duration-150 ${
                viewMode === "cards" ? "bg-[#2563EB] text-white" : "text-[#111827] hover:bg-[#F9FAFB]"
              }`}
              onClick={() => setViewMode("cards")}
            >
              Cards
            </button>
          </div>
      </section>

      <ClientsTable
        rows={paginatedRows}
        loading={!hydrated}
        view={viewMode}
        formatCurrency={formatCurrency}
        onView={(customer) => {
          const found = customerSummaries.find((item) => item.id === customer.id);
          if (found) setEditing(found);
        }}
        onEdit={(customer) => {
          const found = customerSummaries.find((item) => item.id === customer.id);
          if (found) setEditing(found);
        }}
        onNewOrder={() => navigate("/ordens/nova")}
        onHistory={() => navigate("/ordens")}
        onCreateFirst={() => navigate("/clientes/novo")}
      />

      <div className="mt-6">
        <Pagination page={safePage} totalPages={totalPages} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage} />
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (!open ? setEditing(null) : null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editing ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input className="h-10 rounded-lg border border-input bg-card px-3 text-sm" placeholder="Nome" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <input className="h-10 rounded-lg border border-input bg-card px-3 text-sm" placeholder="CPF" value={editing.cpf} onChange={(e) => setEditing({ ...editing, cpf: e.target.value })} />
                <input className="h-10 rounded-lg border border-input bg-card px-3 text-sm" placeholder="Telefone" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                <input className="h-10 rounded-lg border border-input bg-card px-3 text-sm" placeholder="E-mail" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="text-xs text-muted-foreground">{editing.totalOrders} OS • Total gasto: {formatCurrency(editing.totalSpent)}</div>
                {editing.id !== "customer-nao-identificado" ? (
                  <Button type="button" variant="ghost" size="sm" className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleDeleteCustomer}>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
