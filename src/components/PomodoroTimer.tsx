import React, { useState, useEffect, useRef } from 'react';
import { addDailyTimeSeconds } from '../utils/storage';
import {
  Play,
  Pause,
  RotateCcw,
  Timer,
  Sparkles,
  Settings,
  Volume2,
  VolumeX,
  Minimize2,
  Maximize2,
  X,
  Check,
  Bell,
  Clock,
} from 'lucide-react';

interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  soundEnabled: boolean;
}

interface PomodoroTimerProps {
  onDailyTimeUpdated: () => void;
  onClose?: () => void;
  isFloating?: boolean;
  onToggleMinimize?: () => void;
  isMinimized?: boolean;
  onTimerStateChange?: (state: { isRunning: boolean; mode: 'focus' | 'shortBreak' | 'longBreak'; timeLeft: number }) => void;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  soundEnabled: true,
};

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  onDailyTimeUpdated,
  onClose,
  isFloating = false,
  onToggleMinimize,
  isMinimized = false,
  onTimerStateChange,
}) => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('synapse_pomodoro_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Form states for settings
  const [editFocus, setEditFocus] = useState(settings.focusMinutes);
  const [editShort, setEditShort] = useState(settings.shortBreakMinutes);
  const [editLong, setEditLong] = useState(settings.longBreakMinutes);
  const [editSound, setEditSound] = useState(settings.soundEnabled);

  // Save settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: PomodoroSettings = {
      focusMinutes: Math.max(1, Math.min(120, Number(editFocus) || 25)),
      shortBreakMinutes: Math.max(1, Math.min(60, Number(editShort) || 5)),
      longBreakMinutes: Math.max(1, Math.min(60, Number(editLong) || 15)),
      soundEnabled: editSound,
    };
    setSettings(newSettings);
    localStorage.setItem('synapse_pomodoro_settings', JSON.stringify(newSettings));
    setShowSettings(false);

    // Reset current mode time if not running
    if (!isRunning) {
      if (mode === 'focus') setTimeLeft(newSettings.focusMinutes * 60);
      else if (mode === 'shortBreak') setTimeLeft(newSettings.shortBreakMinutes * 60);
      else setTimeLeft(newSettings.longBreakMinutes * 60);
    }
  };

  // Play audio alarm chime
  const playAlarmChime = () => {
    if (!settings.soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);

        gain.gain.setValueAtTime(0.25, ctx.currentTime + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.12);
        osc.stop(ctx.currentTime + index * 0.12 + 0.35);
      });
    } catch (e) {
      console.warn('Audio play exception:', e);
    }
  };

  // Keep refs for callback props to prevent infinite re-render loops
  const onTimerStateChangeRef = useRef(onTimerStateChange);
  useEffect(() => {
    onTimerStateChangeRef.current = onTimerStateChange;
  }, [onTimerStateChange]);

  const onDailyTimeUpdatedRef = useRef(onDailyTimeUpdated);
  useEffect(() => {
    onDailyTimeUpdatedRef.current = onDailyTimeUpdated;
  }, [onDailyTimeUpdated]);

  const getModeDuration = (m: 'focus' | 'shortBreak' | 'longBreak') => {
    switch (m) {
      case 'focus':
        return settings.focusMinutes * 60;
      case 'shortBreak':
        return settings.shortBreakMinutes * 60;
      case 'longBreak':
        return settings.longBreakMinutes * 60;
    }
  };

  const handleModeChange = (newMode: 'focus' | 'shortBreak' | 'longBreak') => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(getModeDuration(newMode));
  };

  // Real-time interval & daily time logging
  useEffect(() => {
    let interval: any = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });

        // Increment daily time second-by-second during focus mode
        if (mode === 'focus') {
          addDailyTimeSeconds(1);
          if (onDailyTimeUpdatedRef.current) {
            onDailyTimeUpdatedRef.current();
          }
        }
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      playAlarmChime();

      if (mode === 'focus') {
        const newSessions = sessionCount + 1;
        setSessionCount(newSessions);

        // Every 4 focus sessions, offer long break
        if (newSessions % 4 === 0) {
          handleModeChange('longBreak');
        } else {
          handleModeChange('shortBreak');
        }
      } else {
        handleModeChange('focus');
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, settings, sessionCount]);

  // Notify parent of state change safely using ref
  useEffect(() => {
    if (onTimerStateChangeRef.current) {
      onTimerStateChangeRef.current({ isRunning, mode, timeLeft });
    }
  }, [isRunning, mode, timeLeft]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getModeDuration(mode));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalModeDuration = getModeDuration(mode);
  const progressPercent = Math.min(100, Math.max(0, ((totalModeDuration - timeLeft) / totalModeDuration) * 100));

  // Minimized Widget View
  if (isMinimized) {
    return (
      <div className="bg-slate-100 dark:bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-2xl p-3 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
        <div className="relative flex items-center justify-center w-8 h-8">
          <Timer className={`w-5 h-5 ${isRunning ? 'text-cyan-400 animate-pulse' : 'text-slate-600 dark:text-slate-400'}`} />
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
            {mode === 'focus' ? 'Foco' : 'Pausa'}
          </div>
          <div className="text-base font-extrabold text-slate-800 dark:text-white font-mono leading-none">
            {formatTime(timeLeft)}
          </div>
        </div>
        <button
          onClick={toggleTimer}
          className={`p-2 rounded-xl text-slate-800 dark:text-white font-bold transition-all ${
            isRunning ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white bg-slate-200 dark:bg-slate-800 rounded-lg"
            title="Expandir Cronômetro"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full mx-auto shadow-2xl animate-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
          <Timer className="w-5 h-5 text-cyan-400" />
          <span>Cronômetro Pomodoro de Estudos</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
              showSettings
                ? 'bg-indigo-600 dark:bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 hover:text-slate-800 dark:text-white'
            }`}
            title="Configurar Tempos & Som"
          >
            <Settings className="w-4 h-4" />
          </button>

          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 rounded-xl"
              title="Minimizar em Janela Flutuante"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-white rounded-xl"
              title="Fechar Modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Settings Form Drawer */}
      {showSettings ? (
        <form onSubmit={handleSaveSettings} className="space-y-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Editar Tempos (em Minutos)
            </h4>
            <button
              type="button"
              onClick={playAlarmChime}
              className="text-[11px] font-bold text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Bell className="w-3 h-3" />
              Testar Alerta
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Foco (min)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={editFocus}
                onChange={(e) => setEditFocus(Number(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Pausa Curta</label>
              <input
                type="number"
                min="1"
                max="60"
                value={editShort}
                onChange={(e) => setEditShort(Number(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Pausa Longa</label>
              <input
                type="number"
                min="1"
                max="60"
                value={editLong}
                onChange={(e) => setEditLong(Number(e.target.value))}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 dark:text-slate-300">
              <input
                type="checkbox"
                checked={editSound}
                onChange={(e) => setEditSound(e.target.checked)}
                className="rounded bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-600 focus:ring-0"
              />
              <span>Ativar Sinal Sonoro ao Finalizar</span>
            </label>

            <button
              type="submit"
              className="bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-md flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Tempos</span>
            </button>
          </div>
        </form>
      ) : (
        /* Mode Selector Buttons */
        <div className="flex items-center justify-center gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
          <button
            onClick={() => handleModeChange('focus')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'focus' ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
            }`}
          >
            Foco ({settings.focusMinutes}m)
          </button>
          <button
            onClick={() => handleModeChange('shortBreak')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'shortBreak' ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
            }`}
          >
            Pausa Curta ({settings.shortBreakMinutes}m)
          </button>
          <button
            onClick={() => handleModeChange('longBreak')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'longBreak' ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white'
            }`}
          >
            Pausa Longa ({settings.longBreakMinutes}m)
          </button>
        </div>
      )}

      {/* Main Timer Display */}
      <div className="text-center py-6 space-y-4 relative">
        <div className="text-6xl md:text-7xl font-extrabold text-slate-800 dark:text-white font-mono tracking-tight drop-shadow-lg">
          {formatTime(timeLeft)}
        </div>

        {/* Mode & Progress Status */}
        <div className="max-w-xs mx-auto space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-semibold uppercase">
            <span>{mode === 'focus' ? 'Sessão Ativa de Foco' : 'Descanso Merecido'}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-50 dark:bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                mode === 'focus' ? 'bg-gradient-to-r from-indigo-500 to-cyan-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Primary Action Controls */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          onClick={resetTimer}
          className="p-3 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-2xl border border-slate-300 dark:border-slate-700 transition-all"
          title="Reiniciar Tempo"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={toggleTimer}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm text-slate-800 dark:text-white shadow-xl transition-all hover:scale-105 ${
            isRunning ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 shadow-indigo-600/25'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              <span>Pausar</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Iniciar Sessão</span>
            </>
          )}
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
          <span>Ciclos Concluídos Hoje:</span>
        </span>
        <span className="font-bold text-indigo-300 font-mono">{sessionCount} Pomodoros</span>
      </div>
    </div>
  );
};
