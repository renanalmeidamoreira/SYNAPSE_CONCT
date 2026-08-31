import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  ShieldCheck,
  Lock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Calendar,
  Compass,
  Cpu,
  Loader2,
  AlertTriangle,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from './AuthContext';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, loginAsGuest, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<{ message: string; isPopupBlocked?: boolean } | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setLoginError(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Falha no login:', err);
      const code = err?.code || '';
      const msg = String(err?.message || '');

      if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        setLoginError({
          message:
            'O navegador ou ambiente bloqueou a janela pop-up de login do Google. Desative o bloqueador de pop-ups ou acesse como Convidado.',
          isPopupBlocked: true,
        });
      } else if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        setLoginError({
          message: 'A janela de autenticação do Google foi fechada antes de concluir.',
        });
      } else if (code === 'auth/cancelled-popup-request') {
        setLoginError({
          message: 'Processo cancelado. Tente novamente.',
        });
      } else {
        setLoginError({
          message: err?.message || 'Falha ao autenticar com a conta Google.',
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-violet-600/20 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-cyan-600/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              SYNAPSE <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800/60">PRO</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Ambiente Seguro</span>
        </div>
      </header>

      {/* Main Hero & Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-7 md:p-9 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Estação de Estudos SYNAPSE</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Plataforma de alta performance para concurseiros. Faça login para acessar suas estações, cronogramas e simulados.
            </p>
          </div>

          {loginError && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                loginError.isPopupBlocked
                  ? 'bg-amber-950/60 border-amber-800/80 text-amber-200'
                  : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    loginError.isPopupBlocked ? 'text-amber-400' : 'text-rose-400'
                  }`}
                />
                <span className="leading-relaxed">{loginError.message}</span>
              </div>

              {loginError.isPopupBlocked && (
                <div className="pt-2 border-t border-amber-800/40 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-amber-300/80">Pop-up bloqueado?</span>
                  <button
                    onClick={handleGuestLogin}
                    className="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer"
                  >
                    Entrar como Visitante →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Login Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn || loading}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn || loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>Entrar com Gmail / Google</span>
            </button>

            <button
              onClick={handleGuestLogin}
              className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs rounded-2xl transition-all border border-slate-700/60 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Acessar Modo Demonstração / Convidado</span>
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-500">
                Prioridade de autenticação via Google Workspace & Gmail.
              </p>
            </div>
          </div>

          {/* Platform Highlights */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Varredura ativa de Editais de MG e Federais</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Estações de Estudo com IA e Flashcards</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Agenda de Estudos Compacta & Pomodoro Integrado</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-600">
        SYNAPSE Study Station • Todos os direitos reservados.
      </footer>
    </div>
  );
};
