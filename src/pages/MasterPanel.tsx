import { useEffect, useState } from "react";
import {
  listCompaniesForMaster,
  masterUpdateCompany,
  CompanySubscriptionView,
  listUsersForMaster,
  masterUpdateUser,
  MasterUserRow,
} from "@/lib/supabaseRest";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

type StatusValue = "ativa" | "bloqueada" | "cancelada";

export default function MasterPanel() {
  const { isMaster } = useAuth();
  const [items, setItems] = useState<CompanySubscriptionView[]>([]);
  const [users, setUsers] = useState<MasterUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [savingUserId, setSavingUserId] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const [data, usersData] = await Promise.all([listCompaniesForMaster(), listUsersForMaster()]);
        setItems(data);
        setUsers(usersData);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar empresas.");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  if (!isMaster) {
    return <Navigate to="/" replace />;
  }

  const updateRow = async (row: CompanySubscriptionView, status: StatusValue, vencimento: string) => {
    setSavingId(row.id);
    try {
      await masterUpdateCompany(row.id, status, vencimento);
      setItems((prev) =>
        prev.map((item) =>
          item.id === row.id ? { ...item, status_assinatura: status, vencimento } : item
        )
      );
      toast.success("Empresa atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar empresa.");
    } finally {
      setSavingId("");
    }
  };

  const saveUser = async (row: MasterUserRow) => {
    setSavingUserId(row.id);
    try {
      await masterUpdateUser(row.id, { nome: row.nome, role: row.role || "tecnico", ativo: row.ativo });
      toast.success("Usuário atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar usuario.");
    } finally {
      setSavingUserId("");
    }
  };

  return (
    <div className="premium-page animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Painel Master</h2>
        <p className="text-sm text-muted-foreground">Gerencie empresas, assinaturas e usuarios de todo o sistema.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando empresas...</div>
      ) : (
        <div className="premium-table-shell overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const venc = row.vencimento ? row.vencimento.slice(0, 10) : "";
                return (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{row.nome_empresa}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.email_principal || "-"}</td>
                    <td className="px-4 py-3">{row.plano || "elite"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={row.status_assinatura}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, status_assinatura: e.target.value as StatusValue }
                                : item
                            )
                          )
                        }
                        className="h-9 rounded-lg border border-input bg-card px-2"
                      >
                        <option value="ativa">ativa</option>
                        <option value="bloqueada">bloqueada</option>
                        <option value="cancelada">cancelada</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={venc}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? {
                                    ...item,
                                    vencimento: `${e.target.value}T00:00:00.000Z`,
                                  }
                                : item
                            )
                          )
                        }
                        className="h-9 rounded-lg border border-input bg-card px-2"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        onClick={() =>
                          updateRow(
                            row,
                            row.status_assinatura as StatusValue,
                            row.vencimento || new Date().toISOString()
                          )
                        }
                        disabled={savingId === row.id}
                      >
                        {savingId === row.id ? "Salvando..." : "Salvar"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="premium-table-shell overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-left">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Sistema</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {users.map((row) => (
              <tr key={row.id} className="border-t border-border/60">
                <td className="px-4 py-3">
                  <input
                    value={row.nome}
                    onChange={(e) =>
                      setUsers((prev) => prev.map((item) => (item.id === row.id ? { ...item, nome: e.target.value } : item)))
                    }
                    className="h-9 w-full rounded-lg border border-input bg-card px-2"
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.email || "-"}</td>
                <td className="px-4 py-3">
                  {row.role_system === "super_admin" || row.role === "master_admin" ? (
                    <span className="font-medium">master_admin</span>
                  ) : (
                    <select
                      value={row.role || "tecnico"}
                      onChange={(e) =>
                        setUsers((prev) =>
                          prev.map((item) => (item.id === row.id ? { ...item, role: e.target.value } : item))
                        )
                      }
                      className="h-9 rounded-lg border border-input bg-card px-2"
                    >
                      <option value="admin">admin</option>
                      <option value="atendente">atendente</option>
                      <option value="tecnico">tecnico</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.role_system || "-"}</td>
                <td className="px-4 py-3">
                  {row.role_system === "super_admin" || row.role === "master_admin" ? (
                    <span className="font-medium">sempre ativo</span>
                  ) : (
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.ativo}
                        onChange={(e) =>
                          setUsers((prev) =>
                            prev.map((item) => (item.id === row.id ? { ...item, ativo: e.target.checked } : item))
                          )
                        }
                      />
                      {row.ativo ? "Ativo" : "Inativo"}
                    </label>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(row.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    onClick={() => void saveUser(row)}
                    disabled={savingUserId === row.id || row.role_system === "super_admin" || row.role === "master_admin"}
                  >
                    {savingUserId === row.id ? "Salvando..." : "Salvar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
