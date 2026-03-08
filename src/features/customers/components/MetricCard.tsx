import type { ReactNode } from "react";

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string | number;
};

export function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_4px_10px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]">{icon}</div>
      <strong className="block text-[30px] font-semibold leading-none text-[#111827]">{value}</strong>
      <p className="mt-2 text-sm text-[#6B7280]">{label}</p>
    </article>
  );
}
