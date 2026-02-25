import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, RefreshCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import {
  createOutboundWhatsAppMessage,
  getCurrentCompanyId,
  listWhatsAppMessages,
  WhatsAppMessageRow,
} from "@/lib/supabaseRest";

const templates = [
  "Ola, {cliente}. Sua ordem {os} esta com status: {status}.",
  "Ola, {cliente}. Seu aparelho {marca} {modelo} esta pronto para retirada.",
  "Ola, {cliente}. Precisamos da sua aprovacao para seguir com o reparo da ordem {os}.",
];

const statusLabel: Record<string, string> = {
  received: "Recebido",
  diagnosing: "Diagnosticando",
  repairing: "Em reparo",
  waiting_parts: "Aguardando peca",
  completed: "Concluido",
  delivered: "Entregue",
  cancelled: "Cancelada",
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function Communication() {
  const { orders } = useAppStore();
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");
  const [template, setTemplate] = useState(templates[0]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<WhatsAppMessageRow[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  const resolvedMessage = useMemo(() => {
    if (!selectedOrder) return "";
    return (message || template)
      .replaceAll("{cliente}", selectedOrder.customerName)
      .replaceAll("{os}", selectedOrder.id)
      .replaceAll("{status}", statusLabel[selectedOrder.status] || selectedOrder.status)
      .replaceAll("{marca}", selectedOrder.brand)
      .replaceAll("{modelo}", selectedOrder.model);
  }, [message, selectedOrder, template]);

  useEffect(() => {
    void (async () => {
      try {
        const id = await getCurrentCompanyId();
        setCompanyId(id);
      } catch {
        setCompanyId(null);
      }
    })();
  }, []);

  const reloadMessages = async () => {
    if (!selectedOrder || !companyId) {
      setMessages([]);
      return;
    }
    const phone = normalizePhone(selectedOrder.customerPhone);
    if (!phone) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await listWhatsAppMessages({
        companyId,
        customerPhone: phone,
      });
      setMessages(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar conversas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId, companyId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void reloadMessages();
    }, 15000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId, companyId]);

  const handleWhatsApp = async () => {
    if (!selectedOrder) return;
    const phone = normalizePhone(selectedOrder.customerPhone);
    if (!phone) {
      toast.error("Cliente sem telefone valido.");
      return;
    }
    if (!resolvedMessage.trim()) {
      toast.error("A mensagem esta vazia.");
      return;
    }

    try {
      if (companyId) {
        await createOutboundWhatsAppMessage({
          companyId,
          orderId: selectedOrder.id,
          customerPhone: phone,
          customerName: selectedOrder.customerName,
          body: resolvedMessage.trim(),
        });
      }
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(resolvedMessage.trim())}`, "_blank");
      toast.success("Mensagem preparada no WhatsApp.");
      void reloadMessages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar envio.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-sm text-muted-foreground">
          WhatsApp com historico de mensagens enviadas e respostas recebidas.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card space-y-4 rounded-xl p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Ordem de servico</label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
            >
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.id} - {order.customerName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Template</label>
            <select
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                setMessage("");
              }}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
            >
              {templates.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Mensagem</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite uma mensagem ou use o template."
              className="min-h-[130px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleWhatsApp()} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Enviar WhatsApp
            </Button>
            <Button variant="outline" onClick={() => void reloadMessages()} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Atualizar conversa
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Conversa</h3>
            {loading ? <span className="text-xs text-muted-foreground">Sincronizando...</span> : null}
          </div>

          {selectedOrder ? (
            <>
              <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <p className="font-medium text-foreground">{selectedOrder.customerName}</p>
                <p className="mt-1 text-muted-foreground">OS: {selectedOrder.id}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {selectedOrder.customerPhone}
                </p>
              </div>

              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma mensagem ainda. Envie a primeira no WhatsApp para iniciar o historico.
                  </p>
                ) : (
                  messages.map((row) => (
                    <div
                      key={row.id}
                      className={`rounded-lg border p-3 text-sm ${
                        row.direction === "outbound"
                          ? "ml-8 border-primary/30 bg-primary/5"
                          : "mr-8 border-border bg-card"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-foreground">{row.body}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{row.direction === "outbound" ? "Enviado" : "Recebido"}</span>
                        <span>{formatWhen(row.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma ordem disponivel para comunicacao.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Webhook WhatsApp</p>
        <p className="mt-1">
          Configure seu provedor para enviar respostas para a Edge Function <code>webhook-whatsapp</code>.
          As respostas recebidas entram automaticamente nesta tela.
        </p>
      </div>
    </div>
  );
}
