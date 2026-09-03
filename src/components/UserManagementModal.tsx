import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  CheckCircle2,
  X,
  Loader2,
  Search,
  Mail,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  AuthorizedUserRecord,
  listAuthorizedUsers,
  addAuthorizedEmail,
  deleteAuthorizedEmail,
  revokeAuthorizedEmail,
  SUPER_ADMIN_EMAIL,
  isSuperAdminEmail,
} from '../lib/firebase';
import { useAuth } from './AuthContext';

interface UserManagementModalProps {
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ onClose }) => {
  const { userEmail } = useAuth();

  // Apenas o Super User r.fabulous.30@gmail.com possui acesso a este modal
  if (!isSuperAdminEmail(userEmail)) {
    return null;
  }

  const [users, setUsers] = useState<AuthorizedUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'student' | 'guest'>('student');
  const [newNotes, setNewNotes] = useState('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await listAuthorizedUsers();
      setUsers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    if (!newEmail.includes('@')) {
      setFormError('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    try {
      setActionLoading(true);
      setFormError(null);
      setFormSuccess(null);

      await addAuthorizedEmail(newEmail.trim(), newRole, newNotes.trim(), userEmail || SUPER_ADMIN_EMAIL);
      setFormSuccess(`E-mail ${newEmail.trim().toLowerCase()} autorizado com sucesso!`);
      setNewEmail('');
      setNewNotes('');
      await fetchUsers();
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setFormError('Erro ao autorizar e-mail. Verifique a conexão.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (email: string) => {
    if (isSuperAdminEmail(email)) return;
    if (!window.confirm(`Deseja realmente remover o acesso de ${email}?`)) return;

    try {
      setActionLoading(true);
      await deleteAuthorizedEmail(email);
      await fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.notes && u.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>Gestão de Acesso & E-mails Autorizados</span>
                <span className="text-[10px] uppercase font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-800">
                  SYNAPSE Gatekeeper
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apenas e-mails do Gmail cadastrados nesta lista conseguem logar na plataforma.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add User Form */}
          <form
            onSubmit={handleAddUser}
            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 md:p-5 space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              <span>Autorizar Novo E-mail (Gmail / Google)</span>
            </div>

            {formSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="student">Papel: Estudante</option>
                  <option value="admin">Papel: Administrador</option>
                  <option value="guest">Papel: Convidado</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Autorizar Acesso</span>
                </button>
              </div>
            </div>

            <div>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Observação (ex: Nome do aluno, concurseiro parceiro)..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </form>

          {/* Search & Counter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por e-mail..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Total de usuários cadastrados: <strong>{users.length}</strong>
            </div>
          </div>

          {/* List of Users */}
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Carregando lista de autorizados...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u) => {
                const isSuper = isSuperAdminEmail(u.email);

                return (
                  <div
                    key={u.email}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isSuper
                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                        }`}
                      >
                        {isSuper ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-white font-mono truncate">
                            {u.email}
                          </span>
                          <span
                            className={`text-[9px] uppercase font-extrabold px-1.5 py-0.2 rounded-md ${
                              isSuper
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : u.role === 'admin'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isSuper ? 'Super Admin' : u.role}
                          </span>
                        </div>

                        {u.notes && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {u.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isSuper ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold px-2 py-1 bg-amber-50 dark:bg-amber-950/60 rounded-lg">
                          Protegido
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDelete(u.email)}
                          disabled={actionLoading}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Remover acesso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-xs text-slate-500">
          <span>Usuário logado: <strong>{userEmail}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-semibold transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
