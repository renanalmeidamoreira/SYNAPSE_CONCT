import React, { useState, useEffect } from 'react';
import { BookOpen, Save, Download, Sparkles, CheckCircle2 } from 'lucide-react';

interface CadernoViewProps {
  notesText: string;
  onSaveNotes: (text: string) => void;
  courseTitle: string;
}

export const CadernoView: React.FC<CadernoViewProps> = ({
  notesText,
  onSaveNotes,
  courseTitle,
}) => {
  const [localNotes, setLocalNotes] = useState(notesText);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    setLocalNotes(notesText);
  }, [notesText]);

  const handleSave = () => {
    onSaveNotes(localNotes);
    if (typeof (window as any).saveCourseNotes === 'function') {
      (window as any).saveCourseNotes();
    }
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2500);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([localNotes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Caderno_SYNAPSE_${courseTitle.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Caderno de Anotações & Registro de Erros
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Guarde resumos, dúvidas e pegadinhas de provas para rápida revisão antes do exame
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showSavedToast && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> Caderno Salvo!
            </span>
          )}

          <button
            onClick={handleDownloadTxt}
            className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs px-3.5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 transition-all"
            title="Exportar anotações em arquivo TXT"
          >
            <Download className="w-4 h-4" />
            <span>Exportar .TXT</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Caderno</span>
          </button>
        </div>
      </div>

      {/* Editor Box */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="font-mono text-indigo-300">#cv-notes • Conectado à Estação</span>
          <span>{localNotes.length} caracteres</span>
        </div>

        <textarea
          id="cv-notes"
          value={localNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          placeholder="Digite aqui suas anotações do edital, erros em simulados e resumos de videoaulas..."
          rows={16}
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500 leading-relaxed font-mono resize-y"
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-500">
            Dica: O conteúdo do caderno é preservado localmente e sincronizado ao leitor acoplado.
          </span>
          <button
            onClick={handleSave}
            className="bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
