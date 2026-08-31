import { Request, Response } from 'express';

export interface ChatRequestBody {
  messages: Array<{ role: string; content?: string; text?: string }>;
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * Handler para o endpoint de chat com IA local (Llamafile) ou fallback inteligente
 */
export async function handleAIChat(req: Request, res: Response) {
  try {
    const { messages, endpoint = 'http://127.0.0.1:8080', temperature = 0.7, maxTokens = 2048 } = req.body as ChatRequestBody;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'A lista de mensagens é obrigatória.',
      });
    }

    // Formata mensagens para padrão OpenAI/Llamafile
    const formattedMessages = messages.map((m) => ({
      role: m.role === 'model' || m.role === 'ai' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content || m.text || '',
    }));

    const cleanEndpoint = endpoint.replace(/\/+$/, '');

    // 1. Tenta consultar a instância do Llamafile com timeout rápido de 3.5s
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const llamaRes = await fetch(`${cleanEndpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (llamaRes.ok) {
        const data = await llamaRes.json();
        const outputText = data?.choices?.[0]?.message?.content || data?.content || '';
        return res.json({
          success: true,
          text: outputText,
          isLocal: true,
          source: 'llamafile',
        });
      }
    } catch (localErr: unknown) {
      const errObj = localErr as Error;
      console.warn('[AIChat Endpoint] Llamafile local não respondeu:', errObj.message);
    }

    // Se o Llamafile não estiver rodando ou falhar, retorna status para o cliente ou fallback
    return res.json({
      success: false,
      isLocal: false,
      error: 'Instância local do Llamafile não está ativa na porta configurada.',
      fallbackAvailable: true,
    });
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error('[AIChat Endpoint] Erro no processamento:', errorObj.message);
    return res.status(500).json({
      success: false,
      error: errorObj.message || 'Erro interno no chat de IA.',
    });
  }
}
