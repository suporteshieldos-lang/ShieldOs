export type DashboardKpi = {
  id: string;
  title: string;
  value: string;
  description: string;
  change: string;
  trend: "up" | "down";
};

export type TrendPoint = {
  month: string;
  ordens: number;
  receita: number;
};

export type StatusPoint = {
  status: string;
  quantidade: number;
};

export type ComparePoint = {
  label: string;
  valor: number;
};

export const kpiData: DashboardKpi[] = [
  {
    id: "os_abertas",
    title: "OS abertas",
    value: "128",
    description: "Ordens em andamento",
    change: "+8,6%",
    trend: "up",
  },
  {
    id: "os_concluidas",
    title: "OS concluídas",
    value: "94",
    description: "Fechadas no período",
    change: "+5,2%",
    trend: "up",
  },
  {
    id: "fat_mes",
    title: "Faturamento mês",
    value: "R$ 86.420",
    description: "Receita consolidada",
    change: "+12,4%",
    trend: "up",
  },
];

export const secondaryStats = [
  { title: "Satisfação do cliente", value: "96%", helper: "NPS e avaliações" },
  { title: "Tempo médio atendimento", value: "2,8 dias", helper: "Do recebimento à entrega" },
  { title: "SLA cumprido", value: "92%", helper: "Prazo acordado com cliente" },
];

export const ordersTrendData: TrendPoint[] = [
  { month: "Jan", ordens: 78, receita: 56200 },
  { month: "Fev", ordens: 84, receita: 61000 },
  { month: "Mar", ordens: 91, receita: 64700 },
  { month: "Abr", ordens: 88, receita: 62500 },
  { month: "Mai", ordens: 96, receita: 68900 },
  { month: "Jun", ordens: 104, receita: 74100 },
  { month: "Jul", ordens: 112, receita: 80400 },
  { month: "Ago", ordens: 119, receita: 86420 },
];

export const ordersByStatusData: StatusPoint[] = [
  { status: "Recebidas", quantidade: 32 },
  { status: "Em reparo", quantidade: 51 },
  { status: "Aguard. peça", quantidade: 24 },
  { status: "Prontas", quantidade: 17 },
];

export const compareData: ComparePoint[] = [
  { label: "Hoje", valor: 12400 },
  { label: "Ontem", valor: 9800 },
  { label: "Semana", valor: 76800 },
];

export const recentActivities = [
  { id: "a1", title: "OS #1084 finalizada", subtitle: "Cliente: Ana Paula • iPhone 12" },
  { id: "a2", title: "OS #1087 criada", subtitle: "Cliente: Roberto Silva • Galaxy A54" },
  { id: "a3", title: "Peça recebida", subtitle: "Bateria iPhone 11 • fornecedor principal" },
  { id: "a4", title: "OS #1079 entregue", subtitle: "Cliente: Marcio Lima • Notebook Dell" },
  { id: "a5", title: "Pagamento confirmado", subtitle: "OS #1081 • Pix • R$ 590,00" },
];
