import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  LogOut,
  Settings, 
  Sun, 
  Moon, 
  Download, 
  Upload,
  Brain,
  Sparkles,
  Timer,
  Clock,
  ExternalLink,
  SlidersHorizontal,
  GraduationCap,
  Info,
  Users,
  ShieldCheck,
  FileCode,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { ThemeSelector } from './ThemeSelector';
import { CourseData } from '../types';
import { isSuperAdminEmail } from '../lib/firebase';

interface HeaderProps {
  courses: CourseData[];
  activeCourseId: string | null;
  onSelectCourse: (id: string) => void;
  onOpenNewCourseModal: () => void;
  onOpenGeminiModal: () => void;
  onOpenPomodoro: () => void;
  onOpenWorkspaceModal?: () => void;
  onOpenUserManagement?: () => void;
  onOpenConnectionsModal?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  dailySeconds: number;
  dailyTargetSeconds: number;
  pomodoroState?: {
    isRunning: boolean;
    mode: 'focus' | 'shortBreak' | 'longBreak';
    timeLeft: number;
  };
}

export const Header: React.FC<HeaderProps> = ({
  courses,
  activeCourseId,
  onSelectCourse,
  onOpenNewCourseModal,
  onOpenGeminiModal,
  onOpenPomodoro,
  onOpenWorkspaceModal,
  onOpenUserManagement,
  onOpenConnectionsModal,
  isSidebarCollapsed,
  onToggleSidebar,
  dailySeconds,
  dailyTargetSeconds,
  pomodoroState,
}) => {
  const { user, logout, isSuperAdmin, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isSwat = theme === 'swat';
  const isPink = theme === 'pink';
  const isSuperUser = isSuperAdmin && isSuperAdminEmail(user?.email);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatHours = (sec: number) => {
    const hrs = (sec / 3600).toFixed(1);
    return `${hrs}h`;
  };

  const formatTimerMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const dailyProgressPercent = Math.min(
    100,
    Math.round((dailySeconds / (dailyTargetSeconds || 10800)) * 100)
  );

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
    setShowToolsMenu(false);
  };

  const handleOpenNotebookLM = () => {
    const targetUrl = localStorage.getItem('synapse_notebooklm_url') || 'https://notebooklm.google.com';
    window.dispatchEvent(new CustomEvent('open-notebooklm-bridge', { detail: { url: targetUrl } }));
    setShowToolsMenu(false);
  };

  return (
    <header className={`sticky top-0 z-30 backdrop-blur-md border-b px-4 lg:px-8 py-2.5 transition-colors ${
      isSwat
        ? 'bg-[#05080e]/95 border-cyan-500/30 text-slate-200'
        : isPink
        ? 'bg-[#0d0612]/95 border-rose-500/30 text-rose-100'
        : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Active Station Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div
            onClick={() => {
              if (typeof (window as any).closeCourse === 'function') {
                (window as any).closeCourse();
              }
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className={`w-9 h-9 rounded-xl p-0.5 shadow-md transition-transform group-hover:scale-105 ${
              isSwat
                ? 'bg-gradient-to-tr from-cyan-500 to-cyan-300 shadow-cyan-500/20'
                : isPink
                ? 'bg-gradient-to-tr from-rose-500 to-pink-500 shadow-rose-500/20'
                : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-indigo-500/20'
            }`}>
              <div className={`w-full h-full rounded-[9px] flex items-center justify-center ${
                isSwat ? 'bg-[#0a111a]' : isPink ? 'bg-[#170a20]' : 'bg-white dark:bg-slate-950'
              }`}>
                <Brain className={`w-4.5 h-4.5 ${
                  isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-indigo-600 dark:text-cyan-400'
                }`} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  SYNAPSE
                </span>
                {isSwat ? (
                  <span className="text-[9px] font-mono font-bold tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.2 rounded-full uppercase">
                    HUD v5.0
                  </span>
                ) : isPink ? (
                  <span className="text-[9px] font-bold tracking-wider text-rose-300 bg-rose-950/80 border border-rose-500/40 px-1.5 py-0.2 rounded-full uppercase">
                    v5.0
                  </span>
                ) : (
                  <span className="text-[9px] font-bold tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 px-1.5 py-0.2 rounded-full uppercase">
                    v5.0
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-0.5 font-medium">Estação de Estudos</p>
            </div>
          </div>
        </div>

        {/* Right Tools: Daily Time Tracker, Pomodoro Button, Tools Menu, Theme & Profile */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Daily Goal Counter (Minimalist) */}
          <div
            onClick={onOpenPomodoro}
            title="Meta diária de estudos - Clique para abrir o Pomodoro"
            className={`flex items-center gap-2 border px-2.5 py-1.5 rounded-xl cursor-pointer transition-all ${
              isSwat
                ? 'bg-cyan-950/40 hover:bg-cyan-950/70 border-cyan-500/30 text-cyan-200'
                : isPink
                ? 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-500/30 text-rose-200'
                : 'bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-700"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    isSwat
                      ? 'text-cyan-400 transition-all duration-500'
                      : isPink
                      ? 'text-rose-400 transition-all duration-500'
                      : 'text-indigo-600 dark:text-cyan-400 transition-all duration-500'
                  }
                  strokeDasharray={`${dailyProgressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Clock className={`w-3 h-3 absolute ${
                isSwat ? 'text-cyan-300' : isPink ? 'text-rose-300' : 'text-indigo-600 dark:text-cyan-300'
              }`} />
            </div>
            <div className="text-left font-mono">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-none">
                {formatHours(dailySeconds)}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">/{formatHours(dailyTargetSeconds)}</span>
            </div>
          </div>

          {/* Pomodoro Timer Quick Button */}
          <button
            onClick={onOpenPomodoro}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-mono text-xs font-bold cursor-pointer border ${
              pomodoroState?.isRunning
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/60 animate-pulse'
                : isSwat
                ? 'bg-cyan-950/40 hover:bg-cyan-950/70 border-cyan-500/30 text-cyan-200'
                : isPink
                ? 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-500/30 text-rose-200'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title="Cronômetro Pomodoro"
          >
            <Timer className={`w-3.5 h-3.5 ${
              pomodoroState?.isRunning 
                ? 'text-rose-400' 
                : isSwat 
                ? 'text-cyan-400' 
                : isPink 
                ? 'text-rose-400' 
                : 'text-indigo-600 dark:text-indigo-400'
            }`} />
            <span>
              {pomodoroState && pomodoroState.timeLeft !== undefined
                ? formatTimerMinSec(pomodoroState.timeLeft)
                : 'Pomodoro'}
            </span>
          </button>

          {/* Tools & Integrations Popover Menu */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className={`flex items-center justify-center w-8.5 h-8.5 rounded-xl border transition-all cursor-pointer ${
                showToolsMenu 
                  ? isSwat
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                    : isPink
                    ? 'bg-rose-950 text-rose-300 border-rose-500'
                    : 'bg-indigo-50 text-indigo-600 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800' 
                  : isSwat
                  ? 'bg-cyan-950/40 hover:bg-cyan-950/70 border-cyan-500/30 text-cyan-200'
                  : isPink
                  ? 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-500/30 text-rose-200'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title="Mais Ferramentas e Integrações"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {showToolsMenu && (
              <div className={`absolute right-0 mt-2 w-64 border rounded-2xl shadow-xl p-2 z-50 animate-fade-in space-y-1 ${
                isSwat
                  ? 'bg-[#0a111a] border-cyan-500/30 text-slate-200'
                  : isPink
                  ? 'bg-[#170a20] border-rose-500/30 text-rose-100'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Ferramentas & Integrações
                </div>

                {/* Google NotebookLM (Separate Tab) */}
                <button
                  onClick={handleOpenNotebookLM}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-xl transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Google NotebookLM</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                </button>

                {/* Google Workspace Modal */}
                {onOpenWorkspaceModal && (
                  <button
                    onClick={() => {
                      onOpenWorkspaceModal();
                      setShowToolsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-emerald-500" />
                    <span>Google Workspace & Slides</span>
                  </button>
                )}

                {/* Gestão de Usuários & Whitelist (Exclusivo Super User r.fabulous.30@gmail.com) */}
                {isSuperUser && onOpenUserManagement && (
                  <button
                    onClick={() => {
                      onOpenUserManagement();
                      setShowToolsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>Gestão de Acesso (Whitelist)</span>
                  </button>
                )}

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                {/* Conexões e Autorizações Modal Trigger */}
                <button
                  onClick={() => {
                    if (onOpenConnectionsModal) {
                      onOpenConnectionsModal();
                    } else {
                      window.dispatchEvent(new CustomEvent('open-connections-modal'));
                    }
                    setShowToolsMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-colors text-left cursor-pointer ${
                    isSwat
                      ? 'text-cyan-300 hover:bg-cyan-950/60'
                      : isPink
                      ? 'text-rose-300 hover:bg-rose-950/60'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                    <span>Conexões & Autorizações</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                    isSwat
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : isPink
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                  }`}>
                    Central
                  </span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Dados & Backup
                </div>

                {/* Export Backup */}
                <button
                  onClick={handleExportBackup}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Exportar Backup (JSON)</span>
                </button>

                {/* Import Backup */}
                <label className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-xl transition-colors text-left cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Importar Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target?.result as string);
                          if (data.courses) localStorage.setItem('synapse_courses_v5', data.courses);
                          if (data.active) localStorage.setItem('synapse_active_course_v5', data.active);
                          if (data.daily) localStorage.setItem('synapse_daily_time_v5', data.daily);
                          if (data.events) localStorage.setItem('synapse_study_agenda_events', data.events);
                          Object.keys(data).forEach(key => {
                            if (key.startsWith('synapse_meta_')) {
                              localStorage.setItem(key, data[key]);
                            }
                          });
                          window.location.reload();
                        } catch (err) {
                          alert('Erro ao importar backup');
                        }
                      };
                      reader.readAsText(file);
                      setShowToolsMenu(false);
                    }}
                  />
                </label>

                {/* Export Source Code TXT */}
                <a
                  href="/SYNAPSE_CODIGO_COMPLETO.txt"
                  download="SYNAPSE_CODIGO_COMPLETO.txt"
                  onClick={() => setShowToolsMenu(false)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-xl transition-colors text-left cursor-pointer"
                  title="Baixar todo o código-fonte do SYNAPSE em arquivo de texto único separado por blocos comentados"
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-indigo-500" />
                    <span>Baixar Código Completo (.txt)</span>
                  </div>
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono px-1.5 py-0.5 rounded-md">
                    .TXT
                  </span>
                </a>

                {/* Settings toggle */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toggle-ai-widget'));
                    setShowToolsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Alternar Widget IA</span>
                </button>
              </div>
            )}
          </div>

          {/* Theme Selector Popover (Dark, Light, S.W.A.T., Pink) */}
          <ThemeSelector />
          
          {/* User Profile Info */}
          {user && (
            <div 
              onClick={() => {
                if (onOpenConnectionsModal) {
                  onOpenConnectionsModal();
                } else {
                  window.dispatchEvent(new CustomEvent('open-connections-modal'));
                }
              }}
              className={`flex items-center gap-2 pl-1 pr-2.5 py-1 border rounded-xl max-w-[160px] truncate cursor-pointer transition-colors ${
                isSwat
                  ? 'bg-cyan-950/40 hover:bg-cyan-950/70 border-cyan-500/30 text-cyan-200'
                  : isPink
                  ? 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-500/30 text-rose-200'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100'
              }`} 
              title="Gerenciar Conexões & Autorizações"
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Avatar'} 
                  className="w-6.5 h-6.5 rounded-lg object-cover ring-1 ring-indigo-500/40 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6.5 h-6.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col text-left truncate min-w-0">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {user.displayName?.split(' ')[0] || 'Estudante'}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                  {(user as any).isGuest ? 'Modo Local' : 'Google Conectado'}
                </span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={logout}
            className={`flex items-center justify-center w-8.5 h-8.5 border rounded-xl transition-all cursor-pointer ${
              isSwat
                ? 'bg-cyan-950/40 hover:bg-rose-950/60 hover:text-rose-400 border-cyan-500/30 text-cyan-300'
                : isPink
                ? 'bg-rose-950/40 hover:bg-rose-950/70 hover:text-rose-300 border-rose-500/30 text-rose-200'
                : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
            }`}
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
