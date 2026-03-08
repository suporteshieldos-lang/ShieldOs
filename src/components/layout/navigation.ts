import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  DollarSign,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

export type NavItem = {
  path: string;
  icon: LucideIcon;
  label: string;
};

export const navItems: NavItem[] = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/orcamentos", icon: FileText, label: "Orçamentos" },
  { path: "/ordens", icon: Wrench, label: "Ordens de Serviço" },
  { path: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { path: "/caixa", icon: Wallet, label: "Caixa" },
  { path: "/estoque", icon: Package, label: "Estoque" },
  { path: "/garantias", icon: Shield, label: "Garantias" },
  { path: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { path: "/comunicacao", icon: MessageSquare, label: "Comunicação" },
  { path: "/configuracoes", icon: Settings, label: "Configurações" },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/clientes": "Clientes",
  "/clientes/novo": "Novo Cliente",
  "/orcamentos": "Orçamentos",
  "/ordens": "Ordens de Serviço",
  "/ordens/nova": "Nova Ordem de Serviço",
  "/estoque": "Estoque e Peças",
  "/estoque/nova": "Nova Peça",
  "/financeiro": "Financeiro",
  "/caixa": "Caixa",
  "/garantias": "Garantias",
  "/relatorios": "Relatórios",
  "/comunicacao": "Comunicação",
  "/configuracoes": "Configurações",
  "/master": "Painel Master",
};

const titlePrefixes = [
  { prefix: "/clientes/", title: "Clientes" },
  { prefix: "/orcamentos/", title: "Orçamentos" },
  { prefix: "/ordens/", title: "Ordens de Serviço" },
  { prefix: "/estoque/", title: "Estoque e Peças" },
  { prefix: "/financeiro/", title: "Financeiro" },
  { prefix: "/caixa/", title: "Caixa" },
  { prefix: "/garantias/", title: "Garantias" },
  { prefix: "/relatorios/", title: "Relatórios" },
  { prefix: "/comunicacao/", title: "Comunicação" },
  { prefix: "/configuracoes/", title: "Configurações" },
  { prefix: "/master/", title: "Painel Master" },
] as const;

export function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/dashboard")) return "Dashboard";

  const prefixed = titlePrefixes.find((item) => pathname.startsWith(item.prefix));
  return prefixed?.title || "ShieldOS";
}

export function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/") return pathname === "/" || pathname.startsWith("/dashboard");
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
