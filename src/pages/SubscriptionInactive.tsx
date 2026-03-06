import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SubscriptionInactive() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleExit = async () => {
    try {
      await signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Assinatura inativa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua empresa esta com assinatura bloqueada, cancelada ou vencida. Regularize o pagamento para voltar a acessar.
        </p>
        <Button className="mt-5 w-full" variant="outline" onClick={() => void handleExit()}>
          Sair
        </Button>
      </div>
    </div>
  );
}
