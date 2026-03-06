import { useState } from "react";
import { Search, Plus, DollarSign, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAppStore, formatCurrency, getOrderTotal, DEFAULT_CUSTOMER } from "@/store/appStore";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createId } from "@/lib/id";
import { toast } from "sonner";

interface CustomerSummary {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  activeWarranties: number;
  lastVisit: string;
}

export default function Customers() {
  const navigate = useNavigate();
  const { orders, customers: manualCustomers, addCustomer, updateCustomer, updateOrder, deleteCustomer } = useAppStore();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerSummary | null>(null);

  const normalizeIdentity = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  const customerMap = new Map<string, CustomerSummary>();
  orders.forEach((o) => {
    const key = o.customerCpf || `${o.customerName}|${o.customerPhone}`;
    const existing = customerMap.get(key);
    const total = o.paymentStatus === "pago" ? getOrderTotal(o) : 0;

    let hasActiveWarranty = false;
    if (o.completedDate && o.status === "delivered") {
      const parts = o.completedDate.split("/");
      if (parts.length === 3) {
        const completed = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        const expiry = new Date(completed);
        expiry.setDate(expiry.getDate() + o.warrantyDays);
        hasActiveWarranty = expiry.getTime() > Date.now();
      }
    }

    if (existing) {
      existing.totalOrders += 1;
      existing.totalSpent += total;
      if (hasActiveWarranty) existing.activeWarranties += 1;
      existing.lastVisit = o.date;
    } else {
      customerMap.set(key, {
        id: `derived-${key}`,
        name: o.customerName,
        cpf: o.customerCpf,
        phone: o.customerPhone,
        email: o.customerEmail,
        totalOrders: 1,
        totalSpent: total,
        activeWarranties: hasActiveWarranty ? 1 : 0,
        lastVisit: o.date,
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

  const customers = Array.from(customerMap.values());
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search));
  const genericCustomers = filtered.filter((c) => c.id === "customer-nao-identificado" || c.name.toLowerCase().includes("nao identificado"));
  const regularCustomers = filtered.filter((c) => !genericCustomers.some((g) => g.id === c.id));

  const handleSave = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.phone.trim()) {
      toast.error("Nome e telefone são obrigatórios.");
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
      toast.error("O cliente padrão não pode ser excluído.");
      return;
    }

    if (!window.confirm("Deseja realmente excluir este cliente? As OS vinculadas serão movidas para 'Não Identificado'.")) {
      return;
    }

    const targetName = normalizeIdentity(editing.name);
    const targetPhone = normalizePhone(editing.phone);
    const targetCpf = editing.cpf.trim();

    const linkedOrders = orders.filter((order) => {
      const sameCpf = !!targetCpf && order.customerCpf === targetCpf;
      const sameNamePhone =
        normalizeIdentity(order.customerName) === targetName &&
        normalizePhone(order.customerPhone) === targetPhone;
      return sameCpf || sameNamePhone;
    });

    linkedOrders.forEach((order) => {
      updateOrder(order.id, {
        customerName: DEFAULT_CUSTOMER.name,
        customerPhone: DEFAULT_CUSTOMER.phone,
        customerEmail: DEFAULT_CUSTOMER.email,
        customerCpf: DEFAULT_CUSTOMER.cpf,
      });
    });

    const matchingManualCustomers = manualCustomers.filter((customer) => {
      if (customer.id === DEFAULT_CUSTOMER.id) return false;
      const sameCpf = !!targetCpf && customer.cpf === targetCpf;
      const sameNamePhone =
        normalizeIdentity(customer.name) === targetName &&
        normalizePhone(customer.phone) === targetPhone;
      return sameCpf || sameNamePhone || customer.id === editing.id;
    });

    matchingManualCustomers.forEach((customer) => deleteCustomer(customer.id));

    toast.success("Cliente excluído.");
    setEditing(null);
  };

  return (
    <div className="premium-page">
      <div className="premium-toolbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[420px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <Button className="gap-2" onClick={() => navigate("/clientes/novo")}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {regularCustomers.map((customer, i) => (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="cursor-pointer rounded-2xl border border-[#E2EAF4] bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-md"
            onClick={() => setEditing(customer)}
          >
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">{customer.name}</h3>
              <p className="text-xs text-muted-foreground">Última OS: {customer.totalOrders > 0 ? customer.lastVisit : "Sem OS"}</p>
              <div className="space-y-0.5 text-sm text-muted-foreground">
                {customer.phone ? <p>{customer.phone}</p> : null}
                {customer.email ? <p>{customer.email}</p> : null}
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">Total gasto</p>
                <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatCurrency(customer.totalSpent)}
                </p>
              </div>
              <div className="pt-1">
                <span className="text-xs font-medium text-primary">Ver cliente</span>
              </div>
            </div>
          </motion.div>
        ))}
        {regularCustomers.length === 0 && genericCustomers.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[#D7E3F2] bg-white/60 py-14 text-center text-muted-foreground">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {genericCustomers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Cliente genérico</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {genericCustomers.map((customer) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="cursor-pointer rounded-2xl border border-dashed border-[#D7E3F2] bg-white/60 p-5 transition-colors hover:bg-white"
                onClick={() => setEditing(customer)}
              >
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">{customer.name}</h3>
                  <p className="text-xs text-muted-foreground">Cliente genérico para vendas rápidas.</p>
                  <p className="text-xs font-medium text-primary">Ver cliente</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (!open ? setEditing(null) : null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          {editing && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                  placeholder="Nome"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
                <input
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                  placeholder="CPF"
                  value={editing.cpf}
                  onChange={(e) => setEditing({ ...editing, cpf: e.target.value })}
                />
                <input
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                  placeholder="Telefone"
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
                <input
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                  placeholder="E-mail"
                  value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                />
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{editing.totalOrders} OS</Badge>
                  <span className="text-xs text-muted-foreground">Total gasto: {formatCurrency(editing.totalSpent)}</span>
                </div>
                {editing.id !== "customer-nao-identificado" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleDeleteCustomer}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                ) : null}
              </div>
            </>
          )}
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

