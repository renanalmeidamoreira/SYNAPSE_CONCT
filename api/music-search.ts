export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { theme } = req.body || req.query || {};
    const query = typeof theme === 'string' && theme.trim() ? theme.trim() : 'lofi estudo foco';

    const fallbackCatalog = [
      { videoId: 'jfKfPfyJRdk', titulo: 'Lofi Girl - lofi hip hop radio - beats to relax/study to', canal: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg' },
      { videoId: '5qap5aO4i9A', titulo: 'Classical Music for Studying & Brain Power', canal: 'HALIDONMUSIC', thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg' },
      { videoId: 'eKFTSSKCzWA', titulo: 'Relaxing Rain & Thunder Sounds for Sleep or Study', canal: 'Calm Sounds', thumbnail: 'https://i.ytimg.com/vi/eKFTSSKCzWA/hqdefault.jpg' },
      { videoId: 'DWcjZAZBaT0', titulo: 'Synthwave Radio - chill synth / retro beats', canal: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/DWcjZAZBaT0/hqdefault.jpg' },
      { videoId: 'f02gHuu5K2I', titulo: 'Coffee Shop BGM - Relaxing Jazz Music', canal: 'Cafe Music BGM', thumbnail: 'https://i.ytimg.com/vi/f02gHuu5K2I/hqdefault.jpg' },
      { videoId: 'TURbeWK2wwg', titulo: 'Bossa Nova Guitar Instrumental for Focus', canal: 'Relaxing Bossa', thumbnail: 'https://i.ytimg.com/vi/TURbeWK2wwg/hqdefault.jpg' },
      { videoId: 'kgx4WGK0oNU', titulo: 'Jazz Hop & Lofi Beats Collection', canal: 'ChilledCow', thumbnail: 'https://i.ytimg.com/vi/kgx4WGK0oNU/hqdefault.jpg' },
      { videoId: 'lP26UCnoHso', titulo: 'Deep Focus Ambient Music for Work & Coding', canal: 'Music for Body and Spirit', thumbnail: 'https://i.ytimg.com/vi/lP26UCnoHso/hqdefault.jpg' },
    ];

    const ytKey = "AIzaSyCSEReZYr4UPR9-b4xpzBgz3uij4eSNI74";
    let results: Array<{ videoId: string; titulo: string; canal: string; thumbnail: string }> = [];

    if (ytKey) {
      try {
        const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(
          query
        )}&key=${ytKey}`;

        const ytRes = await fetch(ytUrl);
        const ytData = await ytRes.json();

        if (ytRes.ok && ytData.items && Array.isArray(ytData.items)) {
          results = ytData.items
            .map((item: any) => ({
              videoId: item.id?.videoId,
              titulo: item.snippet?.title || 'Vídeo de Música',
              canal: item.snippet?.channelTitle || 'YouTube',
              thumbnail:
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.default?.url ||
                `https://i.ytimg.com/vi/${item.id?.videoId}/hqdefault.jpg`,
            }))
            .filter((x: any) => Boolean(x.videoId));
        }
      } catch (err) {
        console.warn('Erro ao consultar YouTube Data API:', err);
      }
    }

    if (!results || results.length === 0) {
      const qLower = query.toLowerCase();
      results = fallbackCatalog.filter((item) =>
        item.titulo.toLowerCase().includes(qLower) || item.canal.toLowerCase().includes(qLower)
      );
      if (results.length === 0) {
        results = fallbackCatalog;
      }
    }

    return res.status(200).json({
      erro: false,
      results,
      title: results[0]?.titulo,
      url: results[0] ? `https://www.youtube.com/watch?v=${results[0].videoId}` : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({
      erro: true,
      error: err.message || 'Falha ao buscar músicas.',
    });
  }
}
