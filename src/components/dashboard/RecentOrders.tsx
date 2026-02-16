import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  received: { label: "Recebido", variant: "secondary" },
  diagnosing: { label: "Diagnosticando", variant: "outline" },
  repairing: { label: "Em Reparo", variant: "default" },
  waiting_parts: { label: "Aguardando Peça", variant: "destructive" },
  completed: { label: "Concluído", variant: "secondary" },
  delivered: { label: "Entregue", variant: "outline" },
};

const orders = [
  { id: "OS-2401", customer: "Carlos Silva", device: "iPhone 15 Pro", problem: "Tela quebrada", status: "repairing", date: "16/02/2026" },
  { id: "OS-2402", customer: "Maria Santos", device: "MacBook Air M3", problem: "Não liga", status: "diagnosing", date: "15/02/2026" },
  { id: "OS-2403", customer: "João Oliveira", device: "Samsung S24", problem: "Bateria inchada", status: "waiting_parts", date: "15/02/2026" },
  { id: "OS-2404", customer: "Ana Costa", device: "iPad Pro 12.9", problem: "Conector danificado", status: "completed", date: "14/02/2026" },
  { id: "OS-2405", customer: "Pedro Souza", device: "Xiaomi 14", problem: "Câmera com defeito", status: "received", date: "14/02/2026" },
];

export default function RecentOrders() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-xl"
    >
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
              <th className="px-5 py-3 font-medium text-muted-foreground hidden lg:table-cell">Problema</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = statusMap[order.status];
              return (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5 font-medium text-foreground">{order.id}</td>
                  <td className="px-5 py-3.5 text-foreground">{order.customer}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{order.device}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{order.problem}</td>
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
