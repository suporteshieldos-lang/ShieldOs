import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const data = [
  { month: "Set", receita: 8200 },
  { month: "Out", receita: 9800 },
  { month: "Nov", receita: 11500 },
  { month: "Dez", receita: 14200 },
  { month: "Jan", receita: 12800 },
  { month: "Fev", receita: 10400 },
];

export default function RevenueChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-card rounded-xl p-5"
    >
      <h3 className="mb-4 text-base font-semibold text-foreground">Receita Mensal</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215 15% 50%)" }} />
          <YAxis tick={{ fontSize: 12, fill: "hsl(215 15% 50%)" }} tickFormatter={(v) => `R$${v / 1000}k`} />
          <Tooltip
            formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
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
