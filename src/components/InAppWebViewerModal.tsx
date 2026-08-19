import React, { useState, useEffect } from 'react';
import {
  Globe,
  X,
  ExternalLink,
  RefreshCw,
  FileText,
  Save,
  Sparkles,
  ShieldAlert,
  Copy,
  Check,
  BookOpen,
  Layout,
  Plus,
  Maximize2,
  Minimize2,
  Layers,
  ArrowUpRight,
  CornerDownLeft,
  ChevronLeft,
  ChevronRight,
  Monitor,
} from 'lucide-react';

interface InAppWebViewerModalProps {
  url: string;
  title?: string;
  notesText?: string;
  onSaveNotes?: (text: string) => void;
  onClose: () => void;
}

export interface TabItem {
  id: string;
  title: string;
  url: string;
  inputUrl: string;
  useProxyMode: boolean;
  useReaderMode: boolean;
  isPoppedOut: boolean;
  popoutWindowRef?: Window | null;
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

  // 3. Known Strict Domains
  const strictDomains = [
    'notebooklm.google.com',
    'notebook.google.com',
    'chatgpt.com',
    'openai.com',
    'github.com',
    'notion.so',
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
  // Configuração inicial de abas (Tabs)
  const [tabs, setTabs] = useState<TabItem[]>(() => [
    {
      id: 'tab-1',
      title: title || 'Página Principal',
      url: url,
      inputUrl: url,
      useProxyMode: true,
      useReaderMode: false,
      isPoppedOut: false,
    },
    {
      id: 'tab-notebook',
      title: 'Google NotebookLM',
      url: 'https://notebooklm.google.com',
      inputUrl: 'https://notebooklm.google.com',
      useProxyMode: true,
      useReaderMode: false,
      isPoppedOut: false,
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Obter aba ativa
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const [notes, setNotes] = useState<string>(notesText);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isExpandedNotes, setIsExpandedNotes] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Verification & proxy states per active tab
  const [isBlockedFrame, setIsBlockedFrame] = useState<boolean>(false);
  const [checkReason, setCheckReason] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab) {
      verifyUrl(activeTab.url);
    }
  }, [activeTabId]);

  // Listener para eventos de reanexar vindos da janela lado a lado
  useEffect(() => {
    const handleRedockMessage = (data: any) => {
      if (data && data.type === 'SYNAPSE_REDOCK_TAB') {
        const winName = data.windowName || '';
        setTabs((prev) =>
          prev.map((t) => {
            if (
              (winName && winName.includes(t.id)) ||
              t.isPoppedOut ||
              t.id === activeTabId
            ) {
              if (t.popoutWindowRef && !t.popoutWindowRef.closed) {
                try {
                  t.popoutWindowRef.close();
                } catch (e) {}
              }
              return { ...t, isPoppedOut: false, popoutWindowRef: null };
            }
            return t;
          })
        );
        setIframeKey((prev) => prev + 1);
      }
    };

    const onWindowMessage = (event: MessageEvent) => {
      handleRedockMessage(event.data);
    };

    window.addEventListener('message', onWindowMessage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('synapse_channel');
      bc.onmessage = (event) => {
        handleRedockMessage(event.data);
      };
    } catch (e) {}

    // Polling interval para detectar fechamento manual da janela lado a lado e reanexar automaticamente no SY
    const interval = setInterval(() => {
      setTabs((prev) => {
        let hasChanges = false;
        const nextTabs = prev.map((t) => {
          if (t.isPoppedOut && t.popoutWindowRef && t.popoutWindowRef.closed) {
            hasChanges = true;
            return { ...t, isPoppedOut: false, popoutWindowRef: null };
          }
          return t;
        });
        if (hasChanges) {
          setIframeKey((k) => k + 1);
          return nextTabs;
        }
        return prev;
      });
    }, 600);

    return () => {
      window.removeEventListener('message', onWindowMessage);
      if (bc) bc.close();
      clearInterval(interval);
    };
  }, [activeTabId]);

  const verifyUrl = async (targetUrl: string) => {
    setIsChecking(true);
    const { formattedUrl, isKnownBlocked, domainName } = formatEmbeddableUrl(targetUrl);

    if (isKnownBlocked) {
      setIsBlockedFrame(true);
      setCheckReason(`O domínio ${domainName} utiliza restrição HTTP. O Proxy Backend Synapse está ativo para livre navegação.`);
      setIsChecking(false);
      return;
    }

    try {
      const res = await fetch(`/api/check-frame-support?url=${encodeURIComponent(formattedUrl)}`);
      const data = await res.json();

      if (data && data.embeddable === false) {
        setIsBlockedFrame(true);
        setCheckReason(
          data.message || `O site ${domainName} restringe incorporação direta e foi direcionado ao Proxy Backend Synapse.`
        );
      } else {
        setIsBlockedFrame(false);
        setCheckReason('');
      }
    } catch {
      setIsBlockedFrame(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Atualizar aba ativa
  const updateActiveTab = (updates: Partial<TabItem>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t))
    );
  };

