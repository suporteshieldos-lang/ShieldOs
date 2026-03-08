import { Link } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import type { ReactNode } from "react";

const quickActions = [
  { title: "Nova OS", description: "Cadastrar ordem de serviço", to: "/ordens/nova" },
  { title: "Novo cliente", description: "Adicionar novo cadastro", to: "/clientes/novo" },
  { title: "Novo item", description: "Adicionar peça ao estoque", to: "/estoque/nova" },
  { title: "Relatórios", description: "Analisar indicadores", to: "/relatorios" },
] as const;

export function QuickActions({ action }: { action?: ReactNode }) {
  return (
    <section aria-labelledby="quick-actions-title">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="quick-actions-title" className="text-base font-semibold text-slate-900">
            Ações rápidas
          </h2>
          <p className="text-sm text-slate-500">Atalhos para as principais rotinas do dia.</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group min-h-[132px] rounded-2xl border border-slate-200 bg-slate-50 p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#0F2A44] shadow-sm">
                <Plus className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="text-sm font-semibold text-slate-900">{action.title}</p>
            <p className="mt-1 text-xs text-slate-500">{action.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
