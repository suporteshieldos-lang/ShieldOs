import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { createId } from "@/lib/id";
import { formatBrDate, parseBrDate } from "@/features/financial/selectors";
import { ReceivableRow } from "@/features/financial/types";
import { CashEntry, PaymentMethod, RepairOrder, getOrderTotal } from "@/store/appStore";

export const VALID_PAYMENT_METHODS: PaymentMethod[] = ["pix", "dinheiro", "debito", "credito", "cartao", "outro"];
const DEFAULT_UNKNOWN_CUSTOMER = "Não identificado";
export const DAY_MS = 86400000;

type UpdateOrderFn = (id: string, updates: Partial<RepairOrder>) => { ok: boolean; message?: string };
type AddCashEntryFn = (entry: CashEntry) => void;
type CancelCashEntryFn = (id: string, reason: string, by: string) => { ok: boolean; message?: string };

export function parseAmountInputToCents(value: string) {
  const amountValue = Number(value.replace(",", "."));
  if (!Number.isFinite(amountValue)) return { ok: false as const, cents: 0, raw: amountValue };
  const cents = Math.round(amountValue * 100);
  return { ok: cents > 0, cents, raw: amountValue };
}

export function daysLateFromDueDate(dueDate: Date, today: Date) {
  return Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / DAY_MS));
}

function askPaymentMethod(defaultValue: PaymentMethod = "pix"): PaymentMethod | null {
  const typed = window
    .prompt(
      "Informe o meio de pagamento (pix, dinheiro, debito, credito, cartao, outro):",
      defaultValue
    )
    ?.trim()
    .toLowerCase();
  if (!typed) return null;
  if (!VALID_PAYMENT_METHODS.includes(typed as PaymentMethod)) return null;
  return typed as PaymentMethod;
}

export function getAgingBadgeClass(daysLate: number) {
  if (daysLate === 0) return "border-slate-300 bg-slate-100 text-slate-700";
  if (daysLate <= 3) return "border-yellow-300 bg-yellow-100 text-yellow-800";
  if (daysLate <= 7) return "border-orange-300 bg-orange-100 text-orange-800";
  return "border-red-300 bg-red-100 text-red-800";
}

