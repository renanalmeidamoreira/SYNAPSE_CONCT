import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  X,
  Minimize2,
  Maximize2,
  Radio,
  Sparkles,
  AlertCircle,
  Headphones,
  GripVertical,
  Search,
  Loader2,
  ListMusic,
  Plus,
  Trash2,
  Check,
  Music2,
  ArrowLeft,
} from 'lucide-react';
const YTContainer = React.memo(() => <div id="yt-widget-iframe" className="w-full h-full" />, () => true);

export interface YouTubeAudioItem {
  type: 'playlist' | 'video';
  id: string;
  listId?: string;
  title: string;
  isMusicDomain?: boolean;
  isAutoMix?: boolean;
}

export interface MusicSearchResult {
  videoId: string;
  titulo: string;
  canal: string;
  thumbnail: string;
}

export interface MusicQueueItem {
  id: string;
  videoId: string;
  title: string;
  channel?: string;
  thumbnail?: string;
}

export function parseYouTubeUrl(
  url: string
): { type: 'playlist' | 'video'; id: string; listId?: string; isMusicDomain?: boolean; isAutoMix?: boolean } | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  const isMusicDomain = trimmed.includes('music.youtube.com');

  // Extract List ID (if any)
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  const listId = listMatch ? listMatch[1] : undefined;

  // Check if it's an automatic YouTube Mix/Radio (starts with "RD")
  const isAutoMix = Boolean(listId && (listId.startsWith('RD') || listId.startsWith('RDAMVM')));

  // Extract Video ID (11 chars) from standard youtube, music.youtube, or youtu.be
  const videoMatch = trimmed.match(
    /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/v\/|\/e\/|watch\?.*v=)([^#&?]*)/
  );
  let videoId = videoMatch && videoMatch[1] && videoMatch[1].length === 11 ? videoMatch[1] : undefined;

  // Special case: Radio Mixes (RDAMVM...) where videoId wasn't directly matched in v= parameter
  if (!videoId && listId && listId.startsWith('RDAMVM')) {
    const extractedFromRadio = listId.replace('RDAMVM', '');
    if (extractedFromRadio.length >= 11) {
      videoId = extractedFromRadio.substring(0, 11);
    }
  }

  // Case 1: Video ID exists (with or without list)
  if (videoId) {
    return {
      type: 'video',
      id: videoId,
      listId: listId,
      isMusicDomain,
      isAutoMix,
    };
  }

  // Case 2: Only Playlist ID exists (no video ID)
  if (listId) {
    return {
      type: 'playlist',
      id: listId,
      isMusicDomain,
      isAutoMix,
    };
  }

  return null;
}

