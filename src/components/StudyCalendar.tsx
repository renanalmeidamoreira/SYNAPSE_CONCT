import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  X,
  Check,
  Tag,
  AlignLeft,
} from 'lucide-react';

export interface StudyEvent {
  id: string;
  title: string;
  subject: string;
  type: 'study' | 'review' | 'simulado';
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  completed: boolean;
  notes?: string;
}

const STORAGE_KEY = 'synapse_study_agenda_events';

const INITIAL_EVENTS: StudyEvent[] = [
  {
    id: 'evt-1',
    title: 'Direito Constitucional - Direitos Fundamentais (Art. 5º)',
    subject: 'Direito Constitucional',
    type: 'study',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:30',
    durationMinutes: 60,
    completed: true,
    notes: 'Focar nos incisos sobre inviolabilidade de domicílio e sigilo das comunicações.',
  },
  {
    id: 'evt-2',
    title: 'Flashcards Diários - Lei 8.112/90',
    subject: 'Direito Administrativo',
    type: 'review',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    durationMinutes: 30,
    completed: false,
    notes: 'Revisão ativa com 25 repetições espaçadas.',
  },
  {
    id: 'evt-3',
    title: 'Resolução de 30 Questões - Raciocínio Lógico & Tabela Verdade',
    subject: 'Raciocínio Lógico',
    type: 'study',
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    durationMinutes: 45,
    completed: false,
  },
  {
    id: 'evt-4',
    title: 'Simulado Rápido de Português - FGV / Cebraspe',
    subject: 'Língua Portuguesa',
    type: 'simulado',
    date: new Date().toISOString().split('T')[0],
    startTime: '16:00',
    durationMinutes: 40,
    completed: false,
    notes: 'Foco em crase, concordância e reescrita de frases.',
  },
];

