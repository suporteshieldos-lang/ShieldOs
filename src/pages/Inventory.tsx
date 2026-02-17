import { Search, Plus, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAppStore, formatCurrency } from "@/store/appStore";

export default function Inventory() {
  const { inventory } = useAppStore();
  const [search, setSearch] = useState("");
  const filtered = inventory.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  const totalValue = inventory.reduce((sum, i) => sum + i.qty * i.costPrice, 0);
  const lowCount = inventory.filter((i) => i.qty <= i.minQty).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar peça ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 sm:w-80" />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Valor imobilizado: <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span>
            {lowCount > 0 && <span className="ml-3 text-warning">• {lowCount} itens baixos</span>}
          </div>
          <Button className="gap-2"><Plus className="h-4 w-4" />Nova Peça</Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">Peça</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">SKU</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden lg:table-cell">Categoria</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Qtd</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Custo Unit.</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden lg:table-cell">Fornecedor</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((part, i) => {
              const isLow = part.qty <= part.minQty;
              const isOut = part.qty === 0;
              return (
                <motion.tr key={part.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5 font-medium text-foreground">{part.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{part.sku}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{part.category}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-semibold ${isOut ? "text-destructive" : isLow ? "text-warning" : "text-foreground"}`}>{part.qty}</span>
                    <span className="text-muted-foreground">/{part.minQty}</span>
                  </td>
                  <td className="px-5 py-3.5 text-foreground hidden sm:table-cell">{formatCurrency(part.costPrice)}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{part.supplier}</td>
                  <td className="px-5 py-3.5">
                    {isOut ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-destructive"><AlertTriangle className="h-3.5 w-3.5" />Sem estoque</span>
                    ) : isLow ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-warning"><AlertTriangle className="h-3.5 w-3.5" />Baixo</span>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
