import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  GraduationCap,
  SlidersHorizontal,
  ShieldCheck,
  Download,
  Upload,
  FileCode,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Layers,
  Award,
  Calendar,
  Music,
  ExternalLink,
  Brain,
  CheckCircle2,
  FileText,
  HelpCircle,
  FolderOpen,
  Crosshair,
} from 'lucide-react';
import { CourseData } from '../types';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeProvider';
import { isSuperAdminEmail } from '../lib/firebase';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  courses: CourseData[];
  activeCourseId: string | null;
  onSelectCourse: (id: string | null) => void;
  onOpenNewCourseModal: () => void;
  onOpenGeminiModal: () => void;
  onOpenWorkspaceModal?: () => void;
  onOpenUserManagement?: () => void;
  onOpenConnectionsModal?: () => void;
  onLoadUnifiedModel?: (type: 'policiais' | 'adm' | 'tribunais') => void;
  activeCourse?: CourseData | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  courses,
  activeCourseId,
  onSelectCourse,
  onOpenNewCourseModal,
  onOpenGeminiModal,
  onOpenWorkspaceModal,
  onOpenUserManagement,
  onOpenConnectionsModal,
  onLoadUnifiedModel,
  activeCourse,
}) => {
  const { user, isSuperAdmin } = useAuth();
  const isSuperUser = isSuperAdmin && isSuperAdminEmail(user?.email);
  const { theme } = useTheme();
  const [coursesExpanded, setCoursesExpanded] = useState(true);
  const [modelsExpanded, setModelsExpanded] = useState(true);
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [backupExpanded, setBackupExpanded] = useState(true);

  const handleExportBackup = () => {
    const data: Record<string, any> = {
      courses: localStorage.getItem('synapse_courses_v5'),
      active: localStorage.getItem('synapse_active_course_v5'),
      daily: localStorage.getItem('synapse_daily_time_v5'),
      events: localStorage.getItem('synapse_study_agenda_events'),
    };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('synapse_meta_')) {
        data[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synapse_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenNotebookLM = () => {
    const targetUrl = localStorage.getItem('synapse_notebooklm_url') || 'https://notebooklm.google.com';
    window.dispatchEvent(new CustomEvent('open-inapp-web', { detail: { url: targetUrl, title: 'Google NotebookLM' } }));
  };

  const isSwat = theme === 'swat';
  const isPink = theme === 'pink';

  return (
    <aside
      className={`relative z-20 flex flex-col shrink-0 border-r transition-all duration-300 select-none ${
        isSwat
          ? 'bg-[#070b12] border-cyan-500/25 text-slate-200'
          : isPink
          ? 'bg-[#120718] border-rose-500/25 text-rose-100'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
      } ${isCollapsed ? 'w-18' : 'w-72'}`}
      style={{ height: 'calc(100vh - 61px)' }}
    >
      {/* Sidebar Header & Collapse Toggle */}
      <div className="flex items-center justify-between p-3 border-b border-inherit">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              onClick={() => onSelectCourse(null)}
              className="flex items-center gap-2 cursor-pointer group"
              title="Ir para o Painel Geral"
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center p-0.5 shadow-sm transition-transform group-hover:scale-105 ${
                  isSwat
                    ? 'bg-cyan-500 text-black shadow-cyan-500/30'
                    : isPink
                    ? 'bg-rose-500 text-white shadow-rose-500/30'
                    : 'bg-indigo-600 text-white shadow-indigo-500/30'
                }`}
              >
                <Brain className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                    SYNAPSE
                  </span>
                  {isSwat ? (
                    <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-1 py-0.2 rounded">
                      HUD
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-indigo-500 dark:text-cyan-400 bg-indigo-50 dark:bg-slate-800 px-1 py-0.2 rounded">
                      v5.0
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  Estação de Estudos
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-xl border transition-colors cursor-pointer ml-auto ${
            isSwat
              ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/50'
              : isPink
              ? 'border-rose-500/30 text-rose-400 hover:bg-rose-950/50'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={isCollapsed ? 'Expandir Menu Lateral' : 'Ocultar Menu Lateral'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4 custom-scrollbar">
        {/* Navigation Core Items */}
        <div className="space-y-1">
          {/* Painel Geral / Início */}
          <button
            onClick={() => onSelectCourse(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              !activeCourseId
                ? isSwat
                  ? 'bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                  : isPink
                  ? 'bg-rose-950/60 border border-rose-500/50 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                  : 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
            }`}
            title="Painel Geral (Dashboard)"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Painel Geral</span>}
          </button>

          {/* Active Course Quick Focus (if a station is active) */}
          {activeCourse && (
            <div
              className={`p-2 rounded-xl border text-xs transition-all ${
                isSwat
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                  : isPink
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              {!isCollapsed ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-cyan-400" />
                      Estação Ativa
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="font-bold text-xs truncate leading-snug">{activeCourse.title}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {activeCourse.banca || 'Banca Geral'} • {activeCourse.materials?.length || 0} materiais
                  </p>
                </div>
              ) : (
                <div className="flex justify-center" title={`Estação Ativa: ${activeCourse.title}`}>
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Estações de Estudo List */}
        <div className="space-y-1.5">
          {!isCollapsed ? (
            <div
              onClick={() => setCoursesExpanded(!coursesExpanded)}
              className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer select-none group"
            >
              <span className="flex items-center gap-1.5">
                <Layers className={`w-3 h-3 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-indigo-400'}`} />
                <span>Suas Estações ({courses.length})</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNewCourseModal();
                  }}
                  className={`p-0.5 rounded cursor-pointer transition-colors ${
                    isSwat
                      ? 'hover:text-cyan-300'
                      : isPink
                      ? 'hover:text-rose-300'
                      : 'hover:text-indigo-500 dark:hover:text-cyan-400'
                  }`}
                  title="Criar Nova Estação"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${coursesExpanded ? '' : '-rotate-90'}`} />
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-1 border-t border-inherit">
              <button
                onClick={onOpenNewCourseModal}
                className={`p-1.5 rounded-xl transition-colors ${
                  isSwat
                    ? 'hover:bg-cyan-950/60 text-cyan-400'
                    : isPink
                    ? 'hover:bg-rose-950/60 text-rose-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-500 dark:text-cyan-400'
                }`}
                title="Criar Nova Estação"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {(!isCollapsed ? coursesExpanded : true) && (
            <div className="space-y-1 animate-fade-in">
              {courses.slice(0, 8).map((c) => {
                const isSelected = activeCourseId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectCourse(c.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer truncate ${
                      isSelected
                        ? isSwat
                          ? 'bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 font-bold'
                          : isPink
                          ? 'bg-rose-950/80 border border-rose-500/60 text-rose-200 font-bold'
                          : 'bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 font-bold'
                        : isSwat
                        ? 'hover:bg-cyan-950/40 text-slate-400 hover:text-cyan-200 border border-transparent'
                        : isPink
                        ? 'hover:bg-rose-950/40 text-slate-400 hover:text-rose-200 border border-transparent'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-transparent'
                    }`}
                    title={c.title}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected
                          ? isSwat
                            ? 'bg-cyan-400 animate-pulse'
                            : isPink
                            ? 'bg-rose-400 animate-pulse'
                            : 'bg-indigo-500 animate-pulse'
                          : 'bg-slate-400/50'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{c.title}</span>}
                  </button>
                );
              })}

              {courses.length === 0 && !isCollapsed && (
                <p className="text-[11px] text-slate-400 px-3 py-1 italic">Nenhuma estação criada.</p>
              )}
            </div>
          )}
        </div>

        {/* Carreiras & Modelos Prontos */}
        {onLoadUnifiedModel && (
          <div className="space-y-1.5">
            {!isCollapsed ? (
              <div
                onClick={() => setModelsExpanded(!modelsExpanded)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer select-none group"
              >
                <span className="flex items-center gap-1.5">
                  <Award className={`w-3 h-3 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-amber-400'}`} />
                  <span>Modelos de Carreiras</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${modelsExpanded ? '' : '-rotate-90'}`} />
              </div>
            ) : (
              <div className="flex justify-center py-1 border-t border-inherit">
                <Award className={`w-3.5 h-3.5 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-amber-400'}`} />
              </div>
            )}

            {(!isCollapsed ? modelsExpanded : true) && (
              <div className="space-y-1 animate-fade-in">
                <button
                  onClick={() => onLoadUnifiedModel('policiais')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSwat
                      ? 'text-slate-300 hover:bg-cyan-950/50 hover:text-cyan-200'
                      : isPink
                      ? 'text-rose-200/90 hover:bg-rose-950/50 hover:text-rose-100'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title="Criar Estação para Carreiras Policiais (PF / PRF / PC)"
                >
                  <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-blue-400'}`} />
                  {!isCollapsed && <span>Carreiras Policiais</span>}
                </button>
                <button
                  onClick={() => onLoadUnifiedModel('adm')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSwat
                      ? 'text-slate-300 hover:bg-cyan-950/50 hover:text-cyan-200'
                      : isPink
                      ? 'text-rose-200/90 hover:bg-rose-950/50 hover:text-rose-100'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title="Criar Estação Administrativa & Fiscal"
                >
                  <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-emerald-400'}`} />
                  {!isCollapsed && <span>Administrativa & Fiscal</span>}
                </button>
                <button
                  onClick={() => onLoadUnifiedModel('tribunais')}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    isSwat
                      ? 'text-slate-300 hover:bg-cyan-950/50 hover:text-cyan-200'
                      : isPink
                      ? 'text-rose-200/90 hover:bg-rose-950/50 hover:text-rose-100'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title="Criar Estação Tribunais & Judiciário"
                >
                  <Award className={`w-3.5 h-3.5 shrink-0 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-purple-400'}`} />
                  {!isCollapsed && <span>Tribunais & Jurídico</span>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Ferramentas & Ecossistema de Estudos */}
        <div className="space-y-1.5">
          {!isCollapsed ? (
            <div
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer select-none group"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className={`w-3 h-3 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-indigo-400'}`} />
                <span>Ferramentas & IA</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${toolsExpanded ? '' : '-rotate-90'}`} />
            </div>
          ) : (
            <div className="flex justify-center py-1 border-t border-inherit">
              <Sparkles className={`w-3.5 h-3.5 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-indigo-400'}`} />
            </div>
          )}

          {(!isCollapsed ? toolsExpanded : true) && (
            <div className="space-y-1 animate-fade-in">
              {/* Assistente IA */}
              <button
                onClick={onOpenGeminiModal}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left group ${
                  isSwat
                    ? 'text-cyan-200 hover:bg-cyan-950/60'
                    : isPink
                    ? 'text-rose-200 hover:bg-rose-950/60'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                }`}
                title="Abrir Assistente Inteligente Synapse (Gemini / IA Local)"
              >
                <Sparkles className={`w-4 h-4 shrink-0 group-hover:scale-110 transition-transform ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-amber-400'}`} />
                {!isCollapsed && <span>Assistente IA Synapse</span>}
              </button>

              {/* Google NotebookLM in-app */}
              <button
                onClick={handleOpenNotebookLM}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left group ${
                  isSwat
                    ? 'text-slate-200 hover:bg-cyan-950/60'
                    : isPink
                    ? 'text-rose-100 hover:bg-rose-950/60'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                title="Abrir Google NotebookLM Integrado"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen className={`w-4 h-4 shrink-0 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-emerald-400'}`} />
                  {!isCollapsed && <span className="truncate">Google NotebookLM</span>}
                </div>
                {!isCollapsed && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isSwat
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : isPink
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                  }`}>
                    In-App
                  </span>
                )}
              </button>

              {/* Google Workspace & Slides */}
              {onOpenWorkspaceModal && (
                <button
                  onClick={onOpenWorkspaceModal}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                    isSwat
                      ? 'text-slate-200 hover:bg-cyan-950/60'
                      : isPink
                      ? 'text-rose-100 hover:bg-rose-950/60'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                  title="Google Workspace, Drive & Slides"
                >
                  <GraduationCap className={`w-4 h-4 shrink-0 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-cyan-400'}`} />
                  {!isCollapsed && <span>Google Workspace</span>}
                </button>
              )}

              {/* Central de Conexões */}
              <button
                onClick={() => {
                  if (onOpenConnectionsModal) onOpenConnectionsModal();
                  else window.dispatchEvent(new CustomEvent('open-connections-modal'));
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                  isSwat
                    ? 'text-cyan-300 hover:bg-cyan-950/60'
                    : isPink
                    ? 'text-rose-300 hover:bg-rose-950/60'
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                }`}
                title="Central de Conexões & Autorizações"
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Central de Conexões</span>}
              </button>

              {/* Gestão de Acesso (Whitelist) - Exclusivo Super User */}
              {isSuperUser && onOpenUserManagement && (
                <button
                  onClick={onOpenUserManagement}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left ${
                    isSwat
                      ? 'text-amber-400 hover:bg-cyan-950/60'
                      : isPink
                      ? 'text-rose-300 hover:bg-rose-950/60'
                      : 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60'
                  }`}
                  title="Gestão de Usuários e Whitelist de Acesso"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                  {!isCollapsed && <span>Gestão de Acesso</span>}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dados & Backup */}
        <div className="space-y-1.5 border-t border-inherit pt-3">
          {!isCollapsed ? (
            <div
              onClick={() => setBackupExpanded(!backupExpanded)}
              className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer select-none group"
            >
              <span className="flex items-center gap-1.5">
                <Download className={`w-3 h-3 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>Dados & Exportação</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${backupExpanded ? '' : '-rotate-90'}`} />
            </div>
          ) : (
            <div className="flex justify-center py-1 border-t border-inherit">
              <Download className={`w-3.5 h-3.5 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-slate-400'}`} />
            </div>
          )}

          {(!isCollapsed ? backupExpanded : true) && (
            <div className="space-y-1 animate-fade-in">
              <button
                onClick={handleExportBackup}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                  isSwat
                    ? 'text-slate-300 hover:bg-cyan-950/50 hover:text-cyan-200'
                    : isPink
                    ? 'text-rose-200/90 hover:bg-rose-950/50 hover:text-rose-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                title="Exportar Backup dos seus Dados em JSON"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span>Exportar Backup (JSON)</span>}
              </button>

              <a
                href="/SYNAPSE_CODIGO_COMPLETO.txt"
                download="SYNAPSE_CODIGO_COMPLETO.txt"
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                  isSwat
                    ? 'text-slate-300 hover:bg-cyan-950/50 hover:text-cyan-200'
                    : isPink
                    ? 'text-rose-200/90 hover:bg-rose-950/50 hover:text-rose-100'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                title="Baixar Código-Fonte Completo (.txt)"
              >
                <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-indigo-400'}`} />
                {!isCollapsed && <span>Código Completo (.txt)</span>}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-inherit bg-slate-50/50 dark:bg-slate-950/50">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isSwat ? '[ HUD TÁTICO ]' : 'SYNAPSE ONLINE'}
            </span>
            <span className="text-[10px] opacity-70">v5.0</span>
          </div>
        ) : (
          <div className="flex justify-center" title="Status: Online">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
        )}
      </div>
    </aside>
  );
};
