import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, parseCurrency } from "@/store/appStore";
import {
  createInventoryItem,
  createInventoryCategory,
  getSupabaseConfigured,
  InventoryCategory,
  InventorySupplier,
  listInventoryCategories,
  listInventorySuppliers,
} from "@/lib/supabaseRest";
import { createId } from "@/lib/id";
import { toast } from "sonner";

type Unit = "UN" | "CX" | "KG" | "M";
type StockStatus = "ativo" | "inativo" | "descontinuado";

const unitOptions: Unit[] = ["UN", "CX", "KG", "M"];
const statusOptions: Array<{ value: StockStatus; label: string }> = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "descontinuado", label: "Descontinuado" },
];

function isPositiveCurrency(raw: string): boolean {
  return parseCurrency(raw) > 0;
}

export default function NewInventoryItem() {
  const navigate = useNavigate();
  const { addInventoryItem } = useAppStore();
  const configured = getSupabaseConfigured();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplier[]>([]);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    categoryId: "",
    status: "ativo" as StockStatus,
    qty: "0",
    unit: "UN" as Unit,
    minQty: "0",
    location: "",
    costPrice: "",
    salePrice: "",
    supplierId: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [autoSeeded, setAutoSeeded] = useState(false);

  const loadAux = async () => {
    if (!configured) return;
    try {
      const [cats, sups] = await Promise.all([listInventoryCategories(), listInventorySuppliers()]);
      if (cats.length === 0 && !autoSeeded) {
        setAutoSeeded(true);
        try {
          await createInventoryCategory("Geral");
          const [nextCats, nextSups] = await Promise.all([listInventoryCategories(), listInventorySuppliers()]);
          setCategories(nextCats);
          setSuppliers(nextSups);
          if (nextCats.length > 0) {
            setForm((p) => ({ ...p, categoryId: nextCats[0].id }));
          }
          return;
        } catch (seedError) {
          toast.error(seedError instanceof Error ? seedError.message : "Nao foi possivel criar categoria padrao.");
        }
      }
      setCategories(cats);
      setSuppliers(sups);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel carregar dados auxiliares.");
    }
  };

  useEffect(() => {
    void loadAux();
  }, [configured]);

  const handleCreateDefaultCategory = async () => {
    if (!configured) return;
    setCreatingCategory(true);
    try {
      const created = await createInventoryCategory("Geral");
      await loadAux();
      setForm((p) => ({ ...p, categoryId: created.id }));
      toast.success("Categoria padrao criada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel criar a categoria.");
    } finally {
      setCreatingCategory(false);
    }
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const qty = parseInt(form.qty, 10);
    const minQty = parseInt(form.minQty, 10);

    if (!form.name.trim()) nextErrors.name = "Nome da peca e obrigatorio.";
    if (!form.sku.trim()) nextErrors.sku = "SKU e obrigatorio.";
    if (!form.categoryId) nextErrors.categoryId = "Categoria e obrigatoria.";
    if (categories.length === 0) nextErrors.categoryId = "Cadastre ao menos uma categoria antes de salvar.";
    if (Number.isNaN(qty) || qty < 0) nextErrors.qty = "Quantidade inicial deve ser maior ou igual a zero.";
    if (Number.isNaN(minQty) || minQty < 0) nextErrors.minQty = "Estoque minimo deve ser maior ou igual a zero.";
    if (!isPositiveCurrency(form.costPrice)) nextErrors.costPrice = "Custo unitario deve ser maior que zero.";
    if (!isPositiveCurrency(form.salePrice)) nextErrors.salePrice = "Preco de venda deve ser maior que zero.";
    if (!form.unit) nextErrors.unit = "Unidade de medida e obrigatoria.";

    return nextErrors;
  };

  const isValid = Object.keys(validate()).length === 0;

  const handleSave = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Corrija os campos obrigatorios antes de salvar.");
      return;
    }

    setSaving(true);
    try {
      const qty = Math.max(0, parseInt(form.qty, 10) || 0);
      const minQty = Math.max(0, parseInt(form.minQty, 10) || 0);
      const costPrice = parseCurrency(form.costPrice);
      const salePrice = parseCurrency(form.salePrice);
      const selectedCategory = categories.find((item) => item.id === form.categoryId)?.name || "Geral";
      const selectedSupplier = suppliers.find((item) => item.id === form.supplierId)?.name || "";

      let persistedId: string | null = null;
      if (configured) {
        const created = await createInventoryItem({
          name: form.name.trim(),
          sku: form.sku.trim().toUpperCase(),
          categoryId: form.categoryId,
          status: form.status,
          qty,
          unit: form.unit,
          minQty,
          location: form.location.trim(),
          costUnit: costPrice,
          salePrice,
          supplierId: form.supplierId || null,
          notes: form.notes.trim(),
        });
        persistedId = created?.id || null;
      }

      addInventoryItem({
        id: persistedId || createId(),
        name: form.name.trim(),
        category: selectedCategory,
        categoryId: form.categoryId,
        sku: form.sku.trim().toUpperCase(),
        qty,
        minQty,
        unit: form.unit,
        status: form.status,
        location: form.location.trim(),
        costPrice,
        salePrice,
        supplier: selectedSupplier,
        supplierId: form.supplierId || null,
        notes: form.notes.trim(),
      });

      toast.success("Peca cadastrada com sucesso.");
      navigate("/estoque");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a peca.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/60";
  const labelClass = "mb-1.5 block text-sm font-medium text-foreground";
  const errorClass = "mt-1 text-xs text-destructive";

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/estoque")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-foreground">Nova Peca</h2>
      </div>

      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identificacao</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Nome da peca *</label>
              <input
                className={inputClass}
                placeholder="Ex: Fone Bluetooth JBL"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>
            <div>
              <label className={labelClass}>SKU *</label>
              <input
                className={inputClass}
                placeholder="Ex: FON-JBL-001"
                title="Codigo interno para identificacao rapida da peca"
                value={form.sku}
                onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              />
              {errors.sku && <p className={errorClass}>{errors.sku}</p>}
            </div>
            <div>
              <label className={labelClass}>Categoria *</label>
              <select
                className={inputClass}
                value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                aria-invalid={Boolean(errors.categoryId)}
              >
                <option value="" disabled hidden>
                  Selecione uma categoria
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className={errorClass}>{errors.categoryId}</p>}
              {categories.length === 0 && (
                <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                  <p>Nenhuma categoria ativa encontrada para sua empresa.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleCreateDefaultCategory()}
                    disabled={creatingCategory}
                    className="h-8 px-3 text-xs"
                  >
                    {creatingCategory ? "Criando..." : "Criar categoria padrão"}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select className={inputClass} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as StockStatus }))}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Controle de Estoque</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Quantidade inicial *</label>
              <input className={inputClass} type="number" min="0" value={form.qty} onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))} />
              {errors.qty && <p className={errorClass}>{errors.qty}</p>}
            </div>
            <div>
              <label className={labelClass}>Unidade de medida *</label>
              <select className={inputClass} value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value as Unit }))}>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {errors.unit && <p className={errorClass}>{errors.unit}</p>}
            </div>
            <div>
              <label className={labelClass}>Estoque minimo *</label>
              <input className={inputClass} type="number" min="0" value={form.minQty} onChange={(e) => setForm((p) => ({ ...p, minQty: e.target.value }))} />
              {errors.minQty && <p className={errorClass}>{errors.minQty}</p>}
            </div>
            <div>
              <label className={labelClass}>Localizacao</label>
              <input className={inputClass} placeholder="Ex: Prateleira A3" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Custos</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Custo unitario *</label>
              <input
                className={inputClass}
                placeholder="R$ 0,00"
                value={form.costPrice}
                onChange={(e) => setForm((p) => ({ ...p, costPrice: e.target.value }))}
              />
              {errors.costPrice && <p className={errorClass}>{errors.costPrice}</p>}
            </div>
            <div>
              <label className={labelClass}>Preco de venda *</label>
              <input
                className={inputClass}
                placeholder="R$ 0,00"
                value={form.salePrice}
                onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))}
              />
              {errors.salePrice && <p className={errorClass}>{errors.salePrice}</p>}
            </div>
            <div>
              <label className={labelClass}>Fornecedor</label>
              <select className={inputClass} value={form.supplierId} onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}>
                <option value="">Selecione</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-2 border-t border-border pt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Observacoes</h3>
          <textarea
            className="min-h-[92px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            placeholder="Descricao / observacoes tecnicas"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </section>

        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button variant="outline" onClick={() => navigate("/estoque")}>
            Cancelar
          </Button>
          <Button className="gap-2" onClick={handleSave} disabled={saving || !isValid}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar peca"}
          </Button>
        </div>
      </div>
    </div>
  );
}
