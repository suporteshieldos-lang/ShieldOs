import { Search, Plus, AlertTriangle, Pencil, Trash2, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore, formatCurrency, InventoryItem, parseCurrency } from "@/store/appStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { findInventoryItemIdBySku, getSupabaseConfigured, isUuid, registerInventorySale, updateInventoryItemSecure } from "@/lib/supabaseRest";
import { createId } from "@/lib/id";

type EditForm = {
  name: string;
  sku: string;
  category: string;
  minQty: string;
  costPrice: string;
  salePrice: string;
  supplier: string;
  location: string;
  unit: "UN" | "CX" | "KG" | "M";
  status: "ativo" | "inativo" | "descontinuado";
  stockAdjustment: string;
  adjustmentReason: string;
};

const inventoryStatusLabel: Record<EditForm["status"], string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  descontinuado: "Descontinuado",
};

export default function Inventory() {
  const navigate = useNavigate();
  const { inventory, cashRegisters, updateInventoryItem, replaceInventoryItemId, deleteInventoryItem, deductStock, addCashEntry } = useAppStore();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [selling, setSelling] = useState<InventoryItem | null>(null);
  const [sellQty, setSellQty] = useState("1");
  const [sellPrice, setSellPrice] = useState("");
  const [sellMethod, setSellMethod] = useState<"dinheiro" | "pix" | "cartao" | "outro">("pix");
  const [cashReceivedInput, setCashReceivedInput] = useState("");
  const [sellErrors, setSellErrors] = useState<{ qty?: string; price?: string; stock?: string }>({});
  const [sellingLoading, setSellingLoading] = useState(false);
  const configured = getSupabaseConfigured();

  const filtered = useMemo(
    () =>
      inventory.filter(
        (part) =>
          part.name.toLowerCase().includes(search.toLowerCase()) ||
          part.sku.toLowerCase().includes(search.toLowerCase()) ||
          part.category.toLowerCase().includes(search.toLowerCase())
      ),
    [inventory, search]
  );

  const totalValue = inventory.reduce((sum, item) => sum + item.qty * item.costPrice, 0);
  const lowCount = inventory.filter((item) => item.qty <= item.minQty).length;

  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    sku: "",
    category: "",
    minQty: "0",
    costPrice: "",
    salePrice: "",
    supplier: "",
    location: "",
    unit: "UN",
    status: "ativo",
    stockAdjustment: "0",
    adjustmentReason: "",
  });

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setEditForm({
      name: item.name,
      sku: item.sku,
      category: item.category,
      minQty: String(item.minQty),
      costPrice: formatCurrency(item.costPrice),
      salePrice: formatCurrency(item.salePrice || 0),
      supplier: item.supplier || "",
      location: item.location || "",
      unit: item.unit || "UN",
      status: item.status || "ativo",
      stockAdjustment: "0",
      adjustmentReason: "",
    });
  };

  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState(false);

  const validateEdit = () => {
    if (!editing) return { general: "Peça inválida." };
    const nextErrors: Record<string, string> = {};
    const minQty = parseInt(editForm.minQty, 10);
    const adjustment = parseInt(editForm.stockAdjustment, 10) || 0;
    const cost = parseCurrency(editForm.costPrice);
    const sale = parseCurrency(editForm.salePrice);
    const newQty = editing.qty + adjustment;

    if (!editForm.name.trim()) nextErrors.name = "Nome da peça obrigatório.";
    if (!editForm.sku.trim()) nextErrors.sku = "SKU obrigatório.";
    if (Number.isNaN(minQty) || minQty < 0) nextErrors.minQty = "Estoque mínimo não pode ser negativo.";
    if (cost < 0) nextErrors.costPrice = "Custo Não pode ser negativo.";
    if (sale <= 0) nextErrors.salePrice = "Preço de venda deve ser maior que zero.";
    if (adjustment !== 0 && !editForm.adjustmentReason.trim()) nextErrors.adjustmentReason = "Informe o motivo do ajuste.";
    if (newQty < 0) nextErrors.stockAdjustment = "Estoque insuficiente para esse ajuste.";
    return nextErrors;
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editLoading) return;
    const nextErrors = validateEdit();
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrija os campos destacados.");
      return;
    }
    const minQty = Math.max(0, parseInt(editForm.minQty, 10) || 0);
    const cost = parseCurrency(editForm.costPrice);
    const sale = parseCurrency(editForm.salePrice);
    const adjustment = parseInt(editForm.stockAdjustment, 10) || 0;

    setEditLoading(true);
    try {
      let resolvedItemId = editing.id;
      let localItemId = editing.id;
      let canUseBackend = configured;
      if (configured && !isUuid(resolvedItemId)) {
        const foundId = await findInventoryItemIdBySku(editing.sku);
        if (foundId) {
          replaceInventoryItemId(editing.id, foundId);
          resolvedItemId = foundId;
          localItemId = foundId;
        } else {
          canUseBackend = false;
        }
      }

      if (canUseBackend) {
        await updateInventoryItemSecure({
          itemId: resolvedItemId,
          currentQty: editing.qty,
          name: editForm.name.trim(),
          sku: editForm.sku.trim().toUpperCase(),
          category: editForm.category.trim() || "Geral",
          status: editForm.status,
          minQty,
          costPrice: cost,
          salePrice: sale,
          supplier: editForm.supplier.trim(),
          location: editForm.location.trim(),
          unit: editForm.unit,
          notes: "",
          stockAdjustment: adjustment,
          adjustmentReason: editForm.adjustmentReason.trim(),
        });
      }

      updateInventoryItem(localItemId, {
        name: editForm.name.trim(),
        sku: editForm.sku.trim().toUpperCase(),
        category: editForm.category.trim() || "Geral",
        qty: editing.qty + adjustment,
        minQty,
        costPrice: cost,
        salePrice: sale,
        supplier: editForm.supplier.trim(),
        location: editForm.location.trim(),
        unit: editForm.unit,
        status: editForm.status,
      });
      if (!canUseBackend) {
        toast.warning("Peça salva localmente. Para sincronizar no Supabase, recrie este item.");
      }
      toast.success("Peça atualizada com sucesso.");
      setEditing(null);
      setEditErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar a peça.";
      toast.error(message);
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDelete = (item: InventoryItem) => {
    if (!window.confirm(`Deseja excluir a Peça "${item.name}"?`)) return;
    deleteInventoryItem(item.id);
    toast.success("Peça excluída.");
  };

  const openSell = (item: InventoryItem) => {
    setSelling(item);
    setSellQty("1");
    setSellPrice(formatCurrency(item.salePrice || 0));
    setSellMethod("pix");
    setCashReceivedInput("");
    setSellErrors({});
  };

  const validateSale = () => {
    if (!selling) return { qty: "Item inválido." };
    const qty = Math.max(1, parseInt(sellQty, 10) || 1);
    const unitSale = parseCurrency(sellPrice);
    const nextErrors: { qty?: string; price?: string; stock?: string } = {};

    if (selling.qty <= 0) {
      nextErrors.stock = "Estoque insuficiente";
    }
    if (qty < 1) {
      nextErrors.qty = "Quantidade minima: 1";
    } else if (qty > selling.qty) {
      nextErrors.qty = "Estoque insuficiente";
    }
    if (unitSale <= 0) {
      nextErrors.price = "Informe um valor de venda valido";
    }
    if (sellMethod === "dinheiro") {
      const received = parseCurrency(cashReceivedInput);
      const total = unitSale * qty;
      if (received < total) {
        nextErrors.price = "Valor recebido menor que o total da venda";
      }
    }
    return nextErrors;
  };

  const confirmSell = async () => {
    if (!selling) return;
    if (sellingLoading) return;
    const nextErrors = validateSale();
    setSellErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const qty = Math.max(1, parseInt(sellQty, 10) || 1);
    const unitSale = parseCurrency(sellPrice);
    const total = unitSale * qty;
    const openRegister = cashRegisters.find((register) => register.status === "aberto");
    if (sellMethod === "dinheiro" && !openRegister) {
      toast.error("Caixa fechado: para vender em dinheiro, abra o caixa.");
      return;
    }

    setSellingLoading(true);
    try {
      let resolvedItemId = selling.id;
      let localItemId = selling.id;
      let canUseBackend = configured;
      if (configured && !isUuid(resolvedItemId)) {
        const foundId = await findInventoryItemIdBySku(selling.sku);
        if (foundId) {
          replaceInventoryItemId(selling.id, foundId);
          resolvedItemId = foundId;
          localItemId = foundId;
        } else {
          canUseBackend = false;
        }
      }

      let financeId: string | undefined;
      if (canUseBackend) {
        const saleResult = await registerInventorySale({
          itemId: resolvedItemId,
          qty,
          unitSalePrice: unitSale,
          description: `Venda direta: ${selling.name} (${qty}x)`,
        });
        financeId = saleResult?.finance_id;
      }

      deductStock(localItemId, qty);
      addCashEntry({
        id: createId(),
        date: new Date().toLocaleDateString("pt-BR"),
        type: "entrada",
        description: `Venda direta: ${selling.name} (${qty}x)`,
        amount: total,
        paymentMethod: sellMethod,
        source: "venda_peca",
        saleFinanceId: financeId,
        saleItemId: localItemId,
        saleQty: qty,
        saleUnitPrice: unitSale,
        saleUnitCost: selling.costPrice,
        registerId: sellMethod === "dinheiro" ? openRegister?.id : undefined,
        affectsPhysicalCash: sellMethod === "dinheiro",
        cashReceivedAmount: sellMethod === "dinheiro" ? parseCurrency(cashReceivedInput) : undefined,
        changeDueAmount: sellMethod === "dinheiro" ? Math.max(0, parseCurrency(cashReceivedInput) - total) : undefined,
      });
      if (!canUseBackend) {
        toast.warning("Venda registrada localmente. Item legado sem sincronizAção no Supabase.");
      }
      toast.success("Venda registrada com sucesso.");
      setSelling(null);
      setSellErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possivel concluir a venda.";
      setSellErrors((prev) => ({ ...prev, stock: message.includes("Estoque insuficiente") ? "Estoque insuficiente" : prev.stock }));
      toast.error(message);
    } finally {
      setSellingLoading(false);
    }
  };

  const saleTotal = formatCurrency(parseCurrency(sellPrice) * Math.max(1, parseInt(sellQty, 10) || 1));
  const saleTotalCents = parseCurrency(sellPrice) * Math.max(1, parseInt(sellQty, 10) || 1);
  const changeDue = Math.max(0, parseCurrency(cashReceivedInput) - saleTotalCents);
  const hasSaleError = Object.keys(validateSale()).length > 0;

  return (
    <div className="premium-page">
      <div className="premium-toolbar flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar Peça, SKU ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 sm:w-96"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="text-sm text-muted-foreground">
            Valor imobilizado: <span className="font-semibold text-foreground">{formatCurrency(totalValue)}</span>
            {lowCount > 0 && <span className="ml-2 text-warning">- {lowCount} itens baixos</span>}
          </div>
          <Button className="gap-2" onClick={() => navigate("/estoque/nova")}>
            <Plus className="h-4 w-4" />
            Nova Peça
          </Button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((part) => {
          const isLow = part.qty <= part.minQty;
          const isOut = part.qty === 0;
          return (
            <div key={part.id} className="glass-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{part.name}</p>
                  <p className="text-xs text-muted-foreground">SKU: {part.sku}</p>
                  <p className="text-xs text-muted-foreground">Categoria: {part.category || "-"}</p>
                </div>
                <Badge variant="outline">{inventoryStatusLabel[part.status || "ativo"]}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Qtd</p>
                  <p className="font-medium text-foreground">{part.qty}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Venda</p>
                  <p className="font-medium text-foreground">{formatCurrency(part.salePrice || 0)}</p>
                </div>
              </div>
              {(isOut || isLow) && (
                <p className={`mt-3 flex items-center gap-1 text-xs font-medium ${isOut ? "text-destructive" : "text-warning"}`}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {isOut ? "Sem estoque" : "Estoque baixo"}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openEdit(part)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openSell(part)} title="Venda direta sem ordem de serviço">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Vender
                </Button>
                <Button size="sm" variant="outline" className="gap-1 border-destructive/30 text-destructive" onClick={() => confirmDelete(part)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="premium-table-shell hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Peça</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">SKU</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Qtd</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Custo</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Venda</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((part, index) => {
              const isLow = part.qty <= part.minQty;
              const isOut = part.qty === 0;
              return (
                <motion.tr
                  key={part.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-border/50 hover:bg-muted/20"
                >
                  <td className="px-4 py-3.5 font-medium text-foreground">{part.name}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{part.sku}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{part.category || "-"}</td>
                  <td className="px-4 py-3.5 text-foreground">
                    <span className={isOut ? "text-destructive" : isLow ? "text-warning" : ""}>{part.qty}</span>
                    <span className="text-muted-foreground">/{part.minQty}</span>
                  </td>
                  <td className="px-4 py-3.5 text-foreground">{formatCurrency(part.costPrice)}</td>
                  <td className="px-4 py-3.5 text-foreground">{formatCurrency(part.salePrice || 0)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit">{inventoryStatusLabel[part.status || "ativo"]}</Badge>
                      {(isOut || isLow) && (
                        <span className={`text-xs ${isOut ? "text-destructive" : "text-warning"}`}>{isOut ? "Sem estoque" : "Baixo"}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(part)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openSell(part)} title="Venda direta sem ordem de serviço">
                        <ShoppingCart className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-destructive/30 text-destructive" onClick={() => confirmDelete(part)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (!open ? setEditing(null) : null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Editar Peça</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(100vh-14rem)] overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Nome da Peça *</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              {editErrors.name && <p className="mt-1 text-xs text-destructive">{editErrors.name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">SKU *</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.sku} onChange={(e) => setEditForm((p) => ({ ...p, sku: e.target.value }))} />
              {editErrors.sku && <p className="mt-1 text-xs text-destructive">{editErrors.sku}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Categoria</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Status</label>
              <select className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as EditForm["status"] }))}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="descontinuado">Descontinuado</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Estoque atual</label>
              <input className="h-10 w-full rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground" value={String(editing?.qty ?? 0)} readOnly />
              {!!editing && editing.qty < editing.minQty && <p className="mt-1 text-xs text-warning">Abaixo do estoque mínimo.</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Ajuste de estoque (+/-)</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" type="number" value={editForm.stockAdjustment} onChange={(e) => setEditForm((p) => ({ ...p, stockAdjustment: e.target.value }))} />
              {editErrors.stockAdjustment && <p className="mt-1 text-xs text-destructive">{editErrors.stockAdjustment}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Motivo do ajuste</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.adjustmentReason} onChange={(e) => setEditForm((p) => ({ ...p, adjustmentReason: e.target.value }))} />
              {editErrors.adjustmentReason && <p className="mt-1 text-xs text-destructive">{editErrors.adjustmentReason}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Estoque mínimo *</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" type="number" min="0" value={editForm.minQty} onChange={(e) => setEditForm((p) => ({ ...p, minQty: e.target.value }))} />
              {editErrors.minQty && <p className="mt-1 text-xs text-destructive">{editErrors.minQty}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Custo *</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.costPrice} onChange={(e) => setEditForm((p) => ({ ...p, costPrice: e.target.value }))} />
              {editErrors.costPrice && <p className="mt-1 text-xs text-destructive">{editErrors.costPrice}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Preço de venda *</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.salePrice} onChange={(e) => setEditForm((p) => ({ ...p, salePrice: e.target.value }))} />
              <p className="mt-1 text-[11px] text-muted-foreground">Preço cobrado do cliente</p>
              {editErrors.salePrice && <p className="mt-1 text-xs text-destructive">{editErrors.salePrice}</p>}
              {parseCurrency(editForm.salePrice) < parseCurrency(editForm.costPrice) && (
                <p className="mt-1 text-xs text-warning">Aviso: preço de venda abaixo do custo.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Fornecedor</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.supplier} onChange={(e) => setEditForm((p) => ({ ...p, supplier: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">LocalizAção</label>
              <input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={editForm.location} onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
              Margem estimada:{" "}
              <span className={`font-semibold ${parseCurrency(editForm.salePrice) - parseCurrency(editForm.costPrice) >= 0 ? "text-success" : "text-destructive"}`}>
                {formatCurrency(parseCurrency(editForm.salePrice) - parseCurrency(editForm.costPrice))}
              </span>
            </div>
          </div>
          </div>
          <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-border bg-background px-6 py-4">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={editLoading}>Cancelar</Button>
            <Button onClick={() => void saveEdit()} disabled={editLoading}>
              {editLoading ? "Salvando..." : "Salvar alterAções"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selling)} onOpenChange={(open) => (!open ? setSelling(null) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar venda de Peça</DialogTitle>
          </DialogHeader>
          {selling && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{selling.name} - estoque atual: {selling.qty}</p>
              {selling.qty <= 0 && <p className="text-xs text-destructive">Estoque insuficiente</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Quantidade</label>
                  <input
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                    type="number"
                    min="1"
                    max={selling.qty}
                    value={sellQty}
                    onChange={(e) => setSellQty(e.target.value)}
                    disabled={selling.qty <= 0 || sellingLoading}
                  />
                  {sellErrors.qty && <p className="mt-1 text-xs text-destructive">{sellErrors.qty}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Preço unitário</label>
                  <input
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                    placeholder="Preço unitário de venda"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                  />
                  {sellErrors.price && <p className="mt-1 text-xs text-destructive">{sellErrors.price}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Forma de pagamento</label>
                  <select
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                    value={sellMethod}
                    onChange={(e) => setSellMethod(e.target.value as typeof sellMethod)}
                    disabled={sellingLoading}
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">Pix</option>
                    <option value="cartao">Cartao</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                {sellMethod === "dinheiro" ? (
                  <div className="sm:col-span-2 rounded-lg border border-border bg-muted/20 p-3">
                    <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Valor recebido</label>
                    <input
                      className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25"
                      placeholder="R$ 0,00"
                      value={cashReceivedInput}
                      onChange={(e) => setCashReceivedInput(e.target.value)}
                      disabled={sellingLoading}
                    />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Troco: <span className="font-semibold text-foreground">{formatCurrency(changeDue)}</span>
                    </p>
                  </div>
                ) : null}
              </div>
              <p className="text-sm">
                Total: <span className="font-semibold text-foreground">{saleTotal}</span>
              </p>
              {sellErrors.stock && <p className="text-xs text-destructive">{sellErrors.stock}</p>}
            </div>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelling(null)} disabled={sellingLoading}>Cancelar</Button>
            <Button onClick={() => void confirmSell()} disabled={sellingLoading || hasSaleError}>
              {sellingLoading ? "Confirmando..." : "Confirmar venda"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

