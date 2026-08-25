/**
 * Resilient Gemini Client with Safe HTTP Communication & Pedagogical Fallback Engine
 * Security: Strictly server-side authentication (No client-side API keys exposed)
 */

export interface GeminiRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
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

  return `📚 **Orientação Pedagógica SYNAPSE:**

Para maximizar sua preparação neste tópico:
1. **Compreensão Teórica:** Faça leitura atenta da letra da lei (a letra da lei responde por mais de 70% das questões de provas objetivas).
2. **Fixação Ativa:** Resolva questões da sua banca examinadora e registre seus erros para revisão periódica.
3. **Revisão Espaçada:** Revise os pontos principais em ciclos de 24h, 7 dias e 30 dias.

Em que ponto específico posso detalhar mais a explicação para você?`;
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
      const timeoutId = setTimeout(() => controller.abort(), 20000);

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
          const generatedText = data?.data?.text || data?.text;
          if (typeof generatedText === 'string' && generatedText.length > 0) {
            return generatedText;
          }
        }

        // Handle 429 Quota Exceeded
        if (res.status === 429 || data?.error?.code === 'QUOTA_EXCEEDED') {
          console.warn('[Gemini Client] Limite de cota atingido na API.');
          // Do not retry 429, fall directly to pedagogical engine
          return getPedagogicalFallbackResponse(prompt, systemInstruction);
        }

        // Retryable status code (5xx or temporary)
        if (res.status >= 500 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= factor;
          continue;
        }
      }

      // If attempt reached maxRetries or JSON format is strictly required
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

// Global hook for integration
if (typeof window !== 'undefined') {
  (window as any).callGeminiAPI = callGeminiAPI;
}
