import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ erro: true, mensagem: 'Chave GEMINI_API_KEY não configurada.' });
    }

    const { url: targetUrl } = req.body || req.query || {};
    if (!targetUrl) {
      return res.status(400).json({ erro: true, mensagem: 'URL é obrigatória.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const fetchRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);

    let pageText = '';
    if (fetchRes) {
      const rawHtml = await fetchRes.text();
      pageText = rawHtml
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 8000);
    }

    const prompt = `Você é o Assistente de Estudos do Synapse. Analise o seguinte conteúdo de concurso/edital e gere um resumo estruturado para o caderno do aluno:
URL: ${targetUrl}
Conteúdo: ${pageText || 'Página de Concurso / Edital Oficial'}

Gere um resumo em Markdown organizado com tópicos:
1. 📌 **Órgão e Cargo**
2. 💰 **Vagas e Remuneração**
3. 🏢 **Banca Organizadora**
4. 📅 **Datas Importantes**
5. 📚 **Disciplinas Principais**
6. 🎯 **Dica Estratégica Synapse**`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.status(200).json({ erro: false, summary: response.text || 'Resumo gerado.' });
  } catch (err: any) {
    return res.status(500).json({ erro: true, mensagem: err.message || 'Erro ao resumir página.' });
  }
}
