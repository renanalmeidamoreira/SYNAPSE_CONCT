import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  X,
  Sparkles,
  Send,
  Loader2,
  Trash2,
  Maximize2,
  Minimize2,
  RotateCcw,
  MessageSquare,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { CourseData, Flashcard, SimuladoItem } from '../types';
import { useTheme } from './ThemeProvider';
import { callGeminiStream, ChatMessageItem } from '../utils/gemini';

interface FloatingAIAssistantProps {
  courses?: CourseData[];
  flashcards?: Flashcard[];
  simulados?: SimuladoItem[];
}

const STORAGE_KEY = 'synapse_chat_history';

const INITIAL_WELCOME_MESSAGE: ChatMessageItem = {
  id: 'welcome-msg',
  sender: 'ai',
  text: 'Olá! Sou o assistente educacional do **Synapse Studies**. Estou aqui para te ajudar com dúvidas das matérias, técnicas de memorização e mnemônicos, organização de cronogramas ou simplesmente conversar sobre sua rotina. Sobre o que você gostaria de falar hoje?',
  timestamp: Date.now(),
};

const SUGGESTION_CHIPS = [
  '💡 Dica de memorização ativa',
  '⚖️ Diferença entre Concussão e Corrupção Passiva',
  '🎯 Como montar meu ciclo de estudos?',
  '📝 Estratégia de redação discursiva',
];

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  courses = [],
  flashcards = [],
  simulados = [],
}) => {
  const { theme } = useTheme();
  const isSwat = theme === 'swat';
  const isPink = theme === 'pink';

  const [isEnabled, setIsEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);

  // Chat history state persisted in localStorage (works even if user is not logged in)
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar histórico do chat:', e);
    }
    return [INITIAL_WELCOME_MESSAGE];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, loading, isStreaming]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Erro ao salvar histórico do chat:', e);
    }
  }, [messages]);

  // Enable/Disable toggle via global custom event
  useEffect(() => {
    const saved = localStorage.getItem('synapse_floating_ai_enabled');
    if (saved !== null) {
      setIsEnabled(saved === 'true');
    }

    const handleToggleEvent = () => {
      setIsEnabled((prev) => {
        const newVal = !prev;
        localStorage.setItem('synapse_floating_ai_enabled', String(newVal));
        if (!newVal) setIsOpen(false);
        return newVal;
      });
    };

    window.addEventListener('toggle-ai-widget', handleToggleEvent);
    return () => window.removeEventListener('toggle-ai-widget', handleToggleEvent);
  }, []);

  // Synchronize when external events want to open the chat with a specific prompt
  useEffect(() => {
    const handleOpenChatEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const initialText = customEvent.detail;
      setIsOpen(true);
      if (initialText && typeof initialText === 'string') {
        setInputPrompt(initialText);
      }
    };

    window.addEventListener('open-synapse-chat-widget', handleOpenChatEvent);
    return () => window.removeEventListener('open-synapse-chat-widget', handleOpenChatEvent);
  }, []);

  // Periodic pulse to invite conversation
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        setIsPulsing(true);
        setTimeout(() => setIsPulsing(false), 5000);
      }
    }, 120000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClearHistory = () => {
    if (window.confirm('Deseja limpar o histórico da conversa com o Assistente?')) {
      const resetList = [INITIAL_WELCOME_MESSAGE];
      setMessages(resetList);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resetList));
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleSend = async (directText?: string) => {
    const textToSend = (directText !== undefined ? directText : inputPrompt).trim();
    if (!textToSend || loading || isStreaming) return;

    setInputPrompt('');

    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    const newConversation = [...messages, userMsg];
    const aiPlaceholderId = `ai-${Date.now()}`;

    const placeholderAiMsg: ChatMessageItem = {
      id: aiPlaceholderId,
      sender: 'ai',
      text: '',
      timestamp: Date.now(),
    };

    setMessages([...newConversation, placeholderAiMsg]);
    setLoading(true);
    setIsStreaming(true);

    const educationalSystemPrompt =
      'Você é o tutor e assistente de inteligência artificial da plataforma educacional Synapse Studies. ' +
      'Seu objetivo inicial é manter uma conversação natural, acolhedora, clara e altamente didática com o estudante. ' +
      'Ajude os alunos com dúvidas educacionais em matérias de concursos (Direito Constitucional, Administrativo, Penal, Língua Portuguesa, Raciocínio Lógico) ou vestibulares. ' +
      'Utilize formatação Markdown limpa (tópicos, negritos, mnemônicos e exemplos práticos). Responda com simpatia e incentivo ao estudo.';

    try {
      let accumulated = '';
      const fullResponse = await callGeminiStream(
        newConversation,
        (chunkText) => {
          accumulated = chunkText;
          setLoading(false);
          setMessages((prev) => {
            const copy = [...prev];
            const targetIdx = copy.findIndex((m) => m.id === aiPlaceholderId);
            if (targetIdx !== -1) {
              copy[targetIdx] = {
                ...copy[targetIdx],
                text: accumulated,
              };
            }
            return copy;
          });
        },
        educationalSystemPrompt,
        {
          model: 'gemini-3.1-flash-lite',
        }
      );

      setMessages((prev) => {
        const copy = [...prev];
        const targetIdx = copy.findIndex((m) => m.id === aiPlaceholderId);
        if (targetIdx !== -1) {
          copy[targetIdx] = {
            ...copy[targetIdx],
            text: fullResponse || accumulated,
          };
        }
        return copy;
      });
    } catch (err: any) {
      console.warn('[FloatingAIAssistant] Erro ao obter resposta:', err);
      setMessages((prev) => {
        const copy = [...prev];
        const targetIdx = copy.findIndex((m) => m.id === aiPlaceholderId);
        if (targetIdx !== -1) {
          copy[targetIdx] = {
            ...copy[targetIdx],
            text:
              'Estou pronto para continuar! Tivemos uma breve oscilação de conexão. Pode reenviar sua pergunta?',
          };
        }
        return copy;
      });
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExpandToModal = () => {
    // Open full GeminiAssistantModal with current context
    window.dispatchEvent(
      new CustomEvent('open-gemini-chat', {
        detail: messages[messages.length - 1]?.text || '',
      })
    );
    setIsOpen(false);
  };

  if (!isEnabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end print:hidden font-sans pointer-events-auto">
      {/* Inline Chatbot Widget */}
      {isOpen && (
        <div
          id="synapse-chatbot-widget"
          className={`mb-3 w-[340px] sm:w-[400px] h-[520px] max-h-[85vh] flex flex-col rounded-3xl border shadow-2xl backdrop-blur-xl animate-in zoom-in-95 origin-bottom-right overflow-hidden transition-all duration-300 ${
            isSwat
              ? 'bg-[#060b13]/95 border-cyan-500/30 text-slate-100 shadow-cyan-500/15'
              : isPink
              ? 'bg-[#120619]/95 border-rose-500/30 text-rose-100 shadow-rose-500/15'
              : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-indigo-500/20'
          }`}
        >
          {/* Header Bar */}
          <div
            className={`px-4 py-3 border-b flex items-center justify-between select-none ${
              isSwat
                ? 'border-cyan-500/20 bg-cyan-950/30'
                : isPink
                ? 'border-rose-500/20 bg-rose-950/30'
                : 'border-slate-800 bg-slate-950/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ${
                  isSwat
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : isPink
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-indigo-600/30 border-indigo-500 text-indigo-400'
                }`}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                  Assistente SYNAPSE
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
                </h3>
                <p className="text-[10px] text-slate-400">Tutor e Companheiro Educacional</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              {/* Reset / Clear Chat */}
              <button
                onClick={handleClearHistory}
                className="p-1.5 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                title="Limpar conversa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Expand to Full Modal */}
              <button
                onClick={handleExpandToModal}
                className="p-1.5 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                title="Expandir para tela cheia (Tutor Completo)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              {/* Minimize / Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
                title="Minimizar Assistente"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 custom-scrollbar text-xs leading-relaxed">
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              const isCopied = copiedId === msg.id;

              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 shadow-md relative ${
                      isUser
                        ? isSwat
                          ? 'bg-cyan-500 text-black font-medium rounded-tr-xs'
                          : isPink
                          ? 'bg-rose-600 text-white rounded-tr-xs'
                          : 'bg-indigo-600 text-white rounded-tr-xs'
                        : isSwat
                        ? 'bg-[#0d1624] border border-cyan-500/25 text-slate-200 rounded-tl-xs'
                        : isPink
                        ? 'bg-[#1b0d24] border border-rose-500/25 text-slate-200 rounded-tl-xs'
                        : 'bg-slate-800/90 border border-slate-700/70 text-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {/* Message Content */}
                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                    {/* Copy Button for AI Messages */}
                    {!isUser && msg.text && (
                      <div className="mt-2 pt-1 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="opacity-75">Synapse AI</span>
                        <button
                          onClick={() => handleCopyMessage(msg.text, msg.id || String(index))}
                          className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer p-0.5"
                          title="Copiar mensagem"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading / Typing Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                <Loader2 className={`w-3.5 h-3.5 animate-spin ${isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-indigo-400'}`} />
                <span>Digitando resposta educacional...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Conversation Starter Chips */}
          <div className="px-3 py-1.5 border-t border-slate-800/70 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {SUGGESTION_CHIPS.map((chip, i) => (
              <button
                key={i}
                onClick={() => handleSend(chip)}
                disabled={loading || isStreaming}
                className={`whitespace-nowrap px-2.5 py-1 rounded-xl text-[10px] font-semibold border transition-all cursor-pointer ${
                  isSwat
                    ? 'bg-cyan-950/40 border-cyan-800/50 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400'
                    : isPink
                    ? 'bg-rose-950/40 border-rose-800/50 text-rose-300 hover:bg-rose-900/50 hover:border-rose-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <div
            className={`p-3 border-t flex items-center gap-2 ${
              isSwat ? 'border-cyan-500/20' : isPink ? 'border-rose-500/20' : 'border-slate-800'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder="Digite sua dúvida ou converse com o tutor..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || isStreaming}
              className={`flex-1 bg-slate-950/80 border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 transition-all ${
                isSwat
                  ? 'border-cyan-900/60 focus:ring-cyan-400 focus:border-cyan-400'
                  : isPink
                  ? 'border-rose-900/60 focus:ring-rose-400 focus:border-rose-400'
                  : 'border-slate-700 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputPrompt.trim() || loading || isStreaming}
              className={`p-2 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSwat
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-cyan-500/20'
                  : isPink
                  ? 'bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-rose-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-indigo-600/20'
              }`}
              title="Enviar mensagem"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsPulsing(false);
        }}
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer ${
          isSwat
            ? isOpen
              ? 'bg-cyan-400 text-black scale-105 border border-cyan-300 shadow-cyan-500/40'
              : 'bg-cyan-500 hover:bg-cyan-400 text-black hover:scale-105 border border-cyan-400/50 shadow-cyan-500/30 font-bold'
            : isPink
            ? isOpen
              ? 'bg-rose-700 text-white scale-105 border border-rose-400 shadow-rose-500/40'
              : 'bg-rose-600 hover:bg-rose-500 text-white hover:scale-105 border border-rose-400/30 shadow-rose-600/30 font-bold'
            : isOpen
            ? 'bg-indigo-700 text-white scale-105 shadow-indigo-600/40 border border-indigo-500'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105 hover:shadow-indigo-500/40 border border-indigo-400/30'
        } ${
          isPulsing && !isOpen
            ? isSwat
              ? 'animate-bounce ring-4 ring-cyan-400/40'
              : isPink
              ? 'animate-bounce ring-4 ring-rose-400/40'
              : 'animate-bounce ring-4 ring-indigo-400/40'
            : ''
        }`}
        title="Assistente Educacional Synapse (Chat IA)"
      >
        <Bot className="w-6 h-6" />
        {isPulsing && !isOpen && (
          <span
            className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 animate-ping ${
              isSwat ? 'bg-cyan-400' : isPink ? 'bg-rose-400' : 'bg-indigo-400'
            }`}
          />
        )}
      </button>
    </div>
  );
};
