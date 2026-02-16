import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";

const statusConfig: Record<string, { label: string; color: string }> = {
  received: { label: "Recebido", color: "bg-secondary text-secondary-foreground" },
  diagnosing: { label: "Diagnosticando", color: "bg-info/10 text-info" },
  repairing: { label: "Em Reparo", color: "bg-accent/10 text-accent" },
  waiting_parts: { label: "Aguardando Peça", color: "bg-warning/10 text-warning" },
  completed: { label: "Concluído", color: "bg-success/10 text-success" },
  delivered: { label: "Entregue", color: "bg-muted text-muted-foreground" },
};

const statusFilters = ["all", "received", "diagnosing", "repairing", "waiting_parts", "completed", "delivered"];

export default function RepairOrders() {
  const navigate = useNavigate();
  const { orders } = useAppStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = orders.filter((o) => {
    const matchSearch = o.customerName.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase()) || o.model.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por OS, cliente ou dispositivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 sm:w-96"
          />
        </div>
        <Button className="gap-2" onClick={() => navigate("/ordens/nova")}>
          <Plus className="h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "all" ? "Todas" : statusConfig[s]?.label || s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((order, i) => {
          const status = statusConfig[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" };
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card cursor-pointer rounded-xl p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{order.id}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {order.customerName} • {order.model} ({order.brand})
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{order.reportedProblem}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-medium text-foreground">{order.cost || "-"}</p>
                    <p className="text-xs text-muted-foreground">Téc: {order.technician || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Criado: {order.date}</p>
                    <p className="text-xs text-muted-foreground">Entrega: {order.estimatedDelivery || "-"}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">Nenhuma ordem encontrada.</div>
        )}
      </div>
    </div>
  );
}
