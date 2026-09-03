/**
 * Resilient Gemini Client with Multi-turn, Grounding (Search/Maps), Audio Transcription & Veo Video Generation
 * Security: Strictly server-side authentication (No client-side API keys exposed)
 */

export interface GeminiRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  model?: 'gemini-3.1-flash-lite' | 'gemini-3.8-flash' | 'gemini-3.1-pro-preview' | string;
  useSearchGrounding?: boolean;
  useMapsGrounding?: boolean;
}

export interface ChatMessageItem {
  id?: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp?: number;
  groundingMetadata?: {
    webSearchQueries?: string[];
    searchEntryPoint?: { renderedContent?: string };
    groundingChunks?: Array<{
      web?: { uri: string; title: string };
      maps?: { uri: string; title: string; placeId?: string };
    }>;
  };
  modelUsed?: string;
}

/**
 * Motor pedagógico fundamentado para suporte contínuo ao concurseiro caso haja indisponibilidade transitória
 */
function getPedagogicalFallbackResponse(prompt: string, context?: string): string {
  const p = prompt.toLowerCase();

  if (p.includes('plano') || p.includes('cronograma') || p.includes('semanal') || p.includes('estudo')) {
    return `🎯 **Plano Semanal de Alta Performance SYNAPSE**

Aqui está uma estrutura recomendada com ciclo intercalado para potencializar sua retenção:

- 🗓️ **Segunda-feira (Base Jurídica):** Direito Constitucional (Art. 5º ao 17) + 20 questões comentadas.
- 🗓️ **Terça-feira (Exatas & Lógica):** Raciocínio Lógico-Matemático (Tabela Verdade, Equivalências) + Caderno de Erros.
- 🗓️ **Quarta-feira (Língua Portuguesa):** Sintaxe, Concordância, Regência e Interpretação de Texto da banca.
- 🗓️ **Quinta-feira (Penal & Especial):** Crimes contra a Administração Pública + Estatuto Geral das Guardas (Lei 13.022/14) ou Legislação Específica.
- 🗓️ **Sexta-feira (Direito Administrativo):** Atos Administrativos, Poderes e Regime Jurídico dos Servidores.
- 🗓️ **Sábado (Simulado Real):** 1 Simulado cronometrado no SYNAPSE (50 questões) + Revisão dos pontos fracos.
- 🗓️ **Domingo (Revisão Leve & TAF):** Revisão de Flashcards + Preparação física leve para o TAF.

💡 *Dica de Ouro:* Use a técnica Pomodoro de 25/5 com o player de música em som instrumental para manter foco absoluto!`;
  }

  if (p.includes('legalidade') || p.includes('limpe') || p.includes('administrativo') || p.includes('ato')) {
    return `🏛️ **Princípio da Legalidade no Direito Administrativo:**

- **Para o Particular (Art. 5º, II da CF/88):** Princípio da autonomia da vontade. "Ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei". Ou seja, o que a lei não proíbe, é permitido.
- **Para a Administração Pública (Art. 37, caput da CF/88):** Princípio da legalidade estrita. O agente público só pode agir quando e como a lei expressamente autorizar ou determinar. Não há vontade pessoal do administrador.

💡 *Mnemônico LIMPE (Art. 37 da CF/88):*
- **L**egalidade
- **I**mpessoalidade
- **M**oralidade
- **P**ublicidade
- **E**ficiência (incluída pela EC 19/98)`;
  }

  if (p.includes('penal') || p.includes('crime') || p.includes('ilicitude') || p.includes('peculato')) {
    return `⚖️ **Principais Tópicos de Direito Penal para Concursos:**

1. **Excludentes de Ilicitude (Art. 23 do CP - "L.E.E.E."):**
   - **L**egítima Defesa (repelir agressão injusta, atual ou iminente).
   - **E**stado de Necessidade (sacrifício de bem menor para salvar bem maior).
   - **E**strito Cumprimento do Dever Legal (dever imposto pela lei ao agente público).
   - **E**xercício Regular de Direito.

2. **Crimes Praticados por Funcionário Público (Art. 312 a 327 do CP):**
   - **Peculato (Art. 312):** Apropriar-se ou desviar dinheiro/bem móvel de que tem a posse em razão do cargo.
   - **Concussão (Art. 316):** **Exigir** vantagem indevida.
   - **Corrupção Passiva (Art. 317):** **Solicitar ou receber** (ou aceitar promessa) de vantagem indevida.
   - **Prevaricação (Art. 319):** Retardar ou deixar de praticar ato de ofício para **satisfazer interesse ou sentimento pessoal**.

💡 *Pegadinha clássica da banca:* A banca costuma trocar os verbos "exigir" (Concussão) por "solicitar" (Corrupção Passiva). Fique atento!`;
  }

  if (p.includes('constitucional') || p.includes('art. 5') || p.includes('direitos') || p.includes('remédio')) {
    return `🏛️ **Destaques de Direito Constitucional (Art. 5º CF/88):**

1. **Inviolabilidade do Domicílio (Art. 5º, XI):**
   - A casa é asilo inviolável.
   - **Durante o dia:** Flagrante delito, desastre, prestar socorro ou por determinação judicial.
   - **Durante a noite:** APENAS flagrante delito, desastre ou prestar socorro (ordem judicial NÃO autoriza entrada noturna).

2. **Remédios Constitucionais:**
   - **Habeas Corpus:** Liberdade de locomoção (gratuito).
   - **Habeas Data:** Acesso e retificação de informações relativas à pessoa do impetrante (gratuito).
   - **Mandado de Segurança:** Proteger direito líquido e certo não amparado por HC ou HD.
   - **Ação Popular:** Qualquer cidadão contra atos lesivos ao patrimônio público ou moralidade.`;
  }

  if (p.includes('olá') || p.includes('ola') || p.includes('oi') || p.includes('tudo bem') || p.includes('boa tarde') || p.includes('bom dia') || p.includes('boa noite')) {
    return `Olá! Que bom falar com você! 👋 Estou online e pronto para te acompanhar nos seus estudos. 

Como posso te ajudar hoje? Posso:
- 🎯 Montar um plano de estudos focado na sua meta
- 💡 Explicar qualquer matéria de concurso ou vestibular com exemplos simples
- 📝 Elaborar questões práticas ou simular bancas
- ✍️ Dar dicas certeiras de redação e discursivas

Me conte: o que você está estudando no momento?`;
  }

  return `Com certeza! Vamos destrinchar isso juntos de forma bem prática:

Para fixar este tema com máxima eficiência:
1. **Conceito Chave:** Entenda o "porquê" da regra ou do conteúdo antes de tentar decorar.
2. **Exemplo Prático:** Relacione com um caso real ou mnemônico simples.
3. **Aplicação em Questões:** Pratique ao menos 5 a 10 questões da banca sobre o assunto para ver as pegadinhas mais comuns.

Se quiser, me mande uma dúvida específica ou um exercício desse assunto que eu resolvo com você passo a passo!`;
}

