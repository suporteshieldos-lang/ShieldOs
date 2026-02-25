import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.jpeg";
import { logLoginAttempt } from "@/lib/supabaseRest";

const LOGIN_GUARD_KEY = "shieldos_login_guard_v1";
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

type LoginGuard = {
  failedCount: number;
  lockUntil: number | null;
  history: Array<{ at: string; success: boolean; email: string }>;
};

function readGuard(): LoginGuard {
  try {
    const raw = localStorage.getItem(LOGIN_GUARD_KEY);
    if (!raw) return { failedCount: 0, lockUntil: null, history: [] };
    return JSON.parse(raw) as LoginGuard;
  } catch {
    return { failedCount: 0, lockUntil: null, history: [] };
  }
}

function writeGuard(next: LoginGuard) {
  localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(next));
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function Login() {
  const { signIn, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guard, setGuard] = useState<LoginGuard>(() => readGuard());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isLocked = useMemo(() => Boolean(guard.lockUntil && guard.lockUntil > now), [guard.lockUntil, now]);
  const remainingSeconds = useMemo(() => {
    if (!guard.lockUntil || guard.lockUntil <= now) return 0;
    return Math.ceil((guard.lockUntil - now) / 1000);
  }, [guard.lockUntil, now]);
  const emailError = email && !isValidEmail(email) ? "Informe um e-mail válido" : "";

  const handleFail = () => {
    const current = readGuard();
    const failedCount = current.failedCount + 1;
    const locked = failedCount >= MAX_FAILED_ATTEMPTS;
    const next: LoginGuard = {
      failedCount: locked ? 0 : failedCount,
      lockUntil: locked ? Date.now() + LOCK_MINUTES * 60 * 1000 : current.lockUntil,
      history: [
        { at: new Date().toISOString(), success: false, email: email.trim().toLowerCase() },
        ...(current.history || []),
      ].slice(0, 20),
    };
    writeGuard(next);
    setGuard(next);
    void logLoginAttempt(email.trim().toLowerCase(), false, "invalid_credentials");
  };

  const handleSuccess = () => {
    const current = readGuard();
    const next: LoginGuard = {
      failedCount: 0,
      lockUntil: null,
      history: [
        { at: new Date().toISOString(), success: true, email: email.trim().toLowerCase() },
        ...(current.history || []),
      ].slice(0, 20),
    };
    writeGuard(next);
    setGuard(next);
    void logLoginAttempt(email.trim().toLowerCase(), true, "success");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (isLocked) {
      setError(`Acesso temporariamente bloqueado. Tente novamente em ${remainingSeconds}s.`);
      return;
    }
    if (!isValidEmail(email)) {
      setError("Informe um e-mail válido");
      return;
    }
    if (!password) {
      setError("Informe sua senha");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      handleSuccess();
      navigate("/", { replace: true });
    } catch {
      handleFail();
      setError("E-mail ou senha incorretos. Verifique e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_12px_34px_rgba(15,42,68,0.09)] sm:p-8">
        <div className="mb-6 text-center">
          <img src={logo} alt="ShieldOS" className="mx-auto mb-3 h-14 w-14 rounded-xl object-cover" />
          <h1 className="text-2xl font-bold text-[#111827]">ShieldOS</h1>
          <p className="text-sm font-medium text-[#1E4E7A]">Controle sem caos</p>
          <p className="mt-1 text-xs text-[#4B5563]">Sistema de gestão da assistência técnica</p>
        </div>

        <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#D6E0EA] bg-[#F8FBFF] p-3 text-xs text-[#374151]">
          <Lock className="h-4 w-4 text-[#0F2A44]" />
          <span>Cada técnico acessa apenas seus próprios dados.</span>
        </div>

        {!configured && (
          <div className="mb-4 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
            Supabase não configurado. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
          </div>
        )}

        {isLocked && (
          <div className="mb-4 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
            Muitas tentativas sem sucesso. Tente novamente em {remainingSeconds}s.
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#111827]">E-mail</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tecnico@empresa.com"
              className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1E4E7A]/20"
            />
            {emailError && <p className="mt-1 text-xs text-[#B91C1C]">{emailError}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#111827]">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 pr-11 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#1E4E7A]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#64748B] hover:bg-[#F1F5F9]"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-xs text-[#B91C1C]">{error}</div>}

          <Button
            type="submit"
            className="h-11 w-full gap-2 bg-[#0F2A44] text-white hover:bg-[#13395E]"
            disabled={loading || !configured || isLocked || Boolean(emailError)}
          >
            {loading ? (
              <>
                <ShieldCheck className="h-4 w-4 animate-pulse" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Entrar no sistema
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          <Link to="/recuperar-acesso" className="text-[#1E4E7A] hover:underline">
            Esqueci minha senha
          </Link>
          <a href="mailto:suporte@shieldos.com.br" className="text-[#64748B] hover:text-[#1E4E7A] hover:underline">
            Problemas para acessar?
          </a>
        </div>
      </div>
    </div>
  );
}
