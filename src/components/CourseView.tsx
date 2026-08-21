import React, { useState } from 'react';
import { CourseData, MaterialItem, SimuladoItem, Flashcard } from '../types';
import { EditalView } from './EditalView';
import { GradeView } from './GradeView';
import { ProvasView } from './ProvasView';
import { FlashcardsView } from './FlashcardsView';
import { CadernoView } from './CadernoView';
import { TafView } from './TafView';
import { PomodoroTimer } from './PomodoroTimer';
import {
  ArrowLeft,
  FileText,
  PlaySquare,
  FileCheck2,
  Layers,
  BookOpen,
  Activity,
  Timer,
  BarChart3,
  Sparkles,
  Search,
} from 'lucide-react';

interface CourseViewProps {
  course: CourseData;
  simulados: SimuladoItem[];
  flashcards: Flashcard[];
  notesText: string;
  onUpdateCourse: (updated: CourseData) => void;
  onUpdateSimulados: (updated: SimuladoItem[]) => void;
  onUpdateFlashcards: (updated: Flashcard[]) => void;
  onSaveNotes: (text: string) => void;
  onOpenMedia: (item: MaterialItem) => void;
  onDailyTimeUpdated: () => void;
}

export const CourseView: React.FC<CourseViewProps> = ({
  course,
  simulados,
  flashcards,
  notesText,
  onUpdateCourse,
  onUpdateSimulados,
  onUpdateFlashcards,
  onSaveNotes,
  onOpenMedia,
  onDailyTimeUpdated,
}) => {
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeTab, setActiveTab] = useState<
    'edital' | 'grade' | 'provas' | 'flashcards' | 'caderno' | 'taf' | 'pomodoro'
  >('edital');

  const handleBack = () => {
    if (typeof (window as any).closeCourse === 'function') {
      (window as any).closeCourse();
    }
  };

  const completedMaterials = course.materials?.filter((m) => m.completed).length || 0;
  const totalMaterials = course.materials?.length || 0;
  const progressPercent = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0;

  return (
    <div id="course-view" className="max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6 space-y-6">
      {/* Top Navigation & Station Header */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Voltar ao Painel de Estações"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950 border border-cyan-800/80 px-2 py-0.5 rounded-full uppercase">
                  {course.banca || 'Banca Geral'}
                </span>
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 font-mono">
                  ID: {course.id}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight mt-1">
                {course.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-600 dark:text-slate-400 block text-[10px]">Evolução Geral</span>
              <span className="text-indigo-300 font-bold text-sm">{progressPercent}% Concluído</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-800 flex items-center justify-center font-bold text-cyan-400">
              {progressPercent}%
            </div>
          </div>
        </div>

                <div className="mb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar materiais por título ou descrição..."
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                if (e.target.value && activeTab !== 'grade') {
                  setActiveTab('grade');
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>
        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('grade')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'grade'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <PlaySquare className="w-4 h-4" />
            <span>Grade & Mídias ({totalMaterials})</span>
          </button>

          <button
            onClick={() => setActiveTab('edital')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'edital'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Edital Verticalizado</span>
          </button>

          <button
            onClick={() => setActiveTab('provas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'provas'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Provas & Simulados ({simulados.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'flashcards'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Flashcards ({flashcards.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('caderno')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'caderno'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Caderno de Notas</span>
          </button>

          <button
            onClick={() => setActiveTab('taf')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'taf'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Calculadora TAF</span>
          </button>

          <button
            onClick={() => setActiveTab('pomodoro')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'pomodoro'
                ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800'
            }`}
          >
            <Timer className="w-4 h-4" />
            <span>Pomodoro</span>
          </button>
        </div>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'grade' && (
        <GradeView
          course={course}
          onUpdateCourse={onUpdateCourse}
          onOpenMedia={onOpenMedia}
          globalSearchQuery={globalSearch}
        />
      )}

      {activeTab === 'edital' && (
        <EditalView course={course} onUpdateCourse={onUpdateCourse} />
      )}

      {activeTab === 'provas' && (
        <ProvasView
          course={course}
          simulados={simulados}
          onUpdateSimulados={onUpdateSimulados}
        />
      )}

      {activeTab === 'flashcards' && (
        <FlashcardsView
          flashcards={flashcards}
          onUpdateFlashcards={onUpdateFlashcards}
        />
      )}

      {activeTab === 'caderno' && (
        <CadernoView
          notesText={notesText}
          onSaveNotes={onSaveNotes}
          courseTitle={course.title}
        />
      )}

      {activeTab === 'taf' && <TafView />}

      {activeTab === 'pomodoro' && (
        <PomodoroTimer onDailyTimeUpdated={onDailyTimeUpdated} />
      )}
    </div>
  );
};
