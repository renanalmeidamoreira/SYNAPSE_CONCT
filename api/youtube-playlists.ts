export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token de autorização do Google/YouTube ausente. Conecte sua conta do YouTube.',
        },
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const ytUrl = 'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=25';

    const ytRes = await fetch(ytUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const data = await ytRes.json();

    if (!ytRes.ok) {
      const isExpired = ytRes.status === 401 || data?.error?.code === 401;
      const isForbidden = ytRes.status === 403 || data?.error?.code === 403;
      return res.status(ytRes.status).json({
        success: false,
        error: {
          code: isExpired ? 'AUTH_EXPIRED' : isForbidden ? 'FORBIDDEN_SCOPE' : 'YOUTUBE_API_ERROR',
          message: isExpired
            ? 'Sua sessão do YouTube expirou. Por favor, autorize novamente.'
            : isForbidden
            ? 'Acesso não autorizado para ler playlists. Conceda a permissão ao conectar.'
            : (data?.error?.message || 'Erro ao consultar playlists no YouTube.'),
        },
      });
    }

    const playlists = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || 'Playlist sem título',
      description: item.snippet?.description || '',
      thumbnail:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
      itemCount: item.contentDetails?.itemCount || 0,
    }));

    return res.status(200).json({
      success: true,
      playlists,
    });
  } catch (err: any) {
    console.error('Erro na API de playlists do YouTube:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Falha interna ao buscar playlists.',
      },
    });
  }
}
