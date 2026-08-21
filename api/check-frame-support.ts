export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ embeddable: false, reason: 'URL ausente' });
  }

  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();

    const knownBlockedDomains = [
      'notebooklm.google.com',
      'notebook.google.com',
      'chatgpt.com',
      'openai.com',
      'github.com',
      'notion.so',
      'accounts.google.com',
      'mail.google.com',
      'facebook.com',
      'instagram.com',
      'twitter.com',
      'x.com',
    ];

    if (knownBlockedDomains.some((d) => hostname === d || hostname.endsWith('.' + d))) {
      return res.status(200).json({
        embeddable: false,
        domain: hostname,
        reason: 'x-frame-options_conhecido',
        message: 'Este site restringe exibição em IFrame.',
      });
    }

    return res.status(200).json({ embeddable: true, domain: hostname });
  } catch (err: any) {
    return res.status(200).json({ embeddable: true });
  }
}
