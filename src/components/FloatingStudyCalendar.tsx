import React, { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, parseISO, isSameDay } from 'date-fns';
import {
  Calendar as CalendarIcon,
  X,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Trash2,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { StudyEvent } from './StudyCalendar';
import { useTheme } from './ThemeProvider';

const STORAGE_KEY = 'synapse_study_agenda_events';

export const FloatingStudyCalendar: React.FC = () => {
  const { theme } = useTheme();
  const isSwat = theme === 'swat';
  const isPink = theme === 'pink';

  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<StudyEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newDuration, setNewDuration] = useState('60');
  const [newType, setNewType] = useState<'study' | 'review' | 'exam'>('study');
  const [newNotes, setNewNotes] = useState('');

  // Sync with localStorage and cross-component events
  const loadEvents = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setEvents((prev) => {
            if (JSON.stringify(prev) === saved) return prev;
            return parsed;
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadEvents();
    const handleEventsUpdated = (e: any) => {
      if (e?.detail?.sender === 'FloatingStudyCalendar') return;
      loadEvents();
    };
    window.addEventListener('study-events-updated', handleEventsUpdated);
    window.addEventListener('storage', handleEventsUpdated);
    const handleOpenCalendar = () => setIsOpen(true);
    window.addEventListener('open-floating-calendar', handleOpenCalendar);
    return () => {
      window.removeEventListener('study-events-updated', handleEventsUpdated);
      window.removeEventListener('storage', handleEventsUpdated);
      window.removeEventListener('open-floating-calendar', handleOpenCalendar);
    };
  }, []);

  const saveEvents = (updated: StudyEvent[], broadcast = true) => {
    setEvents(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (broadcast) {
        window.dispatchEvent(new CustomEvent('study-events-updated', { detail: { sender: 'FloatingStudyCalendar' } }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Filter events for the selected date
  const dayEvents = events.filter((ev) => ev.date === selectedDateStr);

  // Pending events for today to display on floating trigger badge
  const todayPendingCount = events.filter(
    (ev) => ev.date === todayStr && !ev.completed
  ).length;

  // Days that have events for the DayPicker modifier
  const daysWithEvents = events.map((ev) => {
    const parts = ev.date.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  });

  const handleToggleComplete = (id: string) => {
    const updated = events.map((ev) =>
      ev.id === id ? { ...ev, completed: !ev.completed } : ev
    );
    saveEvents(updated);
  };

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter((ev) => ev.id !== id);
    saveEvents(updated);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: StudyEvent = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      date: selectedDateStr,
      startTime: newStartTime || '09:00',
      durationMinutes: parseInt(newDuration) || 60,
      subject: newSubject.trim() || 'Estudos Gerais',
      type: newType,
      completed: false,
      notes: newNotes.trim(),
    };

    saveEvents([...events, created]);
    setNewTitle('');
    setNewSubject('');
    setNewNotes('');
    setIsAdding(false);
  };

  return (
    <div className={`fixed bottom-6 ${isOpen ? 'right-4 sm:right-6' : 'right-20 sm:right-22'} z-40 print:hidden font-sans pointer-events-auto transition-all`}>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`group flex items-center gap-2.5 font-bold px-4 py-3 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer ${
            isSwat
              ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/25 border border-cyan-400/60 font-extrabold'
              : isPink
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25 border border-rose-400/40 font-extrabold'
              : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/30 border border-white/20'
          }`}
          title="Abrir Calendário Flutuante & Agenda"
        >
          <div className="relative">
            <CalendarIcon className={`w-5 h-5 ${isSwat ? 'text-black' : isPink ? 'text-rose-100' : 'text-cyan-200'}`} />
            {todayPendingCount > 0 && (
              <span className={`absolute -top-2 -right-2.5 w-5 h-5 text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-pulse ${
                isSwat ? 'bg-cyan-400 text-black' : 'bg-rose-500 text-white'
              }`}>
                {todayPendingCount}
              </span>
            )}
          </div>
          <span className="text-xs hidden sm:inline tracking-wide font-semibold">
            Calendário de Estudos
          </span>
        </button>
      )}

      {/* Floating Modal / Panel */}
      {isOpen && (
        <div className={`w-[360px] sm:w-[420px] max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border ${
          isSwat
            ? 'bg-[#070b12] text-slate-100 border-cyan-500/30'
            : isPink
            ? 'bg-[#120718] text-rose-100 border-rose-500/30'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${
            isSwat
              ? 'bg-[#09111c] border-cyan-500/20'
              : isPink
              ? 'bg-[#190a22] border-rose-500/20'
              : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                isSwat
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : isPink
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              }`}>
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold flex items-center gap-1.5">
                  <span className={isSwat ? 'text-cyan-200' : isPink ? 'text-rose-100' : 'text-slate-800 dark:text-slate-100'}>Calendário Interativo</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold border ${
                    isSwat
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40'
                      : isPink
                      ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                      : 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/80 border-cyan-200 dark:border-cyan-800'
                  }`}>
                    SYNAPSE
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">
                  Clique nos dias para agendar sessões
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Picker (react-day-picker) */}
          <div className={`p-3 border-b flex justify-center ${
            isSwat
              ? 'bg-[#070b12] border-cyan-500/20'
              : isPink
              ? 'bg-[#120718] border-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
          }`}>
            <style>{`
              .rdp-root {
                --rdp-accent-color: ${isSwat ? '#00f0ff' : isPink ? '#f43f5e' : '#4f46e5'};
                --rdp-accent-background-color: ${isSwat ? '#00f0ff22' : isPink ? '#f43f5e22' : '#e0e7ff'};
                margin: 0;
              }
              .rdp-day {
                font-size: 0.8rem;
                height: 32px;
                width: 32px;
                border-radius: 10px;
                font-weight: 500;
              }
              .rdp-day_selected {
                background-color: ${isSwat ? '#00f0ff !important; color: #000000 !important' : isPink ? '#f43f5e !important; color: #ffffff !important' : '#4f46e5 !important; color: #ffffff !important'};
                font-weight: bold;
              }
              .rdp-day_today {
                border: 1.5px solid ${isSwat ? '#00f0ff' : isPink ? '#f43f5e' : '#06b6d4'};
                font-weight: bold;
              }
              .rdp-caption_label {
                font-size: 0.85rem;
                font-weight: 700;
                text-transform: capitalize;
              }
              .rdp-nav_button {
                width: 24px;
                height: 24px;
              }
              .has-event {
                position: relative;
              }
              .has-event::after {
                content: '';
                position: absolute;
                bottom: 3px;
                left: 50%;
                transform: translateX(-50%);
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background-color: ${isSwat ? '#00f0ff' : isPink ? '#f43f5e' : '#4f46e5'};
              }
              .rdp-day_selected.has-event::after {
                background-color: ${isSwat ? '#000000' : '#ffffff'};
              }
            `}</style>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setIsAdding(false);
                }
              }}
              locale={ptBR}
              modifiers={{
                hasEvent: daysWithEvents,
              }}
              modifiersClassNames={{
                hasEvent: 'has-event',
              }}
            />
          </div>

          {/* Selected Date Header & Event List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[300px]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  {isSameDay(selectedDate, new Date()) ? 'Hoje' : 'Dia Selecionado'}
                </span>
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 capitalize">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </h4>
              </div>

              {!isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 px-2.5 py-1 rounded-xl transition-all cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Evento</span>
                </button>
              )}
            </div>

            {/* Add Event Form Inline */}
            {isAdding && (
              <form
                onSubmit={handleCreateEvent}
                className="bg-slate-50 dark:bg-slate-950/70 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-3 space-y-2.5 animate-in fade-in"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Agendar para {format(selectedDate, 'dd/MM')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Título do estudo (ex: Dir. Constitucional - Art 5º)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Matéria / Disciplina"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
                    >
                      <option value="study">📖 Teoria</option>
                      <option value="review">⚡ Revisão</option>
                      <option value="exam">🎯 Simulado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="bg-transparent text-xs text-slate-800 dark:text-slate-200 w-full focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1">
                    <input
                      type="number"
                      min="15"
                      max="360"
                      step="15"
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      placeholder="Minutos"
                      className="bg-transparent text-xs text-slate-800 dark:text-slate-200 w-full focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-400">min</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer shadow-xs ${
                    isSwat
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold'
                      : isPink
                      ? 'bg-rose-600 hover:bg-rose-500 text-white font-extrabold'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  Salvar Evento
                </button>
              </form>
            )}

            {/* List of events for the day */}
            {dayEvents.length === 0 ? (
              <div className="py-6 text-center text-slate-400 space-y-1">
                <ListTodo className="w-8 h-8 mx-auto opacity-40 mb-1" />
                <p className="text-xs">Nenhum evento agendado para este dia.</p>
                <p className="text-[10px] text-slate-500">
                  Clique em "+ Novo Evento" para programar.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-2.5 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                      event.completed
                        ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 opacity-70'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <button
                        onClick={() => handleToggleComplete(event.id)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                        title={event.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
                      >
                        {event.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <h5
                          className={`text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight ${
                            event.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {event.title}
                        </h5>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                            {event.subject}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.startTime} ({event.durationMinutes}m)
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer shrink-0"
                      title="Excluir evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Sync Indicator */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronizado com Dashboard
            </span>
            <span>{events.length} eventos no total</span>
          </div>
        </div>
      )}
    </div>
  );
};
