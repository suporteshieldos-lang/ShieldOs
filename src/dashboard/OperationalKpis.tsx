import { CheckCircle2, Clock3, Gauge, Wrench } from "lucide-react";
import type { ReactNode } from "react";

type OperationalKpisProps = {
  osAbertas: number;
  osEmAndamento: number;
  osFinalizadasPagas: number;
  tempoMedioDias: number;
  slaCumprido: number;
};

type CardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
};

function OperationalCard({ title, value, description, icon }: CardProps) {
  return (
    <article className="premium-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#0F2A44]">{icon}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </article>
  );
}

export function OperationalKpis({
  osAbertas,
  osEmAndamento,
  osFinalizadasPagas,
  tempoMedioDias,
  slaCumprido,
}: OperationalKpisProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Indicadores operacionais">
      <OperationalCard title="OS abertas" value={String(osAbertas)} description="Ordens em aberto na fila operacional." icon={<Wrench className="h-5 w-5" />} />
      <OperationalCard title="OS em andamento" value={String(osEmAndamento)} description="Ordens em diagnóstico, reparo ou aguardando peça." icon={<Clock3 className="h-5 w-5" />} />
      <OperationalCard title="OS finalizadas pagas" value={String(osFinalizadasPagas)} description="Ordens concluídas e com pagamento confirmado." icon={<CheckCircle2 className="h-5 w-5" />} />
      <OperationalCard title="Tempo médio" value={`${tempoMedioDias}d`} description="Média de dias entre abertura e conclusão." icon={<Gauge className="h-5 w-5" />} />
      <OperationalCard title="SLA cumprido" value={`${slaCumprido}%`} description="Ordens finalizadas em até 3 dias." icon={<Gauge className="h-5 w-5" />} />
    </section>
  );
}
