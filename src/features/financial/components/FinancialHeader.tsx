import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinancialHeader({ onNewMovement }: { onNewMovement: () => void }) {
  return (
    <section className="flex items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Financeiro</h1>
        <p className="mt-1 text-sm text-[#64748B]">Controle financeiro e fluxo de caixa</p>
      </div>
      <Button className="gap-2 rounded-lg bg-[#0F2747] text-white hover:bg-[#1E3A5F]" onClick={onNewMovement}>
        <PlusCircle className="h-4 w-4" />
        Nova movimentacao
      </Button>
    </section>
  );
}
