import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Layers,
  FileText,
  Radio,
  X,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export const NotebookLMSynapseBridge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('https://notebooklm.google.com');
  const [status, setStatus] = useState<'ready' | 'launching' | 'connected'>('ready');
  const [notebookActiveBadge, setNotebookActiveBadge] = useState(false);

  useEffect(() => {
    const handleOpenNotebook = (e: CustomEvent<{ url?: string }>) => {
      const url = e.detail?.url || localStorage.getItem('synapse_notebooklm_url') || 'https://notebooklm.google.com';
      setTargetUrl(url);
      setIsOpen(true);
      setStatus('ready');
    };

    window.addEventListener('open-notebooklm-bridge' as any, handleOpenNotebook as any);
    return () => {
      window.removeEventListener('open-notebooklm-bridge' as any, handleOpenNotebook as any);
    };
  }, []);

  const handleLaunch = () => {
    setStatus('launching');
    
    setTimeout(() => {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      setStatus('connected');
      setNotebookActiveBadge(true);
      
      // Auto close bridge dialog after launch
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    }, 600);
  };

  return (
    <>
      {/* Floating Active NotebookLM Companion Pill (gives native ecosystem feel) */}
      {notebookActiveBadge && (
        <div className="fixed top-20 right-6 z-30 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 bg-slate-900/95 dark:bg-slate-950/95 text-slate-200 border border-amber-500/40 px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="font-bold text-[11px] text-white flex items-center gap-1">
                NotebookLM Conectado
              </span>
              <span className="text-[9px] text-slate-400">Trabalhando em aba paralela</span>
            </div>
            <button
              onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
              className="ml-1 p-1 hover:bg-slate-800 rounded-lg text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
              title="Reabrir aba do NotebookLM"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setNotebookActiveBadge(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Dispensar aviso"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* SYNAPSE-Branded Bridge Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with SYNAPSE Gradient */}
            <div className="relative p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white overflow-hidden border-b border-slate-800">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-10 mb-3">
                <div className="inline-flex items-center gap-1.5 bg-indigo-900/60 border border-indigo-500/30 text-cyan-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>SYNAPSE • Google Bridge</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-bold text-white leading-tight mb-1">
                Espaço de Estudos Google NotebookLM
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Abrindo seu ambiente de resumos e podcast com integração e sincronização visual no SYNAPSE.
              </p>
            </div>

            {/* Features Info List */}
            <div className="p-5 space-y-3.5">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Multitarefa Paralela</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Use o NotebookLM em tela cheia ou lado a lado mantendo o cronômetro Pomodoro e suas estações ativas.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Geração de Áudio e Roteiros</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sintetize apostilas e ouça os episódios de revisão diretamente pela inteligência oficial.
                  </p>
                </div>
              </div>

              {/* Status / Launch Action */}
              <div className="pt-2">
                <button
                  onClick={handleLaunch}
                  disabled={status === 'launching'}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-75"
                >
                  {status === 'launching' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-200" />
                      <span>Conectando ao NotebookLM...</span>
                    </>
                  ) : status === 'connected' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Espaço Conectado!</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no Google NotebookLM</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  Autenticação e dados vinculados à sua conta oficial Google
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
