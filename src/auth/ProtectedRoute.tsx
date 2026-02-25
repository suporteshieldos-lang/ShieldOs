import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, configured, accessAllowed } = useAuth();

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Configure o Supabase em `.env` para habilitar login e persistência.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando sessão...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!accessAllowed) {
    return <Navigate to="/assinatura-inativa" replace />;
  }

  return <>{children}</>;
}
