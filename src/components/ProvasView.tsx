import React, { useState } from 'react';
import { CourseData, SimuladoItem, ExamQuestion } from '../types';
import { ManualSimuladoModal } from './ManualSimuladoModal';
import { callGeminiAPI } from '../utils/gemini';
import {
  FileCheck,
  Award,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  BarChart3,
  RotateCcw,
  Plus,
  Loader2,
  Clock,
  BookOpen,
} from 'lucide-react';

interface ProvasViewProps {
  course: CourseData;
  simulados: SimuladoItem[];
  onUpdateSimulados: (updated: SimuladoItem[]) => void;
}

export const ProvasView: React.FC<ProvasViewProps> = ({
  course,
  simulados,
  onUpdateSimulados,
}) => {
  const [activeExam, setActiveExam] = useState<SimuladoItem | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examScore, setExamScore] = useState<number | null>(null);

  // AI Generator Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [aiMateria, setAiMateria] = useState('Direito Constitucional');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  const handleStartExam = (sim: SimuladoItem) => {
    setActiveExam(sim);
    setUserAnswers({});
    setExamSubmitted(false);
    setExamScore(null);
  };

  const handleSelectAnswer = (qId: string, optIdx: number) => {
    if (examSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const handleSubmitExam = () => {
    if (!activeExam) return;

    let correct = 0;
    activeExam.questoes.forEach((q) => {
      if (userAnswers[q.id] === q.respostaCorreta) {
        correct++;
      }
    });

    const scorePercent = Math.round((correct / activeExam.questoes.length) * 100);
    setExamScore(scorePercent);
    setExamSubmitted(true);

    // Save score in history
    const updated = simulados.map((s) => {
      if (s.id === activeExam.id) {
        return {
          ...s,
          status: 'completed' as const,
          lastScore: scorePercent,
          correctAnswers: correct,
          totalQuestions: activeExam.questoes.length,
          dataRealizacao: new Date().toISOString().split('T')[0],
        };
      }
      return s;
    });

    onUpdateSimulados(updated);
  };

  const handleGenerateAiExam = async () => {
    setLoadingAi(true);
    setAiError('');

    try {
      const prompt = `Gere um simulado com ${aiNumQuestions} questões de múltipla escolha para o concurso da Guarda Civil Municipal (GCM) focado na disciplina: "${aiMateria}".
Chave de resposta: index 0 para A, 1 para B, 2 para C, 3 para D.

Retorne ESTRITAMENTE em formato JSON com o seguinte schema:
[
  {
    "enunciado": "Texto da questão",
    "opcoes": ["Opção A", "Opção B", "Opção C", "Opção D"],
    "respostaCorreta": 1,
    "explicacao": "Explicação detalhada da fundamentação legal."
  }
]`;

      const result = await callGeminiAPI(
        prompt,
        'Você é um elaborador sênior de provas de concursos públicos. Responda apenas com JSON válido.'
      );

      const jsonStart = result.indexOf('[');
      const jsonEnd = result.lastIndexOf(']');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = result.substring(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonString);

        if (Array.isArray(parsed) && parsed.length > 0) {
          const newQuestions: ExamQuestion[] = parsed.map((item: any, idx: number) => ({
            id: `ai-q-${Date.now()}-${idx}`,
            materia: aiMateria,
            enunciado: String(item.enunciado || `Questão ${idx + 1}`),
            opcoes: Array.isArray(item.opcoes) ? item.opcoes.map(String) : ['A', 'B', 'C', 'D'],
            respostaCorreta: Number(item.respostaCorreta) || 0,
            explicacao: String(item.explicacao || 'Sem explicação disponível.'),
          }));

          const newSimulado: SimuladoItem = {
            id: `sim-ai-${Date.now()}`,
            title: `Simulado IA - ${aiMateria} (${newQuestions.length}Q)`,
            dataCriacao: new Date().toISOString().split('T')[0],
            status: 'pending',
            totalQuestions: newQuestions.length,
            questoes: newQuestions,
          };

          onUpdateSimulados([newSimulado, ...simulados]);
          setShowAiModal(false);
          handleStartExam(newSimulado);
        }
      } else {
        throw new Error('Não foi possível processar a estrutura do simulado retornado.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Erro ao gerar simulado com IA.');
    } finally {
      setLoadingAi(false);
    }
  };

  const completedSimulados = simulados.filter((s) => s.status === 'completed' && s.lastScore !== undefined);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Simulados & Provas Práticas
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Responda questões no padrão das bancas e acompanhe seu histórico de aproveitamento
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs px-4 py-2.5 rounded-2xl transition-all border border-slate-300 dark:border-slate-700"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Simulado Manual</span>
          </button>
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-slate-800 dark:text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Gerar Simulado com IA</span>
          </button>
        </div>
      </div>

      {/* History Chart Visualizer */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          Evolução de Desempenho nos Simulados
        </h4>
        {completedSimulados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {completedSimulados.map((sim) => (
              <div
                key={sim.id}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 font-mono">
                    {sim.dataRealizacao || sim.dataCriacao}
                  </span>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-slate-800 dark:text-white truncate mt-1">{sim.title}</h5>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-600 dark:text-indigo-300 font-mono">
                    {sim.lastScore}%
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    {sim.correctAnswers}/{sim.totalQuestions} acertos
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
            <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Conclua um simulado para visualizar seu desempenho aqui.
            </p>
          </div>
        )}
      </div>

      {/* Simulados List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {simulados.map((sim) => (
          <div
            key={sim.id}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-300 dark:border-slate-700 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-0.5 rounded-full uppercase">
                  {sim.questoes.length} Questões
                </span>
                {sim.status === 'completed' ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                    Aproveitamento: {sim.lastScore}%
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950 border border-amber-800 px-2.5 py-0.5 rounded-full">
                    Pendente
                  </span>
                )}
              </div>

              <h4 className="text-base font-bold text-slate-800 dark:text-white mb-2">{sim.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Criado em {sim.dataCriacao} • Questões inéditas com gabarito comentado
              </p>
            </div>

            <button
              onClick={() => handleStartExam(sim)}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 font-bold text-xs py-2.5 rounded-2xl transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{sim.status === 'completed' ? 'Refazer Simulado' : 'Iniciar Prova'}</span>
            </button>
          </div>
        ))}
      </div>

      
      {showManualModal && (
        <ManualSimuladoModal
          onClose={() => setShowManualModal(false)}
          onSave={(sim) => {
            onUpdateSimulados([sim, ...simulados]);
            setShowManualModal(false);
          }}
        />
      )}

      {/* Active Exam Modal */}
      {activeExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-3xl w-full my-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Modo de Prova
                </span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{activeExam.title}</h3>
              </div>
              <button
                onClick={() => setActiveExam(null)}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white bg-slate-200 dark:bg-slate-800 px-3 py-1.5 rounded-xl"
              >
                Sair da Prova
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
              {activeExam.questoes.map((q, idx) => {
                const selectedOption = userAnswers[q.id];
                const isCorrect = selectedOption === q.respostaCorreta;

                return (
                  <div key={q.id} className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-950 px-2.5 py-1 rounded-lg">
                        Q{idx + 1} • {q.materia || 'Geral'}
                      </span>
                      {examSubmitted && (
                        <div>
                          {isCorrect ? (
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Correta
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Incorreta
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                      {q.enunciado}
                    </p>

                    <div className="space-y-2 pt-1">
                      {q.opcoes.map((opt, optIdx) => {
                        let optStyle = 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300';
                        if (selectedOption === optIdx) {
                          optStyle = 'bg-indigo-950 border-indigo-600 text-slate-800 dark:text-white font-semibold';
                        }

                        if (examSubmitted) {
                          if (optIdx === q.respostaCorreta) {
                            optStyle = 'bg-emerald-950/80 border-emerald-600 text-emerald-200 font-bold';
                          } else if (selectedOption === optIdx && !isCorrect) {
                            optStyle = 'bg-rose-950/80 border-rose-600 text-rose-200 line-through';
                          }
                        }

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectAnswer(q.id, optIdx)}
                            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-3 ${optStyle}`}
                          >
                            <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {examSubmitted && (
                      <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-300 space-y-1">
                        <span className="font-bold text-indigo-300 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" /> Gabarito Comentado:
                        </span>
                        <p className="leading-relaxed text-slate-600 dark:text-slate-400">{q.explicacao}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
              {examSubmitted && examScore !== null ? (
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-800 dark:text-white">
                    Pontuação: <span className="text-cyan-400 font-mono">{examScore}%</span>
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {Object.keys(userAnswers).length} de {activeExam.questoes.length} respondidas
                </span>
              )}

              {!examSubmitted ? (
                <button
                  onClick={handleSubmitExam}
                  disabled={Object.keys(userAnswers).length === 0}
                  className="bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-all"
                >
                  Finalizar e Corrigir Prova
                </button>
              ) : (
                <button
                  onClick={() => setActiveExam(null)}
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
                >
                  Fechar Gabarito
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Simulado Generator Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              Gerar Simulado Inédito com IA
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              O Gemini criará questões com 4 alternativas e fundamentação jurídica comentada.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">
                  Disciplina / Assunto *
                </label>
                <input
                  type="text"
                  value={aiMateria}
                  onChange={(e) => setAiMateria(e.target.value)}
                  placeholder="Ex: Direito Penal, CTB, Crase..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">
                  Quantidade de Questões
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={aiNumQuestions}
                  onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                />
              </div>

              {aiError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl">
                  {aiError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  disabled={loadingAi || !aiMateria.trim()}
                  onClick={handleGenerateAiExam}
                  className="flex items-center gap-2 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all"
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando Questões...</span>
                    </>
                  ) : (
                    <span>Elaborar Simulado</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
