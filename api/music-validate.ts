export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { videoId, url } = req.body || req.query || {};
    let idToTest = videoId;

    if (!idToTest && url && typeof url === 'string') {
      const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/shorts\/|\/live\/)([^#&?]*)/);
      if (match && match[1] && match[1].length === 11) {
        idToTest = match[1];
      }
    }

    if (!idToTest) {
      return res.status(400).json({ erro: true, mensagem: 'ID de vídeo ou URL inválida.' });
    }

    let isEmbeddable = false;
    let videoTitle = '';

    const ytApiKey = process.env.YOUTUBE_API_KEY || process.env.GEMINI_API_KEY;
    if (ytApiKey) {
      try {
        const apiRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${idToTest}&key=${ytApiKey}`
        );
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.items && apiData.items.length > 0) {
            const item = apiData.items[0];
            isEmbeddable = item.status?.embeddable === true;
            videoTitle = item.snippet?.title || '';
          }
        }
      } catch (err) {
        // Fallback
      }
    }

    if (!isEmbeddable) {
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${idToTest}&format=json`
        );
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          isEmbeddable = true;
          videoTitle = oembedData.title || '';
        }
      } catch (e) {
        isEmbeddable = false;
      }
    }

    return res.status(200).json({
      erro: false,
      embeddable: isEmbeddable,
      videoId: idToTest,
      title: videoTitle,
    });
  } catch (err: any) {
    return res.status(500).json({ erro: true, mensagem: 'Falha ao validar link.' });
  }
}
