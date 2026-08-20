import React, { useState } from 'react';
import {
  ShieldAlert,
  Mail,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  BrainCircuit,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { SUPER_ADMIN_EMAIL } from '../lib/firebase';

export const UnauthorizedScreen: React.FC = () => {
  const { userEmail, logout, recheckAccess } = useAuth();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(userEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCheckAgain = async () => {
    setChecking(true);
    await recheckAccess();
    setTimeout(() => setChecking(false), 800);
  };

  const mailToUrl = `mailto:${SUPER_ADMIN_EMAIL}?subject=Solicita%C3%A7%C3%A3o%20de%20Acesso%20ao%20SYNAPSE&body=Ol%C3%A1,%20gostaria%20de%20solicitar%20a%20autoriza%C3%A7%C3%A3o%20de%20acesso%20ao%20SYNAPSE%20para%20o%20meu%20e-mail:%20${encodeURIComponent(
    userEmail
  )}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white relative overflow-hidden font-sans">
      {/* Red Glow Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-600/15 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-amber-600/15 blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 p-[1px] shadow-lg shadow-rose-500/25">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              SYNAPSE <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800/60">RESTRITO</span>
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Trocar de Conta</span>
        </button>
      </header>

      {/* Main Access Denied Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-slate-900/90 border border-rose-900/40 rounded-3xl p-7 md:p-9 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/60 text-rose-400 mb-1">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Acesso Pendente de Autorização</h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              A plataforma SYNAPSE possui controle de acesso restrito. Seu e-mail do Google ainda não consta na lista de usuários autorizados pelo administrador.
            </p>
          </div>

          {/* Email Info Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">E-mail Conectado</div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-rose-300 truncate">{userEmail}</span>
              <button
                onClick={handleCopyEmail}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Copiar e-mail"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Action to request authorization */}
          <div className="space-y-3">
            <div className="text-xs text-slate-400 text-center">
              Para liberar o seu acesso, envie uma solicitação ao administrador da plataforma:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={mailToUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Solicitar por E-mail</span>
                <ExternalLink className="w-3 h-3 text-indigo-200" />
              </a>

              <button
                onClick={handleCheckAgain}
                disabled={checking}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin text-indigo-400' : ''}`} />
                <span>Já fui autorizado (Recarregar)</span>
              </button>
            </div>
          </div>

          {/* Admin contact pill */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <span>Administrador Responsável:</span>
            <span className="font-mono text-slate-300 font-bold">{SUPER_ADMIN_EMAIL}</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-600">
        SYNAPSE Study Station • Segurança e Governança de Acesso.
      </footer>
    </div>
  );
};