export const StudyCalendar: React.FC = () => {
  const [events, setEvents] = useState<StudyEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_EVENTS;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'strip' | 'month'>('strip');
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newType, setNewType] = useState<'study' | 'review' | 'simulado'>('study');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('09:00');
  const [newDuration, setNewDuration] = useState(60);
  const [newNotes, setNewNotes] = useState('');

  // Synchronize with external changes safely
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail?.sender === 'StudyCalendar') return;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setEvents((prev) => (JSON.stringify(prev) === raw ? prev : parsed));
          }
        }
      } catch (err) {}
    };

    window.addEventListener('study-events-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('study-events-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const saveEvents = useCallback((updated: StudyEvent[]) => {
    setEvents(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('study-events-updated', {
          detail: { sender: 'StudyCalendar' },
        })
      );
    } catch (e) {}
  }, []);

  const toggleEvent = (id: string) => {
    const updated = events.map((ev) => (ev.id === id ? { ...ev, completed: !ev.completed } : ev));
    saveEvents(updated);
  };

  const deleteEvent = (id: string) => {
    const updated = events.filter((ev) => ev.id !== id);
    saveEvents(updated);
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEv: StudyEvent = {
      id: `evt-${Date.now()}`,
      title: newTitle.trim(),
      subject: newSubject.trim() || 'Geral',
      type: newType,
      date: newDate || selectedDate,
      startTime: newTime || '09:00',
      durationMinutes: Number(newDuration) || 60,
      completed: false,
      notes: newNotes.trim() || undefined,
    };

    const updated = [...events, newEv];
    saveEvents(updated);
    setSelectedDate(newEv.date);
    setShowAddModal(false);
    setNewTitle('');
    setNewSubject('');
    setNewNotes('');
  };

  // Day strip computation (7 days centered around selected date or today)
  const dayStrip = useMemo(() => {
    const base = new Date();
    const list = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      const dayNumber = d.getDate();
      const count = events.filter((e) => e.date === dateStr).length;
      const completed = events.filter((e) => e.date === dateStr && e.completed).length;

      list.push({
        dateStr,
        dayName,
        dayNumber,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        count,
        completed,
      });
    }
    return list;
  }, [events]);

  // Daily events filtered
  const dailyEvents = useMemo(() => {
    return events
      .filter((ev) => ev.date === selectedDate)
      .filter((ev) => (filterType === 'all' ? true : ev.type === filterType))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, selectedDate, filterType]);

  const totalDayEvents = events.filter((e) => e.date === selectedDate).length;
  const completedDayEvents = events.filter((e) => e.date === selectedDate && e.completed).length;
  const progressPercent = totalDayEvents > 0 ? Math.round((completedDayEvents / totalDayEvents) * 100) : 0;

  // Month generation
  const monthDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter((e) => e.date === dateStr);
      days.push({
        empty: false,
        key: dateStr,
        dateStr,
        dayNumber: d,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        isSelected: dateStr === selectedDate,
        count: dayEvents.length,
        completed: dayEvents.filter((e) => e.completed).length,
      });
    }
    return days;
  }, [currentMonthDate, events, selectedDate]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 md:p-5 shadow-xs">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-white">
                Agenda de Estudos
              </h3>
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                {selectedDate.split('-').reverse().join('/')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {completedDayEvents} de {totalDayEvents} tarefas concluídas ({progressPercent}%)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-950 p-0.5 border border-slate-200 dark:border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setCalendarViewMode('strip')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                calendarViewMode === 'strip'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setCalendarViewMode('month')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                calendarViewMode === 'month'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Mês Completo
            </button>
          </div>

          <button
            onClick={() => {
              setNewDate(selectedDate);
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Evento</span>
          </button>
        </div>
      </div>

      {/* Date Selector: Strip or Month */}
      {calendarViewMode === 'strip' ? (
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {dayStrip.map((d) => {
            const isSelected = d.dateStr === selectedDate;
            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDate(d.dateStr)}
                className={`flex flex-col items-center justify-center p-2 rounded-2xl border transition-all text-center ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : d.isToday
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-slate-800 dark:text-slate-100'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {d.dayName}
                </span>
                <span className="text-sm font-extrabold my-0.5">{d.dayNumber}</span>
                {d.count > 0 ? (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : d.completed === d.count
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300'
                    }`}
                  >
                    {d.completed}/{d.count}
                  </span>
                ) : (
                  <span className="text-[9px] text-transparent">•</span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mb-4 bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white capitalize">
              {currentMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const prev = new Date(currentMonthDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentMonthDate(prev);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const next = new Date(currentMonthDate);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentMonthDate(next);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((wd, i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 py-1">
                {wd}
              </span>
            ))}
            {monthDays.map((md) => {
              if (md.empty) return <div key={md.key} className="h-7" />;
              return (
                <button
                  key={md.key}
                  onClick={() => setSelectedDate(md.dateStr!)}
                  className={`h-7 rounded-lg text-xs font-bold flex items-center justify-center relative transition-all ${
                    md.isSelected
                      ? 'bg-indigo-600 text-white'
                      : md.isToday
                      ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-300'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{md.dayNumber}</span>
                  {md.count! > 0 && (
                    <span
                      className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                        md.completed === md.count ? 'bg-emerald-400' : 'bg-indigo-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Event List (High-Density & Clean) */}
      <div className="space-y-2">
        {dailyEvents.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80 p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Nenhum evento agendado para este dia.
            </p>
            <button
              onClick={() => {
                setNewDate(selectedDate);
                setShowAddModal(true);
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + Adicionar evento agora
            </button>
          </div>
        ) : (
          dailyEvents.map((ev) => {
            const isCompleted = ev.completed;
            return (
              <div
                key={ev.id}
                className={`group flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-50/60 dark:bg-slate-950/30 border-slate-200/60 dark:border-slate-800/40 opacity-70'
                    : 'bg-white dark:bg-slate-950/70 border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-500/40 shadow-2xs'
                }`}
              >
                {/* Checkbox & Time & Content */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleEvent(ev.id)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                      {ev.startTime}
                    </span>
                    <span className="text-[10px] text-slate-400">({ev.durationMinutes}m)</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                          ev.type === 'study'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300'
                            : ev.type === 'review'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300'
                            : 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300'
                        }`}
                      >
                        {ev.type === 'study' ? 'Estudo' : ev.type === 'review' ? 'Revisão' : 'Simulado'}
                      </span>

                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.2 rounded-md truncate max-w-[120px]">
                        {ev.subject}
                      </span>
                    </div>

                    <h5
                      className={`text-xs font-bold mt-0.5 truncate ${
                        isCompleted
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-white'
                      }`}
                      title={ev.title}
                    >
                      {ev.title}
                    </h5>
                  </div>
                </div>

                {/* Trash Delete Action */}
                <button
                  onClick={() => deleteEvent(ev.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shrink-0 ml-2"
                  title="Excluir evento"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>Adicionar à Agenda</span>
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Evento / Tópico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Resolução de 30 questões de Português"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Disciplina
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Direito Penal"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Atividade
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="study">Estudo Teórico / Videoaula</option>
                    <option value="review">Revisão / Flashcards</option>
                    <option value="simulado">Simulado / Questões</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="360"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
