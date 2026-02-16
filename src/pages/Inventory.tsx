import { Search, Plus, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

const parts = [
  { id: 1, name: "Tela iPhone 15 Pro", sku: "SCR-IP15P", qty: 3, min: 5, price: "R$ 280,00", supplier: "TechParts BR" },
  { id: 2, name: "Bateria Samsung S24", sku: "BAT-SS24", qty: 12, min: 5, price: "R$ 85,00", supplier: "CellBat" },
  { id: 3, name: "Conector USB-C iPad", sku: "CON-USBC", qty: 2, min: 3, price: "R$ 45,00", supplier: "TechParts BR" },
  { id: 4, name: "Tela MacBook Air M3", sku: "SCR-MBA3", qty: 1, min: 2, price: "R$ 1.200,00", supplier: "AppleFix" },
  { id: 5, name: "Câmera Xiaomi 14", sku: "CAM-XI14", qty: 0, min: 2, price: "R$ 120,00", supplier: "ChinaParts" },
  { id: 6, name: "Pasta Térmica Arctic", sku: "TH-ARC01", qty: 18, min: 5, price: "R$ 35,00", supplier: "TechParts BR" },
  { id: 7, name: "SSD NVMe 512GB", sku: "SSD-512N", qty: 4, min: 3, price: "R$ 220,00", supplier: "MemoryKing" },
  { id: 8, name: "Tela Samsung S24", sku: "SCR-SS24", qty: 1, min: 3, price: "R$ 350,00", supplier: "CellBat" },
];

export default function Inventory() {
  const [search, setSearch] = useState("");
  const filtered = parts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Buscar peça ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 sm:w-80" />
        </div>
        <Button className="gap-2"><Plus className="h-4 w-4" />Nova Peça</Button>
      </div>

      <div className="glass-card overflow-hidden rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">Peça</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">SKU</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Qtd</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Preço</th>
              <th className="px-5 py-3 font-medium text-muted-foreground hidden lg:table-cell">Fornecedor</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((part, i) => {
              const isLow = part.qty <= part.min;
              const isOut = part.qty === 0;
              return (
                <motion.tr
                  key={part.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5 font-medium text-foreground">{part.name}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{part.sku}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-semibold ${isOut ? "text-destructive" : isLow ? "text-warning" : "text-foreground"}`}>{part.qty}</span>
                    <span className="text-muted-foreground">/{part.min}</span>
                  </td>
                  <td className="px-5 py-3.5 text-foreground hidden sm:table-cell">{part.price}</td>
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
