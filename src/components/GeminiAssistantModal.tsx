import React, { useState } from 'react';
import { callGeminiAPI } from '../utils/gemini';
import { Sparkles, Bot, User, Send, Loader2, X, BookOpen, Lightbulb } from 'lucide-react';

interface GeminiAssistantModalProps {
  courseTitle?: string;
  onClose: () => void;
  initialMessage?: string;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  courseTitle,
  onClose,
  initialMessage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: initialMessage || `Olá! Sou seu Assistente de Estudos IA do SYNAPSE. Como posso ajudar na preparação para ${
        courseTitle || 'o seu concurso'
      }? Posso criar cronogramas de estudo, explicar jurisprudência, tirar dúvidas do edital ou dar dicas de memorização!`,
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || loading) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const responseText = await callGeminiAPI(
        userText,
        `Você é o tutor especialista de concursos e vestibulares da plataforma SYNAPSE. Responda com linguagem clara, direta, encorajadora e tecnicamente fundamentada. Se o usuário perguntar sobre o concurso "${
          courseTitle || 'GCM'
        }", considere os requisitos de legislação e disciplinas gerais.`
      );

      setMessages((prev) => [...prev, { sender: 'ai', text: responseText }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Desculpe, ocorreu um erro ao se comunicar com o Gemini: ${
            err.message || 'Erro de conexão.'
          }`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputPrompt(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-0.5">
              <div className="w-full h-full bg-slate-50 dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Assistente de Estudos Gemini</h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Tutor Inteligente de Concursos SYNAPSE</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white hover:bg-slate-200 dark:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 font-sans text-xs md:text-sm">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-slate-800 dark:text-white ${
                  msg.sender === 'user' ? 'bg-indigo-600 dark:bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                }`}
              >
                {msg.sender === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4 text-cyan-400" />
                )}
              </div>

              <div
                className={`p-4 rounded-2xl max-w-[80%] leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 dark:bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Sua IA está formulando a resposta...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
          <button
            onClick={() => handleQuickPrompt('Monte um plano de estudos semanal para esta estação.')}
            className="text-[11px] text-slate-800 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 shrink-0 flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3 text-amber-400" />
            <span>Plano Semanal</span>
          </button>
          <button
            onClick={() => handleQuickPrompt('Quais são as pegadinhas mais comuns em Direito Penal?')}
            className="text-[11px] text-slate-800 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 dark:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 shrink-0 flex items-center gap-1"
          >
            <BookOpen className="w-3 h-3 text-cyan-400" />
            <span>Pegadinhas da Prova</span>
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Pergunte ao Gemini sobre conteúdos, leis ou estratégias de estudo..."
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-800 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-500 dark:hover:bg-indigo-500 disabled:opacity-50 text-white font-bold p-3 rounded-2xl transition-all shadow-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
