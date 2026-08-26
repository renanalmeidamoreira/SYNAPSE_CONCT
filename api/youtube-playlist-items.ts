export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const playlistId = req.query?.playlistId;
    if (!playlistId || typeof playlistId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAM',
          message: 'Parâmetro playlistId é obrigatório.',
        },
      });
    }

    const authHeader = req.headers.authorization;
    const headers: Record<string, string> = { Accept: 'application/json' };
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(
      playlistId
    )}`;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      headers.Authorization = authHeader;
    } else {
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey) {
        url += `&key=${apiKey}`;
      }
    }

    const ytRes = await fetch(url, { headers });
    const data = await ytRes.json();

    if (!ytRes.ok) {
      return res.status(ytRes.status).json({
        success: false,
        error: {
          code: ytRes.status === 401 ? 'AUTH_EXPIRED' : 'YOUTUBE_API_ERROR',
          message: data?.error?.message || 'Erro ao carregar faixas da playlist.',
        },
      });
    }

    const tracks = (data.items || [])
      .map((item: any) => ({
        id: item.id,
        videoId: item.snippet?.resourceId?.videoId || item.contentDetails?.videoId,
        title: item.snippet?.title || 'Faixa de Música',
        channel: item.snippet?.channelTitle || 'YouTube',
        thumbnail:
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${item.snippet?.resourceId?.videoId}/hqdefault.jpg`,
      }))
      .filter(
        (t: any) =>
          Boolean(t.videoId) &&
          t.title !== 'Private video' &&
          t.title !== 'Deleted video'
      );

    return res.status(200).json({
      success: true,
      tracks,
    });
  } catch (err: any) {
    console.error('Erro na API de faixas da playlist do YouTube:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Falha interna ao obter faixas da playlist.',
      },
    });
  }
}
