import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CourseData, MaterialItem, SimuladoItem, Flashcard } from './types';
import {
  getCoursesFromStorage,
  saveCourse,
  deleteCourse as dbDeleteCourse,
  getActiveCourseId,
  setActiveCourseId,
  getMeta,
  saveMeta,
  getDailyTime,
  getCourse,
  createUnifiedStation,
} from './utils/storage';
import { extractEmbedUrl, openCoupledWindow } from './utils/media';
import { callGeminiAPI } from './utils/gemini';
import { Header } from './components/Header';
import { useAuth } from './components/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { UnauthorizedScreen } from './components/UnauthorizedScreen';
import { UserManagementModal } from './components/UserManagementModal';
import { FloatingAIAssistant } from './components/FloatingAIAssistant';
import { loadFromFirestore } from './utils/storage';
import { Dashboard } from './components/Dashboard';
import { CourseView } from './components/CourseView';
import { MediaPanel } from './components/MediaPanel';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { PomodoroTimer } from './components/PomodoroTimer';
import { MusicWidget } from './components/MusicWidget';
import { InAppWebViewerModal } from './components/InAppWebViewerModal';
import { FloatingStudyCalendar } from './components/FloatingStudyCalendar';
import { NotebookLMSynapseBridge } from './components/NotebookLMSynapseBridge';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'warning' | 'info';
}

