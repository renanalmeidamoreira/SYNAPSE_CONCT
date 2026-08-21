import React, { useState, useEffect } from 'react';
import {
  Globe,
  X,
  ExternalLink,
  RefreshCw,
  FileText,
  Save,
  Sparkles,
  Copy,
  Check,
  BookOpen,
  ArrowUpRight,
  Maximize2,
  Minimize2,
  Loader2,
  ChevronRight,
  ShieldCheck,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { callGeminiAPI } from '../utils/gemini';

interface InAppWebViewerModalProps {
  url: string;
  title?: string;
  notesText?: string;
  onSaveNotes?: (text: string) => void;
  onClose: () => void;
}

/**
 * Formata URLs para versões que aceitam IFrame (Google Drive preview, YouTube embed, etc)
 */
function formatEmbeddableUrl(rawUrl: string): { formattedUrl: string; isKnownBlocked: boolean; domainName: string } {
  let urlStr = rawUrl.trim();
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `https://${urlStr}`;
  }

  let domainName = '';
  try {
    domainName = new URL(urlStr).hostname.toLowerCase();
  } catch {
    domainName = urlStr;
  }

  // 1. Google Drive PDF / Document -> Convert to /preview
  if (urlStr.includes('drive.google.com/file/d/')) {
    const match = urlStr.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (match && match[1]) {
      return {
        formattedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        isKnownBlocked: false,
        domainName,
      };
    }
  }
  if (urlStr.includes('drive.google.com/open?id=')) {
    const match = urlStr.match(/id=([^&]+)/);
    if (match && match[1]) {
      return {
        formattedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        isKnownBlocked: false,
        domainName,
      };
    }
  }

  // 2. YouTube Video -> Convert to /embed
  if (urlStr.includes('youtube.com/watch') || urlStr.includes('youtu.be/')) {
    let videoId = '';
    if (urlStr.includes('youtu.be/')) {
      videoId = urlStr.split('youtu.be/')[1]?.split('?')[0] || '';
    } else {
      const match = urlStr.match(/v=([^&]+)/);
      if (match) videoId = match[1];
    }
    if (videoId) {
      return {
        formattedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
        isKnownBlocked: false,
        domainName,
      };
    }
  }

  // 3. Known Strict Domains that block iframes
  const strictDomains = [
    'notebooklm.google.com',
    'notebook.google.com',
    'chatgpt.com',
    'openai.com',
    'accounts.google.com',
    'mail.google.com',
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
  ];

  const isKnownBlocked = strictDomains.some(
    (d) => domainName === d || domainName.endsWith('.' + d)
  );

  return {
    formattedUrl: urlStr,
    isKnownBlocked,
    domainName,
  };
}

