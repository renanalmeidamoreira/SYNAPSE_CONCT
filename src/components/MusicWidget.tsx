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
  FolderHeart,
  ExternalLink,
  LogIn,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from './AuthContext';

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

export interface UserPlaylist {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  itemCount: number;
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

  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  const listId = listMatch ? listMatch[1] : undefined;
  const isAutoMix = Boolean(listId && (listId.startsWith('RD') || listId.startsWith('RDAMVM')));

  const videoMatch = trimmed.match(
    /(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/v\/|\/e\/|watch\?.*v=)([^#&?]*)/
  );
  let videoId = videoMatch && videoMatch[1] && videoMatch[1].length === 11 ? videoMatch[1] : undefined;

  if (!videoId && listId && listId.startsWith('RDAMVM')) {
    const extractedFromRadio = listId.replace('RDAMVM', '');
    if (extractedFromRadio.length >= 11) {
      videoId = extractedFromRadio.substring(0, 11);
    }
  }

  if (videoId) {
    return {
      type: 'video',
      id: videoId,
      listId,
      isMusicDomain,
      isAutoMix,
    };
  }

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
    title: 'Sons da Chuva & Tempestade Suave',
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
  {
    title: 'Bossa Nova Instrumental Relax',
    desc: 'Violão suave e ritmo acolhedor para leitura',
    type: 'video',
    id: 'TURbeWK2wwg',
  },
];

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const MusicWidget: React.FC = () => {
  const { googleAccessToken, authorizeYouTube, user } = useAuth();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'player' | 'search' | 'playlists' | 'queue'>('player');

  const [customUrl, setCustomUrl] = useState<string>('');
  const [aiSearchTheme, setAiSearchTheme] = useState<string>('');
  const [isAISearching, setIsAISearching] = useState<boolean>(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search Results state
  const [searchResults, setSearchResults] = useState<MusicSearchResult[] | null>(null);

  // YouTube OAuth Playlists state
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(false);
  const [playlistAuthError, setPlaylistAuthError] = useState<boolean>(false);
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const [playlistLinkInput, setPlaylistLinkInput] = useState<string>('');
  const [isLoadingPlaylistLink, setIsLoadingPlaylistLink] = useState<boolean>(false);

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
    y: 80,
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

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(null), 3000);
    return () => clearTimeout(t);
  }, [successToast]);

