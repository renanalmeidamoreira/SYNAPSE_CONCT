import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Presentation,
  Sparkles,
  X,
  RefreshCw,
  BookOpen,
  ExternalLink,
  MessageSquare,
  Radio,
  HelpCircle,
  Layers,
  FileText,
  Check,
  Share2,
  ListTodo,
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface GoogleWorkspaceModalProps {
  onClose: () => void;
  onImportFlashcards?: (cards: { frente: string; verso: string }[]) => void;
}

interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  alternateLink?: string;
}

interface CourseWorkItem {
  id: string;
  title: string;
  description?: string;
  alternateLink?: string;
  creationTime?: string;
}

interface NotebookLMArtifact {
  summary: string;
  keyTakeaways: string[];
  faq: { question: string; answer: string }[];
  audioOverviewScript: { speaker: string; line: string }[];
  flashcards: { frente: string; verso: string }[];
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  onClose,
  onImportFlashcards,
}) => {
  const { googleAccessToken, login } = useAuth();
  const [activeTab, setActiveTab] = useState<'classroom' | 'slides' | 'notebooklm'>('classroom');

  // Classroom state
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseWork, setCourseWork] = useState<CourseWorkItem[]>([]);
  const [loadingClassroom, setLoadingClassroom] = useState(false);
  const [classroomError, setClassroomError] = useState<string | null>(null);

  // Slides state
  const [slidesUrlInput, setSlidesUrlInput] = useState('');
  const [activePresentationId, setActivePresentationId] = useState<string | null>(null);
  const [slidesNotesInput, setSlidesNotesInput] = useState('');

  // NotebookLM state
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesizedNotebook, setSynthesizedNotebook] = useState<NotebookLMArtifact | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [importedStatus, setImportedStatus] = useState(false);

  // Extract presentation ID from Google Slides URL
  const extractSlidesId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url.trim();
  };

  // Fetch Classroom courses
  const fetchClassroomCourses = async () => {
    if (!googleAccessToken) {
      setClassroomError('Conecte sua Conta do Google para acessar o Google Classroom.');
      return;
    }

    setLoadingClassroom(true);
    setClassroomError(null);
    try {
      const res = await fetch('/api/classroom/courses', {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setClassroomError('Sessão expirada. Faça login novamente no Google.');
        } else {
          setClassroomError('Não foi possível carregar turmas do Google Classroom.');
        }
        setLoadingClassroom(false);
        return;
      }

      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err: any) {
      console.error(err);
      setClassroomError('Erro de conexão ao acessar o Google Classroom.');
    } finally {
      setLoadingClassroom(false);
    }
  };

  // Fetch CourseWork for selected course
  const fetchCourseWork = async (courseId: string) => {
    if (!googleAccessToken) return;
    setLoadingClassroom(true);
    try {
      const res = await fetch(`/api/classroom/coursework?courseId=${encodeURIComponent(courseId)}`, {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCourseWork(data.courseWork || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClassroom(false);
    }
  };

  useEffect(() => {
    if (googleAccessToken && activeTab === 'classroom') {
      fetchClassroomCourses();
    }
  }, [googleAccessToken, activeTab]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseWork(selectedCourseId);
    }
  }, [selectedCourseId]);

  // Synthesize content with NotebookLM API
  const handleSynthesizeNotebookLM = async (title: string, textContent: string, sourceType: string) => {
    setSynthesizing(true);
    setActiveTab('notebooklm');
    try {
      const res = await fetch('/api/notebooklm/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: textContent, sourceType }),
      });

      const data = await res.json();
      if (data.success && data.notebook) {
        setSynthesizedNotebook(data.notebook);
      } else {
        alert(data.error || 'Erro ao sintetizar conteúdo com a API do NotebookLM.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar à API de Inteligência do NotebookLM.');
    } finally {
      setSynthesizing(false);
    }
  };

  const handleOpenNotebookLMSideBySide = () => {
    window.open('https://notebooklm.google.com', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Conexão Google Workspace & NotebookLM API
              </h2>
              <p className="text-xs text-slate-400">
                Classroom, Slides & Síntese de Estudos de Alta Performance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800 bg-slate-950/60">
          <button
            onClick={() => setActiveTab('classroom')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'classroom'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Google Classroom
          </button>

          <button
            onClick={() => setActiveTab('slides')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'slides'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Presentation className="w-4 h-4" />
            Google Slides
          </button>

          <button
            onClick={() => setActiveTab('notebooklm')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'notebooklm'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            NotebookLM Synthesis API
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GOOGLE CLASSROOM & MATERIAIS */}
          {activeTab === 'classroom' && (
            <div className="space-y-6">
              <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-base">Google Classroom & Materiais de Estudo</h3>
                      <p className="text-xs text-slate-400">
                        Cole o link da sua turma, código da disciplina ou texto da aula para sintetizar resumos e flashcards com a IA.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenNotebookLMSideBySide}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-semibold text-xs flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    Abrir NotebookLM Lado a Lado
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Cole a URL da sua Turma do Google Classroom (ex: https://classroom.google.com/c/...)"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <textarea
                    placeholder="Ou cole avisos, apostilas, tópicos e textos das aulas aqui para sintetizar o caderno completo..."
                    rows={4}
                    id="classroom-text-input"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-slate-500">
                      💡 Você pode abrir o NotebookLM na janela lado a lado enquanto estuda suas turmas do Classroom.
                    </p>
                    <button
                      onClick={() => {
                        const textarea = document.getElementById('classroom-text-input') as HTMLTextAreaElement;
                        const val = textarea?.value?.trim() || 'Resumo geral dos tópicos das aulas do Google Classroom com legislação, exercícios e simulados.';
                        handleSynthesizeNotebookLM('Material do Google Classroom', val, 'Google Classroom');
                      }}
                      className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Sintetizar Conteúdo no NotebookLM
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SLIDES */}
          {activeTab === 'slides' && (
            <div className="space-y-6">
              <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Presentation className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">Incorporar e Sintetizar Google Slides</h3>
                    <p className="text-xs text-slate-400">
                      Cole a URL ou ID de qualquer apresentação do Google Slides para abrir a visualização e gerar um roteiro de estudos NotebookLM.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={slidesUrlInput}
                    onChange={(e) => setSlidesUrlInput(e.target.value)}
                    placeholder="Cole a URL do Google Slides (ex: https://docs.google.com/presentation/d/...)"
                    className="flex-1 w-full bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => {
                      const id = extractSlidesId(slidesUrlInput);
                      if (id) setActivePresentationId(id);
                      else alert('Por favor, informe uma URL válida do Google Slides.');
                    }}
                    className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-600/20 shrink-0"
                  >
                    <BookOpen className="w-4 h-4" />
                    Carregar Apresentação
                  </button>
                </div>
              </div>

              {activePresentationId && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Presentation IFrame Embed */}
                  <div className="md:col-span-2 bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden h-[400px] relative shadow-xl">
                    <iframe
                      src={`https://docs.google.com/presentation/d/${activePresentationId}/embed?start=false&loop=false&delayms=3000`}
                      title="Google Slides Presentation"
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>

                  {/* Notes & Synthesis Column */}
                  <div className="space-y-4 bg-slate-950/60 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs uppercase text-amber-400 tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Notas da Apresentação
                      </h4>
                      <textarea
                        value={slidesNotesInput}
                        onChange={(e) => setSlidesNotesInput(e.target.value)}
                        placeholder="Cole tópicos, resumos ou anotações desta apresentação aqui para enviar ao NotebookLM API..."
                        className="w-full h-44 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        handleSynthesizeNotebookLM(
                          'Apresentação Google Slides',
                          slidesNotesInput || `Apresentação Google Slides ID: ${activePresentationId}`,
                          'Google Slides'
                        );
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      Sintetizar Apresentação no NotebookLM
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTEBOOKLM SYNTHESIS STUDIO */}
          {activeTab === 'notebooklm' && (
            <div className="space-y-6">
              {synthesizing ? (
                <div className="py-20 text-center space-y-4 bg-slate-950/30 rounded-3xl border border-slate-800">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-400 animate-spin mx-auto" />
                  <h3 className="font-bold text-base text-slate-100">
                    Sintetizando Caderno na API do Google NotebookLM...
                  </h3>
                  <p className="text-xs text-slate-400">
                    Processando síntese executiva, roteiro de áudio com 2 apresentadores, FAQ e deck de flashcards.
                  </p>
                </div>
              ) : synthesizedNotebook ? (
                <div className="space-y-6">
                  {/* Notebook Header Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-950 border border-indigo-800/80 px-2.5 py-1 rounded-full">
                        NotebookLM Studio Artifact
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-1">
                        Caderno Sintetizado com Sucesso
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenNotebookLMSideBySide}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
                      >
                        <ExternalLink className="w-4 h-4 text-indigo-400" />
                        Abrir no NotebookLM Lado a Lado
                      </button>

                      {onImportFlashcards && (
                        <button
                          onClick={() => {
                            if (synthesizedNotebook.flashcards?.length) {
                              onImportFlashcards(synthesizedNotebook.flashcards);
                              setImportedStatus(true);
                              setTimeout(() => setImportedStatus(false), 3000);
                            }
                          }}
                          className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                        >
                          {importedStatus ? <Check className="w-4 h-4 text-emerald-300" /> : <Layers className="w-4 h-4" />}
                          {importedStatus ? 'Flashcards Importados!' : 'Importar Flashcards para Estação'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Artifacts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Resumo Executivo & Pontos Chave */}
                    <div className="p-5 rounded-3xl bg-slate-950/50 border border-slate-800 space-y-4">
                      <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Resumo Executivo & Pontos Vitais
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                        {synthesizedNotebook.summary}
                      </p>

                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-slate-400">Tópicos de Fixação:</span>
                        <ul className="space-y-1.5">
                          {synthesizedNotebook.keyTakeaways?.map((item, idx) => (
                            <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                              <span className="text-indigo-400 font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Audio Overview Podcast Script (NotebookLM Signature Feature) */}
                    <div className="p-5 rounded-3xl bg-slate-950/50 border border-slate-800 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                            <Radio className="w-4 h-4" />
                            Roteiro de Áudio (2 Hosts: Alex & Sam)
                          </h4>
                          <button
                            onClick={() => {
                              const scriptText = synthesizedNotebook.audioOverviewScript
                                ?.map((s) => `${s.speaker}: ${s.line}`)
                                .join('\n\n');
                              navigator.clipboard.writeText(scriptText || '');
                              setCopiedScript(true);
                              setTimeout(() => setCopiedScript(false), 2500);
                            }}
                            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                          >
                            {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                            {copiedScript ? 'Copiado!' : 'Copiar Roteiro'}
                          </button>
                        </div>

                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {synthesizedNotebook.audioOverviewScript?.map((dialogue, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-2xl text-xs space-y-1 border ${
                                dialogue.speaker === 'Alex'
                                  ? 'bg-cyan-950/20 border-cyan-800/40 text-cyan-200'
                                  : 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200'
                              }`}
                            >
                              <span className="font-extrabold text-[10px] uppercase tracking-wider block">
                                {dialogue.speaker}
                              </span>
                              <p className="leading-relaxed">{dialogue.line}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800">
                        <button
                          onClick={handleOpenNotebookLMSideBySide}
                          className="w-full py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-bold text-xs hover:bg-cyan-900/60 transition-colors"
                        >
                          Gerar Áudio Oficial na plataforma NotebookLM
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* FAQ & Study Questions */}
                  <div className="p-5 rounded-3xl bg-slate-950/50 border border-slate-800 space-y-4">
                    <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Perguntas Frequentes & Guias de Estudo (FAQ)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {synthesizedNotebook.faq?.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                          <h5 className="font-bold text-xs text-amber-200">{item.question}</h5>
                          <p className="text-xs text-slate-300 leading-relaxed">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center space-y-4 bg-slate-950/30 rounded-3xl border border-slate-800 max-w-lg mx-auto">
                  <Sparkles className="w-12 h-12 text-indigo-400 mx-auto" />
                  <h3 className="font-bold text-slate-200 text-base">Nenhum Caderno Sintetizado Ainda</h3>
                  <p className="text-xs text-slate-400 leading-relaxed px-4">
                    Navegue pelas abas <strong>Google Classroom</strong> ou <strong>Google Slides</strong> para carregar seus materiais e acionar a síntese inteligente do NotebookLM.
                  </p>
                  <button
                    onClick={handleOpenNotebookLMSideBySide}
                    className="py-2.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir Plataforma Google NotebookLM Direta
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
