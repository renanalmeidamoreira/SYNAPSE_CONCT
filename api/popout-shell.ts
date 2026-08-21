export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, title, tabId } = req.query || {};
  const targetUrl = typeof url === 'string' ? url : 'https://notebooklm.google.com';
  const pageTitle = typeof title === 'string' ? title : 'Synapse Lado a Lado';

  const shellHtml = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle} - Synapse</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body, html { width: 100%; height: 100%; overflow: hidden; font-family: system-ui, -apple-system, sans-serif; background: #0b0f19; }
      .header { height: 48px; background: #0f172a; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; color: #e2e8f0; }
      .title-box { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; }
      .badge { background: #6366f1; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; }
      .btn-redock { background: #334155; hover: background: #475569; color: #f8fafc; border: 1px solid #475569; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; }
      .btn-redock:hover { background: #475569; }
      .frame-container { width: 100%; height: calc(100% - 48px); }
      iframe { width: 100%; height: 100%; border: none; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title-box">
        <span class="badge">SYNAPSE</span>
        <span>${pageTitle}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <a href="${targetUrl}" target="_blank" style="color: #94a3b8; font-size: 12px; text-decoration: none; font-weight: 600;">Abrir Direto ↗</a>
        <button class="btn-redock" onclick="redockToMain()">↩ Reanexar no SY</button>
      </div>
    </div>
    <div class="frame-container">
      <iframe src="${targetUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    <script>
      function redockToMain() {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'SYNAPSE_REDOCK_TAB', tabId: '${tabId || ''}', windowName: window.name }, '*');
        }
        try {
          const bc = new BroadcastChannel('synapse_channel');
          bc.postMessage({ type: 'SYNAPSE_REDOCK_TAB', tabId: '${tabId || ''}', windowName: window.name });
          bc.close();
        } catch(e) {}
        setTimeout(() => window.close(), 100);
      }
    </script>
  </body>
  </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(shellHtml);
}
