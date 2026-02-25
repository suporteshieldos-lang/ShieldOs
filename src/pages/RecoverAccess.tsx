import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getSupabaseConfigured, readRecoverySessionFromUrl, requestPasswordRecovery, signOut, updatePassword } from "@/lib/supabaseRest";
import logo from "@/assets/logo.jpeg";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function RecoverAccess() {
  const navigate = useNavigate();
  const configured = getSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    const session = readRecoverySessionFromUrl();
    if (session?.access_token) {
      setHasRecoverySession(true);
    }
  }, []);

  const emailError = useMemo(() => {
    if (!email) return "";
    return isValidEmail(email) ? "" : "Informe um e-mail válido";
  }, [email]);

  const sendRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido");
      return;
    }
    setLoading(true);
    try {
      const redirect = `${window.location.origin}/recuperar-acesso`;
      await requestPasswordRecovery(email.trim().toLowerCase(), redirect);
      setMessage("Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.");
    } catch {
      setMessage("Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.");
    } finally {
      setLoading(false);
    }
  };

  const redefinePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(password);
      await signOut();
      setMessage("Senha redefinida com sucesso. Faça login com a nova senha.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch {
      setError("Não foi possível redefinir a senha. Solicite um novo link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_34px_rgba(15,42,68,0.09)] sm:p-8">
        <div className="mb-5 text-center">
          <img src={logo} alt="ShieldOS" className="mx-auto mb-3 h-14 w-14 rounded-xl object-cover" />
          <h1 className="text-xl font-bold text-[#111827]">{hasRecoverySession ? "Redefinir senha" : "Recuperar acesso"}</h1>
          <p className="text-sm text-[#4B5563]">{hasRecoverySession ? "Defina uma nova senha segura." : "Receba um link para redefinir sua senha."}</p>
        </div>

        {!configured && (
          <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
            Supabase não configurado. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
          </div>
        )}

        {!hasRecoverySession ? (
          <form className="space-y-4" onSubmit={sendRecovery}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#111827]">E-mail</label>
              <input
                type="email"
                required
                placeholder="tecnico@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1E4E7A]/20"
              />
              {emailError && <p className="mt-1 text-xs text-[#B91C1C]">{emailError}</p>}
            </div>
            <Button className="h-11 w-full gap-2 bg-[#0F2A44] text-white hover:bg-[#13395E]" type="submit" disabled={!configured || loading || Boolean(emailError)}>
              <KeyRound className="h-4 w-4" />
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={redefinePassword}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#111827]">Nova senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1E4E7A]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#111827]">Confirmar nova senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1E4E7A]/20"
              />
            </div>
            <Button className="h-11 w-full gap-2 bg-[#0F2A44] text-white hover:bg-[#13395E]" type="submit" disabled={!configured || loading}>
              <ShieldCheck className="h-4 w-4" />
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}

        {error && <div className="mt-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-xs text-[#B91C1C]">{error}</div>}
        {message && <div className="mt-4 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-2.5 text-xs text-[#166534]">{message}</div>}

        <div className="mt-4 text-xs">
          <Link to="/login" className="inline-flex items-center gap-1 text-[#1E4E7A] hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para login
          </Link>
        </div>
      </div>
    </div>
  );
}
