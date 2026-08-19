import React, { useState, useEffect } from 'react';
import { MaterialItem } from '../types';
import { extractEmbedUrl, openCoupledWindow, redockCoupledWindow } from '../utils/media';
import { getProviderBranding } from '../utils/providerBranding';
import {
  X,
  ExternalLink,
  Globe,
  Save,
  BookOpen,
  FileText,
  Video,
  Maximize2,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  Lock,
  MoveHorizontal,
} from 'lucide-react';

interface MediaPanelProps {
  material: MaterialItem;
  courseNotes: string;
  onSaveNotes: (notes: string) => void;
  onClose: () => void;
}

export const MediaPanel: React.FC<MediaPanelProps> = ({
  material,
  courseNotes,
  onSaveNotes,
  onClose,
}) => {
  const [localNotes, setLocalNotes] = useState(courseNotes);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    setLocalNotes(courseNotes);
  }, [courseNotes]);

  const rawUrl =
    material.url ||
    (material.entryId
      ? `https://cdnapisec.kaltura.com/index.php/extwidget/preview/partner_id/${
          material.partnerId || '2608811'
        }/entry_id/${material.entryId}/embed/dynamic`
      : '');

  const embedUrl = extractEmbedUrl(rawUrl, material.partnerId || '2608811');

  const handleSaveNotes = () => {
    onSaveNotes(localNotes);
    if (typeof (window as any).saveCourseNotes === 'function') {
      // Also execute global handler if defined
      (window as any).saveCourseNotes();
    }
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleCoupledOpen = () => {
    if (rawUrl) {
      const success = openCoupledWindow(rawUrl);
      if (!success && (window as any).showToast) {
        (window as any).showToast('Permita pop-ups para abrir em janela acoplada.', 'warning');
      }
    }
  };

  const handleRedock = () => {
    const ok = redockCoupledWindow();
    if (!ok && rawUrl) {
      handleCoupledOpen();
    } else if (ok && (window as any).showToast) {
      (window as any).showToast('Janela acoplada realinhada!', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
      {/* Media Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-900/80 border border-indigo-700/60 flex items-center justify-center shrink-0">
            {material.type === 'focus' || material.type === 'link' ? (
              <Video className="w-4 h-4 text-cyan-400" />
            ) : (
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <div className="truncate">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">{material.title}</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
              {material.category || 'Leitor Acoplado SYNAPSE'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {rawUrl && (
            <>
              <button
                onClick={handleCoupledOpen}
                className="hidden sm:flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                title="Abrir conteúdo em janela suspensa acoplada (Atalho: Ctrl+Shift+F)"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Janela Acoplada</span>
              </button>

              <button
                onClick={handleRedock}
                className="hidden sm:flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all"
                title="Re-encaixar/Re-alinhar janela acoplada ao lado do SYNAPSE"
              >
                <MoveHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Redockar</span>
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-colors"
            title="Fechar leitor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Split Layout: Media Viewer Left (2/3 or full), Notes Right (1/3) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Container: Media Player / Bridge UI */}
        <div id="mp-container" className="relative flex-1 bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800">
          {material.type === 'text' ? (
            <div className="p-6 overflow-y-auto max-w-4xl mx-auto w-full text-slate-800 dark:text-slate-200 leading-relaxed text-sm space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Documento de Leitura
                </span>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{material.title}</h2>
              </div>
              <div className="whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-300">
                {material.data || 'Nenhum conteúdo de texto disponível.'}
              </div>
            </div>
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              className="w-full h-full border-0 absolute inset-0"
              title={material.title}
            />
          ) : (
            <iframe
              src={embedUrl || rawUrl}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              className="w-full h-full border-0 absolute inset-0 bg-white"
              title={material.title}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
            />
          )}
        </div>

        {/* Right Sidebar: Caderno de Anotações (#cv-notes) */}
        <div className="w-full lg:w-96 bg-slate-100 dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 flex flex-col h-64 lg:h-full shrink-0">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-100 dark:bg-slate-900/90">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Caderno de Notas</span>
            </div>
            {saveToast && (
              <span className="text-xs font-semibold text-emerald-400 animate-in fade-in">
                Salvo!
              </span>
            )}
          </div>

          <div className="flex-1 p-3 flex flex-col">
            <textarea
              id="cv-notes"
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Digite aqui suas anotações, mapas mentais ou pontos importantes deste material..."
              className="w-full flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs md:text-sm text-slate-800 dark:text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 resize-none font-mono"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-500">
                {localNotes.length} caracteres
              </span>
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1.5 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Caderno</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
