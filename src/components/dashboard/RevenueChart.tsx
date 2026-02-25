import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { getOrderTotal, useAppStore } from "@/store/appStore";

function parseBrDate(value?: string) {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

export default function RevenueChart() {
  const { orders, cashEntries } = useAppStore();

  const data = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, idx) => {
      const dt = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      const label = dt.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      return { key, month: label.charAt(0).toUpperCase() + label.slice(1), receita: 0 };
    });

    const map = new Map(months.map((m) => [m.key, m]));

    orders
      .filter((o) => o.paymentStatus === "pago")
      .forEach((order) => {
        const dt = parseBrDate(order.paymentDate || order.date);
        if (!dt) return;
        const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
        const row = map.get(key);
        if (!row) return;
        row.receita += getOrderTotal(order) / 100;
      });

    cashEntries
      .filter((entry) => entry.status !== "cancelada" && entry.type === "entrada" && entry.source === "venda_peca")
      .forEach((entry) => {
        const dt = parseBrDate(entry.date);
        if (!dt) return;
        const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
        const row = map.get(key);
        if (!row) return;
        row.receita += entry.amount / 100;
      });

    return months.map((m) => ({ month: m.month, receita: Number(m.receita.toFixed(2)) }));
  }, [orders, cashEntries]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-5">
      <h3 className="mb-4 text-base font-semibold text-foreground">Receita Mensal</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215 15% 50%)" }} />
          <YAxis tick={{ fontSize: 12, fill: "hsl(215 15% 50%)" }} tickFormatter={(v) => `R$${v.toLocaleString("pt-BR")}`} />
          <Tooltip
            formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Receita"]}
            contentStyle={{
              backgroundColor: "hsl(0 0% 100%)",
              border: "1px solid hsl(214 20% 90%)",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
          <Bar dataKey="receita" fill="hsl(215 60% 22%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
