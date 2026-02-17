import { useState } from "react";
import { Search, Plus, Phone, Mail, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAppStore, formatCurrency, getOrderTotal } from "@/store/appStore";

interface CustomerSummary {
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
  const { orders } = useAppStore();
  const [search, setSearch] = useState("");

  // Derive customers from orders
  const customerMap = new Map<string, CustomerSummary>();
  orders.forEach((o) => {
    const key = o.customerCpf || o.customerName;
    const existing = customerMap.get(key);
    const total = o.paymentStatus === "pago" ? getOrderTotal(o) : 0;

    // Check warranty
    let hasActiveWarranty = false;
    if (o.completedDate && o.status === "delivered") {
      const parts = o.completedDate.split("/");
      if (parts.length === 3) {
        const completed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        const expiry = new Date(completed);
        expiry.setDate(expiry.getDate() + o.warrantyDays);
        hasActiveWarranty = expiry.getTime() > Date.now();
      }
    }

    if (existing) {
      existing.totalOrders += 1;
      existing.totalSpent += total;
      if (hasActiveWarranty) existing.activeWarranties += 1;
      // Keep latest date
      existing.lastVisit = o.date;
    } else {
      customerMap.set(key, {
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

  const customers = Array.from(customerMap.values());
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.cpf.includes(search)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 sm:w-80"
          />
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((customer, i) => (
          <motion.div
            key={customer.cpf || customer.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card cursor-pointer rounded-xl p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{customer.name}</h3>
                {customer.cpf && <p className="text-xs text-muted-foreground">CPF: {customer.cpf}</p>}
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {formatCurrency(customer.totalSpent)}
                </div>
                <p className="text-xs text-muted-foreground">total gasto</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="secondary">{customer.totalOrders} OS</Badge>
                {customer.activeWarranties > 0 && (
                  <Badge variant="outline" className="text-success border-success/30">{customer.activeWarranties} garantia(s)</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Última: {customer.lastVisit}</span>
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">Nenhum cliente encontrado.</div>
        )}
      </div>
    </div>
  );
}
