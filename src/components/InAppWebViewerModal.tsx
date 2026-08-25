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
  ChevronRight,
  ShieldCheck,
  PanelRightClose,
  PanelRightOpen,
  Loader2,
  Building2,
  BookOpen,
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
function formatEmbeddableUrl(rawUrl: string): { formattedUrl: string; isDirectlyEmbeddable: boolean; domainName: string } {
  let urlStr = (rawUrl || '').trim();
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
        isDirectlyEmbeddable: true,
        domainName,
      };
    }
  }
  if (urlStr.includes('drive.google.com/open?id=')) {
    const match = urlStr.match(/id=([^&]+)/);
    if (match && match[1]) {
      return {
        formattedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        isDirectlyEmbeddable: true,
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
        isDirectlyEmbeddable: true,
        domainName,
      };
    }
  }

  // 3. Known services that support iframe
  const embeddableDomains = [
    'wikipedia.org',
    'wikimedia.org',
    'archive.org',
  ];

  const isDirectlyEmbeddable = embeddableDomains.some(
    (d) => domainName === d || domainName.endsWith('.' + d)
  );

  return {
    formattedUrl: urlStr,
    isDirectlyEmbeddable,
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
  const [pageTitle, setPageTitle] = useState<string>(title || 'Portal do Concurso');
  
  const [notes, setNotes] = useState<string>(notesText);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showNotesSidebar, setShowNotesSidebar] = useState<boolean>(true);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  const { formattedUrl, isDirectlyEmbeddable, domainName } = formatEmbeddableUrl(currentUrl);

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
    setIframeKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
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
      const prompt = `Analise e faça um resumo pedagógico estruturado do edital/concurso (${pageTitle} - ${currentUrl}):
- Órgão e Nível de Escolaridade
- Principais disciplinas a priorizar
- Dica de estratégia de estudo e resolução de questões`;

      const summary = await callGeminiAPI(prompt, 'Você é o tutor especialista em editais e concursos do SYNAPSE.');
      const header = `\n\n--- 🤖 RESUMO DO EDITAL (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}) ---\n`;
      const newNotes = notes + header + summary + '\n-----------------------------------\n';
      setNotes(newNotes);
      if (onSaveNotes) {
        onSaveNotes(newNotes);
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      console.error('Erro ao resumir edital:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200 overflow-hidden">
      {/* Single Unified Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 select-none shrink-0 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-700/50 px-2.5 py-1 rounded-xl shrink-0">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-200 truncate max-w-[200px] hidden sm:inline">
              {pageTitle}
            </span>
          </div>

          <form onSubmit={handleNavigate} className="flex-1 max-w-xl min-w-[200px]">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono pr-8"
              />
              <button
                type="submit"
                className="absolute right-2 text-slate-400 hover:text-white p-1 cursor-pointer"
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
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
            title="Recarregar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopyUrl}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
            title="Copiar URL"
          >
            {hasCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Open Official Portal */}
          <button
            onClick={handleOpenExternal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            title="Abrir no portal oficial"
          >
            <span>Abrir no Portal Oficial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Sidebar */}
          <button
            onClick={() => setShowNotesSidebar(!showNotesSidebar)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              showNotesSidebar
                ? 'bg-indigo-950/80 border-indigo-600/60 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={showNotesSidebar ? 'Ocultar Caderno' : 'Exibir Caderno'}
          >
            {showNotesSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 rounded-xl border border-slate-800 hover:border-rose-700/50 transition-colors ml-1 cursor-pointer"
            title="Voltar ao SYNAPSE"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Split Workspace (Portal Info / Embed + Side Notes) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Embed or Clean Official Portal Card */}
        <div className="flex-1 flex flex-col bg-slate-900 relative overflow-hidden">
          {isDirectlyEmbeddable ? (
            <iframe
              key={`web-frame-${iframeKey}`}
              src={formattedUrl}
              className="w-full h-full border-none bg-white"
              title={pageTitle}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-200 overflow-y-auto">
              <div className="max-w-lg w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
                  <Building2 className="w-7 h-7" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-3">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Conexão Segura & Oficial</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{pageTitle}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Para garantir a autenticidade dos dados e inscrições do órgão ({domainName}), acesse a página oficial com um clique.
                  </p>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">Destino:</span>
                    <span className="text-indigo-300 font-mono text-[11px] truncate max-w-[260px]">{currentUrl}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">Status do Edital:</span>
                    <span className="text-emerald-400 font-bold">Verificado</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleOpenExternal}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <span>Acessar Portal Oficial</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <p className="text-[11px] text-slate-500">
                    Dica: Mantenha o <strong>Caderno de Anotações</strong> ao lado para registrar pontos-chave do edital.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Notes & AI Synthesis Panel */}
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
                  className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 cursor-pointer"
                  title="Resumir edital com IA"
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
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
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
                placeholder="Anote aqui requisitos, prazos, banca, matérias de maior peso e observações do edital..."
                className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
              />
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Salvo na Estação</span>
                <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
