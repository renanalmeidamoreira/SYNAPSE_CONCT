import React, { useState } from 'react';
import { CourseData, QuestionStructure } from '../types';
import { callGeminiAPI } from '../utils/gemini';
import {
  FileText,
  Calculator,
  Award,
  Briefcase,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  ListChecks,
  Bot,
  Loader2,
  Info,
  Upload,
} from 'lucide-react';

interface EditalViewProps {
  course: CourseData;
  onUpdateCourse: (updated: CourseData) => void;
}

export const EditalView: React.FC<EditalViewProps> = ({ course, onUpdateCourse }) => {
  const [showAiModal, setShowAiModal] = useState(false);
  const [rawText, setRawText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  // Local state for editing subjects
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newMateria, setNewMateria] = useState('');
  const [newQuestoes, setNewQuestoes] = useState(10);
  const [newPeso, setNewPeso] = useState(1.0);

  const questionsList = course.questoes || [];

  const totalPoints = questionsList.reduce(
    (acc, item) => acc + (item.questoes || 0) * (item.peso || 1),
    0
  );

  const totalQuestions = questionsList.reduce(
    (acc, item) => acc + (item.questoes || 0),
    0
  );

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMateria.trim()) return;

    const newItem: QuestionStructure = {
      id: `q-${Date.now()}`,
      materia: newMateria.trim(),
      questoes: Number(newQuestoes) || 10,
      peso: Number(newPeso) || 1.0,
    };

    const updated = {
      ...course,
      questoes: [...questionsList, newItem],
    };

    onUpdateCourse(updated);
    setNewMateria('');
    setNewQuestoes(10);
    setNewPeso(1.0);
    setShowAddSubject(false);
  };

  const handleDeleteSubject = (id: string) => {
    const updated = {
      ...course,
      questoes: questionsList.filter((q) => q.id !== id),
    };
    onUpdateCourse(updated);
  };

  const handleParseEditalAi = async () => {
    if (!rawText.trim()) return;
    setLoadingAi(true);
    setAiError('');

    try {
      const prompt = `Analise o seguinte texto de edital de concurso e extraia a estrutura de disciplinas, quantidade de questões e pesos em formato JSON.
Texto do Edital:
"""
${rawText}
"""

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
[
  { "materia": "Nome da Disciplina", "questoes": 15, "peso": 2.0 }
]`;

      const result = await callGeminiAPI(
        prompt,
        'Você é um especialista em análise de edital de concursos públicos. Retorne apenas JSON válido conforme instruído.'
      );

      const jsonStart = result.indexOf('[');
      const jsonEnd = result.lastIndexOf(']');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = result.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonString);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const newQuestoes: QuestionStructure[] = parsed.map((item: any, idx: number) => ({
            id: `ai-q-${Date.now()}-${idx}`,
            materia: String(item.materia || `Disciplina ${idx + 1}`),
            questoes: Number(item.questoes) || 10,
            peso: Number(item.peso) || 1.0,
          }));

          onUpdateCourse({
            ...course,
            questoes: newQuestoes,
          });
          setShowAiModal(false);
          setRawText('');
        }
      } else {
        throw new Error('Não foi possível extrair a tabela do texto fornecido.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Erro ao processar edital com IA.');
    } finally {
      setLoadingAi(false);
    }
  };


  const hasEditalData = course.resumoIA || course.banca || course.vagas || course.remuneracao || (course.questoes && course.questoes.length > 0) || (course.etapas && course.etapas.length > 0);

  if (!hasEditalData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Edital não importado</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
          Você não importou nenhum edital para esta estação. Importe um edital (PDF) ou adicione os dados manualmente para gerar o resumo estruturado e a tabela de disciplinas.
        </p>
        <button
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>Extrair Edital (Texto) com IA</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Resumo IA */}
      {course.resumoIA && (
        <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900 border border-slate-300 dark:border-indigo-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Bot className="w-32 h-32 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Resumo Estratégico do Edital
            </h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {course.resumoIA}
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-800/60 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="truncate">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Banca
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-white truncate block">
              {course.banca || 'Não informada'}
            </span>
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="truncate">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Vagas & Remuneração
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-white truncate block">
              {course.vagas || 'A definir'}
            </span>
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center shrink-0">
            <ListChecks className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="truncate">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Total de Questões
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-white font-mono truncate block">
              {totalQuestions} Questões
            </span>
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800/60 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5 text-amber-400" />
          </div>
          <div className="truncate">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
              Pontuação Máxima
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-white font-mono truncate block">
              {totalPoints.toFixed(1)} Pontos
            </span>
          </div>
        </div>
      </div>

      {/* Career & Exam Stages */}
      {((course.etapas && course.etapas.length > 0) || (course.carreira && course.carreira.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Etapas do Concurso */}
          {course.etapas && course.etapas.length > 0 && (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Etapas do Concurso
              </h3>
              <div className="space-y-3">
                {course.etapas.map((etapa, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{etapa.nome}</span>
                      <span className="text-[10px] font-semibold text-indigo-300 bg-indigo-950 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                        {etapa.caracter}
                      </span>
                    </div>
                    {etapa.detalhes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{etapa.detalhes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plano de Carreira */}
          {course.carreira && course.carreira.length > 0 && (
            <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
              <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                Evolução na Carreira
              </h3>
              <div className="space-y-2.5">
                {course.carreira.map((nivel, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center gap-3 text-xs text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono flex items-center justify-center font-bold text-[11px] shrink-0">
                      {idx + 1}
                    </span>
                    <span>{nivel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Questions & Weights Table Section */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Pesos & Estrutura da Prova Objetiva
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Acompanhe a relevância e pontuação de cada disciplina no resultado final
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-slate-800 dark:text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md shadow-indigo-500/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Importar com IA</span>
            </button>

            <button
              onClick={() => setShowAddSubject(true)}
              className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Disciplina</span>
            </button>
          </div>
        </div>

        {/* Add Subject Form */}
        {showAddSubject && (
          <form onSubmit={handleAddSubject} className="mb-6 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">Disciplina</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Direito Penal"
                  value={newMateria}
                  onChange={(e) => setNewMateria(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">Nº Questões</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newQuestoes}
                  onChange={(e) => setNewQuestoes(Number(e.target.value))}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">Peso por Questão</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={newPeso}
                  onChange={(e) => setNewPeso(Number(e.target.value))}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddSubject(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
              >
                Salvar Disciplina
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Disciplina</th>
                <th className="py-3 px-4 text-center">Questões</th>
                <th className="py-3 px-4 text-center">Peso</th>
                <th className="py-3 px-4 text-center">Pontos Totais</th>
                <th className="py-3 px-4 text-center">% da Prova</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {questionsList.map((item) => {
                const subTotal = (item.questoes || 0) * (item.peso || 1);
                const percent = totalPoints > 0 ? ((subTotal / totalPoints) * 100).toFixed(1) : '0';

                return (
                  <tr key={item.id} className="hover:bg-slate-200 dark:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white">{item.materia}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-800 dark:text-slate-300">
                      {item.questoes}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-cyan-400">
                      {item.peso}x
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-indigo-300 font-bold">
                      {subTotal.toFixed(1)} pts
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-400">
                      {percent}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteSubject(item.id)}
                        className="p-1 text-slate-500 dark:text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remover disciplina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Edital Import Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Extração Completa de Edital com IA
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Envie o PDF do edital ou cole o texto. Nossa inteligência artificial extrairá o resumo, etapas, disciplinas e pesos para estruturar sua estação automaticamente.
            </p>

            <div className="mb-6 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center">
                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Importar PDF do Edital</h4>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                     if (e.target.files && e.target.files.length > 0) {
                       setPdfFile(e.target.files[0]);
                       setRawText('');
                     }
                  }}
                  className="hidden"
                  id="edital-upload-modal"
                />
                <label
                  htmlFor="edital-upload-modal"
                  className="inline-flex items-center gap-2 cursor-pointer bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-transparent"
                >
                  Selecionar Arquivo PDF
                </label>
                {pdfFile && (
                  <div className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {pdfFile.name}
                  </div>
                )}
            </div>

            <div className="flex items-center justify-center gap-4 mb-6">
               <div className="h-px bg-slate-300 dark:bg-slate-800 flex-1"></div>
               <span className="text-xs text-slate-500 font-semibold uppercase">OU COLE O TEXTO</span>
               <div className="h-px bg-slate-300 dark:bg-slate-800 flex-1"></div>
            </div>

            <textarea
              placeholder="Cole o texto do conteúdo programático aqui..."
              value={rawText}
              onChange={(e) => {
                 setRawText(e.target.value);
                 if (e.target.value) setPdfFile(null);
              }}
              className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-4"
            />
            
            {aiError && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
                {aiError}
              </div>
            )}
            
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAiModal(false);
                  setPdfFile(null);
                  setRawText('');
                  setAiError('');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loadingAi || (!rawText.trim() && !pdfFile)}
                onClick={handleParseEditalAi}
                className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all"
              >
                {loadingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Extrair Edital</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