  // Criar nova aba
  const handleAddNewTab = (initialUrl = 'https://notebooklm.google.com', customTitle = 'Nova Guia') => {
    const newId = `tab-${Date.now()}`;
    const newTab: TabItem = {
      id: newId,
      title: customTitle,
      url: initialUrl,
      inputUrl: initialUrl,
      useProxyMode: true,
      useReaderMode: false,
      isPoppedOut: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
    setIframeKey((prev) => prev + 1);
  };

  // Fechar aba
  const handleCloseTab = (e: React.MouseEvent, tabIdToClose: string) => {
    e.stopPropagation();
    if (tabs.length <= 1) return; // Manter pelo menos 1 aba
    const remaining = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(remaining);
    if (activeTabId === tabIdToClose) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  // Deslocar / Destacar para Janela Lado a Lado (Pop-out)
  const handlePopoutTab = (tabToPop = activeTab) => {
    const width = 960;
    const height = 820;
    const left = Math.max(0, window.screen.width - width - 40);
    const top = 40;

    // Utilizar a rota do Shell para garantir a barra de topo com o botão Reanexar fixado no topo da janela destacada
    const shellUrl = `/api/popout-shell?url=${encodeURIComponent(tabToPop.url)}&tabId=${encodeURIComponent(tabToPop.id)}&title=${encodeURIComponent(tabToPop.title)}`;
    const windowName = `SynapseTab_${tabToPop.id}`;

    const novaJanela = window.open(
      shellUrl,
      windowName,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    if (!novaJanela) {
      alert(
        "⚠️ O seu navegador bloqueou a abertura da janela Lado a Lado.\n\n" +
        "Como permitir pop-ups para usar este recurso:\n" +
        "1. Clique no ícone de bloqueio de pop-up na barra de endereços do seu navegador (no canto superior direito).\n" +
        "2. Selecione 'Sempre permitir pop-ups e redirecionamentos para este site'.\n" +
        "3. Clique em 'Concluído' e tente clicar no botão Lado a Lado novamente."
      );
      return;
    }

    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabToPop.id
          ? { ...t, isPoppedOut: true, popoutWindowRef: novaJanela }
          : t
      )
    );
  };

  // Reanexar / Retornar Guia para dentro do Modal (Docking)
  const handleRedockTab = (tabToRedock = activeTab) => {
    if (tabToRedock.popoutWindowRef && !tabToRedock.popoutWindowRef.closed) {
      try {
        tabToRedock.popoutWindowRef.close();
      } catch (e) {}
    }

    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabToRedock.id
          ? { ...t, isPoppedOut: false, popoutWindowRef: null }
          : t
      )
    );
    setIframeKey((prev) => prev + 1);
  };

  // Navegação do formulário da URL
  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let formatted = activeTab.inputUrl.trim();
    if (formatted && !formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }

    let tabTitle = activeTab.title;
    try {
      const parsed = new URL(formatted);
      tabTitle = parsed.hostname.replace('www.', '');
    } catch {}

    updateActiveTab({
      url: formatted,
      inputUrl: formatted,
      title: tabTitle,
    });
    setIframeKey((prev) => prev + 1);
    verifyUrl(formatted);
  };

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    verifyUrl(activeTab.url);
  };

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(notes);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  const handleSummarizeUrlWithAI = async () => {
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/summarize-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: activeTab.url }),
      });
      const data = await res.json();
      if (data && data.summary) {
        const header = `\n\n--- 🤖 RESUMO IA SYNAPSE (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}) ---\n`;
        setNotes((prev) => prev + header + data.summary + '\n-----------------------------------\n');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (e) {
      console.error('Erro ao resumir URL com IA:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(activeTab.url);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const { formattedUrl, domainName } = formatEmbeddableUrl(activeTab.url);
  const isGoogleAuth =
    activeTab.url.includes('accounts.google.com') ||
    activeTab.url.includes('notebooklm.google.com') ||
    activeTab.url.includes('google.com/v3/signin');

  const isLoginContext =
    isGoogleAuth ||
    activeTab.url.includes('focusconcursos') ||
    activeTab.url.includes('grancursos') ||
    activeTab.url.includes('estrategiaconcursos') ||
    activeTab.url.includes('login') ||
    activeTab.url.includes('entrar') ||
    activeTab.url.includes('auth');

  // Determinar fonte do iframe
  let activeIframeSrc = formattedUrl;
  if (activeTab.useReaderMode) {
    activeIframeSrc = `/api/reader-mode?url=${encodeURIComponent(formattedUrl)}`;
  } else if (activeTab.useProxyMode) {
    activeIframeSrc = `/api/proxy-web?url=${encodeURIComponent(formattedUrl)}`;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex flex-col animate-in fade-in duration-200 overflow-hidden">
      {/* 1. Barra de Abas Estilo Navegador (Multi-Tab Browser Bar) */}
      <div className="bg-slate-950 border-b border-slate-800 px-3 pt-2 pb-0 flex items-center justify-between gap-2 overflow-x-auto select-none shrink-0 scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-none py-0.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-semibold transition-all cursor-pointer border-t border-x shrink-0 max-w-[200px] ${
                  isActive
                    ? 'bg-slate-900 text-white border-indigo-500/50 shadow-md shadow-indigo-950/40 z-10'
                    : 'bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80'
                }`}
              >
                {/* Ícone status da aba */}
                {tab.isPoppedOut ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                ) : tab.url.includes('notebooklm') ? (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                )}

                <span className="truncate flex-1 text-[11px] font-medium">
                  {tab.title}
                </span>

                {/* Badge se destacado Lado a Lado */}
                {tab.isPoppedOut && (
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-bold">
                    Fora
                  </span>
                )}

                {/* Ação rápida de deslocar/reanexar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tab.isPoppedOut) {
                      handleRedockTab(tab);
                    } else {
                      handlePopoutTab(tab);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-300 transition-all"
                  title={tab.isPoppedOut ? 'Reanexar Guia na Janela Principal' : 'Deslocar Guia para Janela Lado a Lado'}
                >
                  {tab.isPoppedOut ? <CornerDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                </button>

                {/* Botão de Fechar Aba */}
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="p-0.5 hover:bg-rose-500/20 hover:text-rose-300 rounded text-slate-500 transition-colors"
                    title="Fechar aba"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Botão de Adicionar Nova Guia */}
          <button
            onClick={() => handleAddNewTab('https://notebooklm.google.com', 'Nova Guia NotebookLM')}
            className="p-1.5 bg-slate-900/60 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-200 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ml-1"
            title="Abrir nova aba de estudos (NotebookLM / Portal)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Atalhos Rápidos de Plataformas de Concursos / Estudo */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0 pb-1">
          <span className="text-[10px] text-slate-500 font-medium">Atalhos 1-Clique:</span>
          <button
            onClick={() => handleAddNewTab('https://notebooklm.google.com', 'Google NotebookLM')}
            className="text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>NotebookLM</span>
          </button>
          <button
            onClick={() => handleAddNewTab('https://www.focusconcursos.com.br/painel/', 'Focus Concursos')}
            className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer"
          >
            Focus Concursos
          </button>
          <button
            onClick={() => handleAddNewTab('https://www.grancursosonline.com.br/', 'Gran Cursos')}
            className="text-[10px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer"
          >
            Gran Cursos
          </button>
          <button
            onClick={() => handleAddNewTab('https://drive.google.com', 'Google Drive')}
            className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer"
          >
            Google Drive
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Bar (Barra de Controle de URL e Ferramentas) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white leading-tight truncate flex items-center gap-1.5">
              <span>{activeTab.title}</span>
              {activeTab.useProxyMode && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">
                  Proxy Backend Active
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* URL Bar Input */}
        <form onSubmit={handleNavigate} className="flex-1 max-w-xl mx-2 flex items-center gap-2 min-w-[200px]">
          <div className="relative flex-1">
            <input
              type="text"
              value={activeTab.inputUrl}
              onChange={(e) => updateActiveTab({ inputUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              placeholder="https://..."
            />
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Recarregar aba"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Copiar link"
          >
            {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </form>

        {/* Action Controls (Reader, Proxy, Popout, Re-dock, Close) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              updateActiveTab({ useReaderMode: !activeTab.useReaderMode });
              setIframeKey((prev) => prev + 1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
              activeTab.useReaderMode
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Modo Leitor Limpo sem anúncios"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{activeTab.useReaderMode ? 'Leitor Ativo' : 'Leitor Limpo'}</span>
          </button>

          {/* Botão de Deslocar / Reanexar na Guia */}
          {activeTab.isPoppedOut ? (
            <button
              onClick={() => handleRedockTab(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-amber-500/10 cursor-pointer"
              title="Trazer e reanexar esta página de volta para a aba da janela principal"
            >
              <CornerDownLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>↩️ Reanexar na Guia</span>
            </button>
          ) : (
            <button
              onClick={() => handlePopoutTab(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Mover e destacar esta página para uma janela Lado a Lado externa"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>↗ Deslocar Lado a Lado</span>
            </button>
          )}

          <button
            onClick={() => setIsExpandedNotes(!isExpandedNotes)}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isExpandedNotes ? 'Reduzir Caderno' : 'Anotações'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
            title="Fechar estação"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3. Main Split Content (IFrame / Popout Notice vs Integrated Notes) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left / Top Container */}
        <div
          className={`flex-1 bg-slate-950 relative flex flex-col transition-all duration-300 ${
            isExpandedNotes ? 'md:w-1/2' : 'md:w-2/3'
          }`}
        >
          {/* Banner de Sincronização e Cookies de Login */}
          {isLoginContext && (
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-slate-100 text-xs shrink-0 z-10 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-white text-xs flex items-center gap-2">
                    <span>{isGoogleAuth ? 'Sincronização Google / NotebookLM' : 'Portal de Estudos / Concursos'}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      Proxy Unificado Ativo
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    Caso a plataforma peça login ou expire a sessão, utilize "🔓 Deslocar para Janela Lado a Lado" para salvar os cookies.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => handlePopoutTab(activeTab)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span>🔓 Forçar Login Lado a Lado</span>
                </button>

                <button
                  onClick={handleRefresh}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1 text-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sincronizar Iframe</span>
                </button>
              </div>
            </div>
          )}

          {/* ESTADO 1: A Guia foi Deslocada para Fora (Popout State) */}
          {activeTab.isPoppedOut ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center bg-slate-950">
              <div className="max-w-md bg-slate-900 border border-amber-500/30 p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-amber-500/20">
                  <Monitor className="w-24 h-24" />
                </div>

                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <ArrowUpRight className="w-7 h-7 animate-bounce" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    Guia Deslocada para Janela Externa
                  </h4>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    A aba <strong>"{activeTab.title}"</strong> está sendo exibida em uma janela lado a lado no seu navegador. Seu caderno de anotações continua 100% ativo ao lado.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    onClick={() => handleRedockTab(activeTab)}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    <CornerDownLeft className="w-4 h-4" />
                    <span>↩️ Reanexar e Trazer de Volta para a Guia Principal</span>
                  </button>

                  <button
                    onClick={() => {
                      if (activeTab.popoutWindowRef && !activeTab.popoutWindowRef.closed) {
                        activeTab.popoutWindowRef.focus();
                      } else {
                        handlePopoutTab(activeTab);
                      }
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-cyan-300" />
                    <span>Focar / Destacar Janela Lado a Lado</span>
                  </button>
                </div>
              </div>
            </div>
          ) : isBlockedFrame && !activeTab.useProxyMode ? (
            /* ESTADO 2: Bloqueio HTTP */
            <div className="flex-1 flex items-center justify-center p-6 text-center bg-slate-950">
              <div className="max-w-md bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5 shadow-2xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                  <ShieldAlert className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">
                    {domainName || 'Este site'} Possui Proteção X-Frame
                  </h4>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    O Proxy Backend Synapse foi configurado para desativar bloqueios HTTP e carregar o site perfeitamente.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      updateActiveTab({ useProxyMode: true });
                      setIframeKey((prev) => prev + 1);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Carregar via Proxy Backend Synapse</span>
                  </button>

                  <button
                    onClick={() => handlePopoutTab(activeTab)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Deslocar para Janela Lado a Lado</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ESTADO 3: Visualização do IFrame da Aba Ativa */
            <iframe
              key={`${activeTab.id}-${iframeKey}`}
              src={activeIframeSrc}
              className="w-full h-full border-0 bg-white"
              title={activeTab.title}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />
          )}
        </div>

        {/* Right / Bottom: Caderno de Anotações Integrado */}
        <div
          className={`bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col transition-all duration-300 ${
            isExpandedNotes ? 'md:w-1/2 h-1/2 md:h-full' : 'md:w-1/3 h-1/2 md:h-full'
          }`}
        >
          {/* Header do Caderno */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold">Caderno de Anotações Lado a Lado</h4>
            </div>

            <div className="flex items-center gap-2">
              {isSaved && (
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3" />
                  Salvo!
                </span>
              )}
              <button
                onClick={handleSaveNotes}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Caderno</span>
              </button>
            </div>
          </div>

          {/* Área do Editor */}
          <div className="flex-1 p-3 flex flex-col bg-slate-950/30">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Digite suas anotações, destaques do edital e tópicos do NotebookLM ou portal de concursos aqui..."
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 resize-none font-mono leading-relaxed"
            />
          </div>

          {/* Rodapé IA e Ações Rápidas */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="truncate">Sincronizado com a Estação</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSummarizeUrlWithAI}
                disabled={isSummarizing}
                className="text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
                title="Resumir com Gemini IA"
              >
                <Sparkles className={`w-3 h-3 text-cyan-300 ${isSummarizing ? 'animate-spin' : ''}`} />
                <span>{isSummarizing ? 'Analisando...' : 'Resumir com IA'}</span>
              </button>
              <button
                onClick={() => {
                  const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  setNotes((prev) => `${prev}\n\n[${timestamp}] Ref (${activeTab.title}): `);
                }}
                className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>Hora</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

