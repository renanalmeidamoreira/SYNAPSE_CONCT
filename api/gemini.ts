import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return ai;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Método não permitido. Utilize POST.',
      },
    });
  }

  try {
    const aiClient = getAiClient();
    if (!aiClient) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: 'Chave GEMINI_API_KEY não configurada no ambiente do servidor.',
          retryable: false,
        },
      });
    }

    const { prompt, history, messages, systemInstruction, responseMimeType, responseSchema } = req.body || {};

    let contentsPayload: any;

    if (Array.isArray(history) && history.length > 0) {
      contentsPayload = history.map((msg: any) => ({
        role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(msg.text || msg.content || '') }],
      }));

      // If there is an active new prompt at the end that isn't in history
      if (prompt && typeof prompt === 'string' && prompt.trim()) {
        const lastMsg = history[history.length - 1];
        if (!lastMsg || lastMsg.text !== prompt) {
          contentsPayload.push({
            role: 'user',
            parts: [{ text: prompt.trim() }],
          });
        }
      }
    } else if (Array.isArray(messages) && messages.length > 0) {
      contentsPayload = messages.map((msg: any) => ({
        role: msg.role === 'ai' || msg.role === 'model' || msg.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: String(msg.text || msg.content || '') }],
      }));
    } else if (prompt && typeof prompt === 'string' && prompt.trim()) {
      contentsPayload = prompt.trim();
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROMPT',
          message: 'O campo prompt ou histórico de mensagens é obrigatório.',
          retryable: false,
        },
      });
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

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const response = await aiClient.models.generateContent({
      model: modelName,
      contents: contentsPayload,
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    const outputText = response.text || '';

    return res.status(200).json({
      success: true,
      text: outputText,
      message: outputText,
      data: {
        text: outputText,
      },
    });
  } catch (err: any) {
    console.error('Erro no processamento da API Gemini:', err);
    const errMessage = String(err?.message || err || '');
    const isQuota =
      err?.status === 429 ||
      errMessage.includes('429') ||
      errMessage.includes('RESOURCE_EXHAUSTED') ||
      errMessage.includes('Quota exceeded');

    return res.status(isQuota ? 429 : 500).json({
      success: false,
      error: {
        code: isQuota ? 'QUOTA_EXCEEDED' : 'AI_PROVIDER_ERROR',
        message: isQuota
          ? 'Limite temporário de requisições de IA atingido. Tente novamente em instantes.'
          : 'Não foi possível consultar o assistente de IA agora.',
        retryable: isQuota || err?.status >= 500,
      },
    });
  }
}
