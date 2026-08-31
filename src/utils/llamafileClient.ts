export interface LlamafileMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlamafileChatOptions {
  endpoint?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface LlamafileChatResponse {
  text: string;
  isLocal: boolean;
  error?: string;
}

/**
 * Cliente para interagir com instâncias do Llamafile (IA Local)
 */
export async function queryLlamafile(
  messages: LlamafileMessage[],
  options?: LlamafileChatOptions
): Promise<LlamafileChatResponse> {
  const targetEndpoint = options?.endpoint || localStorage.getItem('synapse_llamafile_endpoint') || 'http://127.0.0.1:8080';

  try {
    // 1. Tenta chamar o endpoint de chat proxy da API interna
    const proxyRes = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        endpoint: targetEndpoint,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 2048,
        model: options?.model || 'llamafile',
      }),
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data.success && data.text) {
        return {
          text: data.text,
          isLocal: Boolean(data.isLocal),
        };
      }
    }

    // 2. Se a API de proxy não responder ou falhar, tenta requisição direta ao endpoint local
    const directRes = await fetch(`${targetEndpoint.replace(/\/+$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false,
      }),
    });

    if (directRes.ok) {
      const json = await directRes.json();
      const answer = json?.choices?.[0]?.message?.content || json?.content || '';
      return {
        text: answer,
        isLocal: true,
      };
    }

    throw new Error(`Falha ao conectar no Llamafile (${directRes.status})`);
  } catch (err: unknown) {
    const errorObj = err as Error;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[LlamafileClient] Erro ao consultar IA local:', errorObj.message);
    }
    return {
      text: '',
      isLocal: false,
      error: errorObj.message || 'Llamafile offline ou inacessível.',
    };
  }
}
