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
  History,
  Heart,
  Clock,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Disc,
  Music,
  Bookmark,
  BookmarkPlus,
  BookmarkCheck,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useServiceAuthContext } from '../context/ServiceAuthContext';
import { useTheme } from './ThemeProvider';

export interface SavedStudyPlaylist {
  id: string;
  title: string;
  itemCount?: number;
  thumbnail?: string;
  custom?: boolean;
}

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
  itemCount?: number;
  isLikedList?: boolean;
  link?: string;
  deepLink?: string;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  channelTitle?: string;
  description?: string;
  thumbnail?: string;
  videoId?: string | null;
  playlistId?: string | null;
  publishedAt?: string;
  type?: string;
  link?: string;
  deepLink?: string;
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

  // Se for id direto de playlist (ex: LM, LL ou PL...)
  if (/^[A-Za-z0-9_-]{2,}$/.test(trimmed) && !trimmed.includes('http') && !trimmed.includes('/')) {
    return {
      type: 'playlist',
      id: trimmed,
      listId: trimmed,
      isMusicDomain,
      isAutoMix,
    };
  }

  return null;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const MusicWidget: React.FC = () => {
  const { googleAccessToken, authorizeYouTube, user } = useAuth();
  const { googleMusic } = useServiceAuthContext();
  const { theme } = useTheme();
  const isSwat = theme === 'swat';
  const isPink = theme === 'pink';

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

  // YouTube OAuth Playlists & Library state
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [librarySubTab, setLibrarySubTab] = useState<'playlists' | 'saved' | 'recents'>('playlists');
  const [loadingPlaylists, setLoadingPlaylists] = useState<boolean>(false);
  const [playlistAuthError, setPlaylistAuthError] = useState<boolean>(false);
  const [popupBlocked, setPopupBlocked] = useState<boolean>(false);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const [playlistLinkInput, setPlaylistLinkInput] = useState<string>('');
  const [isLoadingPlaylistLink, setIsLoadingPlaylistLink] = useState<boolean>(false);
  const [directEmbedPlaylistId, setDirectEmbedPlaylistId] = useState<string | null>(null);
  const [isDirectEmbedMode, setIsDirectEmbedMode] = useState<boolean>(false);

  // Persistent Saved Study Playlists
  const [savedPlaylists, setSavedPlaylists] = useState<SavedStudyPlaylist[]>(() => {
    try {
      const stored = localStorage.getItem('synapse_saved_study_playlists');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      {
        id: 'PLofht4PTcKYnaH8w5gkDC26ASmawF2PC7',
        title: 'Lofi Study Beats & Foco',
        thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&q=80',
        itemCount: 50,
        custom: false,
      },
      {
        id: 'PL3-sRm8xAzY9xXQ4Q6R77wR91zJjL-VbX',
        title: 'Piano & Cordas para Concentração Profunda',
        thumbnail: 'https://images.unsplash.com/photo-1520523839898-507127054992?w=300&q=80',
        itemCount: 40,
        custom: false,
      },
      {
        id: 'PLFPg_IUxqnZNt1e1Abl6vVq_jMh6L9t2e',
        title: 'Synthwave / Retrowave Study Space',
        thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&q=80',
        itemCount: 35,
        custom: false,
      },
      {
        id: 'PL4QNnZMr8qwW7GZlR8q7QZ_2vWj_B6Y_X',
        title: 'Ondas Alfa & Ruído Marrom para Foco Extremo',
        thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
        itemCount: 25,
        custom: false,
      },
    ];
  });

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

  // Position state for dragging (default placed safely clear of sidebar)
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 304,
    y: 72,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 304,
    posY: 72,
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

  // Timeline / Seek state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [seekValue, setSeekValue] = useState<number>(0);

  // Playlist track list UI state
  const [isPlaylistTracksExpanded, setIsPlaylistTracksExpanded] = useState<boolean>(true);
  const [trackSearchFilter, setTrackSearchFilter] = useState<string>('');

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (newSec: number) => {
    setCurrentTime(newSec);
    safeCall('seekTo', newSec, true);
  };

  // Poll current time and duration when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (isSeeking) return;
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const cur = playerRef.current.getCurrentTime() || 0;
          const dur = playerRef.current.getDuration() || 0;
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
        } catch (e) {}
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, isSeeking]);

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

  // Unified Music Token & Connection status
  const effectiveToken =
    googleMusic.accessToken ||
    googleAccessToken ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('synapse_youtube_token') || localStorage.getItem('synapse_google_music_token')
      : null);

  const hasValidAuth = Boolean(effectiveToken && !playlistAuthError);
  const isConnected = Boolean((googleMusic.isAuthenticated || hasValidAuth) && !playlistAuthError);
  const connectedUserEmail =
    googleMusic.userEmail ||
    user?.email ||
    (typeof window !== 'undefined' ? localStorage.getItem('synapse_google_music_email') : null);

  // Fetch YouTube Library (Playlists + Recent activities) automatically
  const fetchUserPlaylists = async (overrideToken?: string) => {
    const token =
      overrideToken ||
      effectiveToken ||
      googleMusic.accessToken ||
      googleAccessToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('synapse_youtube_token') || localStorage.getItem('synapse_google_music_token')
        : null);

    if (!token) {
      setPlaylistAuthError(true);
      return;
    }

    setLoadingPlaylists(true);
    setPlaylistAuthError(false);

    try {
      const res = await fetch('/api/youtube-library', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (Array.isArray(data.playlists)) {
          setUserPlaylists(data.playlists);
        }
        if (Array.isArray(data.recentActivities)) {
          setRecentActivities(data.recentActivities);
        }
        setPlaylistAuthError(false);
      } else {
        if (res.status === 401 || data?.error?.code === 'AUTH_EXPIRED') {
          setPlaylistAuthError(true);
          try {
            localStorage.removeItem('synapse_youtube_token');
            localStorage.removeItem('synapse_google_music_token');
          } catch (e) {}
        } else {
          setErrorToast(data?.error?.message || 'Erro ao carregar dados do YouTube Music.');
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar biblioteca do YouTube:', err);
      setPlaylistAuthError(true);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Auto-fetch when playlists tab is opened and user is connected
  useEffect(() => {
    if (activeTab === 'playlists' && effectiveToken && !playlistAuthError) {
      fetchUserPlaylists(effectiveToken);
    }
  }, [activeTab, effectiveToken, playlistAuthError]);

  // Auto-fetch when user logs in via googleMusic
  useEffect(() => {
    if (googleMusic.isAuthenticated && googleMusic.accessToken) {
      fetchUserPlaylists(googleMusic.accessToken);
    }
  }, [googleMusic.isAuthenticated, googleMusic.accessToken]);

  // Unified Connect Action
  const handleConnectYouTube = async () => {
    setErrorToast(null);
    setPopupBlocked(false);
    setLoadingPlaylists(true);

    try {
      // 1. Tenta autenticação direta pelo hook de Google Music com escopo do YouTube
      const token = await googleMusic.loginGoogleMusic();
      if (token) {
        setPlaylistAuthError(false);
        setSuccessToast('YouTube Music conectado com sucesso!');
        await fetchUserPlaylists(token);
        return;
      }

      // 2. Fallback via authorizeYouTube
      const authContextToken = await authorizeYouTube();
      if (authContextToken) {
        setPlaylistAuthError(false);
        setSuccessToast('YouTube Music conectado com sucesso!');
        await fetchUserPlaylists(authContextToken);
        return;
      }
    } catch (err: any) {
      const code = err?.code || '';
      const msg = String(err?.message || '');

      if (code === 'auth/popup-blocked' || msg.includes('POPUP_BLOCKED') || msg.includes('popup-blocked')) {
        setPopupBlocked(true);
        setErrorToast('Pop-up bloqueado pelo navegador. Habilite pop-ups para esta página ou cole o link da playlist.');
      } else if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        msg.includes('fechada') ||
        msg.includes('popup-closed-by-user')
      ) {
        setErrorToast(null);
      } else {
        console.warn('[MusicWidget Connect Warning]:', err?.message || err);
        setErrorToast('Não foi possível conectar ao YouTube Music. Tente novamente.');
      }
    } finally {
      setLoadingPlaylists(false);
    }
  };

  // Unified Disconnect Action
  const handleDisconnectYouTube = () => {
    googleMusic.logoutGoogleMusic();
    try {
      localStorage.removeItem('synapse_youtube_token');
      localStorage.removeItem('synapse_google_music_token');
      localStorage.removeItem('synapse_google_music_email');
    } catch (e) {}
    setUserPlaylists([]);
    setRecentActivities([]);
    setPlaylistAuthError(true);
    setSuccessToast('Conta do YouTube desconectada.');
  };

  // Saved study playlists persistence handlers
  const handleSavePlaylist = (pl: { id: string; title: string; thumbnail?: string; itemCount?: number }) => {
    setSavedPlaylists((prev) => {
      if (prev.some((p) => p.id === pl.id)) {
        setSuccessToast(`"${pl.title}" já está nas suas Playlists Salvas!`);
        return prev;
      }
      const updated = [{ ...pl, custom: true }, ...prev];
      try {
        localStorage.setItem('synapse_saved_study_playlists', JSON.stringify(updated));
      } catch (e) {}
      setSuccessToast(`Playlist "${pl.title}" salva nos favoritos!`);
      return updated;
    });
  };

  const handleRemoveSavedPlaylist = (id: string, title: string) => {
    setSavedPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('synapse_saved_study_playlists', JSON.stringify(updated));
      } catch (e) {}
      setSuccessToast(`Playlist "${title}" removida.`);
      return updated;
    });
  };

  const handleSaveCurrentInputPlaylist = () => {
    const raw = playlistLinkInput.trim();
    if (!raw) {
      setErrorToast('Insira uma URL ou ID da playlist para salvar.');
      return;
    }
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
    handleSavePlaylist({
      id: targetId,
      title: `Playlist de Estudo (${targetId.slice(0, 8)}...)`,
      itemCount: 0,
    });
    setPlaylistLinkInput('');
  };

  const handlePlaySavedPlaylist = (pl: SavedStudyPlaylist) => {
    handleLoadPlaylistByLink(pl.id, true);
  };

  const handleLoadPlaylistByLink = async (playlistIdentifier?: string, forceDirectEmbed: boolean = false) => {
    const raw = (playlistIdentifier || playlistLinkInput).trim();
    if (!raw) return;

    if (raw.includes('music.youtube.com/library') && !raw.includes('list=')) {
      setSuccessToast('Sincronizando com sua Biblioteca do YouTube Music...');
      await fetchUserPlaylists();
      setPlaylistLinkInput('');
      return;
    }

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

      // Handle Liked Music (LM)
      if (targetId === 'LM') {
        setDirectEmbedPlaylistId('LM');
        setIsDirectEmbedMode(true);
        setCurrentItem({
          type: 'playlist',
          id: 'LM',
          title: 'Músicas que gostei (YouTube Music)',
          listId: 'LM',
        });
        safeCall('loadPlaylist', { list: 'LM', listType: 'playlist', index: 0 });
        setIsPlaying(true);
        setSuccessToast('Iniciando Músicas Curtidas do YouTube Music!');
        setPlaylistLinkInput('');
        setActiveTab('player');
        return;
      }

      // If user requested direct embed mode or single video
      if (forceDirectEmbed) {
        setDirectEmbedPlaylistId(targetId);
        setIsDirectEmbedMode(true);
        setCurrentItem({
          type: 'playlist',
          id: targetId,
          title: 'Playlist de Estudo',
          listId: targetId,
        });
        safeCall('loadPlaylist', { list: targetId, listType: 'playlist', index: 0 });
        setIsPlaying(true);
        setSuccessToast('Iniciando reprodução no Player Direto!');
        setPlaylistLinkInput('');
        setActiveTab('player');
        return;
      }

      // Call secure server proxy with fallback
      const token =
        effectiveToken ||
        googleAccessToken ||
        googleMusic.accessToken ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('synapse_youtube_token') || localStorage.getItem('synapse_google_music_token')
          : null);

      let rawItems: any[] = [];
      try {
        const itemRes = await fetch(`/api/youtube-playlist-items?playlistId=${encodeURIComponent(targetId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const itemData = await itemRes.json();
        if (itemData.success && Array.isArray(itemData.tracks) && itemData.tracks.length > 0) {
          rawItems = itemData.tracks;
        }
      } catch (e) {}

      if (rawItems.length === 0) {
        try {
          const res = await fetch(`/api/youtube-proxy?playlistId=${encodeURIComponent(targetId)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json();
          rawItems = data.items || data.tracks || [];
        } catch (e) {}
      }

      if (rawItems.length > 0) {
        const newQueue: MusicQueueItem[] = rawItems.map((t: any) => ({
          id: `${t.snippet?.resourceId?.videoId || t.videoId || t.id}_${Math.random().toString(36).substring(2, 6)}`,
          videoId: t.snippet?.resourceId?.videoId || t.videoId || t.id,
          title: t.snippet?.title || t.title || 'Faixa da Playlist',
          channel: t.snippet?.channelTitle || t.channel || 'YouTube Music',
          thumbnail: t.snippet?.thumbnails?.medium?.url || t.snippet?.thumbnails?.default?.url || t.thumbnail,
        }));

        setQueue(newQueue);
        setCurrentIndex(0);
        setCurrentItem({
          type: 'video',
          id: newQueue[0].videoId,
          title: newQueue[0].title,
        });

        setIsDirectEmbedMode(false);
        setDirectEmbedPlaylistId(targetId);
        safeCall('loadVideoById', newQueue[0].videoId);
        setIsPlaying(true);

        setPlaylistLinkInput('');
        setSuccessToast(`Playlist sincronizada com ${newQueue.length} faixas!`);
        setActiveTab('player');
      } else {
        // Direct embed fallback sem sugestões falsas
        setDirectEmbedPlaylistId(targetId);
        setIsDirectEmbedMode(true);
        setCurrentItem({
          type: 'playlist',
          id: targetId,
          title: 'Playlist do YouTube Music',
          listId: targetId,
        });
        safeCall('loadPlaylist', { list: targetId, listType: 'playlist', index: 0 });
        setIsPlaying(true);
        setSuccessToast('Iniciando reprodução no Player Direto!');
        setPlaylistLinkInput('');
        setActiveTab('player');
      }
    } catch (err) {
      console.warn('[MusicWidget Load Playlist Link]:', err);
      let targetId = raw;
      const match = raw.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (match) targetId = match[1];
      setDirectEmbedPlaylistId(targetId);
      setIsDirectEmbedMode(true);
      setCurrentItem({
        type: 'playlist',
        id: targetId,
        title: 'Playlist do YouTube Music',
        listId: targetId,
      });
      safeCall('loadPlaylist', { list: targetId, listType: 'playlist', index: 0 });
      setIsPlaying(true);
      setSuccessToast('Carregando no Player do YouTube.');
      setActiveTab('player');
    } finally {
      setIsLoadingPlaylistLink(false);
    }
  };

  const handleSelectUserPlaylist = async (playlist: UserPlaylist) => {
    setLoadingPlaylistId(playlist.id);
    const token =
      effectiveToken ||
      googleAccessToken ||
      googleMusic.accessToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('synapse_youtube_token') || localStorage.getItem('synapse_google_music_token')
        : null);

    // Suporte especial a Músicas Curtidas (LM)
    if (playlist.id === 'LM' || playlist.isLikedList) {
      setDirectEmbedPlaylistId('LM');
      setIsDirectEmbedMode(true);
      setCurrentItem({
        type: 'playlist',
        id: 'LM',
        title: 'Músicas que gostei (YouTube Music)',
        listId: 'LM',
      });
      safeCall('loadPlaylist', { list: 'LM', listType: 'playlist', index: 0 });
      setIsPlaying(true);
      setSuccessToast('Reproduzindo Músicas Curtidas do YouTube Music!');
      setActiveTab('player');
      setLoadingPlaylistId(null);
      return;
    }

    try {
      let rawItems: any[] = [];
      try {
        const itemRes = await fetch(`/api/youtube-playlist-items?playlistId=${encodeURIComponent(playlist.id)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const itemData = await itemRes.json();
        if (itemData.success && Array.isArray(itemData.tracks) && itemData.tracks.length > 0) {
          rawItems = itemData.tracks;
        }
      } catch (e) {}

      if (rawItems.length === 0) {
        try {
          const res = await fetch(`/api/youtube-proxy?playlistId=${encodeURIComponent(playlist.id)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const data = await res.json();
          rawItems = data.items || data.tracks || [];
        } catch (e) {}
      }

      if (rawItems.length > 0) {
        const newQueue: MusicQueueItem[] = rawItems.map((t: any) => ({
          id: `${t.snippet?.resourceId?.videoId || t.videoId || t.id}_${Math.random().toString(36).substring(2, 6)}`,
          videoId: t.snippet?.resourceId?.videoId || t.videoId || t.id,
          title: t.snippet?.title || t.title || 'Faixa da Playlist',
          channel: t.snippet?.channelTitle || t.channel || 'YouTube Music',
          thumbnail: t.snippet?.thumbnails?.medium?.url || t.snippet?.thumbnails?.default?.url || t.thumbnail,
        }));

        setQueue(newQueue);
        setCurrentIndex(0);
        setCurrentItem({
          type: 'video',
          id: newQueue[0].videoId,
          title: newQueue[0].title,
        });

        setIsDirectEmbedMode(false);
        setDirectEmbedPlaylistId(playlist.id);
        safeCall('loadVideoById', newQueue[0].videoId);
        setIsPlaying(true);

        setSuccessToast(`Playlist "${playlist.title}" carregada com ${newQueue.length} faixas!`);
        setActiveTab('player');
      } else {
        // Direct embed fallback sem sugestões falsas
        setDirectEmbedPlaylistId(playlist.id);
        setIsDirectEmbedMode(true);
        setCurrentItem({
          type: 'playlist',
          id: playlist.id,
          title: playlist.title,
          listId: playlist.id,
        });
        safeCall('loadPlaylist', { list: playlist.id, listType: 'playlist', index: 0 });
        setIsPlaying(true);
        setSuccessToast(`Reproduzindo "${playlist.title}" via Player Direto!`);
        setActiveTab('player');
      }
    } catch (err) {
      console.error('Erro ao carregar faixas da playlist:', err);
      setDirectEmbedPlaylistId(playlist.id);
      setIsDirectEmbedMode(true);
      setCurrentItem({
        type: 'playlist',
        id: playlist.id,
        title: playlist.title,
        listId: playlist.id,
      });
      setIsPlaying(true);
      setSuccessToast(`Reproduzindo "${playlist.title}" no Player Direto.`);
      setActiveTab('player');
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
    } else if (queue.length > 0) {
      playQueueIndex(0);
      setSuccessToast('Reiniciando fila desde o início');
    } else {
      safeCall('nextVideo');
    }
  };

  const handlePrevTrack = () => {
    if (currentIndex > 0) {
      playQueueIndex(currentIndex - 1);
    } else if (queue.length > 0) {
      playQueueIndex(queue.length - 1);
    } else {
      safeCall('previousVideo');
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

  const handleSelectRecentActivity = (activity: RecentActivityItem) => {
    setErrorToast(null);
    if (activity.videoId) {
      setIsDirectEmbedMode(false);
      setCurrentItem({
        type: 'video',
        id: activity.videoId,
        title: activity.title,
      });
      setQueue([
        {
          id: `${activity.videoId}_recent`,
          videoId: activity.videoId,
          title: activity.title,
          channel: activity.channelTitle || 'YouTube Music',
          thumbnail: activity.thumbnail,
        },
      ]);
      safeCall('loadVideoById', activity.videoId);
      setIsPlaying(true);
      setSuccessToast(`Reproduzindo faixa recente: ${activity.title}`);
      setActiveTab('player');
    } else if (activity.playlistId) {
      handleLoadPlaylistByLink(activity.playlistId, true);
    }
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
            className={`flex items-center gap-1.5 backdrop-blur-xl px-2.5 py-2 rounded-full shadow-2xl cursor-grab active:cursor-grabbing transition-all hover:scale-105 border ${
              isSwat
                ? 'bg-[#070b12]/95 border-cyan-500/40 text-cyan-200 shadow-cyan-500/20'
                : isPink
                ? 'bg-[#120718]/95 border-rose-500/40 text-rose-200 shadow-rose-500/20'
                : 'bg-slate-900/85 hover:bg-slate-800/90 text-white border-slate-700/60'
            }`}
          >
            <GripVertical className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <button
              onClick={() => setIsOpen(true)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full font-bold text-xs transition-all cursor-pointer ${
                isPlaying
                  ? isSwat
                    ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30 font-extrabold'
                    : isPink
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-extrabold'
                    : 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/30 animate-pulse'
                  : isSwat
                  ? 'text-cyan-200 hover:text-cyan-100'
                  : isPink
                  ? 'text-rose-200 hover:text-rose-100'
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
          className={`w-[340px] sm:w-[400px] rounded-3xl shadow-2xl backdrop-blur-2xl transition-all animate-in fade-in overflow-hidden border ${
            isOpen ? 'block' : 'hidden'
          } ${
            isSwat
              ? 'bg-[#070b12]/95 text-slate-200 border-cyan-500/30'
              : isPink
              ? 'bg-[#120718]/95 text-rose-100 border-rose-500/30'
              : 'bg-slate-900/90 text-white border-slate-700/60'
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
                {/* Mode Indicator & Switcher */}
                {directEmbedPlaylistId && (
                  <div className="flex items-center justify-between px-2 py-1 bg-slate-950/70 border border-slate-800 rounded-xl text-[11px]">
                    <span className="text-cyan-400 font-bold flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse" />
                      {isDirectEmbedMode ? 'Modo Player Direto (YouTube Oficial)' : 'Modo Fila Personalizada'}
                    </span>
                    <button
                      onClick={() => setIsDirectEmbedMode(!isDirectEmbedMode)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline text-[10px]"
                    >
                      {isDirectEmbedMode ? 'Ver Fila' : 'Ver Player Direto'}
                    </button>
                  </div>
                )}

                {/* Embedded YouTube Container */}
                <div
                  ref={containerRef}
                  className="w-full h-36 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative group shadow-inner"
                >
                  <YTContainer />
                </div>

                {/* Currently Playing Card with Animated Equalizer */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-2xl">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center shrink-0">
                      {isPlaying ? (
                        <div className="flex items-end gap-0.5 h-4">
                          <span className="w-1 bg-indigo-400 animate-[bounce_0.8s_infinite] h-2 rounded-full" />
                          <span className="w-1 bg-cyan-400 animate-[bounce_1.1s_infinite] h-4 rounded-full" />
                          <span className="w-1 bg-emerald-400 animate-[bounce_0.7s_infinite] h-3 rounded-full" />
                        </div>
                      ) : (
                        <Music className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-white truncate">
                        {queue[currentIndex]?.title || currentItem.title || 'Áudio Educacional'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {queue[currentIndex]?.channel || 'YouTube Music'}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 shrink-0 font-semibold px-2 py-0.5 bg-cyan-950/40 border border-cyan-800/40 rounded-lg">
                    {isPlaying ? 'Tocando' : 'Pausado'}
                  </div>
                </div>

                {/* Timeline / Progress Seek Bar */}
                <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                    <span className="text-indigo-400 font-semibold">{formatTime(isSeeking ? seekValue : currentTime)}</span>
                    <span className="text-slate-500">{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration > 0 ? duration : 100}
                    value={isSeeking ? seekValue : (currentTime || 0)}
                    onMouseDown={() => {
                      setIsSeeking(true);
                      setSeekValue(currentTime);
                    }}
                    onTouchStart={() => {
                      setIsSeeking(true);
                      setSeekValue(currentTime);
                    }}
                    onChange={(e) => {
                      setSeekValue(Number(e.target.value));
                    }}
                    onMouseUp={(e) => {
                      setIsSeeking(false);
                      handleSeek(Number((e.target as HTMLInputElement).value));
                    }}
                    onTouchEnd={(e) => {
                      setIsSeeking(false);
                      handleSeek(Number((e.target as HTMLInputElement).value));
                    }}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer transition-all"
                  />
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

                {/* Listing the Tracks of the Playlist (Faixas da Playlist) */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setIsPlaylistTracksExpanded(!isPlaylistTracksExpanded)}
                      className="flex items-center gap-2 text-xs font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      <ListMusic className="w-4 h-4 text-indigo-400" />
                      <span>Faixas da Playlist ({queue.length})</span>
                      {isPlaylistTracksExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {queue.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        Faixa {currentIndex + 1} de {queue.length}
                      </span>
                    )}
                  </div>

                  {isPlaylistTracksExpanded && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      {queue.length > 3 && (
                        <div className="relative">
                          <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Filtrar faixas da playlist..."
                            value={trackSearchFilter}
                            onChange={(e) => setTrackSearchFilter(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {/* Scrollable Tracks List */}
                      <div className="max-h-52 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {queue
                          .filter((t) =>
                            !trackSearchFilter.trim() ||
                            t.title.toLowerCase().includes(trackSearchFilter.toLowerCase()) ||
                            t.channel.toLowerCase().includes(trackSearchFilter.toLowerCase())
                          )
                          .map((track, idx) => {
                            const isCurrent = currentIndex === idx;
                            return (
                              <div
                                key={track.id || `${track.videoId}_${idx}`}
                                onClick={() => playQueueIndex(idx)}
                                className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-xs group ${
                                  isCurrent
                                    ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm'
                                    : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <span
                                    className={`text-[10px] font-mono w-4 text-center shrink-0 ${
                                      isCurrent ? 'text-indigo-400 font-bold' : 'text-slate-500'
                                    }`}
                                  >
                                    {idx + 1}
                                  </span>
                                  {track.thumbnail ? (
                                    <img
                                      src={track.thumbnail}
                                      alt=""
                                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-800"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                      <Music className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                  )}
                                  <div className="overflow-hidden">
                                    <p
                                      className={`truncate font-medium text-[11px] ${
                                        isCurrent ? 'text-indigo-200 font-bold' : 'group-hover:text-white'
                                      }`}
                                    >
                                      {track.title}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate">{track.channel}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                  {isCurrent && isPlaying ? (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                      Tocando
                                    </span>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        playQueueIndex(idx);
                                      }}
                                      className="p-1 rounded-lg text-slate-400 group-hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                                      title="Tocar esta faixa"
                                    >
                                      <Play className="w-3.5 h-3.5" />
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

                {/* User Library Playlists in Player Tab */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {userPlaylists.length > 0 ? `Sua Biblioteca (${userPlaylists.length})` : 'Playlists da sua Biblioteca'}
                    </label>
                    {isConnected && (
                      <button
                        onClick={() => fetchUserPlaylists()}
                        disabled={loadingPlaylists}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        title="Atualizar Biblioteca"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${loadingPlaylists ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                      </button>
                    )}
                  </div>

                  {isConnected && userPlaylists.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                      {userPlaylists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => handleSelectUserPlaylist(pl)}
                          className={`w-full text-left p-2 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                            currentItem.id === pl.id || directEmbedPlaylistId === pl.id
                              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 font-bold'
                              : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0">
                            {pl.isLikedList || pl.id === 'LM' ? (
                              <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                                <Heart className="w-3.5 h-3.5 fill-rose-500" />
                              </div>
                            ) : pl.thumbnail ? (
                              <img src={pl.thumbnail} alt={pl.title} className="w-6 h-6 rounded-lg object-cover shrink-0 border border-slate-800" />
                            ) : (
                              <div className="w-6 h-6 rounded-lg bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center text-indigo-400 shrink-0">
                                <ListMusic className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div className="truncate min-w-0">
                              <p className="font-semibold truncate text-[11px]">{pl.title}</p>
                              <p className="text-[9px] text-slate-500 truncate">
                                {pl.id === 'LM' ? 'Músicas Curtidas' : `${pl.itemCount || 0} vídeos`}
                              </p>
                            </div>
                          </div>
                          <Play className="w-3.5 h-3.5 shrink-0 opacity-70 ml-2 text-indigo-400 fill-indigo-400" />
                        </button>
                      ))}
                    </div>
                  ) : isConnected ? (
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-center space-y-1">
                      <p className="text-[11px] text-slate-400">Nenhuma playlist encontrada na sua biblioteca do YouTube Music.</p>
                      <button
                        onClick={() => setActiveTab('playlists')}
                        className="text-[10px] text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Acessar aba de Playlists & Recentes
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-center space-y-1.5">
                      <p className="text-[11px] text-slate-400">Conecte sua conta para carregar suas músicas curtidas e playlists reais.</p>
                      <button
                        onClick={() => setActiveTab('playlists')}
                        className="px-3 py-1 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1"
                      >
                        <LogIn className="w-3 h-3" />
                        <span>Conectar YouTube Music</span>
                      </button>
                    </div>
                  )}
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

            {/* TAB 3: USER YOUTUBE PLAYLISTS */}
            {activeTab === 'playlists' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FolderHeart className="w-4 h-4 text-cyan-400" />
                    <span>Playlists & YouTube Music</span>
                  </span>
                  {isConnected && (
                    <button
                      onClick={() => fetchUserPlaylists()}
                      disabled={loadingPlaylists}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Sincronizar playlists do seu canal"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingPlaylists ? 'animate-spin' : ''}`} />
                      <span>Atualizar</span>
                    </button>
                  )}
                </div>

                {/* Account Status / Auth Guidance Banner */}
                {isConnected ? (
                  <div className="bg-indigo-950/40 border border-indigo-500/40 p-3 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                        {connectedUserEmail ? connectedUserEmail[0].toUpperCase() : 'Y'}
                      </div>
                      <div className="truncate text-xs">
                        <p className="font-semibold text-slate-200 truncate">{connectedUserEmail || 'Conta Conectada'}</p>
                        <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          YouTube Music Conectado
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => fetchUserPlaylists()}
                        disabled={loadingPlaylists}
                        className="text-[10px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        title="Buscar playlists do seu canal"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingPlaylists ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Sincronizar</span>
                      </button>
                      <button
                        onClick={handleDisconnectYouTube}
                        className="text-[10px] bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 text-red-300 hover:text-red-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Desconectar do YouTube"
                      >
                        Sair
                      </button>
                    </div>
                  </div>
                ) : user?.email ? (
                  /* User logged in to app with Google, but needs YouTube scope confirmation */
                  <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/50 border border-indigo-500/40 p-3 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-bold text-white">Sincronizar Playlists do YouTube</span>
                      </div>
                      <span className="text-[10px] text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                        {user.email}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Conectado como <strong className="text-white">{user.email}</strong>. Autorize a leitura da sua biblioteca para puxar suas playlists existentes e curtidas.
                    </p>
                    <button
                      onClick={handleConnectYouTube}
                      disabled={loadingPlaylists}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loadingPlaylists ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <FolderHeart className="w-4 h-4" />
                      )}
                      <span>Puxar Minhas Playlists do YouTube</span>
                    </button>
                  </div>
                ) : (
                  /* Clean login card for unauthenticated users */
                  <div className="bg-slate-950/80 border border-slate-800/90 p-4 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <FolderHeart className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white mb-1">
                        Sincronizar Playlists do YouTube Music
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                        Conecte sua conta do Google para puxar automaticamente suas playlists existentes para o seu momento de foco.
                      </p>
                    </div>
                    <button
                      onClick={handleConnectYouTube}
                      disabled={loadingPlaylists}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loadingPlaylists ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      <span>Conectar Conta YouTube / Google</span>
                    </button>
                  </div>
                )}

                {/* Playlist Auth Alert if expired/needs grant */}
                {playlistAuthError && (
                  <div className="bg-amber-950/40 border border-amber-800/80 text-amber-200 p-2.5 rounded-2xl text-[11px] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">Sessão do YouTube precisa de confirmação.</span>
                    </div>
                    <button
                      onClick={handleConnectYouTube}
                      className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-[10px] shrink-0"
                    >
                      Reconectar
                    </button>
                  </div>
                )}

                {/* Direct Playlist Link Importer & Quick Saver */}
                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Carregar Playlist por Link ou ID
                    </label>
                    <span className="text-[10px] text-slate-500">Qualquer link do YouTube</span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Cole link ou ID (ex: https://music.youtube.com/playlist?list=...)"
                      value={playlistLinkInput}
                      onChange={(e) => setPlaylistLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLoadPlaylistByLink(undefined, true);
                      }}
                      className="w-full bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleLoadPlaylistByLink(undefined, true)}
                        disabled={isLoadingPlaylistLink || !playlistLinkInput.trim()}
                        className="flex-1 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                        title="Toca a playlist direto sem depender de permissões"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Tocar Direto</span>
                      </button>
                      <button
                        onClick={() => handleLoadPlaylistByLink(undefined, false)}
                        disabled={isLoadingPlaylistLink || !playlistLinkInput.trim()}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                        title="Carrega as faixas individualmente na fila"
                      >
                        {isLoadingPlaylistLink ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ListMusic className="w-3.5 h-3.5" />
                        )}
                        <span>Carregar Faixas</span>
                      </button>
                      <button
                        onClick={handleSaveCurrentInputPlaylist}
                        disabled={!playlistLinkInput.trim()}
                        className="px-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-semibold text-xs py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                        title="Salvar esta playlist nos favoritos"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Salvar</span>
                      </button>
                    </div>
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

                {/* Playlists, Salvas de Estudo & Atividades Recentes Subtabs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-1 border-b border-slate-800/80 pb-2 overflow-x-auto">
                    <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shrink-0">
                      <button
                        onClick={() => setLibrarySubTab('playlists')}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                          librarySubTab === 'playlists'
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <FolderHeart className="w-3.5 h-3.5" />
                        <span>YouTube ({userPlaylists.length})</span>
                      </button>
                      <button
                        onClick={() => setLibrarySubTab('saved')}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                          librarySubTab === 'saved'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Salvas ({savedPlaylists.length})</span>
                      </button>
                      <button
                        onClick={() => setLibrarySubTab('recents')}
                        className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                          librarySubTab === 'recents'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Recentes ({recentActivities.length})</span>
                      </button>
                    </div>

                    <a
                      href="https://music.youtube.com/library"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 shrink-0 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-cyan-500/40"
                      title="Abrir Biblioteca Completa no YouTube Music"
                    >
                      <span className="hidden sm:inline">music.youtube.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* 1. Playlists Subtab (YouTube Library) */}
                  {librarySubTab === 'playlists' && (
                    loadingPlaylists ? (
                      <div className="text-center py-8 text-slate-400 space-y-2">
                        <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-400" />
                        <p className="text-xs">Sincronizando com sua Biblioteca do YouTube Music...</p>
                      </div>
                    ) : !isConnected ? (
                      <div className="text-center py-6 text-slate-400 space-y-2.5 bg-slate-950/40 rounded-2xl border border-slate-800 p-4">
                        <FolderHeart className="w-8 h-8 mx-auto opacity-40 text-indigo-400" />
                        <p className="text-xs font-semibold text-slate-200">Biblioteca do YouTube não conectada</p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                          Conecte sua conta ou toque diretamente as playlists de foco na aba <strong>Salvas</strong>.
                        </p>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={handleConnectYouTube}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            Conectar Agora
                          </button>
                          <button
                            onClick={() => setLibrarySubTab('saved')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            Ver Salvas de Estudo
                          </button>
                        </div>
                      </div>
                    ) : userPlaylists.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800 p-4">
                        <FolderHeart className="w-8 h-8 mx-auto opacity-40 text-indigo-400" />
                        <div>
                          <p className="text-xs font-semibold text-slate-200">Nenhuma playlist personalizada encontrada</p>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed mt-1">
                            Você pode tocar suas músicas curtidas agora ou ouvir playlists de estudo prontas:
                          </p>
                        </div>

                        {/* Quick 1-click Liked Music Player */}
                        <button
                          onClick={() => handleSelectUserPlaylist({ id: 'LM', title: 'Músicas que gostei', isLikedList: true })}
                          className="w-full bg-slate-900/90 hover:bg-rose-950/30 border border-slate-700/80 hover:border-rose-500/50 p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                              <Heart className="w-4 h-4 fill-rose-500" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-white">Músicas que gostei (LM)</p>
                              <p className="text-[10px] text-slate-400">Tocar todas as suas faixas curtidas no YouTube Music</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold">
                            Tocar
                          </span>
                        </button>

                        <button
                          onClick={() => setLibrarySubTab('saved')}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                        >
                          <span>Ouvir Playlists Salvas para Estudo ({savedPlaylists.length})</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span>Playlists da sua Biblioteca ({userPlaylists.length})</span>
                          <span className="text-[10px] text-slate-500 font-mono">list=ID</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {userPlaylists.map((pl) => (
                            <div
                              key={pl.id}
                              className="bg-slate-950/60 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/50 p-2.5 rounded-2xl transition-all flex items-center justify-between gap-3 group"
                            >
                              <div
                                onClick={() => handleSelectUserPlaylist(pl)}
                                className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                              >
                                {pl.isLikedList || pl.id === 'LM' ? (
                                  <div className="w-12 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-sm">
                                    <Heart className="w-5 h-5 fill-rose-500" />
                                  </div>
                                ) : pl.thumbnail ? (
                                  <img
                                    src={pl.thumbnail}
                                    alt={pl.title}
                                    className="w-12 h-10 object-cover rounded-xl bg-slate-900 shrink-0 border border-slate-800"
                                  />
                                ) : (
                                  <div className="w-12 h-10 rounded-xl bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center text-indigo-400 shrink-0">
                                    <ListMusic className="w-4 h-4" />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                                      {pl.title}
                                    </h4>
                                    {pl.id === 'LM' && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-700/40 text-rose-300 font-medium shrink-0">
                                        Curtidas
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span>{pl.id === 'LM' ? 'Músicas Curtidas' : `${pl.itemCount || 0} vídeos`}</span>
                                    <span className="text-slate-600">•</span>
                                    <span className="font-mono text-slate-500 text-[9px]">list={pl.id}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleSavePlaylist(pl)}
                                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded-xl transition-all border border-slate-800 cursor-pointer"
                                  title="Salvar nas Playlists de Estudo"
                                >
                                  <BookmarkPlus className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={pl.link || `https://music.youtube.com/playlist?list=${pl.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-xl transition-all border border-slate-800"
                                  title="Abrir no YouTube Music (music.youtube.com)"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => handleSelectUserPlaylist(pl)}
                                  disabled={loadingPlaylistId === pl.id}
                                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Tocar Playlist"
                                >
                                  {loadingPlaylistId === pl.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Play className="w-3.5 h-3.5 fill-white" />
                                  )}
                                  <span className="text-[10px] hidden sm:inline">Tocar</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* 2. Saved Playlists Subtab (Study & Personal Favorites) */}
                  {librarySubTab === 'saved' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                        <span>Playlists Salvas para Estudo ({savedPlaylists.length})</span>
                        <span className="text-[10px] text-emerald-400 font-medium">Prontas para tocar</span>
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {savedPlaylists.map((pl) => (
                          <div
                            key={pl.id}
                            className="bg-slate-950/60 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/50 p-2.5 rounded-2xl transition-all flex items-center justify-between gap-3 group"
                          >
                            <div
                              onClick={() => handlePlaySavedPlaylist(pl)}
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                            >
                              {pl.thumbnail ? (
                                <img
                                  src={pl.thumbnail}
                                  alt={pl.title}
                                  className="w-12 h-10 object-cover rounded-xl bg-slate-900 shrink-0 border border-slate-800"
                                />
                              ) : (
                                <div className="w-12 h-10 rounded-xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shrink-0">
                                  <Music2 className="w-4 h-4" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                                  {pl.title}
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span>{pl.custom ? 'Personalizada' : 'Foco & Estudo'}</span>
                                  {pl.itemCount ? (
                                    <>
                                      <span className="text-slate-600">•</span>
                                      <span>{pl.itemCount} faixas</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {pl.custom && (
                                <button
                                  onClick={() => handleRemoveSavedPlaylist(pl.id, pl.title)}
                                  className="p-2 bg-slate-900 hover:bg-red-950/50 text-slate-500 hover:text-red-400 rounded-xl transition-all border border-slate-800 cursor-pointer"
                                  title="Remover das salvas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handlePlaySavedPlaylist(pl)}
                                className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                title="Tocar Playlist"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span className="text-[10px] hidden sm:inline">Tocar</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Recent Activities Subtab */}
                  {librarySubTab === 'recents' && (
                    recentActivities.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 space-y-2.5 bg-slate-950/40 rounded-2xl border border-slate-800 p-4">
                        <History className="w-8 h-8 mx-auto opacity-40 text-cyan-400" />
                        <p className="text-xs font-semibold text-slate-200">Sem atividades recentes</p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                          Nenhuma atividade recente registrada recentemente na sua conta do YouTube Music.
                        </p>
                        <a
                          href="https://music.youtube.com/library"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700/80 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Acessar YouTube Music</span>
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span>Atividades Recentes ({recentActivities.length})</span>
                          <span className="text-[10px] text-cyan-400">Direto da sua conta</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {recentActivities.map((act) => (
                            <div
                              key={act.id}
                              className="bg-slate-950/60 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-2xl transition-all flex items-center justify-between gap-3 group"
                            >
                              <div
                                onClick={() => handleSelectRecentActivity(act)}
                                className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                              >
                                {act.thumbnail ? (
                                  <img
                                    src={act.thumbnail}
                                    alt={act.title}
                                    className="w-12 h-10 object-cover rounded-xl bg-slate-900 shrink-0 border border-slate-800"
                                  />
                                ) : (
                                  <div className="w-12 h-10 rounded-xl bg-cyan-900/40 border border-cyan-700/40 flex items-center justify-center text-cyan-400 shrink-0">
                                    <Music2 className="w-4 h-4" />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                                    {act.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span className="truncate">{act.channelTitle || 'YouTube Music'}</span>
                                    {act.type === 'like' && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/60 border border-rose-700/40 text-rose-300 font-medium shrink-0 flex items-center gap-0.5">
                                        <Heart className="w-2.5 h-2.5 fill-rose-500" />
                                        <span>Curtida</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={act.link || (act.videoId ? `https://music.youtube.com/watch?v=${act.videoId}` : 'https://music.youtube.com')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-xl transition-all border border-slate-800"
                                  title="Abrir no YouTube Music"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => handleSelectRecentActivity(act)}
                                  className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Tocar Faixa Recente"
                                >
                                  <Play className="w-3.5 h-3.5 fill-white" />
                                  <span className="text-[10px] hidden sm:inline">Tocar</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
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