export const InAppWebViewerModal: React.FC<InAppWebViewerModalProps> = ({
  url,
  title,
  notesText = '',
  onSaveNotes,
  onClose,
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>(url || 'https://concursosnobrasil.com/concursos/mg/');
  const [inputUrl, setInputUrl] = useState<string>(url || 'https://concursosnobrasil.com/concursos/mg/');
  const [pageTitle, setPageTitle] = useState<string>(title || 'Portal de Estudos Synapse');
  
  const [notes, setNotes] = useState<string>(notesText);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showNotesSidebar, setShowNotesSidebar] = useState<boolean>(true);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [useReaderMode, setUseReaderMode] = useState<boolean>(false);
  const [useProxy, setUseProxy] = useState<boolean>(true);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  const { formattedUrl, isKnownBlocked, domainName } = formatEmbeddableUrl(currentUrl);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let formatted = inputUrl.trim();
    if (formatted && !formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }

    try {
      const parsed = new URL(formatted);
      setPageTitle(parsed.hostname.replace('www.', ''));
    } catch {}

    setCurrentUrl(formatted);
    setInputUrl(formatted);
    setLoadError(false);
    setIframeKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setLoadError(false);
    setIframeKey((prev) => prev + 1);
  };

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(notes);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  const handleOpenExternal = () => {
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleSummarizeWithAI = async () => {
    setIsSummarizing(true);
    try {
      const prompt = `Analise e faça um resumo pedagógico estruturado do seguinte portal de concurso ou conteúdo de estudos (${currentUrl}):
- Órgão / Instituição
- Requisitos e Cargos
- Vagas e Remuneração
- Principais disciplinas a estudar
- Dica de estratégia de estudo`;

      const summary = await callGeminiAPI(prompt, 'Você é um assistente pedagógico de concursos do SYNAPSE.');
      const header = `\n\n--- 🤖 RESUMO SYNAPSE (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}) ---\n`;
      const newNotes = notes + header + summary + '\n-----------------------------------\n';
      setNotes(newNotes);
      if (onSaveNotes) {
        onSaveNotes(newNotes);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error('Erro ao resumir URL:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Determine iframe source
  let activeSrc = formattedUrl;
  if (useReaderMode) {
    activeSrc = `/api/reader-mode?url=${encodeURIComponent(formattedUrl)}`;
  } else if (useProxy && !formattedUrl.includes('drive.google.com') && !formattedUrl.includes('youtube.com')) {
    activeSrc = `/api/proxy-web?url=${encodeURIComponent(formattedUrl)}`;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200 overflow-hidden">
      {/* Unified Single Navigation Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 select-none shrink-0 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/50 px-2.5 py-1 rounded-xl shrink-0">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-200 truncate max-w-[200px] hidden sm:inline">
              {pageTitle}
            </span>
          </div>

          <form onSubmit={handleNavigate} className="flex-1 max-w-xl min-w-[220px]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono pr-8"
              />
              <button
                type="submit"
                className="absolute right-2 text-slate-400 hover:text-white p-1"
                title="Navegar"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors"
            title="Recarregar página"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopyUrl}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors"
            title="Copiar URL"
          >
            {hasCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Open Official Portal */}
          <button
            onClick={handleOpenExternal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30"
            title="Abrir no portal oficial em nova aba"
          >
            <span>Abrir no Portal Oficial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Sidebar */}
          <button
            onClick={() => setShowNotesSidebar(!showNotesSidebar)}
            className={`p-1.5 rounded-xl border transition-colors ${
              showNotesSidebar
                ? 'bg-indigo-950/80 border-indigo-600/60 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={showNotesSidebar ? 'Ocultar Caderno Lado a Lado' : 'Exibir Caderno Lado a Lado'}
          >
            {showNotesSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 rounded-xl border border-slate-800 hover:border-rose-700/50 transition-colors ml-1"
            title="Fechar Visualizador"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Split Web + Side Notes */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Web View Container */}
        <div className="flex-1 flex flex-col bg-slate-900 relative overflow-hidden">
          {isKnownBlocked ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 text-slate-200">
              <div className="max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Visualização de Segurança</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  O portal <strong className="text-slate-200">{domainName}</strong> requer autenticação direta no navegador para proteger sua sessão.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleOpenExternal}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <span>Abrir Página Oficial em Nova Aba</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <iframe
              key={`web-frame-${iframeKey}`}
              src={activeSrc}
              className="w-full h-full border-none bg-white"
              title={pageTitle}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
              onError={() => setLoadError(true)}
            />
          )}
        </div>

        {/* Side Notes & AI Assistant Panel */}
        {showNotesSidebar && (
          <div className="w-80 md:w-96 border-l border-slate-800 bg-slate-950 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Caderno de Anotações</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSummarizeWithAI}
                  disabled={isSummarizing}
                  className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50"
                  title="Resumir conteúdo com IA"
                >
                  {isSummarizing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                  )}
                  <span>Resumir IA</span>
                </button>
                <button
                  onClick={handleSaveNotes}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                    isSaved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                  <span>{isSaved ? 'Salvo!' : 'Salvar'}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-3 flex flex-col">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Digite suas anotações, destaques do edital e tópicos importantes aqui..."
                className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 resize-none font-sans leading-relaxed"
              />
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Sincronizado com a Estação</span>
                <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
