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
    return res.status(400).json({ erro: true, mensagem: 'URL ausente para o proxy.' });
  }

  try {
    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || 'text/html';
    const htmlText = await response.text();
    const urlObj = new URL(response.url || targetUrl);

    // Remove frame-busting scripts and inject base href for relative assets
    const cleanHtml = htmlText
      .replace(/<head\b[^>]*>/i, `<head>\n<base href="${urlObj.protocol}//${urlObj.host}${urlObj.pathname}">\n<meta name="referrer" content="no-referrer">\n`)
      .replace(/top\.location\s*=\s*self\.location/gi, '/* blocked */')
      .replace(/window\.top\s*!==\s*window\.self/gi, 'false')
      .replace(/if\s*\(top\s*!==\s*self\)/gi, 'if (false)');

    res.setHeader('Content-Type', contentType.includes('text/html') ? 'text/html; charset=utf-8' : contentType);
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' *");

    return res.status(200).send(cleanHtml);
  } catch (err: any) {
    console.error('Erro no Proxy Web Synapse:', err);
    // Return friendly HTML fallback
    const fallbackHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Portal do Concurso - Synapse</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px 24px; text-align: center; }
        .card { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
        h2 { color: #818cf8; margin-top: 0; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
        .btn { display: inline-block; margin-top: 20px; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; transition: background 0.2s; }
        .btn:hover { background: #4f46e5; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🏛️ Visualizador Synapse</h2>
        <p>O portal do edital protegeu sua exibição externa direta para garantir a autenticidade oficial.</p>
        <p>Você pode abrir diretamente o link no portal oficial com um clique e manter o caderno de anotações ao lado:</p>
        <a href="${rawUrl}" target="_blank" rel="noopener noreferrer" class="btn">Abrir no Portal Oficial ↗</a>
      </div>
    </body>
    </html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(fallbackHtml);
  }
}
