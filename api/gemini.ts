import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini AI client server-side
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export default async function handler(req: any, res: any) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: true, error: 'Método não permitido.' });
  }

  try {
    const activeKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!activeKey) {
      return res.status(500).json({
        erro: true,
        tipo: 'erro_config',
        error: 'Chave GEMINI_API_KEY não configurada nas variáveis da Vercel. Adicione GEMINI_API_KEY no painel da Vercel (Settings > Environment Variables).',
        mensagem: 'Chave GEMINI_API_KEY não configurada nas variáveis da Vercel.',
      });
    }

    if (!ai) {
      ai = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }

    const { prompt, systemInstruction, responseMimeType, responseSchema } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ erro: true, error: 'Prompt é obrigatório.' });
    }

    const config: Record<string, any> = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (responseMimeType) {
      config.responseMimeType = responseMimeType;
    }
    if (responseSchema) {
      config.responseSchema = responseSchema;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    return res.status(200).json({ text: response.text || '' });
  } catch (err: any) {
    console.error('Erro na API Gemini Vercel:', err);
    const errMessage = String(err?.message || err || '');
    const isQuota =
      err?.status === 429 ||
      errMessage.includes('429') ||
      errMessage.includes('RESOURCE_EXHAUSTED') ||
      errMessage.includes('Quota exceeded');

    return res.status(isQuota ? 429 : 500).json({
      erro: true,
      tipo: isQuota ? 'quota_excedida' : 'erro_temporario',
      error: errMessage || 'Erro ao processar requisição com IA Gemini.',
      mensagem: isQuota
        ? 'Limite de consultas de IA atingido no momento. Tente novamente em instantes.'
        : 'Erro ao comunicar com o modelo de IA Gemini.',
    });
  }
}
