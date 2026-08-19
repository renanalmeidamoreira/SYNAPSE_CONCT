/**
 * Server-side Gemini API client caller with Exponential Backoff for 429 / Quota errors
 */

export interface GeminiRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

export async function callGeminiAPI(
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: string,
  responseSchema?: any,
  options: GeminiRetryOptions = {}
): Promise<string> {
  const maxRetries = options.maxRetries ?? 4;
  let delay = options.initialDelayMs ?? 1000;
  const factor = options.backoffFactor ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          systemInstruction,
          responseMimeType,
          responseSchema,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const isQuotaError =
          res.status === 429 ||
          data?.tipo === 'quota_excedida' ||
          (typeof data?.error === 'string' &&
            (data.error.includes('429') ||
              data.error.toLowerCase().includes('quota') ||
              data.error.toLowerCase().includes('rate limit'))) ||
          (typeof data?.mensagem === 'string' &&
            (data.mensagem.includes('429') ||
              data.mensagem.toLowerCase().includes('quota') ||
              data.mensagem.toLowerCase().includes('rate limit')));

        if (isQuotaError && attempt < maxRetries) {
          const currentDelay = Math.round(delay + Math.random() * 300);
          console.warn(
            `[Gemini API 429] Cota excedida (Quota Exceeded). Tentativa ${
              attempt + 1
            }/${maxRetries}. Reagendando em ${currentDelay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, currentDelay));
          delay *= factor;
          continue;
        }

        throw new Error(data.error || data.mensagem || `Erro ${res.status} ao comunicar com a API do Gemini`);
      }

      return data.text || '';
    } catch (err: any) {
      const isQuotaError =
        err?.status === 429 ||
        (typeof err?.message === 'string' &&
          (err.message.includes('429') ||
            err.message.toLowerCase().includes('quota') ||
            err.message.toLowerCase().includes('rate limit')));

      if (isQuotaError && attempt < maxRetries) {
        const currentDelay = Math.round(delay + Math.random() * 300);
        console.warn(
          `[Gemini API 429] Reagendando requisição em ${currentDelay}ms (Tentativa ${
            attempt + 1
          }/${maxRetries})...`
        );
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        delay *= factor;
        continue;
      }

      console.error(`Gemini API Call Error (Tentativa ${attempt + 1}/${maxRetries + 1}):`, err);
      throw err;
    }
  }

  throw new Error('Serviço do Gemini temporariamente indisponível após múltiplas tentativas (Quota Exceeded).');
}

// Expose globally for window.callGeminiAPI
if (typeof window !== 'undefined') {
  (window as any).callGeminiAPI = callGeminiAPI;
}

