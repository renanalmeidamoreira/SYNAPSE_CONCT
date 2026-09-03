import React, { useState, useEffect, useRef } from 'react';
import {
  callGeminiStream,
  callGeminiChat,
  ChatMessageItem,
  transcribeAudioWithGemini,
  DEFAULT_NATURAL_SYSTEM_PROMPT,
} from '../utils/gemini';
import { queryLlamafile } from '../utils/llamafileClient';
import { useServiceAuthContext } from '../context/ServiceAuthContext';
import { useTheme } from './ThemeProvider';
import {
  Sparkles,
  Bot,
  User,
  Send,
  Loader2,
  X,
  RotateCcw,
  Globe,
  MapPin,
  Mic,
  Square,
  Video,
  ExternalLink,
  Cpu,
  Layers,
  Copy,
  Check,
  Volume2,
  VolumeX,
  CornerDownLeft,
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
  const { theme } = useTheme();
  const isSwat = theme === 'swat';
  const isPink = theme === 'pink';

  const [model, setModel] = useState<string>(geminiService.preferredModel || 'gemini-3.1-flash-lite');
  const [role, setRole] = useState<'geral' | 'redacao' | 'bancas' | 'oral'>('geral');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);

  const STORAGE_KEY = 'synapse_chat_history';

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
    return [
      {
        sender: 'ai',
        text:
          initialMessage ||
          `Olá! Estou online para conversar e acelerar sua aprovação${
            courseTitle ? ` na estação de ${courseTitle}` : ''
          }. Como posso te ajudar hoje? Posso tirar dúvidas, explicar matérias com macetes e mnemônicos, treinar questões de bancas examinadoras ou montar um plano de estudos com você!`,
      },
    ];
  });

  // Keep localStorage updated with modal messages
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (e) {
      console.warn('Erro ao salvar histórico do modal:', e);
    }
  }, [messages]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Copied message state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // TTS audio reading state
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

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
  }, [messages, loading, isStreaming]);

  // Clean up any ongoing TTS on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getSystemInstructionForRole = (currentRole: string) => {
    const basePersonality = `Você é o tutor de inteligência artificial de alta performance do SYNAPSE. Converse com o estudante de forma natural, amigável, clara e didática, como em uma conversa viva online. Utilize formatação Markdown limpa (tópicos, negritos, mnemônicos e citações de artigos).`;

    switch (currentRole) {
      case 'redacao':
        return `${basePersonality} Especialidade: Redação Discursiva e Peças Técnicas de Concursos. Avalie estrutura dissertativo-argumentativa, coesão, clareza, repertório jurídico e critérios de correção das bancas examinadoras. Proponha esqueletos e parágrafos modelo práticos.`;
      case 'bancas':
        return `${basePersonality} Especialidade: Estratégia de Bancas Examinadoras (Cebraspe - Certo/Errado e jurisprudência, FGV - interpretação e casos interdisciplinares, VUNESP - letra fria da lei rigorosa, FCC - raciocínio lógico e súmulas). Explique o estilo da banca com pegadinhas e tendências.`;
      case 'oral':
        return `${basePersonality} Especialidade: Examinador de Prova Oral e Arguição Jurídica. Faça perguntas diretas e realistas simulando uma arguição, analise a resposta com clareza e corrija termos técnicos.`;
      default:
        return `${basePersonality} Especialidade: Preparação Geral de Concursos e Estudo Ativo${
          courseTitle ? ` focado na estação "${courseTitle}"` : ''
        }. Ajude a fixar conteúdos, tirar dúvidas e planejar a rotina sem estresse.`;
    }
  };

  const handleCopyText = (text: string, index: number) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleToggleSpeak = (text: string, index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown characters for cleaner speech
    const cleanText = text
      .replace(/[*_#`~>\[\]]/g, '')
      .replace(/https?:\/\/\S+/g, 'link');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const userText = (directText !== undefined ? directText : inputPrompt).trim();
    if (!userText || loading || isStreaming) return;

    setInputPrompt('');

    const userMsgItem: ChatMessageItem = { sender: 'user', text: userText };
    const conversationWithUser = [...messages, userMsgItem];
    
    // Create an empty AI message to receive the live stream
    const placeholderAiMsg: ChatMessageItem = {
      sender: 'ai',
      text: '',
      modelUsed: model,
    };

    setMessages([...conversationWithUser, placeholderAiMsg]);
    setLoading(true);
    setIsStreaming(true);

    try {
      const systemInstruction = getSystemInstructionForRole(role);

      // Local Llamafile handling
      if (model === 'llamafile' || geminiService.useLocalLlamafile) {
        const llamaMessages = [
          { role: 'system' as const, content: systemInstruction },
          ...conversationWithUser.map((m) => ({
            role: m.sender === 'ai' ? ('assistant' as const) : ('user' as const),
            content: m.text,
          })),
        ];

        const llamaResult = await queryLlamafile(llamaMessages, {
          endpoint: geminiService.llamafileEndpoint,
        });

        if (llamaResult.text) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              sender: 'ai',
              text: llamaResult.text,
              modelUsed: 'Llamafile (Local)',
            };
            return updated;
          });
          return;
        }
      }

      // Live streaming response with Gemini
      let accumulated = '';
      const fullText = await callGeminiStream(
        conversationWithUser,
        (chunkText) => {
          accumulated = chunkText;
          setLoading(false); // First chunk arrived, hide spinner and show stream
          setMessages((prev) => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                sender: 'ai',
                text: accumulated,
                modelUsed: model,
              };
            }
            return updated;
          });
        },
        systemInstruction,
        {
          model,
          useSearchGrounding,
          useMapsGrounding,
        }
      );

      // Final update with complete response text
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            sender: 'ai',
            text: fullText || accumulated,
            modelUsed: model,
          };
        }
        return updated;
      });
    } catch (err: unknown) {
      const errorObj = err as Error;
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            sender: 'ai',
            text: `Desculpe, ocorreu uma instabilidade na conexão: ${
              errorObj?.message || 'Tente novamente.'
            }. Estou pronto para tentar de novo!`,
            modelUsed: model,
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
      setIsStreaming(false);
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingIndex(null);
    const resetMsg: ChatMessageItem[] = [
      {
        id: 'reset-msg',
        sender: 'ai',
        text: `Conversa reiniciada! Estou online. Como posso te apoiar nos estudos hoje?`,
        timestamp: Date.now(),
      },
    ];
    setMessages(resetMsg);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resetMsg));
    } catch (e) {}
  };

  // Quick conversation starter prompts
  const QUICK_PROMPTS = [
    '🎯 Monte meu plano de estudos de hoje',
    '💡 Me ensine um mnemônico para memorização',
    '📝 Faça 3 questões de concurso comentadas',
    '✍️ Como estruturar uma redação nota 100?',
    '⚖️ Explique os conceitos mais cobrados de Direito',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`rounded-3xl p-4 sm:p-6 max-w-3xl w-full h-[90vh] flex flex-col shadow-2xl text-slate-100 font-sans overflow-hidden border ${
          isSwat
            ? 'bg-[#0a0f18] border-cyan-500/40'
            : isPink
            ? 'bg-[#150a1c] border-rose-500/40'
            : 'bg-slate-900 border-slate-700/70'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl p-0.5 shadow-md ${
                isSwat
                  ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-cyan-500/20'
                  : isPink
                  ? 'bg-gradient-to-tr from-rose-600 to-pink-500 shadow-rose-500/20'
                  : 'bg-gradient-to-tr from-indigo-600 via-cyan-500 to-emerald-400 shadow-indigo-600/30'
              }`}
            >
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles
                  className={`w-5 h-5 ${
                    isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-cyan-400'
                  }`}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Assistente IA SYNAPSE</span>
                </h3>

                {/* Real-time Online Indicator */}
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isStreaming ? 'Respondendo online...' : 'Online'}</span>
                </div>

                <span className="text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono hidden md:inline">
                  {model}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {courseTitle ? `Estação: ${courseTitle}` : 'Conversa natural, tira-dúvidas e planos em tempo real'}
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
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-indigo-500 w-full cursor-pointer"
            >
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Mais Rápido / Recomendado)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Geral Avançado)</option>
              <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Raciocínio Jurídico)</option>
              <option value="llamafile">🦙 Llamafile (IA Local Offline)</option>
            </select>
          </div>

          {/* Role selection */}
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={role}
              onChange={(e: any) => setRole(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-cyan-500 w-full cursor-pointer"
            >
              <option value="geral">🎓 Tutor Amigável & Geral</option>
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
              title="Buscar jurisprudências, notícias recentes e leis no Google Search"
            >
              <Globe className="w-3 h-3" />
              <span>Google Search</span>
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
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 mb-2 font-sans text-xs md:text-sm custom-scrollbar">
          {messages.map((msg, idx) => {
            const isAi = msg.sender === 'ai';
            const isLastAi = isAi && idx === messages.length - 1;
            const isCurrentlyStreamingThis = isLastAi && isStreaming;

            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 ${
                  msg.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
                    msg.sender === 'user'
                      ? isSwat
                        ? 'bg-cyan-500 text-black font-bold'
                        : isPink
                        ? 'bg-rose-600'
                        : 'bg-indigo-600'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot
                      className={`w-4 h-4 ${
                        isSwat ? 'text-cyan-400' : isPink ? 'text-rose-400' : 'text-cyan-400'
                      }`}
                    />
                  )}
                </div>

                <div className="max-w-[85%] space-y-1.5">
                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? isSwat
                          ? 'bg-cyan-600/90 text-white rounded-tr-none shadow-md shadow-cyan-600/20'
                          : isPink
                          ? 'bg-rose-600 text-white rounded-tr-none shadow-md shadow-rose-600/20'
                          : 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950/85 border border-slate-800 text-slate-200 rounded-tl-none shadow-inner'
                    }`}
                  >
                    {msg.text ? (
                      msg.text
                    ) : isCurrentlyStreamingThis ? (
                      <span className="flex items-center gap-1.5 text-slate-400 italic">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>Escrevendo resposta...</span>
                      </span>
                    ) : null}

                    {/* Cursor while streaming */}
                    {isCurrentlyStreamingThis && (
                      <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-1 translate-y-0.5 animate-pulse" />
                    )}

                    {/* Grounding Source Badges */}
                    {msg.groundingMetadata?.groundingChunks &&
                      msg.groundingMetadata.groundingChunks.length > 0 && (
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
                                    <span className="truncate max-w-[200px]">
                                      {mapsTitle || 'Ver no Google Maps'}
                                    </span>
                                  </a>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* AI Message Action Bar (Copy & Read Aloud) */}
                  {isAi && msg.text && !isCurrentlyStreamingThis && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                      <button
                        onClick={() => handleCopyText(msg.text, idx)}
                        className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copiar texto da resposta"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <span className="opacity-40">•</span>

                      <button
                        onClick={() => handleToggleSpeak(msg.text, idx)}
                        className="hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title={speakingIndex === idx ? 'Parar leitura de voz' : 'Ouvir resposta em áudio'}
                      >
                        {speakingIndex === idx ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-400" />
                            <span className="text-rose-400 font-medium">Parar Áudio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-cyan-400" />
                            <span>Ouvir</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && !isStreaming && (
            <div className="flex items-center gap-2 text-xs text-slate-300 p-3 bg-slate-950/70 rounded-2xl border border-slate-800 w-fit animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Conectando com o Gemini online...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 shrink-0 custom-scrollbar">
          {QUICK_PROMPTS.map((promptText, pIdx) => (
            <button
              key={pIdx}
              type="button"
              disabled={loading || isStreaming}
              onClick={() => handleSend(undefined, promptText)}
              className="text-[11px] bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
            >
              {promptText}
            </button>
          ))}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              useSearchGrounding
                ? 'Pergunte sobre leis recentes, editais e notícias no Google...'
                : useMapsGrounding
                ? 'Procure locais de prova, bibliotecas e salas de estudo...'
                : 'Converse naturalmente com a IA ou pergunte sobre matérias e simulados...'
            }
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || loading || isStreaming}
            className={`p-3 rounded-2xl transition-all text-white font-bold shadow-lg cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              isSwat
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold shadow-cyan-500/20'
                : isPink
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 shadow-indigo-600/30'
            }`}
            title="Enviar mensagem"
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

