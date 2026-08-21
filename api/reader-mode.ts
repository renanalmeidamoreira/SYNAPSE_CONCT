export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.query.url as string;
  if (!rawUrl) {
    return res.status(400).send('URL ausente');
  }

  try {
    let targetUrl = rawUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeout);
    const htmlText = await response.text();
    const urlObj = new URL(response.url || targetUrl);

    let cleaned = htmlText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    const readerHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Leitor Limpo Synapse - ${urlObj.hostname}</title>
      <base href="${urlObj.protocol}//${urlObj.host}${urlObj.pathname}">
      <style>
        body { font-family: system-ui, sans-serif; background-color: #0b0f19; color: #cbd5e1; line-height: 1.8; padding: 32px 24px; max-width: 900px; margin: 0 auto; }
        header.synapse-reader-bar { background: #1e293b; border: 1px solid #334155; padding: 16px 20px; border-radius: 16px; margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between; }
        header.synapse-reader-bar h1 { font-size: 15px; font-weight: 800; color: #ffffff; margin: 0; }
        a { color: #818cf8; text-decoration: underline; }
        h1, h2, h3 { color: #f8fafc; font-weight: 800; }
        p, li { font-size: 15px; color: #cbd5e1; }
      </style>
    </head>
    <body>
      <header class="synapse-reader-bar">
        <h1>📖 Modo Leitor Limpo Synapse (${urlObj.hostname})</h1>
        <a href="${targetUrl}" target="_blank" style="color:#38bdf8;font-size:12px;font-weight:700;text-decoration:none;">↗️ Ver Fonte Original</a>
      </header>
      <main>
        ${cleaned}
      </main>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(readerHtml);
  } catch (err: any) {
    return res.status(500).send(`Erro ao gerar modo leitor: ${err.message}`);
  }
}