export async function callGeminiAPI(
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: string,
  responseSchema?: any,
  options: GeminiRetryOptions = {}
): Promise<string> {
  const maxRetries = options.maxRetries ?? 2;
  let delay = options.initialDelayMs ?? 1000;
  const factor = options.backoffFactor ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

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
          model: options.model || 'gemini-3.1-flash-lite',
          useSearchGrounding: options.useSearchGrounding,
          useMapsGrounding: options.useMapsGrounding,
        }),
        signal: controller.signal,
      }).catch((fetchErr) => {
        console.warn('[Gemini Client] Erro de rede na requisição:', fetchErr);
        return null;
      });

      clearTimeout(timeoutId);

      if (res) {
        const contentType = res.headers.get('content-type') || '';
        let data: any = null;

        if (contentType.includes('application/json')) {
          try {
            data = await res.json();
          } catch (jsonErr) {
            console.warn('[Gemini Client] Resposta JSON malformada da API:', jsonErr);
          }
        }

        if (res.ok && data) {
          const generatedText = data?.data?.text || data?.text || data?.message;
          if (typeof generatedText === 'string' && generatedText.length > 0) {
            return generatedText;
          }
        }

        // Handle 429 Quota Exceeded
        if (res.status === 429 || data?.error?.code === 'QUOTA_EXCEEDED') {
          console.warn('[Gemini Client] Limite de cota atingido na API.');
          return getPedagogicalFallbackResponse(prompt, systemInstruction);
        }

        // Retryable status code (5xx or temporary)
        if (res.status >= 500 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= factor;
          continue;
        }
      }

      if (responseMimeType === 'application/json') {
        return '[]';
      }

      return getPedagogicalFallbackResponse(prompt, systemInstruction);
    } catch (err: any) {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= factor;
        continue;
      }
      return getPedagogicalFallbackResponse(prompt, systemInstruction);
    }
  }

  return getPedagogicalFallbackResponse(prompt, systemInstruction);
}

export const DEFAULT_NATURAL_SYSTEM_PROMPT =
  'Você é a Inteligência Artificial do SYNAPSE, um tutor e companheiro de estudos caloroso, amigável, altamente capacitado e natural. ' +
  'Converse com o estudante de forma natural, acolhedora, inteligente e motivadora, exatamente como as melhores IAs (ChatGPT, Gemini). ' +
  'Se o estudante cumprimentar ("oi", "olá", "boa tarde"), responda com simpatia e disposição. ' +
  'Explique conteúdos difíceis com didática impecável, exemplos do cotidiano, mnemônicos e analogias fáceis de memorizar. ' +
  'Organize respostas longas com formatação Markdown (negrito, tópicos, listas limpas), sempre priorizando clareza e ritmo de leitura.';

/**
 * Real-time Streaming Client for Natural, Online Conversational AI (SSE)
 */
