import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = (req.query?.url || req.body?.url) as string;
  if (!rawUrl) {
    return res.status(400).json({ erro: true, mensagem: 'URL ausente para consulta.' });
  }

  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeout);

    const xFrameOptions = response.headers.get('x-frame-options');
    const csp = response.headers.get('content-security-policy');
    const isRestricted = Boolean(
      xFrameOptions || (csp && (csp.includes('frame-ancestors') || csp.includes("frame-ancestors 'none'")))
    );

    return res.status(200).json({
      success: true,
      url: targetUrl,
      status: response.status,
      embeddable: !isRestricted && response.ok,
    });
  } catch (err: any) {
    return res.status(200).json({
      success: false,
      url: targetUrl,
      embeddable: false,
      error: 'Não foi possível verificar a incorporação automática.',
    });
  }
}
