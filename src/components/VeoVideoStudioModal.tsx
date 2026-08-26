import React, { useState, useEffect } from 'react';
import {
  Video,
  Sparkles,
  Play,
  Download,
  Loader2,
  X,
  Layers,
  Smartphone,
  Monitor,
  Lightbulb,
  CheckCircle2,
  Film,
} from 'lucide-react';
import { startVeoVideoGeneration, pollVeoVideoStatus, downloadVeoVideoBlob } from '../utils/gemini';

interface GeneratedVideoItem {
  id: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  videoUrl: string;
  createdAt: number;
}

interface VeoVideoStudioModalProps {
  onClose: () => void;
}

export const VeoVideoStudioModal: React.FC<VeoVideoStudioModalProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideoItem[]>(() => {
    try {
      const saved = localStorage.getItem('synapse_veo_video_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const presetPrompts = [
    {
      title: 'Princípios da Administração (LIMPE)',
      text: 'A clean 3D isometric animation showing legal pillars representing Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência with glowing golden typography and educational graphics for students.',
    },
    {
      title: 'Artigo 5º da CF/88 (Inviolabilidade)',
      text: 'A conceptual educational animation illustrating the sanctuary of home protection, day and night legal exceptions, high tech law scales, and glowing constitutional crest.',
    },
    {
      title: 'Ciclo PDCA na Administração',
      text: 'A sleek motion graphic loop showing the PDCA management cycle: Plan, Do, Check, Act with high contrast neon nodes and seamless arrows.',
    },
    {
      title: 'Fases da Licitação Pública',
      text: 'An engaging educational reel showing public procurement workflow stages with documents, digital seal, and transparent bids dashboard.',
    },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setCurrentVideoUrl(null);
    setGenerationStep('Iniciando renderização com modelo Veo 3...');

    try {
      // Step 1: Start operation
      const { operationName } = await startVeoVideoGeneration(prompt.trim(), aspectRatio, resolution);

      setGenerationStep('Processando frames com IA generativa Veo 3 (isso pode levar alguns instantes)...');

      // Step 2: Poll operation
      let attempts = 0;
      const maxAttempts = 40; // up to ~2-3 minutes
      let isDone = false;

      while (attempts < maxAttempts && !isDone) {
        attempts++;
        await new Promise((r) => setTimeout(r, 4000));
        const status = await pollVeoVideoStatus(operationName);

        if (status.error) {
          throw new Error(status.error.message || 'Erro na renderização do vídeo Veo.');
        }

        if (status.done) {
          isDone = true;
          break;
        }

        const progressPercent = Math.min(95, Math.round((attempts / 25) * 100));
        setGenerationStep(`Renderizando sequência de vídeo com IA (${progressPercent}%)...`);
      }

      if (!isDone) {
        throw new Error('Tempo limite excedido na geração do vídeo. Tente novamente.');
      }

      // Step 3: Download video
      setGenerationStep('Finalizando download do vídeo renderizado...');
      const videoBlob = await downloadVeoVideoBlob(operationName);
      const url = URL.createObjectURL(videoBlob);

      setCurrentVideoUrl(url);

      const newItem: GeneratedVideoItem = {
        id: 'veo_' + Date.now(),
        prompt: prompt.trim(),
        aspectRatio,
        videoUrl: url,
        createdAt: Date.now(),
      };

      setVideoHistory((prev) => {
        const updated = [newItem, ...prev.slice(0, 8)];
        try {
          // Store lightweight references in localStorage
          localStorage.setItem('synapse_veo_video_history', JSON.stringify(updated.map(i => ({ ...i, videoUrl: '' }))));
        } catch {
          // ignore
        }
        return updated;
      });

      setGenerationStep('');
    } catch (err: any) {
      console.error('Erro no estúdio de vídeo Veo:', err);
      alert(`Não foi possível gerar o vídeo: ${err?.message || 'Verifique sua conexão ou tente com outro prompt.'}`);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/70 rounded-3xl p-5 sm:p-7 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl text-slate-100 font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-400 p-0.5 shadow-lg shadow-purple-600/30">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Video className="w-5 h-5 text-pink-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Estúdio de Vídeo Mnemônico Veo 3</span>
                <span className="text-[10px] bg-pink-500/10 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded-full font-bold">
                  Veo 3.1
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gere vídeos animados de alta definição para fixação visual de conceitos jurídicos e matérias
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar">
          {/* Controls row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Prompt input */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Descreva o conceito ou cena para o vídeo</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Animação 3D didática explicando o Princípio da Eficiência na Administração Pública com gráficos luminosos..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all resize-none"
              />
            </div>

            {/* Format and Resolution */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">Formato (Aspect Ratio):</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-600/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>16:9 (Desktop)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      aspectRatio === '9:16'
                        ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-600/30'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>9:16 (Reels)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">Resolução:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('720p')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      resolution === '720p'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    720p HD (Rápido)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('1080p')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      resolution === '1080p'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    1080p Full HD
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Prompts Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Sugestões de temas para concurso:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presetPrompts.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(preset.text)}
                  className="text-left p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-pink-500/50 hover:bg-pink-950/20 text-xs transition-all cursor-pointer group"
                >
                  <div className="font-semibold text-slate-200 group-hover:text-pink-300 flex items-center justify-between">
                    <span>{preset.title}</span>
                    <Sparkles className="w-3 h-3 opacity-0 group-hover:opacity-100 text-pink-400 transition-opacity" />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{preset.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Video Preview or Progress Screen */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[220px]">
            {isGenerating ? (
              <div className="text-center space-y-3 py-6 animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-pink-600/20 border border-pink-500/40 flex items-center justify-center mx-auto animate-pulse">
                  <Loader2 className="w-7 h-7 text-pink-400 animate-spin" />
                </div>
                <h4 className="text-sm font-bold text-white">Criando vídeo com Veo 3...</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">{generationStep}</p>
                <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 animate-pulse w-full rounded-full" />
                </div>
              </div>
            ) : currentVideoUrl ? (
              <div className="w-full flex flex-col items-center space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-black max-w-md w-full aspect-video flex items-center justify-center">
                  <video
                    src={currentVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={currentVideoUrl}
                    download="synapse_estudo_veo.mp4"
                    className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-pink-600/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Vídeo MP4</span>
                  </a>
                  <button
                    onClick={() => setCurrentVideoUrl(null)}
                    className="text-xs text-slate-400 hover:text-white px-3 py-2 bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Novo Vídeo
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 py-4 text-slate-500">
                <Film className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs">Seu vídeo gerado com IA aparecerá aqui em alta definição.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 pt-3 mt-3 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Powered by <strong>Google Veo 3</strong> & Gemini AI
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-pink-600/25 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Vídeo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Vídeo Mnemônico</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