  // Load YouTube IFrame API
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
              // Video Ended -> Advance next
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
          onError: () => {
            setIsPlaying(false);
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

  // Fetch YouTube Playlists when tab is opened
  const fetchUserPlaylists = async (overrideToken?: string) => {
    const token = overrideToken || googleAccessToken || localStorage.getItem('synapse_youtube_token');
    if (!token) {
      setPlaylistAuthError(true);
      return;
    }

    setLoadingPlaylists(true);
    setPlaylistAuthError(false);

    try {
      const res = await fetch('/api/youtube-playlists', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.playlists)) {
        setUserPlaylists(data.playlists);
      } else {
        if (res.status === 401 || data?.error?.code === 'AUTH_EXPIRED') {
          setPlaylistAuthError(true);
        } else {
          setErrorToast(data?.error?.message || 'Erro ao carregar playlists do YouTube.');
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar playlists:', err);
      setPlaylistAuthError(true);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'playlists' && (googleAccessToken || localStorage.getItem('synapse_youtube_token'))) {
      fetchUserPlaylists();
    }
  }, [activeTab, googleAccessToken]);

  const handleConnectYouTube = async () => {
    setErrorToast(null);
    setPopupBlocked(false);

    try {
      // Direct call on user gesture to prevent browser popup block heuristics
      const tokenPromise = authorizeYouTube();
      setLoadingPlaylists(true);
      const token = await tokenPromise;

      if (token) {
        await fetchUserPlaylists(token);
        setSuccessToast('Conta do YouTube conectada com sucesso!');
      }
    } catch (err: any) {
      const code = err?.code || '';
      const msg = String(err?.message || '');

      if (code === 'auth/popup-blocked' || msg.includes('POPUP_BLOCKED') || msg.includes('popup-blocked')) {
        setPopupBlocked(true);
        setErrorToast('Pop-up bloqueado pelo navegador. Habilite pop-ups para esta página ou carregue uma playlist colando o link/ID abaixo.');
      } else if (code === 'auth/popup-closed-by-user' || msg.includes('fechada antes de concluir')) {
        setErrorToast('A janela de login foi fechada antes da autorização.');
      } else {
        console.warn('[MusicWidget Connect Warning]:', err?.message || err);
        setErrorToast('Não foi possível conectar ao YouTube. Use o campo abaixo para carregar sua playlist.');
      }
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleLoadPlaylistByLink = async (playlistIdentifier?: string) => {
    const raw = (playlistIdentifier || playlistLinkInput).trim();
    if (!raw) return;

    setErrorToast(null);
    setIsLoadingPlaylistLink(true);

    try {
      // Extract playlist ID from URL or use raw ID
      let targetId = raw;
      const parsed = parseYouTubeUrl(raw);
      if (parsed?.listId) {
        targetId = parsed.listId;
      } else if (parsed?.type === 'playlist') {
        targetId = parsed.id;
      } else {
        const match = raw.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        if (match) targetId = match[1];
      }

      const token = googleAccessToken || localStorage.getItem('synapse_youtube_token');
      const res = await fetch(`/api/youtube-playlist-items?playlistId=${encodeURIComponent(targetId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
        const newQueue: MusicQueueItem[] = data.tracks.map((t: any) => ({
          id: `${t.videoId}_${Math.random().toString(36).substring(2, 6)}`,
          videoId: t.videoId,
          title: t.title,
          channel: t.channel,
          thumbnail: t.thumbnail,
        }));

        setQueue(newQueue);
        setCurrentIndex(0);
        setCurrentItem({
          type: 'video',
          id: newQueue[0].videoId,
          title: newQueue[0].title,
        });

        safeCall('loadVideoById', newQueue[0].videoId);
        setIsPlaying(true);

        setPlaylistLinkInput('');
        setSuccessToast(`Playlist carregada com ${newQueue.length} faixas!`);
        setActiveTab('player');
      } else {
        // If single video or unlisted playlist, try playing as video
        if (parsed?.type === 'video' && parsed.id) {
          const newItem: MusicQueueItem = {
            id: `${parsed.id}_custom`,
            videoId: parsed.id,
            title: 'Vídeo / Faixa do YouTube',
          };
          setQueue((prev) => [newItem, ...prev]);
          setCurrentIndex(0);
          setCurrentItem({
            type: 'video',
            id: parsed.id,
            title: 'Vídeo / Faixa do YouTube',
          });
          safeCall('loadVideoById', parsed.id);
          setIsPlaying(true);
          setPlaylistLinkInput('');
          setActiveTab('player');
        } else {
          setErrorToast(data?.error?.message || 'Nenhuma faixa encontrada nesta playlist. Verifique se ela é pública ou não-listada.');
        }
      }
    } catch (err) {
      console.warn('[MusicWidget Load Playlist Link]:', err);
      setErrorToast('Erro de conexão ao carregar a playlist.');
    } finally {
      setIsLoadingPlaylistLink(false);
    }
  };

  const handleSelectUserPlaylist = async (playlist: UserPlaylist) => {
    setLoadingPlaylistId(playlist.id);
    const token = googleAccessToken || localStorage.getItem('synapse_youtube_token');

    try {
      const res = await fetch(`/api/youtube-playlist-items?playlistId=${encodeURIComponent(playlist.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (res.ok && data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
        const newQueue: MusicQueueItem[] = data.tracks.map((t: any) => ({
          id: `${t.videoId}_${Math.random().toString(36).substring(2, 6)}`,
          videoId: t.videoId,
          title: t.title,
          channel: t.channel,
          thumbnail: t.thumbnail,
        }));

        setQueue(newQueue);
        setCurrentIndex(0);
        setCurrentItem({
          type: 'video',
          id: newQueue[0].videoId,
          title: newQueue[0].title,
        });

        safeCall('loadVideoById', newQueue[0].videoId);
        setIsPlaying(true);

        setSuccessToast(`Playlist "${playlist.title}" carregada com ${newQueue.length} faixas!`);
        setActiveTab('player');
      } else {
        setErrorToast('Nenhuma faixa reproduzível encontrada nesta playlist.');
      }
    } catch (err) {
      console.error('Erro ao carregar faixas da playlist:', err);
      setErrorToast('Falha ao carregar faixas da playlist.');
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  // Drag logic
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
      } catch (err) {}
    }
  };

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

  const handleAISearch = async (themeQuery?: string) => {
    const query = (themeQuery || aiSearchTheme).trim();
    if (!query) return;

    setErrorToast(null);
    setIsAISearching(true);

    try {
      const res = await fetch('/api/music-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: query }),
      });

      const data = await res.json();
      if (res.ok && data.results && Array.isArray(data.results) && data.results.length > 0) {
        setSearchResults(data.results);
        setActiveTab('search');
      } else {
        setErrorToast('Nenhuma faixa encontrada para este termo. Tente outro tema de estudo.');
      }
    } catch (err) {
      console.warn('[Music Search] Erro na busca:', err);
      setErrorToast('Erro de conexão ao buscar faixas.');
    } finally {
      setIsAISearching(false);
    }
  };

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

    setSuccessToast(`Tocando: "${selectedItem.titulo}"`);
    setActiveTab('player');
  };

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

  const handleRemoveFromQueue = (indexToRemove: number) => {
    if (queue.length <= 1) {
      setErrorToast('A fila deve conter pelo menos uma música.');
      return;
    }

    setQueue((prev) => prev.filter((_, idx) => idx !== indexToRemove));

    if (indexToRemove === currentIndex) {
      const nextIdx = indexToRemove < queue.length - 1 ? indexToRemove : indexToRemove - 1;
      playQueueIndex(Math.max(0, nextIdx));
    } else if (indexToRemove < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleCustomUrlSubmit = async () => {
    const url = customUrl.trim();
    if (!url) return;

    setErrorToast(null);
    const parsed = parseYouTubeUrl(url);

    if (!parsed) {
      setErrorToast('Link não reconhecido! Insira uma URL válida do YouTube.');
      return;
    }

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
        if (valData.autoSearchQuery) {
          handleAISearch(valData.autoSearchQuery);
        }
        return;
      }

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
      setSuccessToast('Faixa carregada com sucesso!');
      setActiveTab('player');
    } catch (err) {
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
      setErrorToast('Você está na última música da fila.');
    }
  };

  const handlePrevTrack = () => {
    if (currentIndex > 0) {
      playQueueIndex(currentIndex - 1);
    } else {
      setErrorToast('Você está na primeira música da fila.');
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
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        className="fixed z-[95] touch-none select-none font-sans"
      >
        {/* Floating Capsule Trigger */}
        {!isOpen && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex items-center gap-1.5 bg-slate-900/85 hover:bg-slate-800/90 text-white border border-slate-700/60 backdrop-blur-xl px-2.5 py-2 rounded-full shadow-2xl cursor-grab active:cursor-grabbing transition-all hover:scale-105"
          >
            <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => setIsOpen(true)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/30 animate-pulse'
                  : 'text-slate-200 hover:text-white'
              }`}
              title="Música & Foco de Estudo"
            >
              <Radio className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isPlaying ? 'Tocando Foco' : 'Música & Foco'}
              </span>
            </button>
          </div>
        )}

        {/* Floating Modal Window with Glassmorphism */}
        <div
          className={`w-[340px] sm:w-[400px] bg-slate-900/90 text-white border border-slate-700/60 rounded-3xl shadow-2xl backdrop-blur-2xl transition-all animate-in fade-in overflow-hidden ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          {/* Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60 cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2.5">
              <GripVertical className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Headphones className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-extrabold text-white leading-tight flex items-center gap-1.5">
                  <span>Player de Foco</span>
                  <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.2 rounded-full">
                    SYNAPSE
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
                  {currentItem.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Fechar janela (música continuará tocando)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Minimized View */}
          <div className={`p-3 flex items-center justify-between gap-2 bg-slate-950/40 ${isMinimized ? 'block' : 'hidden'}`}>
            <div className="flex items-center gap-2 truncate">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                }`}
              />
              <span className="text-xs text-slate-200 font-medium truncate max-w-[220px]">
                {currentItem.title}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleTogglePlay}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white transition-all shadow-md cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Expanded View */}
          <div className={`p-4 space-y-3 select-text cursor-default ${isMinimized ? 'hidden' : 'block'}`}>
            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-[11px] font-bold">
              <button
                onClick={() => setActiveTab('player')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'search'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </button>

              <button
                onClick={() => setActiveTab('playlists')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'playlists'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderHeart className="w-3.5 h-3.5" />
                <span>Playlists</span>
              </button>

              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
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
            {activeTab === 'player' && (
              <div className="space-y-3">
                {/* Embedded YouTube Container */}
                <div
                  ref={containerRef}
                  className="w-full h-36 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative group shadow-inner"
                >
                  <YTContainer />
                </div>

                {/* Player Controls Bar */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl space-y-3">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={handlePrevTrack}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Faixa Anterior"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleTogglePlay}
                      className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/30 scale-105 active:scale-95 cursor-pointer"
                      title={isPlaying ? 'Pausar' : 'Tocar'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      onClick={handleNextTrack}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      title="Próxima Faixa"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={handleToggleMute}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
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
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                      {isMuted ? 0 : volume}%
                    </span>
                  </div>
                </div>

                {/* Presets List */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Canais Recomendados para Foco
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                    {PRESET_PLAYLISTS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => selectPreset(preset)}
                        className={`w-full text-left p-2 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                          currentItem.id === preset.id
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-bold'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-semibold truncate">{preset.title}</p>
                          <p className="text-[10px] text-slate-500 truncate">{preset.desc}</p>
                        </div>
                        <Radio className="w-3.5 h-3.5 shrink-0 opacity-60 ml-2 text-cyan-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paste Link */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Colar Link do YouTube
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
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shrink-0 cursor-pointer shadow-md"
                    >
                      Tocar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SEARCH */}
            {activeTab === 'search' && (
              <div className="space-y-3">
                <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl space-y-2.5">
                  <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>Busca de Músicas no YouTube</span>
                  </label>

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
                        placeholder="Ex: Lo-fi estudos, Jazz café, Sons de chuva..."
                        value={aiSearchTheme}
                        onChange={(e) => setAiSearchTheme(e.target.value)}
                        disabled={isAISearching}
                        className="w-full bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      />
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    </div>

                    <button
                      type="submit"
                      disabled={isAISearching || !aiSearchTheme.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      {isAISearching ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
                    {['Lo-fi Estudos', 'Música Clássica', 'Jazz Foco', 'Chuva Suave', 'Synthwave', 'Bossa Nova'].map(
                      (chip) => (
                        <button
                          key={chip}
                          type="button"
                          disabled={isAISearching}
                          onClick={() => {
                            setAiSearchTheme(chip);
                            handleAISearch(chip);
                          }}
                          className="text-[10px] font-medium bg-slate-900 hover:bg-indigo-600/40 text-slate-300 hover:text-white border border-slate-700/60 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                        >
                          + {chip}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Results List */}
                {searchResults && searchResults.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>Resultados ({searchResults.length})</span>
                      <span className="text-[10px] text-cyan-400 font-normal">
                        Clique para reproduzir
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                      {searchResults.map((item) => (
                        <div
                          key={item.videoId}
                          className="group bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 p-2 rounded-xl transition-all flex items-center gap-2.5"
                        >
                          <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-900 shrink-0 relative group">
                            <img
                              src={item.thumbnail}
                              alt={item.titulo}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => handlePlaySearchResult(item, searchResults)}
                              className="absolute inset-0 bg-indigo-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-white" />
                            </button>
                          </div>

                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handlePlaySearchResult(item, searchResults)}
                          >
                            <h4 className="text-xs font-semibold text-slate-200 leading-snug line-clamp-1 group-hover:text-indigo-300 transition-colors">
                              {item.titulo}
                            </h4>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{item.canal}</p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handlePlaySearchResult(item, searchResults)}
                              className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                              title="Tocar agora"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span className="hidden sm:inline">Tocar</span>
                            </button>
                            <button
                              onClick={() => handleAddToQueue(item)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer"
                              title="Adicionar à fila"
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
                      <p className="text-xs font-medium">Digite um tema ou selecione um atalho acima para buscar</p>
                    </div>
                  )
                )}
              </div>
            )}

            {/* TAB 3: USER YOUTUBE PLAYLISTS (OAUTH) */}
            {activeTab === 'playlists' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FolderHeart className="w-4 h-4 text-cyan-400" />
                    <span>Playlists do YouTube</span>
                  </span>
                  {!playlistAuthError && (
                    <button
                      onClick={() => fetchUserPlaylists()}
                      disabled={loadingPlaylists}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingPlaylists ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </button>
                  )}
                </div>

                {/* Direct Playlist Link Importer (No login required) */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Carregar Playlist por Link ou ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Cole link ou ID da playlist (ex: https://...)"
                      value={playlistLinkInput}
                      onChange={(e) => setPlaylistLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLoadPlaylistByLink();
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleLoadPlaylistByLink()}
                      disabled={isLoadingPlaylistLink || !playlistLinkInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs px-3 py-2 rounded-xl transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                    >
                      {isLoadingPlaylistLink ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white" />
                      )}
                      <span>Carregar</span>
                    </button>
                  </div>
                </div>

                {/* Popup Blocked Guidance Notice */}
                {popupBlocked && (
                  <div className="bg-amber-950/40 border border-amber-800/80 text-amber-200 p-3 rounded-2xl text-[11px] space-y-1.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Pop-up bloqueado pelo navegador</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      1. Clique no ícone de pop-up bloqueado na barra de endereços do seu navegador.<br />
                      2. Selecione <strong>"Sempre permitir pop-ups deste site"</strong> e tente conectar novamente.<br />
                      3. Ou cole o link da playlist acima para tocar direto sem login!
                    </p>
                  </div>
                )}

                {/* Connect Account or List Playlists */}
                {playlistAuthError ? (
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-center space-y-3">
                    <FolderHeart className="w-8 h-8 text-indigo-400 mx-auto opacity-80" />
                    <div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        Sincronizar Minhas Playlists do YouTube
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Conecte sua conta do Google/YouTube para carregar suas listas personalizadas automaticamente.
                      </p>
                    </div>
                    <button
                      onClick={handleConnectYouTube}
                      disabled={loadingPlaylists}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loadingPlaylists ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>Conectar Conta YouTube</span>
                    </button>
                  </div>
                ) : loadingPlaylists ? (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-400" />
                    <p className="text-xs">Carregando suas playlists do YouTube...</p>
                  </div>
                ) : userPlaylists.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800 p-4">
                    <FolderHeart className="w-7 h-7 mx-auto opacity-40 text-indigo-400" />
                    <p className="text-xs font-medium">Nenhuma playlist personalizada encontrada.</p>
                    <p className="text-[10px] text-slate-500">
                      Você pode colar o link de qualquer playlist acima ou usar as playlists recomendadas.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {userPlaylists.map((pl) => (
                      <div
                        key={pl.id}
                        onClick={() => handleSelectUserPlaylist(pl)}
                        className="bg-slate-950/60 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/50 p-2.5 rounded-2xl transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {pl.thumbnail ? (
                            <img
                              src={pl.thumbnail}
                              alt={pl.title}
                              className="w-12 h-9 object-cover rounded-lg bg-slate-900 shrink-0 border border-slate-800"
                            />
                          ) : (
                            <div className="w-12 h-9 rounded-lg bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center text-indigo-400 shrink-0">
                              <ListMusic className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                              {pl.title}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              {pl.itemCount} {pl.itemCount === 1 ? 'vídeo' : 'vídeos'}
                            </p>
                          </div>
                        </div>

                        <button
                          disabled={loadingPlaylistId === pl.id}
                          className="p-2 bg-indigo-600 group-hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm"
                        >
                          {loadingPlaylistId === pl.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-white" />
                          )}
                          <span className="text-[10px] hidden sm:inline">Tocar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PLAYBACK QUEUE LIST */}
            {activeTab === 'queue' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Fila de Reprodução Atual</span>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
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
                              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-spin mx-auto" />
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
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
