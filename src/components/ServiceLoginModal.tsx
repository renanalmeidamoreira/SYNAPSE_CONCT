import React, { useState } from 'react';
import {
  X,
  Music2,
  Cpu,
  Server,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  Save,
  Radio,
  ExternalLink,
  Shield,
  Loader2,
} from 'lucide-react';
import { useServiceAuthContext } from '../context/ServiceAuthContext';

interface ServiceLoginModalProps {
  onClose: () => void;
  initialTab?: 'music' | 'gemini' | 'llamafile';
}

export const ServiceLoginModal: React.FC<ServiceLoginModalProps> = ({
  onClose,
  initialTab = 'music',
}) => {
  const { googleMusic, gemini, getServiceStatusList } = useServiceAuthContext();
  const [activeTab, setActiveTab] = useState<'music' | 'gemini' | 'llamafile'>(initialTab);

  // Gemini state
  const [customKeyInput, setCustomKeyInput] = useState(gemini.apiKey || '');
  const [selectedModel, setSelectedModel] = useState(gemini.preferredModel);
  const [geminiSaved, setGeminiSaved] = useState(false);

  // Llamafile state
  const [llamaEnabled, setLlamaEnabled] = useState(gemini.useLocalLlamafile);
  const [llamaEndpoint, setLlamaEndpoint] = useState(gemini.llamafileEndpoint);
  const [llamaSaved, setLlamaSaved] = useState(false);

  // Google Music Login
  const handleGoogleMusicLogin = async () => {
    try {
      await googleMusic.loginGoogleMusic();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Erro ao conectar Google Music:', err);
      }
    }
  };

  // Gemini Save
  const handleSaveGemini = () => {
    gemini.saveCustomApiKey(customKeyInput);
    gemini.setPreferredModel(selectedModel);
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 2500);
  };

  // Llamafile Save
  const handleSaveLlamafile = () => {
    gemini.toggleLocalLlamafile(llamaEnabled, llamaEndpoint);
    setLlamaSaved(true);
    setTimeout(() => setLlamaSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl text-slate-100 font-sans flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                Gerenciador de Serviços & Autenticações
              </h3>
              <p className="text-xs text-slate-400">
                Configure acessos segregados a serviços externos e IAs locais
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('music')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'music'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Music2 className="w-4 h-4" />
            <span>Google Music</span>
          </button>

          <button
            onClick={() => setActiveTab('gemini')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'gemini'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Gemini AI</span>
          </button>

          <button
            onClick={() => setActiveTab('llamafile')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'llamafile'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Llamafile Local</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs custom-scrollbar">
          {/* TAB 1: GOOGLE MUSIC */}
          {activeTab === 'music' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music2 className="w-4 h-4 text-red-400" />
                    <span className="font-bold text-white text-sm">YouTube / Google Music</span>
                  </div>
                  {googleMusic.isAuthenticated ? (
                    <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">
                      Desconectado
                    </span>
                  )}
                </div>

                <p className="text-slate-400 leading-relaxed text-xs">
                  Conecte sua conta do YouTube para sincronizar suas playlists personalizadas de estudo diretamente no Player de Foco SYNAPSE.
                </p>

                {googleMusic.error && (
                  <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{googleMusic.error}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  {googleMusic.isAuthenticated ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-slate-300 text-xs truncate max-w-[220px]">
                        {googleMusic.userEmail || 'Conta vinculada'}
                      </span>
                      <button
                        onClick={googleMusic.logoutGoogleMusic}
                        className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/50 text-rose-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Desconectar</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleMusicLogin}
                      disabled={googleMusic.isLoading}
                      className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
                    >
                      {googleMusic.isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>Autenticar com Google Music / YouTube</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GEMINI AI CONFIG */}
          {activeTab === 'gemini' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white text-sm">Google Gemini AI</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2.5 py-0.5 rounded-full font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Integrado
                  </span>
                </div>

                <p className="text-slate-400 leading-relaxed text-xs">
                  Por padrão, o SYNAPSE utiliza a chave integrada do servidor. Você pode configurar uma chave própria ou selecionar o modelo preferido.
                </p>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Modelo Preferido de IA
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Ultra Baixa Latência / Recomendado)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (Geral Alta Performance)</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Raciocínio Jurídico Profundo)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Chave Gemini API Customizada (Opcional)
                  </label>
                  <input
                    type="password"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder="Deixe em branco para usar a chave padrão do SYNAPSE..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveGemini}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      geminiSaved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{geminiSaved ? 'Configurações Salvas!' : 'Salvar Preferências'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LLAMAFILE LOCAL */}
          {activeTab === 'llamafile' && (
            <div className="space-y-4">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-sm">Llamafile (IA Local Offline)</span>
                  </div>
                  {llamaEnabled ? (
                    <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-[11px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">
                      Inativo
                    </span>
                  )}
                </div>

                <p className="text-slate-400 leading-relaxed text-xs">
                  O Llamafile permite rodar LLMs locais (Mistral, LLaMA, Phi) de forma 100% offline em sua máquina ou servidor dedicado.
                </p>

                <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <input
                    type="checkbox"
                    id="enable-llamafile-check"
                    checked={llamaEnabled}
                    onChange={(e) => setLlamaEnabled(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="enable-llamafile-check" className="text-xs font-semibold text-slate-200 cursor-pointer">
                    Habilitar roteamento para Llamafile local
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Endpoint do Llamafile
                  </label>
                  <input
                    type="text"
                    value={llamaEndpoint}
                    onChange={(e) => setLlamaEndpoint(e.target.value)}
                    placeholder="http://127.0.0.1:8080"
                    disabled={!llamaEnabled}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-40 font-mono"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveLlamafile}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      llamaSaved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{llamaSaved ? 'Configurações Salvas!' : 'Salvar Llamafile'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
