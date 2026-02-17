import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAppStore, formatCurrency, getOrderTotal } from "@/store/appStore";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received: { label: "Recebido", variant: "secondary" },
  diagnosing: { label: "Diagnosticando", variant: "outline" },
  repairing: { label: "Em Reparo", variant: "default" },
  waiting_parts: { label: "Aguardando Peça", variant: "destructive" },
  completed: { label: "Concluído", variant: "secondary" },
  delivered: { label: "Entregue", variant: "outline" },
};

export default function RecentOrders() {
  const { orders } = useAppStore();
  const recentOrders = orders.slice(0, 5);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl">
      <div className="border-b border-border p-5">
        <h3 className="text-base font-semibold text-foreground">Ordens Recentes</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">OS</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Dispositivo</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden lg:table-cell">Valor</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => {
              const status = statusMap[order.status] || { label: order.status, variant: "outline" as const };
              const total = getOrderTotal(order);
              return (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5 font-medium text-foreground">{order.id}</td>
                  <td className="px-5 py-3.5 text-foreground">{order.customerName}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{order.brand} {order.model}</td>
                  <td className="px-5 py-3.5 text-foreground hidden lg:table-cell">{total > 0 ? formatCurrency(total) : "-"}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{order.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
