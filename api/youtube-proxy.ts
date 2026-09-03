import { Request, Response } from 'express';

export interface PlaylistItemSnippet {
  title: string;
  channelTitle?: string;
  resourceId: {
    videoId: string;
  };
  thumbnails?: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
}

export interface PlaylistItemResponse {
  id: string;
  snippet: PlaylistItemSnippet;
}

// Fallback curated study tracks if YouTube API key is missing or quota/error occurs
export const DEFAULT_STUDY_PLAYLIST = [
  {
    title: 'Lofi Study Beats & Relax (Continuous HQ)',
    url: 'WPni755-Krg',
    channel: 'Synapse Study Focus',
    thumbnail: 'https://i.ytimg.com/vi/WPni755-Krg/hqdefault.jpg',
  },
  {
    title: 'Música Clássica para Foco e Alta Concentração',
    url: '5qap5aO4i9A',
    channel: 'Classical Study Records',
    thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
  },
  {
    title: 'Sons da Chuva & Tempestade Suave para Foco Profundo',
    url: 'eKFTSSKCzWA',
    channel: 'Nature Ambient Sound',
    thumbnail: 'https://i.ytimg.com/vi/eKFTSSKCzWA/hqdefault.jpg',
  },
  {
    title: 'Synthwave & Retrô Beats para Produtividade',
    url: '4xDzrJKXOOY',
    channel: 'Lofi Girl Focus',
    thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
  },
  {
    title: 'Coffee Shop BGM - Relaxing Instrumental Jazz',
    url: 'f02gHuu5K2I',
    channel: 'Cafe Music BGM',
    thumbnail: 'https://i.ytimg.com/vi/f02gHuu5K2I/hqdefault.jpg',
  },
];

/**
 * Extrai o ID da playlist de URLs variadas (YouTube, YouTube Music) ou aceita ID puro
 */
export function extractPlaylistId(rawInput: string): string | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();

  // Se já for um ID limpo de playlist (ex: LM, LL, PL..., OLAK5uy_..., RD...)
  if (/^[A-Za-z0-9_-]{2,}$/.test(trimmed) && !trimmed.includes('http') && !trimmed.includes('/')) {
    return trimmed;
  }

  // Regex para capturar list=... em qualquer URL do YouTube/Music
  const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // Se for embed/videoseries?list=...
  const embedMatch = trimmed.match(/\/videoseries\?list=([a-zA-Z0-9_-]+)/);
  if (embedMatch && embedMatch[1]) {
    return embedMatch[1];
  }

  return null;
}

/**
 * Backend Proxy para a API do YouTube v3
 * 1. Esconde a chave de API dos usuários
 * 2. Lê de variáveis de ambiente com segurança (process.env.YOUTUBE_API_KEY)
 * 3. Garante fallback automático se a chave faltar ou a API falhar
 * 4. Fornece URL direta para iframe embed: https://www.youtube.com/embed/videoseries?list=ID
 */
export async function handleYouTubeProxy(req: Request, res: Response) {
  // Configura headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawPlaylist = (req.query?.playlistId as string) || (req.body?.playlistId as string) || (req.body?.url as string);

  if (!rawPlaylist) {
    return res.status(400).json({
      success: false,
      error: 'ID ou URL da playlist não fornecido. Use ex: https://music.youtube.com/playlist?list=PL...',
      fallback: true,
      defaultPlaylist: DEFAULT_STUDY_PLAYLIST,
    });
  }

  const playlistId = extractPlaylistId(rawPlaylist);

  if (!playlistId) {
    return res.status(400).json({
      success: false,
      error: 'Link de playlist inválido. Use o formato: https://music.youtube.com/playlist?list=PL...',
      fallback: true,
      defaultPlaylist: DEFAULT_STUDY_PLAYLIST,
    });
  }

  const directEmbedUrl = `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&autoplay=1`;

  try {
    const authHeader = req.headers.authorization;
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;

    const headers: Record<string, string> = { Accept: 'application/json' };
    // Para 'LM' (Liked Music do YouTube Music), a API padrão do YouTube costuma associar à lista 'LL' (Liked List)
    const effectivePlaylistId = playlistId === 'LM' ? 'LL' : playlistId;
    let ytApiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(
      effectivePlaylistId
    )}`;

    if (authHeader && authHeader.startsWith('Bearer ') && !authHeader.includes('undefined') && !authHeader.includes('null')) {
      headers.Authorization = authHeader;
    } else if (apiKey) {
      ytApiUrl += `&key=${apiKey}`;
    }

    const ytRes = await fetch(ytApiUrl, { headers });
    const ytData = await ytRes.json();

    if (ytRes.ok && ytData.items && Array.isArray(ytData.items) && ytData.items.length > 0) {
      const formattedItems = ytData.items
        .map((item: any) => ({
          id: item.id,
          snippet: {
            title: item.snippet?.title || 'Música da Playlist',
            channelTitle: item.snippet?.channelTitle || 'YouTube',
            resourceId: {
              videoId: item.snippet?.resourceId?.videoId || item.contentDetails?.videoId,
            },
            thumbnails: item.snippet?.thumbnails || {
              default: { url: `https://i.ytimg.com/vi/${item.snippet?.resourceId?.videoId}/hqdefault.jpg` },
            },
          },
        }))
        .filter(
          (t: any) =>
            Boolean(t.snippet?.resourceId?.videoId) &&
            t.snippet.title !== 'Private video' &&
            t.snippet.title !== 'Deleted video'
        );

      return res.status(200).json({
        success: true,
        playlistId,
        directEmbedUrl,
        items: formattedItems,
        totalResults: formattedItems.length,
      });
    }

    // Se a API não retornou faixas individuais (ex: playlist privada do YouTube Music como LM que só toca no player embutido)
    return res.status(200).json({
      success: true,
      useDirectEmbed: true,
      directEmbedUrl,
      playlistId,
      items: [],
      message: 'Playlist pronta para reprodução direta no player.',
    });
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error('Erro no YouTube Proxy:', errorObj.message);

    return res.status(200).json({
      success: true,
      useDirectEmbed: true,
      directEmbedUrl,
      playlistId,
      items: [],
      message: 'Reproduzindo playlist diretamente.',
    });
  }
}