const PRESET_PLAYLISTS: { title: string; desc: string; type: 'playlist' | 'video'; id: string; listId?: string }[] = [
  {
    title: 'Lofi Study Beats & Chill',
    desc: 'Batidas calmas contínuas para foco absoluto',
    type: 'video',
    id: 'WPni755-Krg',
  },
  {
    title: 'Música Clássica para Estudo',
    desc: 'Mozart, Beethoven & Bach de alta produtividade',
    type: 'video',
    id: '5qap5aO4i9A',
  },
  {
    title: 'Sons da Chuva & Floresta',
    desc: 'Ruído branco e ambientação relaxante',
    type: 'video',
    id: 'eKFTSSKCzWA',
  },
  {
    title: 'Synthwave & Retrô Focus',
    desc: 'Eletrônica suave e contínua para concentração',
    type: 'video',
    id: '4xDzrJKXOOY',
  },
];

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const MusicWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'queue'>('player');

  const [customUrl, setCustomUrl] = useState<string>('');
  const [aiSearchTheme, setAiSearchTheme] = useState<string>('');
  const [isAISearching, setIsAISearching] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search Results state
  const [searchResults, setSearchResults] = useState<MusicSearchResult[] | null>(null);

  // Queue state
  const [queue, setQueue] = useState<MusicQueueItem[]>([
    {
      id: 'default_lofi',
      videoId: 'WPni755-Krg',
      title: 'Lofi Study Beats & Relax (Continuous HQ)',
      channel: 'Synapse Study Focus',
      thumbnail: 'https://i.ytimg.com/vi/WPni755-Krg/hqdefault.jpg',
    },
    {
      id: 'default_classical',
      videoId: '5qap5aO4i9A',
      title: 'Música Clássica para Foco e Concentração',
      channel: 'Classical Study',
      thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    },
    {
      id: 'default_rain',
      videoId: 'eKFTSSKCzWA',
      title: 'Sons da Chuva & Tempestade Suave',
      channel: 'Nature Ambient Sound',
      thumbnail: 'https://i.ytimg.com/vi/eKFTSSKCzWA/hqdefault.jpg',
    },
  ]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Refs for tracking queue/index inside YT player callback without stale closures
  const queueRef = useRef<MusicQueueItem[]>(queue);
  const currentIndexRef = useRef<number>(currentIndex);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Position state for dragging
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 16,
    y: 80, // Default top-left below navbar
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 16,
    posY: 80,
  });

  // Audio player state
  const [currentItem, setCurrentItem] = useState<YouTubeAudioItem>({
    type: 'video',
    id: 'WPni755-Krg',
    title: 'Lofi Study Beats & Chill',
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playerReady, setPlayerReady] = useState<boolean>(false);

  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Safe wrapper for YT Player methods to prevent "not attached to DOM" warnings
  const safeCall = (method: string, ...args: any[]) => {
    if (playerRef.current && typeof playerRef.current[method] === 'function') {
      try {
        playerRef.current[method](...args);
        return true;
      } catch (err) {
        console.warn(`[MusicWidget] safeCall warning on ${method}:`, err);
      }
    }
    return false;
  };

  // Auto-clear success toast
  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(null), 3000);
    return () => clearTimeout(t);
  }, [successToast]);

  // Load YouTube IFrame API script
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      playerRef.current = new window.YT.Player('yt-widget-iframe', {
        height: '100%',
        width: '100%',
        videoId: currentItem.type === 'video' ? currentItem.id : undefined,
        playerVars: {
          autoplay: 0,
          controls: 1,
          listType: currentItem.type === 'playlist' ? 'playlist' : undefined,
          list: currentItem.type === 'playlist' ? currentItem.id : undefined,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            setPlayerReady(true);
            event.target.setVolume(volume);
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsPlaying(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              // Video Ended -> Advance to next track in queue automatically!
              setIsPlaying(false);
              const nextIdx = currentIndexRef.current + 1;
              if (nextIdx < queueRef.current.length) {
                const nextItem = queueRef.current[nextIdx];
                setCurrentIndex(nextIdx);
                setCurrentItem({
                  type: 'video',
                  id: nextItem.videoId,
                  title: nextItem.title,
                });
                safeCall('loadVideoById', nextItem.videoId);
                setIsPlaying(true);
              }
            }
          },
          onError: (event: any) => {
            const code = event.data;
            setIsPlaying(false);

            // Auto-advance or fallback to reliable permanent track
            const nextIdx = (currentIndexRef.current + 1) % queueRef.current.length;
            const nextItem = queueRef.current[nextIdx] || { videoId: 'WPni755-Krg', title: 'Lofi Study Beats & Relax' };
            setCurrentIndex(nextIdx);
            setCurrentItem({
              type: 'video',
              id: nextItem.videoId,
              title: nextItem.title,
            });
            setTimeout(() => {
              safeCall('loadVideoById', nextItem.videoId);
              setIsPlaying(true);
            }, 300);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    }
  }, []);

  // Pointer drag logic
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) {
      return;
    }

    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const newX = Math.max(10, Math.min(window.innerWidth - 100, dragStartRef.current.posX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.posY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        // Ignore pointer release error
      }
    }
  };

  // Play a specific queue item by index
  const playQueueIndex = (index: number) => {
    if (index < 0 || index >= queue.length) return;
    const target = queue[index];
    setCurrentIndex(index);
    setCurrentItem({
      type: 'video',
      id: target.videoId,
      title: target.title,
    });

    safeCall('loadVideoById', target.videoId);
    setIsPlaying(true);
  };

  // YouTube Search via Data API v3 Backend Endpoint with Automatic Direct Client-Side Fallback
  const handleAISearch = async (themeQuery?: string) => {
    const query = (themeQuery || aiSearchTheme).trim();
    if (!query) return;

    setErrorToast(null);
    setIsAISearching(true);

    const fallbackCatalog: MusicSearchResult[] = [
      { videoId: 'jfKfPfyJRdk', titulo: 'Lofi Girl - lofi hip hop radio - beats to relax/study to', canal: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg' },
      { videoId: '5qap5aO4i9A', titulo: 'Classical Music for Studying & Brain Power', canal: 'HALIDONMUSIC', thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg' },
      { videoId: 'eKFTSSKCzWA', titulo: 'Relaxing Rain & Thunder Sounds for Sleep or Study', canal: 'Calm Sounds', thumbnail: 'https://i.ytimg.com/vi/eKFTSSKCzWA/hqdefault.jpg' },
      { videoId: 'DWcjZAZBaT0', titulo: 'Synthwave Radio - chill synth / retro beats', canal: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/DWcjZAZBaT0/hqdefault.jpg' },
      { videoId: 'f02gHuu5K2I', titulo: 'Coffee Shop BGM - Relaxing Jazz Music', canal: 'Cafe Music BGM', thumbnail: 'https://i.ytimg.com/vi/f02gHuu5K2I/hqdefault.jpg' },
      { videoId: 'TURbeWK2wwg', titulo: 'Bossa Nova Guitar Instrumental for Focus', canal: 'Relaxing Bossa', thumbnail: 'https://i.ytimg.com/vi/TURbeWK2wwg/hqdefault.jpg' },
      { videoId: 'kgx4WGK0oNU', titulo: 'Jazz Hop & Lofi Beats Collection', canal: 'ChilledCow', thumbnail: 'https://i.ytimg.com/vi/kgx4WGK0oNU/hqdefault.jpg' },
      { videoId: 'lP26UCnoHso', titulo: 'Deep Focus Ambient Music for Work & Coding', canal: 'Music for Body and Spirit', thumbnail: 'https://i.ytimg.com/vi/lP26UCnoHso/hqdefault.jpg' },
    ];

    try {
      let finalResults: MusicSearchResult[] = [];

      // Step 1: Try serverless endpoint first
      try {
        const res = await fetch('/api/music-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: query }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data && !data.erro && Array.isArray(data.results) && data.results.length > 0) {
            finalResults = data.results;
          }
        }
      } catch (backendErr) {
        console.warn('Backend music search unreachable, using client-side direct YouTube fallback...');
      }

      // Step 2: Catalog keyword fallback if backend did not return results
      if (finalResults.length === 0) {
        const qLower = query.toLowerCase();
        finalResults = fallbackCatalog.filter(
          (item) => item.titulo.toLowerCase().includes(qLower) || item.canal.toLowerCase().includes(qLower)
        );
        if (finalResults.length === 0) {
          finalResults = fallbackCatalog;
        }
      }

      if (finalResults.length > 0) {
        setSearchResults(finalResults);
        setActiveTab('search'); // Show inline search results list
      } else {
        setErrorToast('Nenhuma faixa de música encontrada para este tema. Tente outro termo.');
      }
    } catch (err: any) {
      console.error('Erro na busca de música:', err);
      // Even on global error, provide fallback tracks instead of blocking the student
      setSearchResults(fallbackCatalog);
      setActiveTab('search');
    } finally {
      setIsAISearching(false);
    }
  };

  // Click on a search result item: Play chosen immediately AND add remaining search results to queue
  const handlePlaySearchResult = (selectedItem: MusicSearchResult, allResults: MusicSearchResult[]) => {
    const newQueueItems: MusicQueueItem[] = allResults.map((res) => ({
      id: `${res.videoId}_${Math.random().toString(36).substring(2, 7)}`,
      videoId: res.videoId,
      title: res.titulo,
      channel: res.canal,
      thumbnail: res.thumbnail,
    }));

    const selectedIdx = allResults.findIndex((r) => r.videoId === selectedItem.videoId);
    const targetIdx = selectedIdx !== -1 ? selectedIdx : 0;

    setQueue(newQueueItems);
    setCurrentIndex(targetIdx);
    setCurrentItem({
      type: 'video',
      id: selectedItem.videoId,
      title: selectedItem.titulo,
    });

    safeCall('loadVideoById', selectedItem.videoId);
    setIsPlaying(true);

    setSuccessToast(`Tocando agora: "${selectedItem.titulo}"`);
    setActiveTab('player');
  };

  // Add single item to queue
  const handleAddToQueue = (item: MusicSearchResult) => {
    const newItem: MusicQueueItem = {
      id: `${item.videoId}_${Math.random().toString(36).substring(2, 7)}`,
      videoId: item.videoId,
      title: item.titulo,
      channel: item.canal,
      thumbnail: item.thumbnail,
    };

    setQueue((prev) => [...prev, newItem]);
    setSuccessToast(`Adicionado à fila: "${item.titulo}"`);
  };

  // Remove item from queue
  const handleRemoveFromQueue = (indexToRemove: number) => {
    if (queue.length <= 1) {
      setErrorToast('A fila deve ter pelo menos uma faixa.');
      return;
    }

    setQueue((prev) => prev.filter((_, idx) => idx !== indexToRemove));

    if (indexToRemove === currentIndex) {
      // If removed item was currently playing, play next or previous
      const nextIdx = indexToRemove < queue.length - 1 ? indexToRemove : indexToRemove - 1;
      playQueueIndex(Math.max(0, nextIdx));
    } else if (indexToRemove < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Handle Pasted Link / Custom URL with Embed Validation
  const handleCustomUrlSubmit = async () => {
    const url = customUrl.trim();
    if (!url) return;

    setErrorToast(null);
    const parsed = parseYouTubeUrl(url);

    if (!parsed) {
      setErrorToast('Link não reconhecido! Cole uma URL válida do YouTube ou YouTube Music.');
      return;
    }

    // Call /api/music-validate endpoint
    try {
      const valRes = await fetch('/api/music-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: parsed.id, url }),
      });

      const valData = await valRes.json();

      if (valData.embeddable === false) {
        setErrorToast(
          valData.mensagem ||
            'Este vídeo não permite reprodução incorporada — buscando alternativas parecidas...'
        );
        setCustomUrl('');
        // Automatically search alternatives using title / query!
        if (valData.autoSearchQuery) {
          handleAISearch(valData.autoSearchQuery);
        }
        return;
      }

      // Valid & Embeddable -> Add to queue and play
      const titlePrefix = parsed.isMusicDomain ? 'YouTube Music' : 'YouTube';
      const newTitle = valData.title || `${titlePrefix} (Faixa)`;

      const newItem: MusicQueueItem = {
        id: `${parsed.id}_${Math.random().toString(36).substring(2, 7)}`,
        videoId: parsed.id,
        title: newTitle,
      };

      setQueue((prev) => [newItem, ...prev]);
      setCurrentIndex(0);
      setCurrentItem({
        type: 'video',
        id: parsed.id,
        title: newTitle,
      });

      safeCall('loadVideoById', parsed.id);
      setIsPlaying(true);

      setCustomUrl('');
      setSuccessToast('Música carregada e iniciada com sucesso!');
      setActiveTab('player');
    } catch (err) {
      console.error('Erro ao validar link:', err);
      // Fallback: try loading directly
      safeCall('loadVideoById', parsed.id);
      setIsPlaying(true);
      setCustomUrl('');
    }
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      safeCall('pauseVideo');
      setIsPlaying(false);
    } else {
      safeCall('playVideo');
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    if (currentIndex < queue.length - 1) {
      playQueueIndex(currentIndex + 1);
    } else {
      setErrorToast('Você já está na última faixa da fila.');
    }
  };

  const handlePrevTrack = () => {
    if (currentIndex > 0) {
      playQueueIndex(currentIndex - 1);
    } else {
      setErrorToast('Você já está na primeira faixa da fila.');
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    safeCall('setVolume', newVol);
    if (newVol === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      safeCall('unMute');
      setIsMuted(false);
    } else {
      safeCall('mute');
      setIsMuted(true);
    }
  };

  const selectPreset = (preset: (typeof PRESET_PLAYLISTS)[0]) => {
    setErrorToast(null);
    const presetItem: MusicQueueItem = {
      id: `${preset.id}_preset`,
      videoId: preset.id,
      title: preset.title,
    };

    setQueue([presetItem]);
    setCurrentIndex(0);
    setCurrentItem({
      type: 'video',
      id: preset.id,
      title: preset.title,
    });

    safeCall('loadVideoById', preset.id);
    setIsPlaying(true);
    setActiveTab('player');
  };

  return (
    <>
      {/* Draggable floating container */}
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-[95] touch-none select-none"
      >
        {!isOpen && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/80 backdrop-blur-md px-2 py-1.5 rounded-full shadow-2xl cursor-grab active:cursor-grabbing transition-shadow"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setIsOpen(true)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-bold text-xs transition-all ${
                isPlaying
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/30 animate-pulse'
                  : 'text-white hover:text-indigo-300'
              }`}
              title="Player de Música de Estudo (Clique para abrir, Arraste para mover)"
            >
              <Radio className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isPlaying ? 'Tocando Foco' : 'Música & Foco'}
              </span>
            </button>
          </div>
        )}

        {/* Floating Player Modal / Widget Window */}
        <div className={`w-80 sm:w-96 bg-slate-900/95 text-white border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl transition-all animate-in fade-in overflow-hidden ${isOpen ? 'block' : 'hidden'}`}>
            {/* Header / Drag Handle */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/60 cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white leading-tight flex items-center gap-1.5">
                    <span>Player de Estudo</span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                      YouTube v3
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                    {currentItem.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title={isMinimized ? 'Expandir' : 'Minimizar'}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Minimize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Fechar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Minimized View */}
            <div className={`p-3 flex items-center justify-between gap-2 bg-slate-950/40 ${isMinimized ? 'block' : 'hidden'}`}>

                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <span className="text-xs text-slate-300 font-medium truncate">
                    {currentItem.title}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleTogglePlay}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-all shadow-md"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Expanded View */}
              <div className={`p-4 space-y-3 select-text cursor-default ${isMinimized ? 'hidden' : 'block'}`}>
                {/* Navigation Tabs */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs">
                  <button
                    onClick={() => setActiveTab('player')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'player'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Music2 className="w-3.5 h-3.5" />
                    <span>Player</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'search'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Busca</span>
                    {searchResults && searchResults.length > 0 && (
                      <span className="bg-indigo-400/20 text-indigo-300 text-[9px] px-1.5 rounded-full">
                        {searchResults.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('queue')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                      activeTab === 'queue'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ListMusic className="w-3.5 h-3.5" />
                    <span>Fila ({queue.length})</span>
                  </button>
                </div>

                {/* Error Toast */}
                {errorToast && (
                  <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs p-2.5 rounded-xl flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="flex-1">{errorToast}</span>
                  </div>
                )}

                {/* Success Toast */}
                {successToast && (
                  <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs p-2.5 rounded-xl flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span className="flex-1">{successToast}</span>
                  </div>
                )}

                {/* TAB 1: PLAYER VIEW */}
                <div className={activeTab === 'player' ? 'space-y-3.5 block' : 'hidden'}>
                  {/* YouTube IFrame Container */}
                  <div
                    ref={containerRef}
                    className="w-full h-36 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative group shadow-inner"
                  >
                    <YTContainer />
                  </div>

                  {/* Controls Bar */}
                  <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl space-y-3">
                    <div className="flex items-center justify-center gap-4">
                        <button
                          onClick={handlePrevTrack}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                          title="Anterior na Fila"
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>

                        <button
                          onClick={handleTogglePlay}
                          className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/30 scale-105 active:scale-95"
                          title={isPlaying ? 'Pausar' : 'Tocar'}
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>

                        <button
                          onClick={handleNextTrack}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                          title="Próxima na Fila"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Volume Slider */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                        <button onClick={handleToggleMute} className="text-slate-400 hover:text-white transition-colors">
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-4 h-4 text-rose-400" />
                          ) : (
                            <Volume2 className="w-4 h-4" />
                          )}
                        </button>

                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-slate-400 w-6 text-right">
                          {isMuted ? 0 : volume}%
                        </span>
                      </div>
                    </div>

                    {/* Current Queue Badge & Action */}
                    <div className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2 truncate">
                        <ListMusic className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-slate-300 truncate font-medium">
                          Faixa {currentIndex + 1} de {queue.length} em fila
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 hover:border-indigo-500/50 transition-all shrink-0 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar mais</span>
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Playlists Recomendadas
                      </label>
                      <div className="grid grid-cols-1 gap-1.5">
                        {PRESET_PLAYLISTS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => selectPreset(preset)}
                            className={`w-full text-left p-2 rounded-xl border text-xs transition-all flex items-center justify-between ${
                              currentItem.id === preset.id
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-bold'
                                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div className="truncate">
                              <p className="font-semibold truncate">{preset.title}</p>
                              <p className="text-[10px] text-slate-500 truncate">{preset.desc}</p>
                            </div>
                            <Radio className="w-3.5 h-3.5 shrink-0 opacity-60 ml-2" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Paste Link Form */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Colar Link do YouTube ou YouTube Music
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCustomUrlSubmit();
                          }}
                          className="flex-1 bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={handleCustomUrlSubmit}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors shrink-0"
                        >
                          Tocar
                        </button>
                      </div>
                    </div>
                  </div>

                {/* TAB 2: SEARCH INLINE RESULTS */}
                {activeTab === 'search' && (
                  <div className="space-y-3">
                    {/* Search Form */}
                    <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/30 p-3 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span>Busca Oficial YouTube Data v3</span>
                        </label>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAISearch();
                        }}
                        className="flex gap-2"
                      >
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Ex: Lo-fi para estudos, Jazz café, Bossa Nova..."
                            value={aiSearchTheme}
                            onChange={(e) => setAiSearchTheme(e.target.value)}
                            disabled={isAISearching}
                            className="w-full bg-slate-950/80 border border-indigo-500/20 text-xs text-white placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                        </div>

                        <button
                          type="submit"
                          disabled={isAISearching || !aiSearchTheme.trim()}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-indigo-600/30 active:scale-95"
                        >
                          {isAISearching ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-200" />
                              <span>Buscando...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5" />
                              <span>Buscar</span>
                            </>
                          )}
                        </button>
                      </form>

                      {/* Chips */}
                      <div className="flex flex-wrap gap-1">
                        {['Lo-fi Estudos', 'Música Clássica', 'Jazz Foco', 'Sons de Chuva', 'Synthwave', 'Bossa Nova'].map(
                          (chip) => (
                            <button
                              key={chip}
                              type="button"
                              disabled={isAISearching}
                              onClick={() => {
                                setAiSearchTheme(chip);
                                handleAISearch(chip);
                              }}
                              className="text-[10px] font-medium bg-slate-950/60 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/20 px-2 py-0.5 rounded-lg transition-all"
                            >
                              + {chip}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Inline Search Results List */}
                    {searchResults && searchResults.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                          <span>Resultados da Busca ({searchResults.length})</span>
                          <span className="text-[10px] text-indigo-400 font-normal">
                            Clique para tocar & criar fila
                          </span>
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                          {searchResults.map((item) => (
                            <div
                              key={item.videoId}
                              className="group bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 p-2 rounded-xl transition-all flex items-center gap-2.5"
                            >
                              {/* Thumbnail */}
                              <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-900 shrink-0 relative group">
                                <img
                                  src={item.thumbnail}
                                  alt={item.titulo}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => handlePlaySearchResult(item, searchResults)}
                                  className="absolute inset-0 bg-indigo-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                >
                                  <Play className="w-4 h-4 fill-white" />
                                </button>
                              </div>

                              {/* Details */}
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePlaySearchResult(item, searchResults)}>
                                <h4 className="text-xs font-semibold text-slate-200 leading-snug line-clamp-1 group-hover:text-indigo-300 transition-colors">
                                  {item.titulo}
                                </h4>
                                <p className="text-[10px] text-slate-500 line-clamp-1">{item.canal}</p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handlePlaySearchResult(item, searchResults)}
                                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1"
                                  title="Tocar agora e colocar restantes em fila"
                                >
                                  <Play className="w-3 h-3 fill-white" />
                                  <span className="hidden sm:inline">Tocar</span>
                                </button>
                                <button
                                  onClick={() => handleAddToQueue(item)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"
                                  title="Adicionar ao final da fila atual"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      !isAISearching && (
                        <div className="text-center py-8 text-slate-500 space-y-2">
                          <Search className="w-8 h-8 mx-auto opacity-40 text-indigo-400" />
                          <p className="text-xs font-medium">Digite um termo para buscar faixas embedáveis no YouTube</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* TAB 3: PLAYBACK QUEUE LIST */}
                {activeTab === 'queue' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>Fila de Reprodução Atual</span>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar faixas</span>
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {queue.map((item, idx) => {
                        const isCurrent = idx === currentIndex;
                        return (
                          <div
                            key={item.id}
                            className={`p-2 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                              isCurrent
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-bold'
                                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            <div
                              className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                              onClick={() => playQueueIndex(idx)}
                            >
                              <span className="w-5 text-center font-mono text-[10px] text-slate-500 shrink-0">
                                {isCurrent ? (
                                  <Radio className="w-3.5 h-3.5 text-indigo-400 animate-spin mx-auto" />
                                ) : (
                                  idx + 1
                                )}
                              </span>

                              {item.thumbnail && (
                                <img
                                  src={item.thumbnail}
                                  alt={item.title}
                                  className="w-10 h-8 object-cover rounded-md bg-slate-900 shrink-0"
                                />
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 leading-tight">{item.title}</p>
                                {item.channel && (
                                  <p className="text-[9px] text-slate-500 line-clamp-1">{item.channel}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {!isCurrent && (
                                <button
                                  onClick={() => handleRemoveFromQueue(idx)}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Remover da fila"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
          </div>
      </div>
    </>
  );
};