export function useReceivablesActions({
  orders,
  cashEntries,
  updateOrder,
  addCashEntry,
  cancelCashEntry,
  fromInputDate,
  toInputDate,
  onOpenCashDetail,
  navigateToOrders,
}: {
  orders: RepairOrder[];
  cashEntries: CashEntry[];
  updateOrder: UpdateOrderFn;
  addCashEntry: AddCashEntryFn;
  cancelCashEntry: CancelCashEntryFn;
  fromInputDate: (value: string) => Date | null;
  toInputDate: (date: Date) => string;
  onOpenCashDetail: () => void;
  navigateToOrders: () => void;
}) {
  const [newReceivableCustomer, setNewReceivableCustomer] = useState("");
  const [newReceivablePhone, setNewReceivablePhone] = useState("");
  const [newReceivableDescription, setNewReceivableDescription] = useState("");
  const [newReceivableAmount, setNewReceivableAmount] = useState("");
  const [newReceivableDueDate, setNewReceivableDueDate] = useState(toInputDate(new Date()));
  const [newReceivableMethod, setNewReceivableMethod] = useState<PaymentMethod>("pix");

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const cashEntryById = useMemo(() => new Map(cashEntries.map((entry) => [entry.id, entry])), [cashEntries]);

  const receivablesAging = useMemo<ReceivableRow[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fromOrders: ReceivableRow[] = orders
      .filter((order) => order.paymentStatus !== "pago" && order.status !== "cancelled")
      .map((order) => {
        const due = parseBrDate(order.estimatedDelivery) || parseBrDate(order.date) || today;
        return {
          id: `pending-${order.id}`,
          customer: order.customerName || DEFAULT_UNKNOWN_CUSTOMER,
          reference: order.id,
          value: getOrderTotal(order),
          daysLate: daysLateFromDueDate(due, today),
          dueDate: due,
          phone: order.customerPhone || "",
          sourceKind: "pending_order",
          sourceId: order.id,
        };
      });

    const fromManual: ReceivableRow[] = cashEntries
      .filter(
        (entry) =>
          entry.type === "entrada" &&
          entry.financialStatus === "previsto" &&
          entry.source !== "os" &&
          entry.status !== "cancelada" &&
          entry.status !== "estornada"
      )
      .map((entry) => {
        const due = parseBrDate(entry.date) || today;
        return {
          id: `manual-${entry.id}`,
          customer: entry.customerName || DEFAULT_UNKNOWN_CUSTOMER,
          reference: "Avulso",
          value: entry.amount,
          daysLate: daysLateFromDueDate(due, today),
          dueDate: due,
          phone: entry.customerPhone || "",
          sourceKind: "cash_entry",
          sourceId: entry.id,
        };
      });

    return [...fromOrders, ...fromManual].sort((a, b) => b.daysLate - a.daysLate || b.value - a.value);
  }, [cashEntries, orders]);

  const receivablesTotals = useMemo(() => {
    const now = new Date();
    const isToday = (date: Date) =>
      now.getFullYear() === date.getFullYear() &&
      now.getMonth() === date.getMonth() &&
      now.getDate() === date.getDate();

    return receivablesAging.reduce(
      (acc, row) => {
        acc.total += row.value;
        if (row.daysLate > 0) acc.overdue += row.value;
        if (isToday(row.dueDate)) acc.dueToday += row.value;
        return acc;
      },
      { overdue: 0, dueToday: 0, total: 0 }
    );
  }, [receivablesAging]);

  const markReceivableAsPaid = useCallback(
    (row: ReceivableRow) => {
      if (row.sourceKind === "pending_order") {
        const order = orderById.get(row.sourceId);
        if (!order) return toast.error("OS não encontrada.");

        const typedCost = window.prompt(
          `Informe o custo da OS ${order.id} (>= 0):`,
          (Math.max(0, Number(order.partsCost || 0)) / 100).toFixed(2).replace(".", ",")
        );
        if (typedCost === null) return;

        const parsedCost = Math.round(Number(typedCost.replace(",", ".")) * 100);
        if (!Number.isFinite(parsedCost) || parsedCost < 0) return toast.error("Custo inválido.");

        const selectedMethod = askPaymentMethod(order.paymentMethod || "pix");
        if (!selectedMethod) return toast.error("Meio de pagamento inválido.");

        const result = updateOrder(order.id, {
          partsCost: parsedCost,
          paymentStatus: "pago",
          paymentDate: formatBrDate(new Date()),
          paymentMethod: selectedMethod,
        });
        if (!result.ok) return toast.error(result.message || "Não foi possível marcar como pago.");
        toast.success("Recebível marcado como pago.");
        return;
      }

      const original = cashEntryById.get(row.sourceId);
      if (!original) return toast.error("Recebível não encontrado.");

      const cancelResult = cancelCashEntry(row.sourceId, "Baixa de recebível manual (recebido).", "Usuário");
      if (!cancelResult.ok) return toast.error(cancelResult.message || "Não foi possível baixar recebível.");

      const selectedMethod = askPaymentMethod((original.paymentMethod as PaymentMethod) || "pix");
      if (!selectedMethod) return toast.error("Meio de pagamento inválido.");

      addCashEntry({
        id: createId(),
        date: formatBrDate(new Date()),
        type: "entrada",
        description: original.description,
        amount: original.amount,
        paymentMethod: selectedMethod,
        source: original.source || "manual",
        status: "ativa",
        financialStatus: "pago",
        customerName: original.customerName,
        customerPhone: original.customerPhone,
        notes: `${original.notes ? `${original.notes} | ` : ""}Recebível manual baixado como pago.`,
      });
      toast.success("Recebível manual marcado como pago.");
    },
    [addCashEntry, cancelCashEntry, cashEntryById, orderById, updateOrder]
  );

  const deleteReceivable = useCallback(
    (row: ReceivableRow) => {
      if (row.sourceKind === "pending_order") {
        const order = orderById.get(row.sourceId);
        if (!order) return toast.error("OS não encontrada para exclusão.");
        if (!window.confirm(`Excluir este recebível vai cancelar a ${order.id}. Deseja continuar?`)) return;

        const result = updateOrder(order.id, { status: "cancelled" });
        if (!result.ok) return toast.error(result.message || "Não foi possível excluir.");
        toast.success(`Recebível removido e ${order.id} cancelada.`);
        return;
      }

      if (!window.confirm("Deseja excluir este recebível avulso?")) return;
      const cancelResult = cancelCashEntry(row.sourceId, "Recebível avulso excluído pelo usuário.", "Usuário");
      if (!cancelResult.ok) return toast.error(cancelResult.message || "Não foi possível excluir.");
      toast.success("Recebível avulso excluído.");
    },
    [cancelCashEntry, orderById, updateOrder]
  );

  const openCharge = useCallback((phone: string, reference: string, value: number) => {
    const clean = (phone || "").replace(/\D/g, "");
    if (!clean) return toast.error("Cliente sem telefone para cobrança.");
    const text = encodeURIComponent(
      `Olá! Referente à ${reference}, ficou pendente R$ ${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Podemos regularizar hoje?`
    );
    window.open(`https://wa.me/55${clean}?text=${text}`, "_blank");
  }, []);

  const chargeAllOverdue = useCallback(() => {
    const targets = receivablesAging.filter(
      (row) => row.daysLate > 0 && row.phone.replace(/\D/g, "").length >= 10
    );
    if (targets.length === 0) return toast.error("Nenhum atrasado com telefone válido para cobrança em lote.");
    if (!window.confirm(`Enviar cobrança em lote para ${targets.length} cliente(s) via WhatsApp?`)) return;
    targets.forEach((row, idx) => setTimeout(() => openCharge(row.phone, row.reference, row.value), idx * 220));
    toast.success(`Disparo de cobrança iniciado para ${targets.length} cliente(s).`);
  }, [openCharge, receivablesAging]);

  const openReceivableRecord = useCallback(
    (row: ReceivableRow) => {
      if (row.sourceKind === "pending_order") {
        navigateToOrders();
        return;
      }
      onOpenCashDetail();
    },
    [navigateToOrders, onOpenCashDetail]
  );

  const createManualReceivable = useCallback(
    (onSuccess?: () => void) => {
      const customer = newReceivableCustomer.trim();
      const description = newReceivableDescription.trim();
      const parsed = parseAmountInputToCents(newReceivableAmount);
      const due = fromInputDate(newReceivableDueDate);

      if (!customer) return toast.error("Informe o cliente do recebível.");
      if (!description) return toast.error("Informe a descrição do recebível.");
      if (!parsed.ok) return toast.error("Informe um valor válido.");
      if (!due) return toast.error("Informe uma data de vencimento válida.");

      addCashEntry({
        id: createId(),
        date: formatBrDate(due),
        type: "entrada",
        status: "ativa",
        description,
        amount: parsed.cents,
        paymentMethod: newReceivableMethod,
        source: "manual",
        movementType: "entrada_manual",
        financialStatus: "previsto",
        customerName: customer,
        customerPhone: newReceivablePhone.trim(),
        notes: "Recebível manual (sem OS).",
      });

      setNewReceivableCustomer("");
      setNewReceivablePhone("");
      setNewReceivableDescription("");
      setNewReceivableAmount("");
      setNewReceivableDueDate(toInputDate(new Date()));
      setNewReceivableMethod("pix");
      onSuccess?.();
      toast.success("Recebível avulso adicionado.");
    },
    [
      addCashEntry,
      fromInputDate,
      newReceivableAmount,
      newReceivableCustomer,
      newReceivableDescription,
      newReceivableDueDate,
      newReceivableMethod,
      newReceivablePhone,
      toInputDate,
    ]
  );

  return {
    receivablesAging,
    receivablesTotals,
    agingBadgeClass: getAgingBadgeClass,
    markReceivableAsPaid,
    deleteReceivable,
    openCharge,
    chargeAllOverdue,
    openReceivableRecord,
    createManualReceivable,
    newReceivableCustomer,
    setNewReceivableCustomer,
    newReceivablePhone,
    setNewReceivablePhone,
    newReceivableDescription,
    setNewReceivableDescription,
    newReceivableAmount,
    setNewReceivableAmount,
    newReceivableDueDate,
    setNewReceivableDueDate,
    newReceivableMethod,
    setNewReceivableMethod,
  };
}
