import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PaymentMethod } from "@/store/appStore";

export function NewReceivableDialog({
  open,
  onOpenChange,
  customer,
  setCustomer,
  phone,
  setPhone,
  description,
  setDescription,
  amount,
  setAmount,
  dueDate,
  setDueDate,
  method,
  setMethod,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: string;
  setCustomer: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  method: PaymentMethod;
  setMethod: (value: PaymentMethod) => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo recebivel avulso</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Cliente</Label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Telefone (opcional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Descricao</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mensalidade plano suporte" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Valor (R$)</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Meio</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="debito">Debito</option>
                <option value="credito">Credito</option>
                <option value="cartao">Cartao</option>
                <option value="outro">Outros</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={onSubmit}>Adicionar recebivel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
