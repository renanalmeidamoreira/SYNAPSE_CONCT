import { useAuth } from './AuthContext';
import { Network, Sparkles, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginScreen = () => {
  const { login, loginAsGuest } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4">
      <div className="max-w-md w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center mb-1">
          <div className="w-full h-full bg-slate-100 dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
            <Network size={32} className="text-cyan-400" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-200 bg-clip-text text-transparent">
            SYNAPSE v5.0
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Sua estação de estudos unificada. Sessão persistente com sincronização automática entre Google NotebookLM, Drive, Docs e Portais.
          </p>
        </div>

        <div className="w-full bg-slate-200/60 dark:bg-slate-800/60 border border-slate-300/50 dark:border-slate-700/50 rounded-xl p-3 text-left space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>Sessão Persistente Salva:</strong> Evita mensagens de 'token expired' e mantém você logado ao recarregar a página.</span>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span><strong>Conexão Unificada Google:</strong> O login conecta simultaneamente o NotebookLM e outros serviços sem solicitar novas senhas.</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold py-3.5 px-4 rounded-xl shadow-lg border border-slate-200 transition-all cursor-pointer hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            <span className="text-sm font-semibold text-slate-800">Fazer login com o Google</span>
          </button>

          <button
            onClick={() => loginAsGuest()}
            className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors text-xs cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Acessar Modo Local / Concurseiro Persistente</span>
          </button>
        </div>
      </div>
    </div>
  );
};

