import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";

interface WarrantyInfo {
  orderId: string;
  customerName: string;
  customerCpf: string;
  device: string;
  completedDate: string;
  expiryDate: string;
  daysLeft: number;
  status: "ativa" | "vencida" | "vencendo";
}

export default function Warranties() {
  const { orders } = useAppStore();

  const warranties: WarrantyInfo[] = orders
    .filter((o) => o.completedDate && ["completed", "delivered"].includes(o.status))
    .map((o) => {
      const parts = o.completedDate.split("/");
      const completed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      const expiry = new Date(completed);
      expiry.setDate(expiry.getDate() + o.warrantyDays);
      const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const status: "ativa" | "vencida" | "vencendo" = daysLeft < 0 ? "vencida" : daysLeft <= 15 ? "vencendo" : "ativa";
      return {
        orderId: o.id,
        customerName: o.customerName,
        customerCpf: o.customerCpf,
        device: `${o.brand} ${o.model}`,
        completedDate: o.completedDate,
        expiryDate: expiry.toLocaleDateString("pt-BR"),
        daysLeft,
        status,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const active = warranties.filter((w) => w.status === "ativa").length;
  const expiring = warranties.filter((w) => w.status === "vencendo").length;
  const expired = warranties.filter((w) => w.status === "vencida").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Garantias</h2>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-success mb-1" />
          <p className="text-2xl font-bold text-foreground">{active}</p>
          <p className="text-xs text-muted-foreground">Ativas</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-warning mb-1" />
          <p className="text-2xl font-bold text-foreground">{expiring}</p>
          <p className="text-xs text-muted-foreground">Vencendo</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <Shield className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{expired}</p>
          <p className="text-xs text-muted-foreground">Vencidas</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">OS</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Cliente</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Dispositivo</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Concluída</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Vencimento</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {warranties.map((w, i) => (
              <motion.tr key={w.orderId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5 font-medium text-foreground">{w.orderId}</td>
                <td className="px-5 py-3.5 text-foreground">{w.customerName}</td>
                <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{w.device}</td>
                <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{w.completedDate}</td>
                <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{w.expiryDate}</td>
                <td className="px-5 py-3.5">
                  {w.status === "ativa" ? (
                    <Badge variant="secondary" className="text-success">{w.daysLeft}d restantes</Badge>
                  ) : w.status === "vencendo" ? (
                    <Badge variant="outline" className="text-warning border-warning/30">{w.daysLeft}d restantes</Badge>
                  ) : (
                    <Badge variant="destructive">Vencida</Badge>
                  )}
                </td>
              </motion.tr>
            ))}
            {warranties.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Nenhuma garantia registrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
