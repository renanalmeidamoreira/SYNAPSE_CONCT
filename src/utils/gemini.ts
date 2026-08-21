/**
 * Resilient Gemini API client with Exponential Backoff, Vercel Serverless proxy, Client-Side Fallback & Pedagogical Engine
 */
import { GoogleGenAI } from '@google/genai';

export interface GeminiRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
}

let clientSideAi: GoogleGenAI | null = null;

function getClientSideAi(): GoogleGenAI | null {
  if (clientSideAi) return clientSideAi;
  const clientKey =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    'AIzaSyCSEReZYr4UPR9-b4xpzBgz3uij4eSNI74';
  if (clientKey) {
    try {
      clientSideAi = new GoogleGenAI({ apiKey: clientKey });
    } catch (e) {
      console.warn('Erro ao instanciar GoogleGenAI no cliente:', e);
    }
  }
  return clientSideAi;
}

/**
 * Motor pedagógico de contingência para suporte contínuo ao estudante caso haja oscilação de rede/cota
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

  if (p.includes('gcm') || p.includes('guarda') || p.includes('13.022') || p.includes('segurança')) {
    return `🛡️ **Estatuto Geral das Guardas Municipais (Lei Federal 13.022/2014):**

- **Natureza:** Instituições de caráter civil, uniformizadas e armadas conforme previsto em lei.
- **Princípios Mínimos de Atuação (Art. 3º):**
  1. Proteção dos direitos humanos fundamentais e da cidadania;
  2. Preservação da vida, redução do sofrimento e diminuição das perdas;
  3. Patrulhamento preventivo;
  4. Compromisso com a evolução social da comunidade;
  5. Uso progressivo da força.
- **Competência Geral (Art. 4º):** Proteção de bens, serviços, logradouros públicos e instalações do Município.`;
  }

  return `📚 **Orientação de Estudos SYNAPSE:**

Para dominar este tópico:
1. **Compreensão Teórica:** Foque na leitura atenta da letra da lei (letra fria da CF/88 e leis especiais representam mais de 70% das questões de concurso).
2. **Fixação Ativa:** Crie flashcards no SYNAPSE com os conceitos e exceções das normas.
3. **Simulado Prático:** Resolva pelo menos 15 a 20 questões da sua banca examinadora sobre o assunto.
4. **Caderno de Erros:** Anote as razões de cada erro para revisão periódica a cada 7 e 15 dias.

Como posso aprofundar mais este ponto para você?`;
}

export async function callGeminiAPI(
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: string,
  responseSchema?: any,
  options: GeminiRetryOptions = {}
): Promise<string> {
  const maxRetries = options.maxRetries ?? 2;
  let delay = options.initialDelayMs ?? 800;
  const factor = options.backoffFactor ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Step 1: Serverless proxy call
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
      }).catch(() => null);

      if (res) {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json().catch(() => ({}));
          if (data && data.text) {
            return data.text;
          }
        }
      }

      // Step 2: Direct Client-Side SDK Fallback
      const clientAi = getClientSideAi();
      if (clientAi) {
        try {
          const config: Record<string, any> = {};
          if (systemInstruction) config.systemInstruction = systemInstruction;
          if (responseMimeType) config.responseMimeType = responseMimeType;
          if (responseSchema) config.responseSchema = responseSchema;

          const directRes = await clientAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: Object.keys(config).length > 0 ? config : undefined,
          });

          if (directRes && directRes.text) {
            return directRes.text;
          }
        } catch (clientErr) {
          console.warn('[Gemini Client Direct] tentativa falhou:', clientErr);
        }
      }

      // If json format was requested and failed, return fallback json
      if (responseMimeType === 'application/json' || (responseSchema && Array.isArray(responseSchema))) {
        return '[]';
      }

      // Step 3: Pedagogical Engine Fallback
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

// Expose globally for window.callGeminiAPI
if (typeof window !== 'undefined') {
  (window as any).callGeminiAPI = callGeminiAPI;
}

