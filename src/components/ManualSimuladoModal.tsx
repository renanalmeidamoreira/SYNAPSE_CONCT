import React, { useState } from 'react';
import { extractTextFromPDF, parseGabarito } from '../utils/pdfParser';
import { X, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { SimuladoItem, ExamQuestion } from '../types';

interface Props {
  onClose: () => void;
  onSave: (sim: SimuladoItem) => void;
}

export const ManualSimuladoModal: React.FC<Props> = ({ onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [parsedAnswers, setParsedAnswers] = useState<Record<number, number>>({});
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGabaritoFile(file);
    try {
      const text = await extractTextFromPDF(file);
      const ans = parseGabarito(text);
      setParsedAnswers(ans);
    } catch (err) {
      console.error(err);
      alert('Erro ao ler PDF de gabarito.');
    }
  };

  const handleCreate = () => {
    const questoes: ExamQuestion[] = [];
    for (let i = 1; i <= numQuestions; i++) {
      questoes.push({
        id: `manual-q-\${Date.now()}-\${i}`,
        materia: 'Geral',
        enunciado: `Questão \${i}`,
        opcoes: ['A', 'B', 'C', 'D', 'E'],
        respostaCorreta: parsedAnswers[i] ?? 0, // default A
        explicacao: 'Gabarito importado'
      });
    }

    onSave({
      id: `sim-manual-\${Date.now()}`,
      title: title || 'Simulado Manual',
      dataCriacao: new Date().toISOString().split('T')[0],
      status: 'pending',
      questoes
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 relative shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"><X size={20} /></button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-800 dark:text-white mb-4">Novo Simulado Manual</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1">Título da Prova</label>
            <input 
              className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-800 dark:text-white" 
              value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Prova VUNESP 2023" 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1">Número de Questões</label>
            <input 
              type="number" min={1} max={200}
              className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-800 dark:text-white" 
              value={numQuestions} onChange={(e) => setNumQuestions(parseInt(e.target.value))} 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1">PDF do Gabarito (Opcional)</label>
            <label className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 rounded-xl px-4 py-4 cursor-pointer hover:border-indigo-500 transition-colors">
              <Upload size={20} className="text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">Selecionar arquivo PDF</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
            </label>
            {gabaritoFile && (
              <div className="mt-2 flex items-center justify-between bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>{gabaritoFile.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 size={16} />
                  <span>{Object.keys(parsedAnswers).length} lidas</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button onClick={handleCreate} className="mt-6 w-full py-3 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">
          Criar Simulado
        </button>
      </div>
    </div>
  );
};
