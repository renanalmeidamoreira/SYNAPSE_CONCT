import React, { useState, useEffect } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';
import { CourseData, Flashcard, SimuladoItem } from '../types';

interface FloatingAIAssistantProps {
  courses: CourseData[];
  flashcards: Flashcard[];
  simulados: SimuladoItem[];
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({ courses, flashcards, simulados }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('synapse_floating_ai_enabled');
    if (saved !== null) {
      setIsEnabled(saved === 'true');
    }
    
    const handleToggleEvent = () => {
      setIsEnabled(prev => {
        const newVal = !prev;
        localStorage.setItem('synapse_floating_ai_enabled', String(newVal));
        if (!newVal) setIsOpen(false);
        return newVal;
      });
    };
    
    window.addEventListener('toggle-ai-widget', handleToggleEvent);
    return () => window.removeEventListener('toggle-ai-widget', handleToggleEvent);
  }, []);

  const handleToggleEnable = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !isEnabled;
    setIsEnabled(newVal);
    localStorage.setItem('synapse_floating_ai_enabled', String(newVal));
    if (!newVal) setIsOpen(false);
  };

  useEffect(() => {
    const generateSuggestion = () => {
      const suggestionsList: string[] = [];
      const pendingCardsCount = flashcards.length;

      if (pendingCardsCount > 0) {
        suggestionsList.push(`Você possui ${pendingCardsCount} flashcard(s) criados. Que tal realizar uma sessão de revisão ativa agora?`);
      }

      if (simulados.length > 0) {
        const sorted = [...simulados].sort((a, b) => {
          const dA = a.dataRealizacao ? new Date(a.dataRealizacao).getTime() : 0;
          const dB = b.dataRealizacao ? new Date(b.dataRealizacao).getTime() : 0;
          return dB - dA;
        });
        const lastDate = sorted[0].dataRealizacao ? new Date(sorted[0].dataRealizacao).getTime() : 0;
        if (lastDate > 0) {
          const daysDiff = Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24));
          if (daysDiff > 3) {
            suggestionsList.push(`Já se passaram ${daysDiff} dias desde o seu último simulado. Testar seu aprendizado com questões é essencial!`);
          }
        }
      } else if (courses.length > 0) {
        suggestionsList.push("Você ainda não gerou nenhum simulado para suas estações. Use o Tutor IA para gerar um simulado sob medida!");
      }

      if (courses.length > 0) {
        const activeC = courses[0];
        const completedM = activeC.materials?.filter(m => m.completed).length || 0;
        const totalM = activeC.materials?.length || 0;
        if (totalM > 0 && completedM < totalM) {
          suggestionsList.push(`Na estação "${activeC.title}", você concluiu ${completedM} de ${totalM} materiais. Continue avançando na grade!`);
        }
      }

      if (suggestionsList.length === 0) {
        suggestionsList.push("Crie uma estação de estudos ou importe um edital para receber orientações estratégicas da IA!");
      }

      const randomChoice = suggestionsList[Math.floor(Math.random() * suggestionsList.length)];
      setSuggestion(randomChoice);
    };

    generateSuggestion();

    // Pulse notification every 2 minutes
    const interval = setInterval(() => {
      setIsPulsing(true);
      generateSuggestion();
      setTimeout(() => setIsPulsing(false), 6000);
    }, 120000);

    return () => clearInterval(interval);
  }, [courses, flashcards, simulados]);

  if (!isEnabled) return null;

  return (
    <div className="fixed bottom-22 right-6 z-35 flex flex-col items-end animate-in slide-in-from-bottom-5">
      {isOpen && (
        <div className="mb-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-4 w-72 animate-in zoom-in-95 origin-bottom-right">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" /> Assistente SYNAPSE
            </h4>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleToggleEnable}
                className="text-[10px] text-slate-500 hover:text-rose-500 underline cursor-pointer"
                title="Desativar widget de IA"
              >
                Desativar
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            {suggestion}
          </p>
          <button
            onClick={() => {
              setIsOpen(false);
              window.dispatchEvent(new CustomEvent('open-gemini-chat', { detail: suggestion }));
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
          >
            Abrir Conversa com IA
          </button>
        </div>
      )}
      
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          setIsPulsing(false);
        }}
        className={`relative w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer ${
          isOpen 
            ? 'bg-indigo-700 text-white scale-105' 
            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 hover:shadow-indigo-500/40 border border-indigo-400/30'
        } ${isPulsing && !isOpen ? 'animate-bounce shadow-indigo-500/60 ring-2 ring-indigo-400' : ''}`}
        title="Assistente Flutuante de Estudo"
      >
        <Bot className="w-5 h-5" />
        {isPulsing && !isOpen && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900 animate-ping" />
        )}
      </button>
    </div>
  );
};

