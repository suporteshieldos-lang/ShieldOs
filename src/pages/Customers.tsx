import { useState } from "react";
import { Search, Plus, Phone, Mail, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const customers = [
  { id: 1, name: "Carlos Silva", phone: "(11) 99234-5678", email: "carlos@email.com", devices: 3, orders: 5, lastVisit: "16/02/2026" },
  { id: 2, name: "Maria Santos", phone: "(11) 98765-4321", email: "maria@email.com", devices: 1, orders: 2, lastVisit: "15/02/2026" },
  { id: 3, name: "João Oliveira", phone: "(21) 97654-3210", email: "joao@email.com", devices: 2, orders: 4, lastVisit: "15/02/2026" },
  { id: 4, name: "Ana Costa", phone: "(31) 96543-2109", email: "ana@email.com", devices: 1, orders: 1, lastVisit: "14/02/2026" },
  { id: 5, name: "Pedro Souza", phone: "(41) 95432-1098", email: "pedro@email.com", devices: 4, orders: 7, lastVisit: "14/02/2026" },
  { id: 6, name: "Lucia Mendes", phone: "(51) 94321-0987", email: "lucia@email.com", devices: 2, orders: 3, lastVisit: "13/02/2026" },
];

export default function Customers() {
  const [search, setSearch] = useState("");
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente..."
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
            key={customer.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card cursor-pointer rounded-xl p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{customer.name}</h3>
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
              <div className="flex items-center gap-1 text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm font-medium">{customer.devices}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="secondary">{customer.orders} ordens</Badge>
              <span className="text-xs text-muted-foreground">Última visita: {customer.lastVisit}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
