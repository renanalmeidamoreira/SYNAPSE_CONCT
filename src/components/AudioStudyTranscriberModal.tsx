import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Copy,
  Check,
  Download,
  Loader2,
  X,
  Volume2,
  FileText,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { transcribeAudioWithGemini } from '../utils/gemini';

interface AudioStudyTranscriberModalProps {
  onClose: () => void;
  onInsertToNotes?: (transcription: string) => void;
}

export const AudioStudyTranscriberModal: React.FC<AudioStudyTranscriberModalProps> = ({
  onClose,
  onInsertToNotes,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [copied, setCopied] = useState(false);
  const [promptFocus, setPromptFocus] = useState<string>('geral');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do seu navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);

    let customPrompt = 'Transcreva este áudio em português com fidelidade, pontuação precisa e estruturação em tópicos de estudo.';
    if (promptFocus === 'simulado_oral') {
      customPrompt = 'Transcreva a resposta do candidato para esta arguição oral de concurso público. Corrija pontuação e estruture a linha de argumentação jurídica.';
    } else if (promptFocus === 'resumo_aula') {
      customPrompt = 'Transcreva e organize este resumo falado de aula em tópicos mnemônicos, artigos citados e conceitos fundamentais para concursos.';
    }

    try {
      const result = await transcribeAudioWithGemini(audioBlob, customPrompt);
      setTranscription(result);
    } catch (err: any) {
      console.error('Erro na transcrição:', err);
      alert(`Falha ao transcrever com Gemini: ${err?.message || 'Tente gravar novamente.'}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = () => {
    if (!transcription) return;
    navigator.clipboard.writeText(transcription);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!transcription) return;
    const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcricao_synapse_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/70 rounded-3xl p-5 sm:p-6 max-w-2xl w-full flex flex-col shadow-2xl text-slate-100 font-sans max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-600/30">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Mic className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Gravador & Transcritor de Voz IA</span>
                <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
                  Gemini 3.5 Flash
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Grave anotações orais, treine prova oral e transcreva áudios com alta precisão
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPromptFocus('geral')}
              className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                promptFocus === 'geral'
                  ? 'bg-teal-600/20 border-teal-500 text-teal-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Anotação Geral
            </button>
            <button
              onClick={() => setPromptFocus('resumo_aula')}
              className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                promptFocus === 'resumo_aula'
                  ? 'bg-teal-600/20 border-teal-500 text-teal-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Resumo de Aula
            </button>
            <button
              onClick={() => setPromptFocus('simulado_oral')}
              className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                promptFocus === 'simulado_oral'
                  ? 'bg-teal-600/20 border-teal-500 text-teal-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Treino de Prova Oral
            </button>
          </div>

          {/* Recording Box */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center space-y-4 text-center">
            {isRecording ? (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500 flex items-center justify-center mx-auto animate-pulse">
                  <Mic className="w-8 h-8 text-rose-400 animate-bounce" />
                </div>
                <div className="text-xl font-mono font-bold text-rose-400">
                  {formatTime(recordingDuration)}
                </div>
                <p className="text-xs text-slate-300">Gravando sua voz... Fale com clareza.</p>
                <button
                  onClick={stopRecording}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Finalizar Gravação</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center mx-auto transition-all shadow-lg shadow-teal-600/30 hover:scale-105 cursor-pointer"
                >
                  <Mic className="w-8 h-8" />
                </button>
                <p className="text-xs text-slate-400">Clique para iniciar a gravação com o microfone</p>
              </div>
            )}

            {/* Audio Preview & Transcribe Button */}
            {audioUrl && !isRecording && (
              <div className="w-full pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <audio src={audioUrl} controls className="h-8 max-w-xs w-full" />
                <button
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Transcrevendo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Transcrever com Gemini</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Transcription Output */}
          {transcription && (
            <div className="space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  <span>Transcrição Gerada:</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="Copiar texto"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <button
                    onClick={handleDownloadTxt}
                    className="p-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="Baixar TXT"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>TXT</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-sans">
                {transcription}
              </div>

              {onInsertToNotes && (
                <button
                  onClick={() => {
                    onInsertToNotes(transcription);
                    onClose();
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Inserir no Caderno de Anotações da Estação
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 mt-3 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