export default function App() {
  const { user, loading, isAuthorized } = useAuth();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [activeCourseId, setActiveCourseIdState] = useState<string | null>(null);

  // Station Metadata
  const [activeCourse, setActiveCourse] = useState<CourseData | null>(null);
  const [simulados, setSimulados] = useState<SimuladoItem[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [notesText, setNotesText] = useState<string>('');

  // Daily Time
  const [dailyTime, setDailyTime] = useState(getDailyTime());

  // Media Panel & In-App Web Browser
  const [activeMediaItem, setActiveMediaItem] = useState<MaterialItem | null>(null);
  const [inAppWebItem, setInAppWebItem] = useState<{ url: string; title?: string } | null>(null);

  // Modals & Floating Pomodoro
  const [showNewCourseModal, setShowNewCourseModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [geminiInitialMessage, setGeminiInitialMessage] = useState('');
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [isPomodoroMinimized, setIsPomodoroMinimized] = useState(false);
  const [pomodoroState, setPomodoroState] = useState<{
    isRunning: boolean;
    mode: 'focus' | 'shortBreak' | 'longBreak';
    timeLeft: number;
  }>({
    isRunning: false,
    mode: 'focus',
    timeLeft: 1500,
  });

  // Stable Pomodoro Callbacks & Global In-App Web Viewer Binding
  useEffect(() => {
    (window as any).openInAppWeb = (url: string, title?: string) => {
      const targetUrl = url || 'https://notebooklm.google.com';
      setInAppWebItem({ url: targetUrl, title: title || 'Navegador Interno' });
    };

    // Escuta evento do FloatingAIAssistant para abrir o Gemini
    const handleOpenGemini = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setGeminiInitialMessage(customEvent.detail);
      }
      setShowGeminiModal(true);
    };

    // Trigger initial background sync for MG and Federal contests
    fetch('/api/concursos/auto-sync-mg-federal')
      .then((r) => r.json())
      .catch(() => {});

    window.addEventListener('open-gemini-chat', handleOpenGemini);
    return () => window.removeEventListener('open-gemini-chat', handleOpenGemini);
  }, []);

  const handleDailyTimeUpdated = useCallback(() => {
    const updated = getDailyTime();
    setDailyTime((prev) => {
      if (prev.totalSeconds === updated.totalSeconds && prev.targetSeconds === updated.targetSeconds) {
        return prev;
      }
      return updated;
    });
  }, []);

  const handleTimerStateChange = useCallback(
    (st: { isRunning: boolean; mode: 'focus' | 'shortBreak' | 'longBreak'; timeLeft: number }) => {
      setPomodoroState((prev) => {
        if (
          prev.isRunning === st.isRunning &&
          prev.mode === st.mode &&
          prev.timeLeft === st.timeLeft
        ) {
          return prev;
        }
        return st;
      });
    },
    []
  );

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);



  // Refresh courses from storage
  const refreshCourses = useCallback(() => {
    const list = getCoursesFromStorage();
    setCourses(list);
    const activeId = getActiveCourseId();
    setActiveCourseIdState(activeId);
  }, []);

  // Load from Firestore on auth change
  useEffect(() => {
    if (user) {
      loadFromFirestore(user.uid).then(() => {
        refreshCourses();
      });
    }
  }, [user, refreshCourses]);

  // Load Metadata for active course
  const loadActiveCourseMeta = useCallback((courseId: string) => {
    const currentCourse = getCourse(courseId);
    setActiveCourse(currentCourse);

    if (currentCourse) {
      const simMeta = getMeta<{ list: SimuladoItem[] }>(courseId, 'simulados', { list: [] });
      setSimulados(simMeta.list || []);

      const fcMeta = getMeta<{ list: Flashcard[] }>(courseId, 'flashcards', { list: [] });
      setFlashcards(fcMeta.list || []);

      const notesMeta = getMeta<{ text: string }>(courseId, 'notes', { text: '' });
      setNotesText(notesMeta.text || '');
    }
  }, []);

  // Initial Load
  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  useEffect(() => {
    if (activeCourseId) {
      loadActiveCourseMeta(activeCourseId);
    } else {
      setActiveCourse(null);
    }
  }, [activeCourseId, loadActiveCourseMeta]);

  // Handle Station Switch
  const handleSelectCourse = (id: string) => {
    setActiveCourseId(id);
    setActiveCourseIdState(id);
    loadActiveCourseMeta(id);
  };

  // Close Station handler (closeCourse)
  const handleCloseCourse = useCallback(() => {
    setActiveCourseId(null);
    setActiveCourseIdState(null);
    setActiveCourse(null);
    setActiveMediaItem(null);
  }, []);

  // Delete Station handler (deleteCourse)
  const handleDeleteCourse = useCallback(
    (id: string, ev?: React.MouseEvent, skipConfirm?: boolean) => {
      if (ev) ev.stopPropagation();
      if (skipConfirm || window.confirm('Excluir esta estação permanentemente?')) {
        dbDeleteCourse(id);
        if (String(activeCourseId) === String(id)) {
          handleCloseCourse();
        }
        refreshCourses();
        showToast('Estação removida com sucesso.', 'info');
      }
    },
    [activeCourseId, handleCloseCourse, refreshCourses, showToast]
  );

  // Save Course Notes handler (saveCourseNotes)
  const handleSaveCourseNotes = useCallback(() => {
    const currentId = activeCourseId || getActiveCourseId();
    if (!currentId) return;

    const textarea = document.getElementById('cv-notes') as HTMLTextAreaElement | null;
    const textToSave = textarea ? textarea.value : notesText;

    saveMeta(currentId, 'notes', { text: textToSave, updatedAt: Date.now() });
    setNotesText(textToSave);
    showToast('Caderno salvo!', 'success');
  }, [activeCourseId, notesText, showToast]);

  // Expose MANDATORY window functions globally
  useEffect(() => {
    (window as any).closeCourse = handleCloseCourse;
    (window as any).deleteCourse = handleDeleteCourse;
    (window as any).saveCourseNotes = handleSaveCourseNotes;
    (window as any).fileToBase64 = fileToBase64;
    (window as any).loadDailyTime = () => setDailyTime(getDailyTime());
    (window as any).callGeminiAPI = callGeminiAPI;
    (window as any).extractEmbedUrl = extractEmbedUrl;
    (window as any).openCoupledWindow = (url: string) => {
      const ok = openCoupledWindow(url);
      if (!ok) showToast('Permita pop-ups para abrir em janela acoplada.', 'warning');
      return ok;
    };
    (window as any).renderDashboard = refreshCourses;
    (window as any).showToast = showToast;
    (window as any).openInAppWeb = (url: string, title?: string) => {
      setInAppWebItem({ url, title });
    };
  }, [handleCloseCourse, handleDeleteCourse, handleSaveCourseNotes, refreshCourses, showToast]);

  // Station Updates
  const handleUpdateActiveCourse = (updated: CourseData) => {
    saveCourse(updated);
    setActiveCourse(updated);
    refreshCourses();
  };

  const handleUpdateSimulados = (updatedList: SimuladoItem[]) => {
    if (!activeCourseId) return;
    saveMeta(activeCourseId, 'simulados', { list: updatedList });
    setSimulados(updatedList);
  };

  const handleUpdateFlashcards = (updatedList: Flashcard[]) => {
    if (!activeCourseId) return;
    saveMeta(activeCourseId, 'flashcards', { list: updatedList });
    setFlashcards(updatedList);
  };

  const handleCreateCourse = (title: string, banca: string, vagas: string, extraData?: Partial<CourseData>) => {
    const newCourse: CourseData = {
      id: `course-${Date.now()}`,
      title,
      banca,
      vagas,
      progress: 0,
      materials: [],
      questoes: [],
      updatedAt: Date.now(),
      ...extraData,
    };

    saveCourse(newCourse);
    refreshCourses();
    handleSelectCourse(newCourse.id);
    showToast('Nova Estação criada com sucesso!');
  };

  const handleLoadUnifiedModel = (type: 'policiais' | 'adm' | 'tribunais') => {
    const station = createUnifiedStation(type);
    refreshCourses();
    handleSelectCourse(station.id);
    showToast(`Estação Unificada (${station.title}) criada e selecionada!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3 font-sans">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-400">Autenticando no SYNAPSE...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!isAuthorized) {
    return <UnauthorizedScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans flex flex-col antialiased selection:bg-indigo-500 selection:text-slate-800 dark:text-white">
      <FloatingAIAssistant courses={courses} flashcards={flashcards} simulados={simulados} />
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top-2 duration-200 ${
              t.type === 'success'
                ? 'bg-slate-100 dark:bg-slate-900 border-emerald-500/60 text-emerald-200'
                : t.type === 'warning'
                ? 'bg-slate-100 dark:bg-slate-900 border-amber-500/60 text-amber-200'
                : 'bg-slate-100 dark:bg-slate-900 border-indigo-500/60 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              <span>{t.text}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Floating Music Widget (Top Left) */}
      <MusicWidget />

      {/* Main Header Bar */}
      <Header
        courses={courses}
        activeCourseId={activeCourseId}
        onSelectCourse={handleSelectCourse}
        onOpenNewCourseModal={() => setShowNewCourseModal(true)}
        onOpenGeminiModal={() => setShowGeminiModal(true)}
        onOpenWorkspaceModal={() => setShowWorkspaceModal(true)}
        onOpenUserManagement={() => setShowUserManagementModal(true)}
        onOpenPomodoro={() => {
          setShowPomodoroModal(true);
          setIsPomodoroMinimized(false);
        }}
        dailySeconds={dailyTime.totalSeconds}
        dailyTargetSeconds={dailyTime.targetSeconds}
        pomodoroState={pomodoroState}
      />

      {/* Main Body */}
      <main className="flex-1 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeCourseId && activeCourse ? (
            <motion.div
              key={`course-${activeCourseId}`}
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <CourseView
                course={activeCourse}
                simulados={simulados}
                flashcards={flashcards}
                notesText={notesText}
                onUpdateCourse={handleUpdateActiveCourse}
                onUpdateSimulados={handleUpdateSimulados}
                onUpdateFlashcards={handleUpdateFlashcards}
                onSaveNotes={handleSaveCourseNotes}
                onOpenMedia={(item) => setActiveMediaItem(item)}
                onDailyTimeUpdated={handleDailyTimeUpdated}
              />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <Dashboard
                courses={courses}
                onOpenCourse={handleSelectCourse}
                onDeleteCourse={(id) => handleDeleteCourse(id, undefined, true)}
                onCreateCourse={handleCreateCourse}
                onUpdateCourse={(c) => {
                  saveCourse(c);
                  refreshCourses();
                }}
                onLoadUnifiedModel={handleLoadUnifiedModel}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Split Media Panel Viewer */}
      {activeMediaItem && (
        <MediaPanel
          material={activeMediaItem}
          courseNotes={notesText}
          onSaveNotes={handleSaveCourseNotes}
          onClose={() => setActiveMediaItem(null)}
        />
      )}

      {/* In-App Web Browser with Side Notes */}
      {inAppWebItem && (
        <InAppWebViewerModal
          url={inAppWebItem.url}
          title={inAppWebItem.title}
          notesText={notesText}
          onSaveNotes={(newNotes) => {
            setNotesText(newNotes);
            handleSaveCourseNotes();
          }}
          onClose={() => setInAppWebItem(null)}
        />
      )}

      {/* Gemini AI Assistant Modal */}
      {showGeminiModal && (
        <GeminiAssistantModal
          courseTitle={activeCourse?.title}
          initialMessage={geminiInitialMessage}
          onClose={() => setShowGeminiModal(false)}
        />
      )}

      {/* Google Workspace & NotebookLM Modal */}
      {showWorkspaceModal && (
        <GoogleWorkspaceModal
          onClose={() => setShowWorkspaceModal(false)}
          onImportFlashcards={(newCards) => {
            if (activeCourseId) {
              const updated = [
                ...flashcards,
                ...newCards.map((c, i) => ({
                  id: `card-${Date.now()}-${i}`,
                  frente: c.frente,
                  verso: c.verso,
                  status: 'novo' as const,
                  nextReviewDate: Date.now(),
                  repetitionCount: 0,
                  intervalDays: 1,
                  easeFactor: 2.5,
                })),
              ];
              handleUpdateFlashcards(updated);
              showToast(`${newCards.length} Flashcards importados do NotebookLM com sucesso!`, 'success');
            } else {
              showToast('Selecione uma estação ativa para salvar os flashcards importados.', 'warning');
            }
          }}
        />
      )}

      {/* Pomodoro Floating / Modal Timer (Persistent) */}
      <div className={
        !showPomodoroModal 
          ? "hidden"
          : isPomodoroMinimized 
            ? "fixed bottom-6 left-6 z-[100] animate-in slide-in-from-bottom-4"
            : "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
      }>
        <PomodoroTimer
          isMinimized={isPomodoroMinimized}
          onDailyTimeUpdated={handleDailyTimeUpdated}
          onClose={() => setShowPomodoroModal(false)}
          onToggleMinimize={() => setIsPomodoroMinimized(!isPomodoroMinimized)}
          onTimerStateChange={handleTimerStateChange}
        />
      </div>

      {/* Floating Study Calendar Widget (react-day-picker) */}
      <FloatingStudyCalendar />

      {/* SYNAPSE-Branded NotebookLM Ecosystem Bridge */}
      <NotebookLMSynapseBridge />

      {/* User Management & Whitelist Modal (Admin Only) */}
      {showUserManagementModal && (
        <UserManagementModal onClose={() => setShowUserManagementModal(false)} />
      )}
    </div>
  );
}
