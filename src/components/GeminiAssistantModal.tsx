import React, { useState, useEffect, useRef } from 'react';
import { callGeminiChat, ChatMessageItem, transcribeAudioWithGemini } from '../utils/gemini';
import { queryLlamafile } from '../utils/llamafileClient';
import { useServiceAuthContext } from '../context/ServiceAuthContext';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Loader2,
  X,
  BookOpen,
  Lightbulb,
  RotateCcw,
  Globe,
  MapPin,
  Mic,
  Square,
  Video,
  ExternalLink,
  ChevronDown,
  Cpu,
  Layers,
  Zap,
  Server,
} from 'lucide-react';
import { VeoVideoStudioModal } from './VeoVideoStudioModal';
import { AudioStudyTranscriberModal } from './AudioStudyTranscriberModal';

interface GeminiAssistantModalProps {
  courseTitle?: string;
  onClose: () => void;
  initialMessage?: string;
}

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  courseTitle,
  onClose,
  initialMessage,
}) => {
  const { gemini: geminiService } = useServiceAuthContext();
  const [model, setModel] = useState<string>(geminiService.preferredModel || 'gemini-3.5-flash');
  const [role, setRole] = useState<'geral' | 'redacao' | 'bancas' | 'oral'>('geral');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      sender: 'ai',
      text:
        initialMessage ||
        `Olá! Sou seu Assistente de Estudos IA do SYNAPSE. Como posso acelerar sua preparação para ${
          courseTitle || 'o seu concurso'
        }? Posso montar planos de estudo personalizados, explicar jurisprudências e leis, simular questões com Search Grounding ou guiar sua redação!`,
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Modals
  const [showVeoModal, setShowVeoModal] = useState(false);
  const [showTranscriberModal, setShowTranscriberModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const getSystemInstructionForRole = (currentRole: string) => {
    switch (currentRole) {
      case 'redacao':
        return `Você é o Professor Especialista em Redação Discursiva e Peças Técnicas de Concursos do SYNAPSE. Avalie estrutura dissertativo-argumentativa, coesão, clareza, repertório jurídico e critérios de correção das bancas examinadoras. Proponha esqueletos e parágrafos modelo.`;
      case 'bancas':
        return `Você é o Estrategista de Bancas Examinadoras do SYNAPSE (especialista em perfis CESPE/Cebraspe - Certo/Errado, FGV - casos práticos interdisciplinares, VUNESP - letra da lei rigorosa, e FCC). Destaque as pegadinhas e tendências mais recentes de cada banca.`;
      case 'oral':
        return `Você é o Examinador de Prova Oral e Arguição Jurídica do SYNAPSE. Faça perguntas diretas simulando uma banca de concurso, avalie a precisão conceitual da resposta do candidato e aponte correções pontuais.`;
      default:
        return `Você é o tutor especialista de alta performance da plataforma SYNAPSE. Apoie o candidato em matérias de concurso (${
          courseTitle || 'Direito Constitucional, Administrativo, Penal, Português, RLM'
        }). Responda sempre em português estruturado em Markdown, com tópicos, mnemônicos e citações de artigos e leis.`;
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() || loading) return;

    const userText = inputPrompt.trim();
    setInputPrompt('');

    const userMsgItem: ChatMessageItem = { sender: 'user', text: userText };
    const newMessages: ChatMessageItem[] = [...messages, userMsgItem];
    setMessages(newMessages);
    setLoading(true);

    try {
      const systemInstruction = getSystemInstructionForRole(role);

      if (model === 'llamafile' || geminiService.useLocalLlamafile) {
        const llamaMessages = [
          { role: 'system' as const, content: systemInstruction },
          ...newMessages.map((m) => ({
            role: m.sender === 'ai' ? ('assistant' as const) : ('user' as const),
            content: m.text,
          })),
        ];

        const llamaResult = await queryLlamafile(llamaMessages, {
          endpoint: geminiService.llamafileEndpoint,
        });

        if (llamaResult.text) {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: llamaResult.text,
              modelUsed: 'Llamafile (Local)',
            },
          ]);
          return;
        }
      }

      const response = await callGeminiChat(newMessages, systemInstruction, {
        model,
        useSearchGrounding,
        useMapsGrounding,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: response.text,
          groundingMetadata: response.groundingMetadata,
          modelUsed: model,
        },
      ]);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Desculpe, ocorreu uma instabilidade na consulta: ${
            errorObj?.message || 'Tente novamente.'
          }`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceDictation = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        try {
          setInputPrompt('Transcrevendo áudio com Gemini...');
          const text = await transcribeAudioWithGemini(audioBlob);
          setInputPrompt(text);
        } catch (err) {
          setInputPrompt('');
          console.error('Erro na transcrição por voz:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone.');
    }
  };

  const stopVoiceDictation = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        sender: 'ai',
        text: `Conversa reiniciada! Como posso te ajudar agora nos seus estudos para ${
          courseTitle || 'o seu concurso'
        }?`,
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/70 rounded-3xl p-4 sm:p-6 max-w-3xl w-full h-[88vh] flex flex-col shadow-2xl text-slate-100 font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-400 p-0.5 shadow-md shadow-indigo-600/30">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Assistente Multi-turn SYNAPSE</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
                  {model}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {courseTitle ? `Estação: ${courseTitle}` : 'Tutor Inteligente de Concursos, Redação e Editais'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Button to Open Veo Video Studio */}
            <button
              onClick={() => setShowVeoModal(true)}
              className="px-2.5 py-1.5 bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Criar vídeo mnemônico com Veo 3"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Veo 3</span>
            </button>

            {/* Quick Button to Open Audio Transcriber */}
            <button
              onClick={() => setShowTranscriberModal(true)}
              className="px-2.5 py-1.5 bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white border border-teal-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Transcritor de Voz"
            >
              <Mic className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voz IA</span>
            </button>

            <button
              onClick={handleResetChat}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Nova Conversa"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Model, Role & Grounding Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/70 border border-slate-800/80 p-2 rounded-2xl mb-3 shrink-0 text-xs">
          {/* Model selection */}
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-indigo-500 w-full"
            >
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (Geral/Recomendado)</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Raciocínio Jurídico)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Ultra Rápido)</option>
              <option value="llamafile">🦙 Llamafile (IA Local Offline)</option>
            </select>
          </div>

          {/* Role selection */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-cyan-500 w-full"
            >
              <option value="geral">🎓 Tutor Geral de Concursos</option>
              <option value="redacao">✍️ Redação & Discursivas</option>
              <option value="bancas">🎯 Estrategista de Bancas</option>
              <option value="oral">🎙️ Simulador de Prova Oral</option>
            </select>
          </div>

          {/* Grounding toggles */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setUseSearchGrounding(!useSearchGrounding);
                if (!useSearchGrounding) setUseMapsGrounding(false);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                useSearchGrounding
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm shadow-blue-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Buscar notícias recentes, DOU e leis atualizadas no Google Search"
            >
              <Globe className="w-3 h-3" />
              <span>Search Grounding</span>
            </button>

            <button
              onClick={() => {
                setUseMapsGrounding(!useMapsGrounding);
                if (!useMapsGrounding) setUseSearchGrounding(false);
              }}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                useMapsGrounding
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Buscar locais de prova, salas de estudo e bibliotecas no Google Maps"
            >
              <MapPin className="w-3 h-3" />
              <span>Maps</span>
            </button>
          </div>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-3 font-sans text-xs md:text-sm custom-scrollbar">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              >
                {msg.sender === 'user' ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </div>

              <div
                className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/85 border border-slate-800 text-slate-200 rounded-tl-none shadow-inner'
                }`}
              >
                {msg.text}

                {/* Grounding Source Badges */}
                {msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                      <Globe className="w-3 h-3 text-blue-400" /> Fontes & Citações Google Grounding:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.groundingMetadata.groundingChunks.map((chunk, cIdx) => {
                        const webUri = chunk.web?.uri;
                        const webTitle = chunk.web?.title || webUri;
                        const mapsUri = chunk.maps?.uri;
                        const mapsTitle = chunk.maps?.title;

                        if (webUri) {
                          return (
                            <a
                              key={cIdx}
                              href={webUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[200px]">{webTitle}</span>
                            </a>
                          );
                        }
                        if (mapsUri) {
                          return (
                            <a
                              key={cIdx}
                              href={mapsUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <MapPin className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[200px]">{mapsTitle || 'Ver no Google Maps'}</span>
                            </a>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-300 p-3 bg-slate-950/70 rounded-2xl border border-slate-800 w-fit animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>
                {useSearchGrounding
                  ? 'Buscando fontes e formulando resposta com Search Grounding...'
                  : useMapsGrounding
                  ? 'Consultando locais no Google Maps...'
                  : 'Formulando resposta pedagógica com Gemini...'}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form with Microphone Dictation */}
        <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-slate-800 shrink-0">
          {/* Mic Button */}
          {isRecording ? (
            <button
              type="button"
              onClick={stopVoiceDictation}
              className="bg-rose-600 hover:bg-rose-500 text-white p-3 rounded-2xl transition-all shadow-lg shadow-rose-600/30 cursor-pointer animate-pulse shrink-0"
              title="Parar gravação de voz"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startVoiceDictation}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-3 rounded-2xl border border-slate-700 transition-all cursor-pointer shrink-0"
              title="Falar por voz (Transcrição com Gemini)"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={
              useSearchGrounding
                ? 'Pergunte sobre leis recentes, editais e notícias no Google...'
                : useMapsGrounding
                ? 'Procure locais de prova, bibliotecas e salas de estudo...'
                : 'Pergunte sobre matérias, leis, discursivas ou estratégias...'
            }
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || loading}
            className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 text-white font-bold p-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 cursor-pointer shrink-0 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Child Modals */}
        {showVeoModal && <VeoVideoStudioModal onClose={() => setShowVeoModal(false)} />}
        {showTranscriberModal && <AudioStudyTranscriberModal onClose={() => setShowTranscriberModal(false)} />}
      </div>
    </div>
  );
};

