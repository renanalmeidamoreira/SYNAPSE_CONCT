import React, { useState } from 'react';
import { CourseData } from '../types';
import { extractTextFromPDF } from '../utils/pdfParser';
import { StudyCalendar } from './StudyCalendar';
import { ExternalLink, Headphones, FileCode2, Search } from 'lucide-react';
import { ConcursosSearch } from './ConcursosSearch';
import { callGeminiAPI } from '../utils/gemini';
import {
  BookOpen,
  Plus,
  Trash2,
  Sparkles,
  Award,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Layers,
  FileCheck2,
  AlertCircle,
  BarChart3,
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
  Edit3,
} from 'lucide-react';

interface DashboardProps {
  courses: CourseData[];
  onOpenCourse: (id: string) => void;
  onDeleteCourse: (id: string) => void;
  onCreateCourse: (title: string, banca: string, vagas: string, extraData?: Partial<CourseData>) => void;
  onUpdateCourse?: (updated: CourseData) => void;
  onLoadUnifiedModel?: (type: 'policiais' | 'adm' | 'tribunais') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  courses,
  onOpenCourse,
  onDeleteCourse,
  onCreateCourse,
  onLoadUnifiedModel,
  onUpdateCourse,
}) => {

  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBanca, setNewBanca] = useState('');
  const [newVagas, setNewVagas] = useState('');
  
  // Edit mode states
  const [editCourseId, setEditCourseId] = useState<string | null>(null);

  // PDF import states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<CourseData> | null>(null);
  const [step, setStep] = useState<'initial' | 'review'>('initial');
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showConcursos, setShowConcursos] = useState(false);

  // NotebookLM URL state
  const [notebookUrl, setNotebookUrl] = useState(() => {
    return localStorage.getItem('synapse_notebooklm_url') || 'https://notebooklm.google.com';
  });
  const [isEditingNotebookUrl, setIsEditingNotebookUrl] = useState(false);
  const [tempNotebookUrl, setTempNotebookUrl] = useState(notebookUrl);

  const handleSaveNotebookUrl = () => {
    const formatted = tempNotebookUrl.trim() || 'https://notebooklm.google.com';
    setNotebookUrl(formatted);
    localStorage.setItem('synapse_notebooklm_url', formatted);
    setIsEditingNotebookUrl(false);
  };

  const handleOpenNotebookLM = () => {
    const targetUrl = localStorage.getItem('synapse_notebooklm_url') || notebookUrl || 'https://notebooklm.google.com';
    window.dispatchEvent(new CustomEvent('open-notebooklm-bridge', { detail: { url: targetUrl } }));
  };
  const [searchInitialStatus, setSearchInitialStatus] = useState<string>('todos');
  const [searchInitialBanca, setSearchInitialBanca] = useState<string>('Todas');
  const [searchInitialEstado, setSearchInitialEstado] = useState<string>('TODOS');

  const openRadarWithFilter = (status = 'todos', banca = 'Todas', estado = 'TODOS') => {
    setSearchInitialStatus(status);
    setSearchInitialBanca(banca);
    setSearchInitialEstado(estado);
    setShowConcursos(true);
  };

  const resetModal = () => {
    setShowNewModal(false);
    setEditCourseId(null);
    setNewTitle('');
    setNewBanca('');
    setNewVagas('');
    setPdfFile(null);
    setPdfUrl('');
    setExtractedData(null);
    setStep('initial');
    setIsExtracting(false);
  };

  const handleEditClick = (e: React.MouseEvent, course: CourseData) => {
    e.stopPropagation();
    setEditCourseId(course.id);
    setNewTitle(course.title);
    setNewBanca(course.banca || '');
    setNewVagas(course.vagas || '');
    setShowNewModal(true);
    setStep('initial');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleExtractPDF = async () => {
    if (!pdfFile && !pdfUrl) return;
    setIsExtracting(true);
    try {
      let text = '';
      if (pdfFile) {
        text = await extractTextFromPDF(pdfFile);
      } else if (pdfUrl) {
        text = "Acesse o edital neste link e extraia as informações:\nURL DO EDITAL: " + pdfUrl;
      }
      const prompt = `Analise o seguinte edital de concurso e extraia a estrutura completa.
Texto do Edital:
"""
${text.substring(0, 150000)}
"""
Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "cargo": "Nome do Cargo / Concurso",
  "banca": "Nome da Banca",
  "vagas": "Quantidade de Vagas",
  "remuneracao": "Salário / Remuneração",
  "requisitos": "Requisitos mínimos",
  "resumoIA": "Resumo estruturado com cargo, requisitos, remuneração, etapas, disciplinas e pesos em formato texto (2-3 parágrafos)",
  "etapas": [
    { "nome": "Nome da Etapa", "caracter": "Eliminatória/Classificatória", "detalhes": "Detalhes curtos" }
  ],
  "questoes": [
    { "materia": "Nome da Disciplina", "questoes": 15, "peso": 2.0 }
  ]
}`;

      const result = await callGeminiAPI(prompt, 'Você é um especialista em análise de edital. Retorne apenas JSON válido conforme instruído.');
      const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      setExtractedData(parsed);
      setNewBanca(parsed.banca || '');
      setNewVagas(parsed.vagas || '');
      if (parsed.cargo && !newTitle) {
        setNewTitle(parsed.cargo);
      }
      
      // Auto-fill title if empty
      if (!newTitle) {
         setNewTitle('Edital Importado');
      }
      
      setStep('review');
    } catch (err) {
      console.error(err);
      alert('Falha na extração por IA. Você pode preencher os dados manualmente e prosseguir.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    if (editCourseId) {
       const existing = courses.find(c => c.id === editCourseId);
       if (existing && onUpdateCourse) {
         onUpdateCourse({
           ...existing,
           title: newTitle.trim(),
           banca: newBanca.trim(),
           vagas: newVagas.trim(),
         });
       }
    } else {
       onCreateCourse(newTitle.trim(), newBanca.trim(), newVagas.trim(), extractedData || undefined);
    }
    
    resetModal();
  };


  return (
    <div id="dashboard" className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-8">
      {showConcursos ? (
        <ConcursosSearch
          initialStatusFilter={searchInitialStatus}
          initialBancaFilter={searchInitialBanca}
          initialEstadoFilter={searchInitialEstado}
          onClose={() => {
            setShowConcursos(false);
            setSearchInitialStatus('todos');
            setSearchInitialBanca('Todas');
            setSearchInitialEstado('TODOS');
          }}
          onImportEdital={(url) => {
            setShowConcursos(false);
            setPdfUrl(url);
            setShowNewModal(true);
            setStep('initial');
          }}
        />
      ) : (
        <>
          {/* Welcome & Stats Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xl space-y-4">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Estações de Estudos Unificadas</span>
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight font-display mb-1">
              Central de Estudos de Alto Desempenho
            </h1>
            <p className="text-xs md:text-sm text-slate-300 flex items-center gap-1.5">
              <span>Agrupe seus concursos com editais afins e potencialize seu rendimento diário.</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openRadarWithFilter('todos')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 group cursor-pointer"
            >
              <Search className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
              <span>Radar de Concursos</span>
            </button>
          </div>
        </div>

        {/* Dynamic Quick Filters Bar on Dashboard */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold text-[11px] mr-1">Alertas Ativos:</span>
            <button
              onClick={() => openRadarWithFilter('todos', 'Todas', 'MG')}
              className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>🔺 Minas Gerais (MG)</span>
            </button>
            <button
              onClick={() => openRadarWithFilter('todos', 'Todas', 'TODOS')}
              className="bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>🇧🇷 Federais (BR)</span>
            </button>
            <button
              onClick={() => openRadarWithFilter('aberto')}
              className="bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-300 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Inscrições Abertas
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openRadarWithFilter('todos', 'FGV')}
              className="bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-300 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              FGV
            </button>
            <button
              onClick={() => openRadarWithFilter('todos', 'Cebraspe')}
              className="bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-300 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Cebraspe
            </button>
          </div>
        </div>
      </div>

      {/* Modelos de Estações de Estudo Unificadas (Limpo e sem poluição) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Modelos Pré-Configurados de Estudo</span>
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">1-clique para gerar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Model 1: Carreiras Policiais */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                  Com TAF Físico
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Modelo #1</span>
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors mb-1">
                Policial & Segurança
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate" title="Português, RLM, Informática, Direito Constitucional, Penal, Direitos Humanos, CTB">
                GCM + PC + PM (Português, RLM, Penal, Const...)
              </p>
            </div>
            <button
              onClick={() => onLoadUnifiedModel && onLoadUnifiedModel('policiais')}
              className="w-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gerar Estação Policial</span>
            </button>
          </div>

          {/* Model 2: Carreiras Administrativas */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                  Sem TAF
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Modelo #2</span>
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors mb-1">
                Administrativa & Bancos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate" title="Português, RLM, Informática/IA, Direito Administrativo, Constitucional, Atendimento">
                INSS + PF Adm + Bancos (Português, Adm, Const...)
              </p>
            </div>
            <button
              onClick={() => onLoadUnifiedModel && onLoadUnifiedModel('adm')}
              className="w-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gerar Estação Administrativa</span>
            </button>
          </div>

          {/* Model 3: Tribunais & MPU */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800">
                  Sem TAF
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Modelo #3</span>
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-500 transition-colors mb-1">
                Tribunais & MPU
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 truncate" title="Português, RLM, Informática, Constitucional, Administrativo, Processo Civil e Penal">
                TJ + TRT + MPU (Português, Processo Civil, Penal...)
              </p>
            </div>
            <button
              onClick={() => onLoadUnifiedModel && onLoadUnifiedModel('tribunais')}
              className="w-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gerar Estação Tribunais</span>
            </button>
          </div>
        </div>
      </div>

      {/* NotebookLM Discreet Utility Card (Abertura em nova aba sem poluição visual) */}
      <div className="bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Google NotebookLM</h4>
              <span className="text-[10px] text-slate-400 font-medium">Abertura em aba externa</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Acesse seus cadernos oficiais e resumos em áudio diretamente em uma aba dedicada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isEditingNotebookUrl ? (
            <button
              onClick={() => setIsEditingNotebookUrl(true)}
              className="text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 transition-colors cursor-pointer"
              title="Personalizar URL de caderno específico"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={tempNotebookUrl}
                onChange={(e) => setTempNotebookUrl(e.target.value)}
                placeholder="https://notebooklm.google.com/..."
                className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 w-48 focus:outline-hidden"
              />
              <button
                onClick={handleSaveNotebookUrl}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold cursor-pointer"
              >
                Salvar
              </button>
              <button
                onClick={() => setIsEditingNotebookUrl(false)}
                className="text-slate-400 text-[11px] hover:text-slate-600 px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <button
            onClick={handleOpenNotebookLM}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <span>Abrir Caderno</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Courses Grid Section */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Minhas Estações de Estudo ({courses.length})
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Selecione uma estação para abrir a grade de estudos acoplada
          </p>
        </div>
        <button
          onClick={() => setShowConcursos(true)}
          className="hidden md:flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-xs px-4 py-2 rounded-xl transition-all"
        >
          <Search className="w-4 h-4" /> Buscar Concursos
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 bg-slate-100 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
          <GraduationCap className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
            Nenhuma Estação Cadastrada
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
            Crie sua primeira estação de estudos ou inicie com um dos modelos unificados acima.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all"
            >
              Criar Estação
            </button>
            <button
              onClick={() => setShowConcursos(true)}
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Buscar Concursos
            </button>
            
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const completedCount = course.materials?.filter((m) => m.completed).length || 0;
            const totalMaterials = course.materials?.length || 0;
            const computedProgress =
              totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0;

            return (
              <div
                key={course.id}
                className="group relative bg-slate-100 dark:bg-slate-900/90 hover:bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-1 rounded-full uppercase">
                        {course.banca || 'Banca Geral'}
                      </span>
                    </div>

                    {/* Trash Button */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => handleEditClick(e, course)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition-all"
                        title="Editar Estação"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(course.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-all"
                        title="Excluir Estação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => onOpenCourse(course.id)}
                    className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-indigo-300 transition-colors cursor-pointer line-clamp-2 mb-3"
                  >
                    {course.title}
                  </h3>

                  {/* Details Badges */}
                  <div className="space-y-2 mb-6 text-xs text-slate-800 dark:text-slate-300">
                    {course.vagas && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="truncate">Vagas: {course.vagas}</span>
                      </div>
                    )}
                    {course.remuneracao && (
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{course.remuneracao}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                      <span>
                        {completedCount} de {totalMaterials} mídias concluídas
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-slate-600 dark:text-slate-400">Progresso do Edital</span>
                      <span className="text-indigo-300 font-mono">{computedProgress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700/50">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${computedProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onOpenCourse(course.id)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 font-bold text-sm py-2.5 rounded-2xl transition-all group-hover:border-indigo-500"
                  >
                    <span>Entrar na Estação</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Course Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
              {editCourseId ? 'Editar Estação' : 'Criar Nova Estação'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
              {editCourseId ? 'Edite as informações do cartão de acesso.' : 'Importe o edital (PDF) ou defina o nome manualmente.'}
            </p>
            
            {step === 'initial' && !editCourseId && (
              <div className="mb-6 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center">
                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Importar Edital (PDF)</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                  Nossa IA vai extrair as disciplinas, etapas e resumo.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="edital-upload"
                />
                <label
                  htmlFor="edital-upload"
                  className="inline-flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-300 dark:border-transparent"
                >
                  Selecionar Arquivo PDF
                </label>
                {pdfFile && (
                  <div className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {pdfFile.name}
                  </div>
                )}
                {pdfUrl && !pdfFile && (
                  <div className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> Link do Edital Adicionado
                  </div>
                )}
                {(pdfFile || pdfUrl) && (
                  <button
                    onClick={handleExtractPDF}
                    disabled={isExtracting}
                    className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                    <span>{isExtracting ? 'Analisando Edital...' : 'Ler Edital com IA'}</span>
                  </button>
                )}
              </div>
            )}
            
            <form onSubmit={handleSubmitNew} className="space-y-4">
              {step === 'review' && extractedData && (
                <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl max-h-64 overflow-y-auto">
                  <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Extração Concluída
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-500 mb-3">Revise a estrutura extraída pela IA:</p>
                  <div className="space-y-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <p><strong>Cargo:</strong> {extractedData.cargo || newTitle}</p>
                    <p><strong>Remuneração:</strong> {extractedData.remuneracao || 'Não informada'}</p>
                    <p><strong>Requisitos:</strong> {extractedData.requisitos || 'Não informados'}</p>
                    <p><strong>Banca:</strong> {extractedData.banca || newBanca}</p>
                    <p><strong>Vagas:</strong> {extractedData.vagas || newVagas}</p>
                    
                    <div className="pt-2">
                      <strong className="block mb-1">Etapas ({extractedData.etapas?.length || 0}):</strong>
                      <ul className="list-disc list-inside pl-1">
                        {extractedData.etapas?.map((e: any, i: number) => (
                          <li key={i}>{e.nome} <span className="opacity-70">({e.caracter})</span></li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      <strong className="block mb-1">Disciplinas ({extractedData.questoes?.length || 0}):</strong>
                      <ul className="list-disc list-inside pl-1">
                        {extractedData.questoes?.map((q: any, i: number) => (
                          <li key={i}>{q.materia} <span className="opacity-70">({q.questoes}Q, Peso {q.peso})</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">
                  Nome do Concurso / Estação *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Polícia Civil / Inspetor 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">
                  Banca Organizadora
                </label>
                <input
                  type="text"
                  placeholder="Ex: VUNESP, CEBRASPE, FGV"
                  value={newBanca}
                  onChange={(e) => setNewBanca(e.target.value)}
                  className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-300 mb-1">
                  Número de Vagas
                </label>
                <input
                  type="text"
                  placeholder="Ex: 150 + CR"
                  value={newVagas}
                  onChange={(e) => setNewVagas(e.target.value)}
                  className="w-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 dark:shadow-indigo-500/20 transition-all"
                >
                  {editCourseId ? 'Salvar Alterações' : (step === 'review' ? 'Confirmar e Criar Estação' : 'Criar Estação')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Excluir esta estação?</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
              Todos os materiais, flashcards e dados salvos nesta estação serão permanentemente perdidos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200 dark:bg-slate-800 hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteCourse(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 dark:bg-rose-600 hover:bg-indigo-500 dark:hover:bg-rose-500 transition-all"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