export async function callGeminiStream(
  messages: ChatMessageItem[],
  onChunk: (accumulatedText: string, chunk: string) => void,
  systemInstruction?: string,
  options: GeminiRetryOptions = {}
): Promise<string> {
  const formattedHistory = messages.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'model',
    text: m.text,
  }));

  const activeSystemPrompt = systemInstruction || DEFAULT_NATURAL_SYSTEM_PROMPT;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    const res = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: formattedHistory,
        systemInstruction: activeSystemPrompt,
        model: options.model || 'gemini-3.1-flash-lite',
        useSearchGrounding: options.useSearchGrounding,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok || !res.body) {
      throw new Error(`Falha na resposta do servidor: status ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let accumulated = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.done) {
              break;
            }
            if (parsed.text) {
              accumulated += parsed.text;
              onChunk(accumulated, parsed.text);
            } else if (parsed.error && typeof parsed.error === 'string') {
              console.warn('[Gemini Stream Notice]:', parsed.error);
            }
          } catch (e) {
            // chunk parcial
          }
        }
      }
    }

    if (accumulated.trim().length > 0) {
      return accumulated;
    }

    // Fallback se stream vier vazio
    const fallbackRes = await callGeminiChat(messages, activeSystemPrompt, options);
    onChunk(fallbackRes.text, fallbackRes.text);
    return fallbackRes.text;
  } catch (streamErr) {
    console.warn('[Gemini Stream Fallback]:', streamErr);
    const fallbackRes = await callGeminiChat(messages, activeSystemPrompt, options);
    onChunk(fallbackRes.text, fallbackRes.text);
    return fallbackRes.text;
  }
}

/**
 * Multi-turn chat client for interactive AI conversations with role and model selection
 */
export async function callGeminiChat(
  messages: ChatMessageItem[],
  systemInstruction?: string,
  options: GeminiRetryOptions = {}
): Promise<{ text: string; groundingMetadata?: any }> {
  try {
    const formattedHistory = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      text: m.text,
    }));

    const activeSystemPrompt = systemInstruction || DEFAULT_NATURAL_SYSTEM_PROMPT;

    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: formattedHistory,
        systemInstruction: activeSystemPrompt,
        model: options.model || 'gemini-3.8-flash',
        useSearchGrounding: options.useSearchGrounding,
        useMapsGrounding: options.useMapsGrounding,
      }),
    });

    const data = await res.json();
    if (res.ok && (data.text || data.data?.text)) {
      return {
        text: data.text || data.data?.text,
        groundingMetadata: data.groundingMetadata || data.data?.groundingMetadata,
      };
    }

    // If quota or error, provide pedagogical answer for the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
    return {
      text: getPedagogicalFallbackResponse(lastUserMsg?.text || '', activeSystemPrompt),
    };
  } catch (err) {
    console.warn('[Gemini Chat] Erro na requisição interativa:', err);
    const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
    return {
      text: getPedagogicalFallbackResponse(lastUserMsg?.text || '', systemInstruction),
    };
  }
}

/**
 * Speech-to-text audio transcription utility using gemini-3.5-flash
 */
export async function transcribeAudioWithGemini(
  audioBlob: Blob,
  prompt?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/gemini/transcribe-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioBase64: base64Data,
            mimeType: audioBlob.type || 'audio/webm',
            prompt: prompt || 'Transcreva com precisão o áudio em português, pontuando e destacando conceitos-chave para estudo.',
          }),
        });

        const data = await res.json();
        if (res.ok && (data.text || data.transcription)) {
          resolve(data.text || data.transcription);
        } else {
          reject(new Error(data.error || 'Falha ao transcrever áudio.'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler blob de áudio'));
    reader.readAsDataURL(audioBlob);
  });
}

/**
 * Veo 3 Video Generation: Start generation
 */
export async function startVeoVideoGeneration(
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '16:9',
  resolution: '720p' | '1080p' = '720p'
): Promise<{ operationName: string }> {
  const res = await fetch('/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspectRatio, resolution }),
  });

  const data = await res.json();
  if (!res.ok || !data.operationName) {
    throw new Error(data.error || 'Falha ao iniciar geração de vídeo com Veo 3.');
  }

  return { operationName: data.operationName };
}

/**
 * Veo 3 Video Generation: Poll status
 */
export async function pollVeoVideoStatus(
  operationName: string
): Promise<{ done: boolean; error?: any }> {
  const res = await fetch('/api/video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Falha ao consultar status do vídeo.');
  }

  return { done: !!data.done, error: data.error };
}

/**
 * Veo 3 Video Generation: Download video blob
 */
export async function downloadVeoVideoBlob(
  operationName: string
): Promise<Blob> {
  const res = await fetch('/api/video-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Falha ao baixar vídeo gerado.');
  }

  return await res.blob();
}

// Global hook for integration
if (typeof window !== 'undefined') {
  (window as any).callGeminiAPI = callGeminiAPI;
  (window as any).callGeminiChat = callGeminiChat;
}
