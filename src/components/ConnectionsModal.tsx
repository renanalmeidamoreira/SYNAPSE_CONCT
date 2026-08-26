import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Mic,
  MapPin,
  Globe,
  Video,
  LogOut,
  LogIn,
  RefreshCw,
  SlidersHorizontal,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface ConnectionsModalProps {
  onClose: () => void;
}

export type ConnectionStatus =
  | 'NOT_REQUIRED'
  | 'AVAILABLE'
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DENIED'
  | 'EXPIRED'
  | 'ERROR';

export const ConnectionsModal: React.FC<ConnectionsModalProps> = ({ onClose }) => {
  const { user, googleAccessToken, authorizeYouTube, logout } = useAuth();

  const [youtubeStatus, setYoutubeStatus] = useState<ConnectionStatus>(() => {
    const token = googleAccessToken || localStorage.getItem('synapse_youtube_token');
    return token ? 'CONNECTED' : 'NOT_CONNECTED';
  });

  const [micStatus, setMicStatus] = useState<ConnectionStatus>('NOT_CONNECTED');
  const [micMessage, setMicMessage] = useState<string>('Sob demanda (solicitado apenas ao gravar voz)');
  const [isConnectingYT, setIsConnectingYT] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);

  // Check microphone permission status if supported
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            setMicStatus('CONNECTED');
            setMicMessage('Autorizado no navegador');
          } else if (permissionStatus.state === 'denied') {
            setMicStatus('DENIED');
            setMicMessage('Bloqueado nas configurações do navegador');
          } else {
            setMicStatus('NOT_CONNECTED');
            setMicMessage('Sob demanda (solicitado ao gravar)');
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              setMicStatus('CONNECTED');
              setMicMessage('Autorizado no navegador');
            } else if (permissionStatus.state === 'denied') {
              setMicStatus('DENIED');
              setMicMessage('Bloqueado nas configurações do navegador');
            } else {
              setMicStatus('NOT_CONNECTED');
              setMicMessage('Sob demanda (solicitado ao gravar)');
            }
          };
        })
        .catch(() => {
          // fallback
          setMicStatus('AVAILABLE');
        });
    }
  }, []);

  const handleConnectYouTube = async () => {
    setIsConnectingYT(true);
    setYtError(null);
    try {
      const token = await authorizeYouTube();
      if (token) {
        setYoutubeStatus('CONNECTED');
      } else {
        setYoutubeStatus('NOT_CONNECTED');
      }
    } catch (err: any) {
      console.warn('[ConnectionsModal YouTube]:', err);
      const msg = err?.message || '';
      if (msg.includes('POPUP_BLOCKED')) {
        setYtError('Pop-up bloqueado pelo navegador. Permita pop-ups para autorizar o YouTube.');
      } else if (msg.includes('fechada')) {
        setYtError('A janela de autorização foi fechada antes de concluir.');
      } else {
        setYtError('Não foi possível conectar ao YouTube no momento.');
      }
      setYoutubeStatus('NOT_CONNECTED');
    } finally {
      setIsConnectingYT(false);
    }
  };

  const handleDisconnectYouTube = () => {
    localStorage.removeItem('synapse_youtube_token');
    localStorage.removeItem('synapse_google_access_token');
    setYoutubeStatus('NOT_CONNECTED');
  };

  const handleRequestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('CONNECTED');
      setMicMessage('Microfone testado e autorizado com sucesso!');
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      setMicStatus('DENIED');
      setMicMessage('Acesso ao microfone foi negado pelo navegador.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-xl w-full flex flex-col shadow-2xl text-slate-900 dark:text-slate-100 font-sans max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Conexões & Autorizações</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  Sob Demanda
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie serviços externos. O núcleo do SYNAPSE nunca é bloqueado por itens opcionais.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar text-xs">
          {/* 1. Conta SYNAPSE / Google Auth */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Conta SYNAPSE / Google
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                    ✓ Ativo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {user?.email ? `Sessão ativa: ${user.email}` : 'Modo visitante local ativo (sem bloqueio de estudos)'}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                Núcleo Principal
              </span>
            </div>
          </div>

          {/* 2. YouTube (Opcional - Playlists Pessoais) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                  <Globe className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                      YouTube (Playlists Pessoais)
                    </span>
                    {youtubeStatus === 'CONNECTED' ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                        ✓ Conectado
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.2 rounded-full">
                        ○ Opcional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Permite importar suas playlists particulares no player. (O player de foco e rádios integradas funcionam normalmente sem login).
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                {youtubeStatus === 'CONNECTED' ? (
                  <button
                    onClick={handleDisconnectYouTube}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={handleConnectYouTube}
                    disabled={isConnectingYT}
                    className="text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isConnectingYT ? 'Conectando...' : 'Conectar YouTube'}
                  </button>
                )}
              </div>
            </div>

            {ytError && (
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{ytError}</span>
              </div>
            )}
          </div>

          {/* 3. Microfone & Transcrição de Voz */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                <Mic className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Microfone & Transcrição por Voz
                  </span>
                  {micStatus === 'CONNECTED' ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                      ✓ Autorizado
                    </span>
                  ) : micStatus === 'DENIED' ? (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.2 rounded-full">
                      ⚠️ Negado
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.2 rounded-full">
                      ○ Sob demanda
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {micMessage}. O chat de texto e o restante da plataforma funcionam integralmente sem microfone.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <button
                onClick={handleRequestMic}
                className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
              >
                {micStatus === 'CONNECTED' ? 'Testar Novamente' : 'Permitir'}
              </button>
            </div>
          </div>

          {/* 4. Assistente Gemini IA (Server-Side) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Assistente Gemini IA
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 rounded-full">
                    ✓ Ativo (Servidor)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tutor de questões, discursivas e jurisprudência integrado com segurança via backend sem expor credenciais.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">Auto</span>
            </div>
          </div>

          {/* 5. Google Search Grounding */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Globe className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Pesquisa Google (Search Grounding)
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.2 rounded-full">
                    ✓ Sistema
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Permite ao tutor buscar no Google Leis vigentes, Diários Oficiais e notícias de bancas examinadoras.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">Sob demanda</span>
            </div>
          </div>

          {/* 6. Google Maps Grounding */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Google Maps Grounding
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.2 rounded-full">
                    ○ Sob demanda
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Ativado exclusivamente em perguntas com contexto geográfico (salas de estudo, bibliotecas, locais de prova).
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </div>
          </div>

          {/* 7. Estúdio de Vídeo Veo 3 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 shrink-0">
                <Video className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    Estúdio de Vídeo Mnemônico Veo 3
                  </span>
                  <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.2 rounded-full">
                    ✓ Disponível
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Geração de vídeos animados conceituais em alta definição (16:9 e 9:16) para fixação visual.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Arquitetura <strong>Zero Bloqueio Global</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
