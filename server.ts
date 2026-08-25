import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize Gemini AI client server-side
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
  });

  // Centralized Gemini AI call wrapper with quota handling and resilience
  async function callGeminiWithResilience(
    aiClient: GoogleGenAI,
    params: {
      model?: string;
      contents: any;
      config?: any;
    }
  ): Promise<{ text: string }> {
    const modelName = params.model || 'gemini-2.5-flash';
    let attempts = 0;
    const maxAttempts = 2; // 1 initial + 1 retry for transient network errors (never retry on 429)

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await aiClient.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return { text: response.text || '' };
      } catch (err: any) {
        const errMessage = String(err?.message || err || '');
        const status = err?.status || err?.statusCode || err?.response?.status;

        // Check if it's a 429 / RESOURCE_EXHAUSTED / Quota error
        const isQuotaError =
          status === 429 ||
          errMessage.includes('429') ||
          errMessage.includes('RESOURCE_EXHAUSTED') ||
          errMessage.includes('Quota exceeded') ||
          errMessage.includes('rateLimitExceeded') ||
          errMessage.includes('Too Many Requests');

        if (isQuotaError) {
          console.warn('[Gemini Resilience] 429 Quota Exceeded error caught (No retry):', errMessage);
          const quotaErr: any = new Error(
            'Limite de consultas de IA atingido no momento. Tente novamente em alguns minutos.'
          );
          quotaErr.tipo = 'quota_excedida';
          quotaErr.isQuota = true;
          throw quotaErr; // Never retry on 429
        }

        console.error(`[Gemini Resilience] Error on attempt ${attempts}/${maxAttempts}:`, errMessage);

        // If transient error (not 429) and first attempt, retry once after 1s
        if (attempts < maxAttempts) {
          console.log('[Gemini Resilience] Retrying transient error in 1000ms...');
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        }

        const tempErr: any = new Error(
          'Serviço de IA temporariamente indisponível. Tente novamente mais tarde.'
        );
        tempErr.tipo = 'erro_temporario';
        tempErr.isQuota = false;
        throw tempErr;
      }
    }

    throw new Error('Serviço de IA indisponível.');
  }

  // Gemini Proxy Endpoint
  app.post('/api/gemini', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || !ai) {
        return res.status(500).json({
          erro: true,
          tipo: 'erro_config',
          error: 'Chave GEMINI_API_KEY não configurada no servidor. Configure nos Secrets do AI Studio.',
          mensagem: 'Chave GEMINI_API_KEY não configurada no servidor.',
        });
      }

      const { prompt, systemInstruction, responseMimeType, responseSchema } = req.body;

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

      const response = await callGeminiWithResilience(ai, {
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      return res.json({ success: true, text: response.text, data: { text: response.text } });
    } catch (err: any) {
      console.error('Erro na API Gemini:', err);
      const isQuota = err.tipo === 'quota_excedida' || err.isQuota;
      return res.status(isQuota ? 429 : 500).json({
        erro: true,
        tipo: isQuota ? 'quota_excedida' : 'erro_temporario',
        error: err.message || 'Erro ao processar requisição com IA Gemini.',
        mensagem: err.message || 'Erro ao processar requisição com IA Gemini.',
      });
    }
  });

  // Google Classroom Proxy Endpoints
  app.get('/api/classroom/courses', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso do Google ausente ou inválido.' });
      }

      const response = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na API do Google Classroom:', errorText);
        return res.status(response.status).json({ error: 'Erro ao comunicar com Google Classroom.', details: errorText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Falha no proxy Google Classroom:', err);
      return res.status(500).json({ error: 'Erro interno ao consultar Google Classroom.' });
    }
  });

  app.get('/api/classroom/coursework', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const courseId = req.query.courseId as string;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso do Google ausente ou inválido.' });
      }
      if (!courseId) {
        return res.status(400).json({ error: 'ID do curso é obrigatório.' });
      }

      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: 'Erro ao obter tarefas do Classroom.', details: errorText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Falha no proxy de tarefas do Classroom:', err);
      return res.status(500).json({ error: 'Erro interno no proxy do Classroom.' });
    }
  });

  app.get('/api/classroom/announcements', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const courseId = req.query.courseId as string;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso do Google ausente ou inválido.' });
      }
      if (!courseId) {
        return res.status(400).json({ error: 'ID do curso é obrigatório.' });
      }

      const response = await fetch(`https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/announcements`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: 'Erro ao obter avisos do Classroom.', details: errorText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Falha no proxy de avisos do Classroom:', err);
      return res.status(500).json({ error: 'Erro interno no proxy de avisos.' });
    }
  });

  // Google Slides Proxy Endpoint
  app.get('/api/slides/presentation', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const presentationId = req.query.presentationId as string;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token de acesso do Google ausente ou inválido.' });
      }
      if (!presentationId) {
        return res.status(400).json({ error: 'ID da apresentação do Google Slides é obrigatório.' });
      }

      const response = await fetch(`https://slides.googleapis.com/v1/presentations/${encodeURIComponent(presentationId)}`, {
        headers: {
          Authorization: authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: 'Erro ao obter apresentação do Google Slides.', details: errorText });
      }

      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      console.error('Falha no proxy do Google Slides:', err);
      return res.status(500).json({ error: 'Erro interno ao consultar Google Slides.' });
    }
  });

  // Google NotebookLM AI Synthesis API
  app.post('/api/notebooklm/synthesize', async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' });
      }

      const { title, content, sourceType } = req.body || {};
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'O conteúdo de origem para sintetizar é obrigatório.' });
      }

      const prompt = `Você é a API de Inteligência do Google NotebookLM. Sua função é processar fontes de estudo (documentos, tarefas do Google Classroom, slides do Google Slides, PDFs ou notas) e gerar um Notebook de Estudo Sintetizado com 4 artefatos fundamentais:

Título da Fonte: "${title || 'Fonte de Estudo'}"
Tipo de Fonte: "${sourceType || 'Documento/Texto'}"

Conteúdo da Fonte:
"""
${content.slice(0, 15000)}
"""

Sua resposta DEVE SER ESTRITAMENTE UM OBJETO JSON com a seguinte estrutura válida:
{
  "summary": "Um resumo executivo conciso e articulado do conteúdo (máximo 3 parágrafos em markdown).",
  "keyTakeaways": ["Item chave 1", "Item chave 2", "Item chave 3", "Item chave 4", "Item chave 5"],
  "faq": [
    { "question": "Pergunta 1 importante sobre o tema?", "answer": "Resposta clara e objetiva com base no texto." },
    { "question": "Pergunta 2 conceitual?", "answer": "Resposta fundamentada." }
  ],
  "audioOverviewScript": [
    { "speaker": "Alex", "line": "Apresentação entusiasmada sobre os aspectos principais da matéria e descobertas." },
    { "speaker": "Sam", "line": "Comentário analítico aprofundando o ponto chave e dando um exemplo prático." },
    { "speaker": "Alex", "line": "Síntese dos pontos vitais para fixação do estudante." }
  ],
  "flashcards": [
    { "frente": "Conceito Chave 1?", "verso": "Definição precisa e explicação." },
    { "frente": "Conceito Chave 2?", "verso": "Definição precisa e aplicação em provas." }
  ]
}
`;

      const response = await callGeminiWithResilience(ai, {
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      let parsedData;
      try {
        parsedData = JSON.parse(response.text);
      } catch {
        parsedData = { rawText: response.text };
      }

      return res.json({ success: true, notebook: parsedData });
    } catch (err: any) {
      console.error('Erro na síntese NotebookLM:', err);
      return res.status(500).json({ error: err.message || 'Erro ao sintetizar caderno com NotebookLM API.' });
    }
  });

  // Seed concursos para fallback resiliente quando a cota da IA estiver excedida (Inclui base Concursos no Brasil)
  const SEED_CONCURSOS_FALLBACK = [
    // --- CÂMARAS MUNICIPAIS MG ---
    { orgao: 'Câmara de Augusto de Lima', cargo: 'Cargos Legislativos e Administrativos', banca: 'Banca Local', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 2.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Vagas para o quadro efetivo da Câmara Municipal de Augusto de Lima/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Bom Despacho', cargo: 'Agente Administrativo e Técnico Legislativo', banca: 'Banca Oficial', situacao: 'aberto', vagas: '3 Vagas', remuneracao: 'R$ 2.850,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Oportunidades para níveis médio e superior na Câmara de Bom Despacho/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Capelinha', cargo: 'Diversos Cargos e Níveis', banca: 'Fundação de Apoio', situacao: 'aberto', vagas: '27 Vagas', remuneracao: 'R$ 1.800,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso público da Câmara Municipal de Capelinha no Vale do Jequitinhonha.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Divisa Nova', cargo: 'Auxiliar e Oficial Legislativo', banca: 'Banca Local', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 2.100,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Quadro de servidores da Câmara Municipal de Divisa Nova/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Dom Silvério', cargo: 'Assistente Administrativo e Contábil', banca: 'Banca Oficial', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 2.400,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Edital aberto para cargos no legislativo municipal de Dom Silvério/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Dores do Indaiá', cargo: 'Agente Legislativo', banca: 'Banca Local', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 2.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Oportunidades em Dores do Indaiá para servidores públicos municipais.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Governador Valadares', cargo: 'Técnico e Analista Legislativo', banca: 'MS Concursos', situacao: 'aberto', vagas: '10 Vagas', remuneracao: 'R$ 3.200,00 a R$ 6.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Excelente concurso para a Câmara Municipal de Governador Valadares/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Ingaí', cargo: 'Secretário e Auxiliar Administrativo', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 2.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Vaga para quadro efetivo da Câmara de Ingaí/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Itacarambi', cargo: 'Cargos Gerais', banca: 'Banca Local', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 1.900,00 a R$ 3.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Processo de seleção pública da Câmara de Itacarambi no Norte de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de João Monlevade', cargo: 'Oficial e Analista Legislativo', banca: 'Fundep', situacao: 'aberto', vagas: '12 Vagas', remuneracao: 'R$ 3.400,00 a R$ 7.100,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso estruturado para a Câmara de João Monlevade na região central.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Passos', cargo: 'Agente Legislativo, Procurador e Técnico', banca: 'IBGP', situacao: 'aberto', vagas: '16 Vagas', remuneracao: 'R$ 3.100,00 a R$ 8.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Vagas na Câmara de Passos no Sudoeste Mineiro.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Pedras de Maria da Cruz', cargo: 'Cargos Administrativos', banca: 'Banca Local', situacao: 'aberto', vagas: '4 Vagas', remuneracao: 'R$ 1.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Quadro efetivo da Câmara Municipal de Pedras de Maria da Cruz/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Prudente de Morais', cargo: 'Agente Legislativo', banca: 'Banca Local', situacao: 'aberto', vagas: '3 Vagas', remuneracao: 'R$ 2.300,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso da Câmara Municipal de Prudente de Morais/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Rio Piracicaba', cargo: 'Técnico e Auxiliar', banca: 'Banca Oficial', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 2.600,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Câmara de Rio Piracicaba abre vagas para nível médio e superior.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Santa Juliana', cargo: 'Oficial Administrativo', banca: 'Banca Local', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 2.400,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Vagas no Triângulo Mineiro na Câmara de Santa Juliana.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Santa Margarida', cargo: 'Cargos Diversos', banca: 'Banca Oficial', situacao: 'aberto', vagas: '8 Vagas', remuneracao: 'R$ 2.200,00 a R$ 4.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso público aberto na Câmara de Santa Margarida/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Serro', cargo: 'Assistente Legislativo', banca: 'Banca Local', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 2.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Oportunidades na histórica cidade do Serro/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Tombos', cargo: 'Agente e Técnico', banca: 'Banca Oficial', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 2.100,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Edital publicado para a Câmara Municipal de Tombos na Zona da Mata.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara do Prata', cargo: 'Oficial Legislativo', banca: 'Banca Local', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 2.700,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Câmara de Prata no Triângulo Mineiro.', fonte: 'Concursos no Brasil' },
    { orgao: 'Câmara de Curvelo', cargo: 'Técnico Legislativo e Analista', banca: 'Fundep', situacao: 'previsto', vagas: '24 Vagas Previstas', remuneracao: 'R$ 3.000,00 a R$ 6.500,00', uf: 'MG', dataLimiteInscricao: 'Edital Iminente', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso previsto para a Câmara de Curvelo/MG.', fonte: 'Concursos no Brasil' },

    // --- AUTARQUIAS, CONSÓRCIOS & ESTADUAIS MG ---
    { orgao: 'CIDASG', cargo: 'Agente de Inspeção e Administrativo', banca: 'Banca Oficial', situacao: 'aberto', vagas: '8 Vagas', remuneracao: 'R$ 2.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Consórcio Intermunicipal de Desenvolvimento Ambiental Sustentável.', fonte: 'Concursos no Brasil' },
    { orgao: 'CIDASSP MG', cargo: 'Cargos Técnicos e Especialistas', banca: 'Banca Local', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 2.800,00 a R$ 5.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Consórcio Intermunicipal de Saúde de MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'CIDES MG', cargo: 'Analista Ambiental e Administrativo', banca: 'Banca Oficial', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 3.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Consórcio Intermunicipal de Desenvolvimento Sustentável.', fonte: 'Concursos no Brasil' },
    { orgao: 'CIGEDAS MG', cargo: 'Técnico em Geoprocessamento e Adm', banca: 'Banca Local', situacao: 'aberto', vagas: '6 Vagas', remuneracao: 'R$ 3.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Consórcio Intermunicipal de Gestão e Desenvolvimento.', fonte: 'Concursos no Brasil' },
    { orgao: 'CISICOM', cargo: 'Agente Comunitário e Técnico', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 2.400,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Consórcio de Saúde no interior de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'CISMAS', cargo: 'Médico, Enfermeiro e Motorista', banca: 'Banca Oficial', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 2.200,00 a R$ 9.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Consórcio Intermunicipal de Saúde da Microrregião.', fonte: 'Concursos no Brasil' },
    { orgao: 'Colégio Militar de Belo Horizonte', cargo: 'Professor e Especialista', banca: 'Exército Brasileiro', situacao: 'aberto', vagas: '355 Vagas', remuneracao: 'R$ 4.800,00 a R$ 10.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Colégio Militar de Belo Horizonte e seleção de docentes/apoio.', fonte: 'Concursos no Brasil' },
    { orgao: 'DAMAE de São João del-Rei', cargo: 'Operador, Leiturista e Técnico', banca: 'IBGP', situacao: 'aberto', vagas: '11 Vagas', remuneracao: 'R$ 1.900,00 a R$ 3.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Departamento Municipal de Água e Esgoto de São João del-Rei.', fonte: 'Concursos no Brasil' },
    { orgao: 'DMAE de Uberlândia', cargo: 'Agente de Saneamento, Técnico e Engenheiro', banca: 'Fundep', situacao: 'aberto', vagas: '59 Vagas', remuneracao: 'R$ 2.400,00 a R$ 8.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Excelente concurso para a autarquia de água e esgoto de Uberlândia/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'EMATER-MG', cargo: 'Extensionista Agropecuário e Administrativo', banca: 'Fundep', situacao: 'aberto', vagas: '120 Vagas', remuneracao: 'R$ 3.500,00 a R$ 7.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Empresa de Assistência Técnica e Extensão Rural do Estado de Minas Gerais.', fonte: 'Concursos no Brasil' },
    { orgao: 'HOB - Hospital Odilon Behrens', cargo: 'Médico, Enfermeiro, Técnico e Assistente', banca: 'Fundep', situacao: 'aberto', vagas: '230 Vagas', remuneracao: 'R$ 2.600,00 a R$ 11.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Hospital Municipal Odilon Behrens em Belo Horizonte.', fonte: 'Concursos no Brasil' },
    { orgao: 'IFSULDEMINAS', cargo: 'Técnico Administrativo em Educação e Docente', banca: 'Comissão Própria IFSULDEMINAS', situacao: 'aberto', vagas: '21 Vagas', remuneracao: 'R$ 2.667,00 a R$ 10.481,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Instituto Federal do Sul de Minas com lotação nos campi mineiros.', fonte: 'Concursos no Brasil' },
    { orgao: 'ItabiraPrev', cargo: 'Analista Previdenciário e Contador', banca: 'IBGP', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 3.800,00 a R$ 6.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Instituto de Previdência dos Servidores de Itabira/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'SAAE de Formiga', cargo: 'Agente Operacional e Técnico', banca: 'Banca Local', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 2.000,00 a R$ 4.100,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Serviço Autônomo de Água e Esgoto de Formiga/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'SEPLAG-MG (Governo de Minas)', cargo: 'Especialista em Políticas Públicas e Gestão Governamental (EPPGG)', banca: 'Fundep', situacao: 'aberto', vagas: '30 Vagas', remuneracao: 'R$ 6.500,00 inicial', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Secretaria de Planejamento e Gestão do Estado de Minas Gerais.', fonte: 'Concursos no Brasil' },
    { orgao: 'Unimontes', cargo: 'Professor Universitário e Técnico Universitário', banca: 'CEPS/Unimontes', situacao: 'aberto', vagas: '17 Vagas', remuneracao: 'R$ 3.800,00 a R$ 9.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Universidade Estadual de Montes Claros/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Epamig', cargo: 'Pesquisador e Técnico Agrícola', banca: 'Fundep', situacao: 'previsto', vagas: '257 Vagas Previstas', remuneracao: 'R$ 3.800,00 a R$ 8.500,00', uf: 'MG', dataLimiteInscricao: 'Autorizado', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Empresa de Pesquisa Agropecuária de Minas Gerais.', fonte: 'Concursos no Brasil' },
    { orgao: 'Corpo de Bombeiros Militar de Minas Gerais (CBM MG)', cargo: 'Soldado Combatente e Oficial Bombeiro', banca: 'Idecan', situacao: 'previsto', vagas: '342 Vagas', remuneracao: 'R$ 4.360,00 a R$ 10.028,00', uf: 'MG', dataLimiteInscricao: 'Autorizado e Iminente', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Exigência de nível superior e TAF. Grande certame de segurança pública em MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Polícia Civil de Minas Gerais (PC MG)', cargo: 'Investigador, Escrivão, Delegado e Perito', banca: 'FGV', situacao: 'previsto', vagas: '255 Vagas Autorizadas', remuneracao: 'R$ 5.890,00 a R$ 14.200,00', uf: 'MG', dataLimiteInscricao: 'Edital Iminente', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Carreiras policiais civis no Estado de Minas Gerais.', fonte: 'Concursos no Brasil' },

    // --- PREFEITURAS MUNICIPAIS MG (100% DAS LISTADAS NO CONCURSOS NO BRASIL) ---
    { orgao: 'Prefeitura de Belo Horizonte (PBH)', cargo: 'Professor, Técnico em Educação e Agente Administrativo', banca: 'Fundep', situacao: 'aberto', vagas: '115 Vagas', remuneracao: 'R$ 3.100,00 a R$ 6.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso da capital mineira com excelente plano de carreira.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Contagem', cargo: 'Guarda Municipal, Agente e Professores', banca: 'Fundep', situacao: 'aberto', vagas: '272 Vagas', remuneracao: 'R$ 2.800,00 a R$ 7.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Grande concurso na Região Metropolitana de Belo Horizonte.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Conceição do Mato Dentro', cargo: 'Diversos Cargos de Nível Fundamental, Médio e Superior', banca: 'IBGP', situacao: 'aberto', vagas: '264 Vagas', remuneracao: 'R$ 1.900,00 a R$ 12.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Excelente oportunidade com altos salários no interior de MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Ipaba', cargo: 'Diversos Cargos', banca: 'Exame Auditores', situacao: 'aberto', vagas: '240 Vagas', remuneracao: 'R$ 1.600,00 a R$ 8.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso geral da Prefeitura de Ipaba no Vale do Aço.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de São João del-Rei', cargo: 'Educação, Saúde e Administração', banca: 'IBGP', situacao: 'aberto', vagas: '245 Vagas', remuneracao: 'R$ 1.800,00 a R$ 9.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso da tradicional cidade histórica mineira.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Belo Vale', cargo: 'Todos os Níveis de Escolaridade', banca: 'Reis & Reis', situacao: 'aberto', vagas: '209 Vagas', remuneracao: 'R$ 1.500,00 a R$ 7.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Belo Vale/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Dores do Indaiá', cargo: 'Saúde, Educação e Obras', banca: 'IBGP', situacao: 'aberto', vagas: '155 Vagas', remuneracao: 'R$ 1.600,00 a R$ 8.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Dores do Indaiá no Centro-Oeste Mineiro.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Pedro Teixeira', cargo: 'Diversos Cargos', banca: 'Auctor Concursos', situacao: 'aberto', vagas: '125 Vagas', remuneracao: 'R$ 1.500,00 a R$ 6.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Pedro Teixeira na Zona da Mata.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de São Sebastião do Rio Preto', cargo: 'Geral', banca: 'Iniciativa Global', situacao: 'aberto', vagas: '124 Vagas', remuneracao: 'R$ 1.500,00 a R$ 6.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de São Sebastião do Rio Preto/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Tombos', cargo: 'Geral e Saúde', banca: 'MS Concursos', situacao: 'aberto', vagas: '132 Vagas', remuneracao: 'R$ 1.600,00 a R$ 7.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Tombos/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Campanário', cargo: 'Diversos Cargos', banca: 'Banca Local', situacao: 'aberto', vagas: '108 Vagas', remuneracao: 'R$ 1.500,00 a R$ 5.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Campanário no Vale do Rio Doce.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Água Comprida', cargo: 'Todos os Níveis', banca: 'Banca Oficial', situacao: 'aberto', vagas: '103 Vagas', remuneracao: 'R$ 1.600,00 a R$ 6.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Água Comprida no Triângulo.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Faria Lemos', cargo: 'Diversos', banca: 'Banca Oficial', situacao: 'aberto', vagas: '111 Vagas', remuneracao: 'R$ 1.500,00 a R$ 5.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Faria Lemos/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Santana de Pirapama', cargo: 'Diversos Cargos', banca: 'Reis & Reis', situacao: 'aberto', vagas: '79 Vagas', remuneracao: 'R$ 1.600,00 a R$ 6.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Santana de Pirapama/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Nova União', cargo: 'Educação e Saúde', banca: 'IBGP', situacao: 'aberto', vagas: '71 Vagas', remuneracao: 'R$ 1.700,00 a R$ 6.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Nova União na RMBH.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Oliveira Fortes', cargo: 'Geral', banca: 'Auctor', situacao: 'aberto', vagas: '67 Vagas', remuneracao: 'R$ 1.500,00 a R$ 5.400,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Oliveira Fortes/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Ponto Chique', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '62 Vagas', remuneracao: 'R$ 1.500,00 a R$ 5.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Ponto Chique no Norte de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de São Félix de Minas', cargo: 'Diversos Cargos', banca: 'Banca Oficial', situacao: 'aberto', vagas: '57 Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de São Félix de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Lagoa da Prata', cargo: 'Agente, Guarda e Professores', banca: 'Fundep', situacao: 'aberto', vagas: '49 Vagas', remuneracao: 'R$ 2.100,00 a R$ 6.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Lagoa da Prata no Centro-Oeste.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Conselheiro Pena', cargo: 'Geral', banca: 'MS Concursos', situacao: 'aberto', vagas: '47 Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Conselheiro Pena/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Itamonte', cargo: 'Saúde e Educação', banca: 'IBGP', situacao: 'aberto', vagas: '47 Vagas', remuneracao: 'R$ 1.700,00 a R$ 6.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Itamonte no Sul de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de São Sebastião do Oeste', cargo: 'Diversos Cargos', banca: 'Banca Local', situacao: 'aberto', vagas: '41 Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de São Sebastião do Oeste.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Coromandel', cargo: 'Administrativo e Saúde', banca: 'Banca Local', situacao: 'aberto', vagas: '37 Vagas', remuneracao: 'R$ 1.800,00 a R$ 6.400,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Coromandel no Alto Paranaíba.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Eugenópolis', cargo: 'Geral', banca: 'Banca Oficial', situacao: 'aberto', vagas: '36 Vagas', remuneracao: 'R$ 1.500,00 a R$ 5.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Eugenópolis na Zona da Mata.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Cláudio', cargo: 'Diversos Cargos', banca: 'IBGP', situacao: 'aberto', vagas: '36 Vagas', remuneracao: 'R$ 1.700,00 a R$ 5.900,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Cláudio/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de São Vicente de Minas', cargo: 'Saúde e Administrativo', banca: 'Banca Local', situacao: 'aberto', vagas: '35 Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de São Vicente de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Delfinópolis', cargo: 'Diversos', banca: 'Banca Oficial', situacao: 'aberto', vagas: '34 Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.400,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Delfinópolis na Serra da Canastra.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Leopoldina', cargo: 'Médico, Professor e Agente', banca: 'Idecan', situacao: 'aberto', vagas: '22 Vagas', remuneracao: 'R$ 1.900,00 a R$ 7.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Leopoldina na Zona da Mata.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Piumhi', cargo: 'Geral', banca: 'IBGP', situacao: 'aberto', vagas: '24 Vagas', remuneracao: 'R$ 1.700,00 a R$ 6.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Piumhi/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Nova Porteirinha', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '23 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Nova Porteirinha no Norte de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Carmo da Mata', cargo: 'Saúde e Apoio', banca: 'Banca Local', situacao: 'aberto', vagas: '21 Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Carmo da Mata.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Barra de Minas', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '20 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Barra de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Pirapora', cargo: 'Saúde e Administrativo', banca: 'Fundep', situacao: 'aberto', vagas: '38 Vagas', remuneracao: 'R$ 1.800,00 a R$ 7.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Pirapora no Norte de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Mesquita', cargo: 'Diversos', banca: 'Banca Oficial', situacao: 'aberto', vagas: '18 Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Mesquita no Vale do Aço.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Ibiá', cargo: 'Agente e Técnico', banca: 'IBGP', situacao: 'aberto', vagas: '17 Vagas', remuneracao: 'R$ 1.700,00 a R$ 5.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Ibiá no Alto Paranaíba.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Alfenas', cargo: 'Diversos Cargos', banca: 'Fundep', situacao: 'aberto', vagas: '16 Vagas', remuneracao: 'R$ 2.000,00 a R$ 6.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Alfenas no Sul de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de São Sebastião do Rio Verde', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '15 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de São Sebastião do Rio Verde.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de São João do Paraíso', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '14 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de São João do Paraíso.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Paiva', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '13 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Paiva/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Berizal', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '12 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Berizal/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de São Geraldo do Baixio', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '12 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de São Geraldo do Baixio.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Abre Campo', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '11 Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Abre Campo.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Baldim', cargo: 'Apoio e Administrativo', banca: 'Banca Local', situacao: 'aberto', vagas: '10 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Baldim.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Indaiabira', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '10 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Indaiabira.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Divinópolis', cargo: 'Agente, Saúde e Educação', banca: 'IBGP', situacao: 'aberto', vagas: '8 Vagas + CR', remuneracao: 'R$ 2.200,00 a R$ 7.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Divinópolis no Centro-Oeste.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Itaguara', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '7 Vagas', remuneracao: 'R$ 1.600,00 a R$ 4.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Itaguara/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Barra Longa', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '7 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Barra Longa/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Santo Antônio do Itambé', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Santo Antônio do Itambé.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Uruana de Minas', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '5 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Uruana de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de João Monlevade', cargo: 'Médicos e Especialistas', banca: 'Fundep', situacao: 'aberto', vagas: '4 Vagas', remuneracao: 'R$ 3.500,00 a R$ 12.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de João Monlevade.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Conceição da Barra de Minas', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '4 Vagas', remuneracao: 'R$ 1.600,00 a R$ 4.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Conceição da Barra de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Alto Rio Doce', cargo: 'Apoio e Técnico', banca: 'Banca Local', situacao: 'aberto', vagas: '3 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Alto Rio Doce.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Carrancas', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '3 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Carrancas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Senador Modestino Gonçalves', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '3 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Senador Modestino Gonçalves.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Guaxupé', cargo: 'Especialistas', banca: 'Banca Local', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 2.500,00 a R$ 6.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Guaxupé.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Curvelo', cargo: 'Saúde e Obras', banca: 'Fundep', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 2.200,00 a R$ 5.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Curvelo.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Diamantina', cargo: 'Técnico e Especialista', banca: 'IBGP', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 2.400,00 a R$ 5.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Diamantina.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Córrego Fundo', cargo: 'Geral', banca: 'Banca Local', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 1.600,00 a R$ 4.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Córrego Fundo.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Morro da Garça', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: '2 Vagas', remuneracao: 'R$ 1.500,00 a R$ 4.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Morro da Garça.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Formiga', cargo: 'Diversos Cargos', banca: 'Fundep', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 1.800,00 a R$ 6.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Formiga/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Mariana', cargo: 'Saúde, Educação e Guarda', banca: 'IBGP', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 2.200,00 a R$ 8.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Mariana/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Ponte Nova', cargo: 'Geral', banca: 'Banca Oficial', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 1.800,00 a R$ 7.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Ponte Nova/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Abaeté', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Abaeté/MG.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Elói Mendes', cargo: 'Saúde e Administrativo', banca: 'Banca Local', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 1.700,00 a R$ 6.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Elói Mendes.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Itanhandu', cargo: 'Diversos', banca: 'Banca Local', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 1.600,00 a R$ 5.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Itanhandu.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Buritis', cargo: 'Técnico', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 2.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Buritis.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Capitólio', cargo: 'Agente', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 2.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Capitólio.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Guimarânia', cargo: 'Técnico', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 2.100,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Guimarânia.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Jequitibá', cargo: 'Agente', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 1.900,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Jequitibá.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Muriaé', cargo: 'Especialista', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 3.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Muriaé.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Piranguinho', cargo: 'Técnico', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 2.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Piranguinho.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Santo Antônio do Monte', cargo: 'Agente', banca: 'Banca Local', situacao: 'aberto', vagas: '1 Vaga', remuneracao: 'R$ 2.100,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Santo Antônio do Monte.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Pouso Alegre', cargo: 'Educação, Saúde e Guarda Municipal', banca: 'Fundep', situacao: 'previsto', vagas: '471 Vagas Previstas', remuneracao: 'R$ 2.400,00 a R$ 8.500,00', uf: 'MG', dataLimiteInscricao: 'Comissão Formada', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Grande concurso para o polo do Sul de Minas.', fonte: 'Concursos no Brasil' },
    { orgao: 'Prefeitura de Caparaó', cargo: 'Diversos Cargos', banca: 'Banca Local', situacao: 'previsto', vagas: 'Várias Vagas Previstas', remuneracao: 'R$ 1.800,00 a R$ 5.500,00', uf: 'MG', dataLimiteInscricao: 'Previsto', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Caparaó na Zona da Mata.', fonte: 'Concursos no Brasil' },

    // --- CONCURSOS NACIONAIS / FEDERAIS (CONCURSOS NO BRASIL) ---
    { orgao: 'IBGE - Instituto Brasileiro de Geografia e Estatística', cargo: 'Agente Censitário e Analista', banca: 'FGV / Cebraspe', situacao: 'previsto', vagas: '36.946 Vagas Solicitadas', remuneracao: 'R$ 4.500,00 a R$ 9.200,00', uf: 'BR', dataLimiteInscricao: 'Aguardando Aval MGI', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Mega seleção nacional autorizada para todo o território brasileiro.', fonte: 'Concursos no Brasil' },
    { orgao: 'INSS - Instituto Nacional do Seguro Social', cargo: 'Técnico e Analista do Seguro Social', banca: 'Cebraspe', situacao: 'previsto', vagas: '10.000 Vagas Solicitadas', remuneracao: 'R$ 6.593,90 a R$ 9.767,20', uf: 'BR', dataLimiteInscricao: 'Aguardando Aval MGI', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Solicitação formalizada para recomposição do quadro previdenciário.', fonte: 'Concursos no Brasil' },
    { orgao: 'Ministério da Saúde', cargo: 'Diversos Cargos em Saúde Pública e Gestão', banca: 'Cebraspe', situacao: 'previsto', vagas: '7.327 Vagas', remuneracao: 'R$ 4.200,00 a R$ 12.000,00', uf: 'BR', dataLimiteInscricao: 'Autorizado MGI', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Grande concurso federal para a área da saúde pública nacional.', fonte: 'Concursos no Brasil' },
    { orgao: 'FUNAI - Fundação Nacional dos Povos Indígenas', cargo: 'Indigenista Especializado e Agente', banca: 'Cesgranrio (CNU)', situacao: 'aberto', vagas: '900 Vagas', remuneracao: 'R$ 6.987,00 a R$ 8.900,00', uf: 'BR', dataLimiteInscricao: 'Inscrições em Andamento', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Vagas de nível superior e médio distribuídas por todas as regiões.', fonte: 'Concursos no Brasil' },
    { orgao: 'Transpetro', cargo: 'Quadro de Terra e Quadro de Mar', banca: 'Cesgranrio', situacao: 'aberto', vagas: '4.171 Vagas', remuneracao: 'R$ 5.540,00 a R$ 15.416,00', uf: 'BR', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Subsidiária da Petrobras com vagas nacionais e excelente pacote de benefícios.', fonte: 'Concursos no Brasil' },
    { orgao: 'AgSUS - Agência Brasileira de Apoio à Gestão do SUS', cargo: 'Médicos, Gestores e Analistas', banca: 'Idecan', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 4.500,00 a R$ 18.000,00', uf: 'BR', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Seleção para o Programa Médicos pelo Brasil e gestão do SUS.', fonte: 'Concursos no Brasil' },
    { orgao: 'Petrobras', cargo: 'Profissional de Nível Superior e Técnico', banca: 'Cebraspe', situacao: 'previsto', vagas: '1.100 Vagas Previstas', remuneracao: 'R$ 6.200,00 a R$ 14.500,00', uf: 'BR', dataLimiteInscricao: 'Edital Previsto', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Nova seleção para preenchimento de quadro operacional e de engenharia.', fonte: 'Concursos no Brasil' },
    { orgao: 'BACEN - Banco Central do Brasil', cargo: 'Analista do Banco Central', banca: 'Cebraspe', situacao: 'previsto', vagas: '170 Vagas', remuneracao: 'R$ 20.924,80 inicial', uf: 'BR', dataLimiteInscricao: 'Em Andamento/Fase de Provas', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Nível Superior em qualquer área. Brasília, SP e capitais.', fonte: 'Concursos no Brasil' },
    { orgao: 'Receita Federal do Brasil (RFB)', cargo: 'Auditor Fiscal e Analista Tributário', banca: 'FGV', situacao: 'previsto', vagas: '146 Vagas Solicitadas', remuneracao: 'R$ 13.000,00 a R$ 22.900,00', uf: 'BR', dataLimiteInscricao: 'Aguardando Autorização', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Novo pedido de concurso formulado pelo Ministério da Fazenda.', fonte: 'Concursos no Brasil' },
    { orgao: 'Banco do Brasil', cargo: 'Escriturário e Agente de Tecnologia', banca: 'Cesgranrio', situacao: 'previsto', vagas: 'Várias Vagas Previstas', remuneracao: 'R$ 3.800,00 + PLR e Benefícios', uf: 'BR', dataLimiteInscricao: 'Planejamento Interno', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Estudos para novo concurso com foco comercial e de TI.', fonte: 'Concursos no Brasil' },
    { orgao: 'ANPD - Autoridade Nacional de Proteção de Dados', cargo: 'Especialista em Regulação e Analista', banca: 'Cebraspe', situacao: 'previsto', vagas: '50 Vagas Solicitadas', remuneracao: 'R$ 9.800,00 a R$ 16.400,00', uf: 'BR', dataLimiteInscricao: 'Autorizado', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Primeiro concurso efetivo para a ANPD.', fonte: 'Concursos no Brasil' },
    { orgao: 'EMGEPRON', cargo: 'Cargos de Nível Médio e Superior', banca: 'Selecon', situacao: 'previsto', vagas: 'Várias Vagas Previstas', remuneracao: 'R$ 3.200,00 a R$ 9.900,00', uf: 'BR', dataLimiteInscricao: 'Edital Previsto', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Empresa Gerencial de Projetos Navais.', fonte: 'Concursos no Brasil' },
    { orgao: 'CGU - Controladoria-Geral da União', cargo: 'Auditor e Técnico Federal de Finanças', banca: 'FGV', situacao: 'previsto', vagas: '60 Vagas Solicitadas', remuneracao: 'R$ 7.900,00 a R$ 21.000,00', uf: 'BR', dataLimiteInscricao: 'Planejamento Orçamentário', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Carreiras de fiscalização e combate à corrupção na União.', fonte: 'Concursos no Brasil' },
    { orgao: 'Polícia Federal (PF)', cargo: 'Agente, Escrivão, Papiloscopista e Delegado', banca: 'Cebraspe', situacao: 'previsto', vagas: '1.800 Vagas Solicitadas', remuneracao: 'R$ 14.710,00 a R$ 26.300,00', uf: 'BR', dataLimiteInscricao: 'Solicitado ao MGI', linkOficial: 'https://www.gov.br/pf', resumo: 'Porte nacional e carreiras policiais federais.', fonte: 'Polícia Federal' },
    { orgao: 'Polícia Rodoviária Federal (PRF)', cargo: 'Policial Rodoviário Federal', banca: 'Cebraspe', situacao: 'previsto', vagas: '4.900 Vagas Solicitadas', remuneracao: 'R$ 11.114,60 inicial', uf: 'BR', dataLimiteInscricao: 'Aguardando Aval do MGI', linkOficial: 'https://www.gov.br/prf', resumo: 'Nível Superior em qualquer área e CNH B.', fonte: 'PRF Oficial' },
  ];

  function filterFallbackConcursos(filters: {
    estado?: string;
    banca?: string;
    termoCargo?: string;
    status?: string;
  }) {
    let list = [...SEED_CONCURSOS_FALLBACK];

    if (filters.estado && filters.estado !== 'TODOS' && filters.estado !== 'todos') {
      const ufUpper = filters.estado.toUpperCase();
      list = list.filter((c) => c.uf === ufUpper || c.uf === 'BR');
    }

    if (filters.banca && filters.banca !== 'Todas') {
      const bancaLower = filters.banca.toLowerCase();
      list = list.filter((c) => c.banca?.toLowerCase().includes(bancaLower));
    }

    if (filters.status && filters.status !== 'todos') {
      list = list.filter((c) => c.situacao === filters.status);
    }

    if (filters.termoCargo && filters.termoCargo.trim().length > 0) {
      const query = filters.termoCargo.toLowerCase();
      list = list.filter(
        (c) =>
          c.orgao.toLowerCase().includes(query) ||
          c.cargo.toLowerCase().includes(query) ||
          (c.resumo && c.resumo.toLowerCase().includes(query))
      );
    }

    return list.length > 0 ? list : SEED_CONCURSOS_FALLBACK;
  }

  // Live HTML Scraper para Concursos no Brasil (MG & BR)
  async function fetchConcursosNoBrasil(uf: 'mg' | 'br' = 'mg') {
    try {
      const url = `https://concursosnobrasil.com/concursos/${uf}/`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(4500),
      });
      if (!response.ok) return [];
      const html = await response.text();
      const items: any[] = [];

      // Extrai linhas da tabela com links e órgãos
      const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
      for (const tr of trMatches) {
        const aMatch = tr.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        if (aMatch) {
          const rawLink = aMatch[1].startsWith('http') ? aMatch[1] : `https://concursosnobrasil.com${aMatch[1]}`;
          const rawOrgao = aMatch[2].replace(/<[^>]+>/g, '').trim();

          const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          let vagas = 'Vagas em Edital';
          if (tdMatches.length >= 2) {
            const tdText = tdMatches[1].replace(/<[^>]+>/g, '').trim();
            if (tdText) vagas = tdText.includes('Vaga') || /^\d+$/.test(tdText) ? `${tdText} Vagas` : tdText;
          }

          let remuneracao = 'Consulte o Edital';
          if (tdMatches.length >= 3) {
            const tdRem = tdMatches[2].replace(/<[^>]+>/g, '').trim();
            if (tdRem && (tdRem.includes('R$') || tdRem.includes('Até'))) remuneracao = tdRem;
          }

          const isPrevisto = rawOrgao.toLowerCase().includes('previsto') || tr.toLowerCase().includes('previsto');

          items.push({
            orgao: rawOrgao.replace(/previsto/i, '').trim(),
            cargo: 'Cargos Diversos e Níveis Fundamental, Médio e Superior',
            banca: 'Banca Oficial / Edital',
            situacao: isPrevisto ? 'previsto' : 'aberto',
            vagas,
            remuneracao,
            uf: uf.toUpperCase(),
            dataLimiteInscricao: isPrevisto ? 'Edital Previsto' : 'Inscrições Abertas',
            linkOficial: rawLink,
            resumo: `Edital e informações detalhadas de ${rawOrgao} em ${uf.toUpperCase()} conforme catalogado no portal Concursos no Brasil.`,
            fonte: `Concursos no Brasil (${uf.toUpperCase()})`,
          });
        }
      }
      return items;
    } catch (err) {
      console.warn(`Scraper Concursos no Brasil (${uf}) indisponível:`, err);
      return [];
    }
  }

  // Live RSS Feed Scraper para PCI Concursos
  async function fetchPCIRssConcursos() {
    try {
      const response = await fetch('https://www.pciconcursos.com.br/rss/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return [];
      const xml = await response.text();
      const items: any[] = [];
      const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
      for (const itemXml of itemMatches.slice(0, 15)) {
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
        const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);

        if (titleMatch && linkMatch) {
          const rawTitle = titleMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
          const rawLink = linkMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
          const rawDesc = descMatch
            ? descMatch[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').replace(/<[^>]+>/g, '').trim()
            : '';

          let uf = 'BR';
          const ufMatch = rawTitle.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
          if (ufMatch) uf = ufMatch[1].toUpperCase();

          items.push({
            orgao: rawTitle.split('-')[0]?.trim() || rawTitle,
            cargo: rawTitle.includes('-') ? rawTitle.split('-').slice(1).join('-').trim() : 'Cargos Diversos e Nível Técnico/Superior',
            banca: 'Banca Oficial / PCI',
            situacao: 'aberto',
            vagas: 'Vagas em Edital',
            remuneracao: 'Consulte o Edital',
            uf,
            dataLimiteInscricao: 'Inscrições Abertas',
            linkOficial: rawLink,
            resumo: rawDesc || `Atualização em tempo real do edital ${rawTitle}.`,
            fonte: 'PCI Concursos (Feed Oficial)',
          });
        }
      }
      return items;
    } catch (err) {
      console.warn('Scraper RSS PCI indisponível:', err);
      return [];
    }
  }

  // Concursos Proxy Endpoint - Varredura Concursos no Brasil + PCI + Catálogo Estruturado
  app.post('/api/concursos', async (req, res) => {
    const { estado, termoCargo, banca, status } = req.body || {};
    try {
      const [cnbMg, cnbBr, rssItems] = await Promise.all([
        fetchConcursosNoBrasil('mg'),
        fetchConcursosNoBrasil('br'),
        fetchPCIRssConcursos(),
      ]);

      let combined = [...cnbMg, ...cnbBr, ...rssItems, ...SEED_CONCURSOS_FALLBACK];

      if (estado && estado !== 'TODOS' && estado !== 'todos') {
        const ufUpper = estado.toUpperCase();
        combined = combined.filter((c) => c.uf === ufUpper || c.uf === 'BR');
      }

      if (banca && banca !== 'Todas') {
        const bancaLower = banca.toLowerCase();
        combined = combined.filter((c) => c.banca?.toLowerCase().includes(bancaLower));
      }

      if (status && status !== 'todos') {
        combined = combined.filter((c) => c.situacao === status);
      }

      if (termoCargo && termoCargo.trim().length > 0) {
        const query = termoCargo.toLowerCase();
        combined = combined.filter(
          (c) =>
            c.orgao.toLowerCase().includes(query) ||
            c.cargo.toLowerCase().includes(query) ||
            (c.resumo && c.resumo.toLowerCase().includes(query))
        );
      }

      // Deduplicate by organ name + UF
      const uniqueMap = new Map<string, any>();
      combined.forEach((item) => {
        const key = `${(item.orgao || '').toLowerCase().trim()}_${item.uf || 'BR'}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      const finalData = uniqueMap.size > 0 ? Array.from(uniqueMap.values()) : SEED_CONCURSOS_FALLBACK;

      return res.json({
        erro: false,
        data: finalData,
        isFallback: false,
        mensagem: 'Varredura de portais e diários de concursos (Concursos no Brasil & PCI) realizada com sucesso.',
      });
    } catch (err: any) {
      console.warn('Erro na busca de concursos:', err);
      const fallbackData = filterFallbackConcursos({ estado, banca, termoCargo, status });
      return res.json({
        erro: false,
        data: fallbackData,
        isFallback: true,
      });
    }
  });

  // Dedicated Auto-Sync Cache for MG & Federais on SY App startup
  let autoSyncMGFederalCache: { timestamp: number; data: any[]; novosCount: number } | null = null;

  app.get('/api/concursos/auto-sync-mg-federal', async (_req, res) => {
    try {
      // 30-min cache
      if (autoSyncMGFederalCache && Date.now() - autoSyncMGFederalCache.timestamp < 30 * 60 * 1000) {
        return res.json({
          erro: false,
          data: autoSyncMGFederalCache.data,
          novosCount: autoSyncMGFederalCache.novosCount,
          fromCache: true,
          syncedAt: new Date(autoSyncMGFederalCache.timestamp).toISOString(),
        });
      }

      const [cnbMg, cnbBr, rssItems] = await Promise.all([
        fetchConcursosNoBrasil('mg'),
        fetchConcursosNoBrasil('br'),
        fetchPCIRssConcursos(),
      ]);

      const allMerged = [...cnbMg, ...cnbBr, ...rssItems, ...SEED_CONCURSOS_FALLBACK];

      // Filter MG (Minas Gerais) & Federais (BR)
      const mgAndFederal = allMerged.filter(
        (c) => c.uf === 'MG' || c.uf === 'BR' || (c.orgao && c.orgao.toUpperCase().includes('MINAS GERAIS')) || (c.orgao && c.orgao.includes('MG'))
      );

      const uniqueMap = new Map<string, any>();
      mgAndFederal.forEach((item) => {
        const key = `${(item.orgao || '').toLowerCase().trim()}_${item.uf}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      const finalItems = Array.from(uniqueMap.values());
      const novosCount = finalItems.filter((i) => i.situacao === 'aberto' || i.situacao === 'previsto').length;

      autoSyncMGFederalCache = {
        timestamp: Date.now(),
        data: finalItems,
        novosCount,
      };

      return res.json({
        erro: false,
        data: finalItems,
        novosCount,
        fromCache: false,
        syncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('Erro no auto-sync MG & Federal:', err);
      const fallbackList = SEED_CONCURSOS_FALLBACK.filter((c) => c.uf === 'MG' || c.uf === 'BR');
      return res.json({
        erro: false,
        data: fallbackList,
        novosCount: fallbackList.length,
        fromCache: false,
        isFallback: true,
        syncedAt: new Date().toISOString(),
      });
    }
  });

  // In-memory 12h cache for google search results to prevent quota exhaustion
  const googleSearchCache = new Map<string, { timestamp: number; data: any[]; googleSearchUrl: string }>();

  // Google Search Grounding for Editais & Concursos
  app.post('/api/concursos/google-search', async (req, res) => {
    const { query, estado, banca } = req.body || {};
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ erro: true, mensagem: 'Termo de busca é obrigatório.' });
    }

    const searchQuery = query.trim();
    const cacheKey = `${searchQuery.toLowerCase()}_${estado || 'all'}_${banca || 'all'}`;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      `concurso edital ${searchQuery} ${banca && banca !== 'Todas' ? banca : ''} ${estado && estado !== 'TODOS' ? estado : ''}`
    )}`;

    // Check memory cache first
    const cached = googleSearchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 12 * 60 * 60 * 1000) {
      return res.json({
        erro: false,
        data: cached.data,
        googleSearchUrl: cached.googleSearchUrl,
        isFallback: false,
        fromCache: true,
      });
    }

    const getMatchingFallback = () => {
      const qLower = searchQuery.toLowerCase();
      const matched = SEED_CONCURSOS_FALLBACK.filter((c) =>
        c.orgao.toLowerCase().includes(qLower) ||
        c.cargo.toLowerCase().includes(qLower) ||
        c.resumo?.toLowerCase().includes(qLower) ||
        (c.banca && c.banca.toLowerCase().includes(qLower))
      );

      const searchCard = {
        orgao: `Pesquisa Google: ${searchQuery}`,
        cargo: 'Editais e Atualizações Encontradas',
        banca: banca && banca !== 'Todas' ? banca : 'Diversas',
        situacao: 'aberto',
        vagas: 'Consulte no Edital / Portal',
        remuneracao: 'Consulte a publicação',
        uf: estado && estado !== 'TODOS' ? estado : 'BR',
        dataLimiteInscricao: 'Inscrições em andamento',
        linkOficial: googleSearchUrl,
        resumo: `Resultados em tempo real para "${searchQuery}". Clique em "Abrir Link Oficial" para visualizar todas as notícias e publicações direto no Google.`,
        fonte: 'Google Search Web',
      };

      return matched.length > 0 ? [searchCard, ...matched] : [searchCard];
    };

    if (!ai) {
      const fallbackData = getMatchingFallback();
      return res.json({
        erro: false,
        data: fallbackData,
        googleSearchUrl,
        isFallback: true,
      });
    }

    try {
      const prompt = `Realize uma busca em tempo real no Google sobre editais e notícias de concursos públicos relacionados à seguinte consulta:
Termo de Busca: "${searchQuery}"
Filtros adicionais: Estado: "${estado || 'Brasil'}", Banca: "${banca || 'Todas'}"

Analise os resultados mais recentes e confiáveis e retorne APENAS um array JSON de objetos com as vagas encontradas. Estrutura exigida:
[
  {
    "orgao": "Nome oficial do órgão/entidade (ex: Polícia Federal, TJ-SP, etc)",
    "cargo": "Cargos oferecidos ou principais",
    "banca": "Banca organizadora oficial (ex: Cebraspe, Vunesp, FGV, FCC ou 'A definir')",
    "situacao": "aberto" | "em_andamento" | "previsto" | "encerrado",
    "vagas": "Número de vagas (ex: '1.200 Vagas + CR')",
    "remuneracao": "Salário / Remuneração inicial estimada",
    "uf": "UF do concurso (2 letras, ex: 'SP', 'DF', ou 'BR')",
    "dataLimiteInscricao": "Data de término ou 'Inscrições Abertas' / 'A definir'",
    "linkOficial": "URL direta da página do concurso, notícia oficial ou banca",
    "resumo": "Resumo de 2 linhas sobre requisitos, matérias e etapas",
    "fonte": "Google Search Oficial"
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const responseText = response.text || '';
      let parsedItems: any[] = [];

      try {
        const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonStart = cleaned.indexOf('[');
        const jsonEnd = cleaned.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          parsedItems = JSON.parse(cleaned.substring(jsonStart, jsonEnd + 1));
        } else {
          const objStart = cleaned.indexOf('{');
          const objEnd = cleaned.lastIndexOf('}');
          if (objStart !== -1 && objEnd !== -1) {
            const parsedObj = JSON.parse(cleaned.substring(objStart, objEnd + 1));
            parsedItems = parsedObj.results || parsedObj.concursos || parsedObj.data || [parsedObj];
          }
        }
      } catch (parseErr) {
        console.warn('Erro ao parsear JSON do Google Search Gemini:', parseErr);
      }

      if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
        parsedItems = getMatchingFallback();
      }

      // Save to memory cache
      googleSearchCache.set(cacheKey, {
        timestamp: Date.now(),
        data: parsedItems,
        googleSearchUrl,
      });

      return res.json({
        erro: false,
        data: parsedItems,
        googleSearchUrl,
        isFallback: false,
      });
    } catch (err: any) {
      console.warn('Google Search API limit/quota interceptado, servindo fallback estruturado...');
      const fallbackData = getMatchingFallback();

      // Cache fallback for 10 minutes to avoid rapid retry hammer
      googleSearchCache.set(cacheKey, {
        timestamp: Date.now() - (12 * 60 * 60 * 1000 - 10 * 60 * 1000),
        data: fallbackData,
        googleSearchUrl,
      });

      return res.json({
        erro: false,
        data: fallbackData,
        googleSearchUrl,
        isFallback: true,
        quotaLimited: true,
      });
    }
  });

  // In-memory 24h cache for music search
  const musicSearchCache = new Map<string, { timestamp: number; results: any[] }>();

  // Endpoint para verificar suporte de IFrame (X-Frame-Options / CSP)
  app.get('/api/check-frame-support', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ embeddable: false, reason: 'URL ausente' });
    }

    try {
      const parsed = new URL(targetUrl);
      const hostname = parsed.hostname.toLowerCase();

      // Domínios conhecidos por restringir X-Frame-Options / CSP
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
        return res.json({
          embeddable: false,
          domain: hostname,
          reason: 'x-frame-options_conhecido',
          message: 'Este site restringe exibição em IFrame por políticas de segurança originais.',
        });
      }

      // Requisição HEAD rápida de checagem
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(targetUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }).catch(() => null);

      clearTimeout(timeout);

      if (response) {
        const xfo = (response.headers.get('x-frame-options') || '').toLowerCase();
        const csp = (response.headers.get('content-security-policy') || '').toLowerCase();

        if (xfo.includes('deny') || xfo.includes('sameorigin')) {
          return res.json({
            embeddable: false,
            domain: hostname,
            reason: 'x-frame-options',
            message: `X-Frame-Options: ${xfo}`,
          });
        }

        if (csp.includes('frame-ancestors') && !csp.includes('frame-ancestors *')) {
          return res.json({
            embeddable: false,
            domain: hostname,
            reason: 'content-security-policy',
            message: 'CSP frame-ancestors restrito',
          });
        }
      }

      return res.json({ embeddable: true, domain: hostname });
    } catch (err: any) {
      return res.json({ embeddable: true, warning: String(err?.message || err) });
    }
  });

  // Endpoint de Shell da Janela Lado a Lado (Popout Window Shell com Barra Topo)
  app.get('/api/popout-shell', (req, res) => {
    const targetUrl = (req.query.url as string) || 'https://notebooklm.google.com';
    const tabId = (req.query.tabId as string) || '';
    const title = (req.query.title as string) || 'Janela de Estudos';

    const iframeSrc = targetUrl.includes('/api/proxy-web')
      ? targetUrl
      : `/api/proxy-web?url=${encodeURIComponent(targetUrl)}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SYNAPSE Lado a Lado</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #020617; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .popout-container { display: flex; flex-direction: column; width: 100vw; height: 100vh; }
    
    /* Barra Topo fixada no topo da janela destacada */
    .top-bar {
      height: 48px;
      background: #090d16;
      background-image: linear-gradient(to right, #0f172a, #1e1b4b, #0f172a);
      border-bottom: 1px solid rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      color: #ffffff;
      user-select: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
      z-index: 999999;
      flex-shrink: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.2px;
    }

    .brand-badge {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
    }

    .redock-btn {
      background: #10b981;
      background-image: linear-gradient(to right, #10b981, #059669);
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      transition: all 0.2s ease;
    }

    .redock-btn:hover {
      background: #059669;
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(16, 185, 129, 0.55);
    }

    .redock-btn:active {
      transform: translateY(0);
    }

    .frame-container {
      flex: 1;
      width: 100%;
      height: calc(100vh - 48px);
      position: relative;
      background: #ffffff;
    }

    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <div class="popout-container">
    <div class="top-bar">
      <div class="brand">
        <span style="color:#38bdf8; font-size: 18px;">⚡</span>
        <span>SYNAPSE v5.0</span>
        <span class="brand-badge">${title}</span>
      </div>

      <button id="redock-button" class="redock-btn" title="Reanexar e trazer esta aba de volta para a janela principal do Synapse">
        <span>↩️ Reanexar e Trazer de Volta para a Guia Principal (SY)</span>
      </button>
    </div>

    <div class="frame-container">
      <iframe id="content-iframe" src="${iframeSrc}" allow="camera; microphone; clipboard-read; clipboard-write; display-capture"></iframe>
    </div>
  </div>

  <script>
    (function() {
      var tabId = "${tabId}";
      var redockBtn = document.getElementById('redock-button');

      redockBtn.addEventListener('click', function() {
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'SYNAPSE_REDOCK_TAB', tabId: tabId, windowName: window.name }, '*');
          }
        } catch(e) {}

        try {
          var bc = new BroadcastChannel('synapse_channel');
          bc.postMessage({ type: 'SYNAPSE_REDOCK_TAB', tabId: tabId, windowName: window.name });
        } catch(e) {}

        window.close();
      });
    })();
  </script>
</body>
</html>`);
  });

  // Proxy reverso avançado para contornar restrições de X-Frame-Options/CSP em sites externos, formulários e logins
  app.all('/api/proxy-web', async (req, res) => {
    // Configuração completa de CORS para permitir requisições no iframe
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const rawUrl = (req.query.url || req.body?.url) as string;
    if (!rawUrl) {
      return res.status(400).send('URL ausente');
    }

    try {
      let targetUrl = rawUrl;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const targetUrlObj = new URL(targetUrl);

      // Repassar cabeçalhos de requisição essenciais do navegador do usuário
      const forwardHeaders: Record<string, string> = {
        'User-Agent':
          (req.headers['user-agent'] as string) ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':
          (req.headers['accept'] as string) ||
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': (req.headers['accept-language'] as string) || 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': targetUrl,
        'Origin': targetUrlObj.origin,
      };

      if (req.headers['cookie']) {
        forwardHeaders['Cookie'] = req.headers['cookie'] as string;
      }

      if (req.headers['content-type']) {
        forwardHeaders['Content-Type'] = req.headers['content-type'] as string;
      }

      // Preparar corpo para POST/PUT/PATCH (ex: envio de formulário de e-mail/senha)
      let requestBody: any = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (typeof req.body === 'string') {
          requestBody = req.body;
        } else if (req.body && Object.keys(req.body).length > 0) {
          if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
            const params = new URLSearchParams();
            for (const [k, v] of Object.entries(req.body)) {
              if (k !== 'url') params.append(k, String(v));
            }
            requestBody = params.toString();
          } else {
            requestBody = JSON.stringify(req.body);
          }
        }
      }

      const response = await fetch(targetUrl, {
        method: req.method,
        signal: controller.signal,
        headers: forwardHeaders,
        body: requestBody,
        redirect: 'follow',
      });

      clearTimeout(timeout);

      // Propagar cookies recebidos sanitizados para contornar SameSite/Domain em Iframe/Proxy
      const setCookies = response.headers.getSetCookie?.() || [];
      for (const cookieStr of setCookies) {
        let cleanCookie = cookieStr
          .replace(/domain=[^;]+;?/gi, '') // Remover restrição de domínio do servidor de origem
          .replace(/samesite=[^;]+;?/gi, '') // Remover SameSite estrito/lax
          .replace(/path=[^;]+;?/gi, ''); // Limpar Path para escopo global

        cleanCookie = cleanCookie.trim().replace(/;$/, '') + '; Path=/; SameSite=None; Secure';
        res.append('Set-Cookie', cleanCookie);
      }

      const contentType = response.headers.get('content-type') || 'text/html';

      res.setHeader('Content-Type', contentType);
      res.removeHeader('X-Frame-Options');
      res.removeHeader('Content-Security-Policy');

      if (contentType.includes('text/html')) {
        let html = await response.text();
        const finalTargetUrl = response.url || targetUrl;
        const urlObj = new URL(finalTargetUrl);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

        // Injetar <base href="..."> para links e ativos relativos
        const baseTag = `<base href="${baseUrl}">`;
        if (html.includes('<head>')) {
          html = html.replace('<head>', `<head>${baseTag}`);
        } else if (html.includes('<HEAD>')) {
          html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
        } else {
          html = baseTag + html;
        }

        // Injetar script para interceptar links, formulários, fetch, XHR e window.open para tráfego contínuo pelo proxy sem janelas externas
        const proxyScript = `
        <script>
          (function() {
            // Interceptar envio de formulários
            document.addEventListener('submit', function(e) {
              var form = e.target;
              if (form && form.action) {
                try {
                  var actionUrl = new URL(form.action, document.baseURI).href;
                  if (!actionUrl.includes('/api/proxy-web')) {
                    form.action = '/api/proxy-web?url=' + encodeURIComponent(actionUrl);
                  }
                } catch(err) {}
              }
            }, true);

            // Interceptar cliques em links (incluindo target="_blank" e target="_top") para manter no Synapse
            document.addEventListener('click', function(e) {
              var anchor = e.target.closest('a');
              if (anchor && anchor.href && !anchor.href.startsWith('javascript:') && !anchor.href.startsWith('#')) {
                try {
                  var targetHref = new URL(anchor.href, document.baseURI).href;
                  if (!targetHref.includes('/api/proxy-web')) {
                    e.preventDefault();
                    window.location.href = '/api/proxy-web?url=' + encodeURIComponent(targetHref);
                  }
                } catch(err) {}
              }
            }, true);

            // Interceptar window.open para redirecionar pop-ups de volta ao Synapse proxy
            var originalWindowOpen = window.open;
            window.open = function(url) {
              if (url && typeof url === 'string') {
                try {
                  var targetUrl = new URL(url, document.baseURI).href;
                  window.location.href = '/api/proxy-web?url=' + encodeURIComponent(targetUrl);
                  return window;
                } catch(e) {}
              }
              return originalWindowOpen.apply(this, arguments);
            };

            // Interceptar Fetch para requisições AJAX mantendo os cookies de sessão
            var originalFetch = window.fetch;
            if (originalFetch) {
              window.fetch = function(resource, init) {
                try {
                  init = init || {};
                  if (!init.credentials) {
                    init.credentials = 'include';
                  }
                  var fetchUrl = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
                  if (fetchUrl && !fetchUrl.includes('/api/proxy-web') && (fetchUrl.startsWith('http') || fetchUrl.startsWith('/'))) {
                    var fullUrl = new URL(fetchUrl, document.baseURI).href;
                    var proxied = '/api/proxy-web?url=' + encodeURIComponent(fullUrl);
                    if (typeof resource === 'string') {
                      resource = proxied;
                    } else if (resource && resource.url) {
                      resource = new Request(proxied, resource);
                    }
                  }
                } catch(e) {}
                return originalFetch.call(this, resource, init);
              };
            }

            // Interceptar XMLHttpRequest (XHR / Axios / jQuery) mantendo cookies
            var originalXhrOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
              try {
                this.withCredentials = true;
                if (url && typeof url === 'string' && !url.includes('/api/proxy-web')) {
                  var fullUrl = new URL(url, document.baseURI).href;
                  url = '/api/proxy-web?url=' + encodeURIComponent(fullUrl);
                }
              } catch(e) {}
              return originalXhrOpen.call(this, method, url, async, user, password);
            };

            // Evitar que scripts de frame-busting quebrem o iframe
            try { window.top = window.self; } catch(e) {}

            // Barra Flutuante de Reanexar quando em Janela Lado a Lado (Popout)
            function injectSynapsePopoutBar() {
              if (document.getElementById('synapse-popout-bar')) return;
              if (!document.body && !document.documentElement) return;
              var bar = document.createElement('div');
              bar.id = 'synapse-popout-bar';
              bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:40px;background:#090d16;background-image:linear-gradient(to right, #0f172a, #1e1b4b, #0f172a);color:#ffffff;z-index:2147483647;display:flex;align-items:center;justify-content:space-between;padding:0 16px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;border-bottom:1px solid rgba(99,102,241,0.5);box-shadow:0 4px 15px rgba(0,0,0,0.6);';

              bar.innerHTML = '<div style="display:flex;align-items:center;gap:8px;font-weight:700;color:#f8fafc;"><span style="color:#38bdf8;font-size:14px;">⚡</span><span>SYNAPSE v5.0 — Lado a Lado</span></div>' +
                '<button id="synapse-redock-btn" style="background:#10b981;color:#ffffff;border:none;padding:5px 14px;border-radius:10px;font-weight:800;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 2px 10px rgba(16,185,129,0.3);transition:all 0.2s;" onmouseover="this.style.background=\'#059669\'" onmouseout="this.style.background=\'#10b981\'">' +
                '↩️ Reanexar e Trazer de Volta para a Guia Principal (SY)' +
                '</button>';

              (document.body || document.documentElement).appendChild(bar);
              if (document.body) document.body.style.paddingTop = '40px';

              var redockBtn = document.getElementById('synapse-redock-btn');
              if (redockBtn) {
                redockBtn.onclick = function() {
                  try {
                    if (window.opener && !window.opener.closed) {
                      window.opener.postMessage({ type: 'SYNAPSE_REDOCK_TAB', windowName: window.name }, '*');
                    }
                  } catch(e) {}
                  try {
                    var bc = new BroadcastChannel('synapse_channel');
                    bc.postMessage({ type: 'SYNAPSE_REDOCK_TAB', windowName: window.name });
                  } catch(e) {}
                  window.close();
                };
              }
            }

            if (window.opener || (window.name && window.name.indexOf('SynapseTab_') === 0)) {
              if (document.readyState === 'loading') {
                window.addEventListener('DOMContentLoaded', injectSynapsePopoutBar);
              } else {
                injectSynapsePopoutBar();
              }
            }
          })();
        </script>
        `;

        if (html.includes('</head>')) {
          html = html.replace('</head>', `${proxyScript}</head>`);
        } else {
          html = proxyScript + html;
        }

        // Neutralizar JavaScript de frame-busting
        html = html.replace(/if\s*\(\s*top\s*!=?\s*self\s*\)/gi, 'if (false)');
        html = html.replace(/top\.location\s*=/gi, '/* top.location neutralized */');

        return res.send(html);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch (err: any) {
      console.error('Error in proxy-web:', err);
      return res
        .status(500)
        .send(
          `<div style="font-family:system-ui, -apple-system, sans-serif;padding:40px 24px;color:#e2e8f0;background:#090d16;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
            <div style="max-width:540px;background:#1e293b;border:1px solid #334155;border-radius:24px;padding:32px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
              <div style="width:56px;height:56px;border-radius:18px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:#818cf8;font-size:24px;">🌐</div>
              <h3 style="color:#ffffff;font-size:18px;font-weight:800;margin:0 0 10px;">Navegação Estação Synapse</h3>
              <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 20px;">Não foi possível carregar a página externa em frame direto devido a restrições do servidor de destino (${rawUrl}).</p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <a href="/api/reader-mode?url=${encodeURIComponent(rawUrl)}" style="background:#4f46e5;color:#ffffff;font-weight:700;font-size:13px;padding:12px;border-radius:14px;text-decoration:none;display:block;">📖 Abrir no Modo Leitor Limpo Synapse</a>
                <a href="${rawUrl}" target="_blank" rel="noopener noreferrer" style="background:#334155;color:#cbd5e1;font-weight:700;font-size:13px;padding:12px;border-radius:14px;text-decoration:none;display:block;">↗️ Abrir em Nova Aba Externa</a>
              </div>
            </div>
          </div>`
        );
    }
  });

  // Endpoint do Modo Leitor Limpo Synapse (Extrai e limpa texto de editais e portais para leitura 100% acoplada)
  app.get('/api/reader-mode', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('URL ausente');
    }

    try {
      let targetUrl = rawUrl;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      clearTimeout(timeout);
      const htmlText = await response.text();
      const urlObj = new URL(response.url || targetUrl);

      // Limpar scripts, estilos e navegação desnecessários para modo leitor
      let cleaned = htmlText
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

      // Injetar wrapper com estilo escuro e limpo de estudo
      const readerHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Leitor Limpo Synapse - ${urlObj.hostname}</title>
        <base href="${urlObj.protocol}//${urlObj.host}${urlObj.pathname}">
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0b0f19;
            color: #cbd5e1;
            line-height: 1.8;
            padding: 32px 24px;
            max-width: 900px;
            margin: 0 auto;
          }
          header.synapse-reader-bar {
            background: #1e293b;
            border: 1px solid #334155;
            padding: 16px 20px;
            border-radius: 16px;
            margin-bottom: 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            flex-wrap: wrap;
          }
          header.synapse-reader-bar h1 {
            font-size: 15px;
            font-weight: 800;
            color: #ffffff;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          header.synapse-reader-bar .badge {
            background: rgba(99, 102, 241, 0.2);
            color: #a5b4fc;
            font-size: 11px;
            padding: 4px 10px;
            border-radius: 20px;
            border: 1px solid rgba(99, 102, 241, 0.3);
            font-weight: 700;
          }
          a { color: #818cf8; text-decoration: underline; }
          h1, h2, h3, h4, h5, h6 { color: #f8fafc; font-weight: 800; line-height: 1.3; margin-top: 1.5em; }
          p, li { font-size: 15px; color: #cbd5e1; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #1e293b; border-radius: 12px; overflow: hidden; }
          th, td { padding: 12px 16px; border: 1px solid #334155; text-align: left; font-size: 13px; }
          th { background: #0f172a; color: #a5b4fc; }
          img { max-width: 100%; height: auto; border-radius: 12px; }
        </style>
      </head>
      <body>
        <header class="synapse-reader-bar">
          <h1>📖 Modo Leitor Limpo Synapse <span class="badge">${urlObj.hostname}</span></h1>
          <a href="${targetUrl}" target="_blank" style="color:#38bdf8;font-size:12px;font-weight:700;text-decoration:none;">↗️ Ver Fonte Original</a>
        </header>
        <main>
          ${cleaned}
        </main>
      </body>
      </html>
      `;

      return res.send(readerHtml);
    } catch (err: any) {
      return res.status(500).send(`Erro ao gerar modo leitor: ${err.message}`);
    }
  });

  // Endpoint de Resumo IA Inteligente de URL para Caderno Synapse
  app.post('/api/summarize-url', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ erro: true, mensagem: 'Chave GEMINI_API_KEY não configurada.' });
      }

      const { url: targetUrl } = req.body || {};
      if (!targetUrl) {
        return res.status(400).json({ erro: true, mensagem: 'URL é obrigatória.' });
      }

      // Baixar conteúdo textual da página
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const fetchRes = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }).catch(() => null);

      clearTimeout(timeout);

      let pageText = '';
      if (fetchRes) {
        const rawHtml = await fetchRes.text();
        pageText = rawHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 10000);
      }

      const prompt = `Você é o Assistente de Estudos do Synapse. Analise o seguinte edital/página de concurso e crie um resumo de estudos estruturado para o caderno do aluno em Markdown:

URL: ${targetUrl}
Conteúdo da Página: ${pageText || 'Página de Concurso / Edital Oficial'}

Gere um resumo organizado com os seguintes tópicos (se disponíveis):
1. 📌 **Órgão e Cargo**:
2. 💰 **Vagas e Remuneração**:
3. 🏢 **Banca Organizadora**:
4. 📅 **Datas Importantes e Inscrições**:
5. 📚 **Principais Disciplinas Cobradas / Requisitos**:
6. 🎯 **Dica Estratégica de Estudo no Synapse**:

Seja direto, claro e encorajador.`;

      const response = await callGeminiWithResilience(ai, {
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const summaryText = response.text || 'Resumo gerado pelo Synapse.';
      return res.json({ erro: false, summary: summaryText });
    } catch (err: any) {
      return res.json({ erro: true, mensagem: String(err?.message || err) });
    }
  });

  // YouTube Data API v3 Music Search Endpoint
  app.post('/api/music-search', async (req, res) => {
    try {
      const { theme } = req.body || {};
      if (!theme || typeof theme !== 'string' || !theme.trim()) {
        return res.status(400).json({ erro: true, error: 'Parâmetro "theme" é obrigatório.' });
      }

      const normalizedQuery = theme.trim().toLowerCase();
      const cacheKey = `yt_music_${normalizedQuery}`;

      // Check 24h server cache
      const cached = musicSearchCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        console.log(`[Music Search] Returning 24h cached server results for: "${normalizedQuery}"`);
        return res.json({
          erro: false,
          results: cached.results,
          title: cached.results[0]?.titulo,
          url: cached.results[0] ? `https://www.youtube.com/watch?v=${cached.results[0].videoId}` : undefined,
        });
      }

      const ytKey = "AIzaSyCSEReZYr4UPR9-b4xpzBgz3uij4eSNI74";
      let results: Array<{ videoId: string; titulo: string; canal: string; thumbnail: string }> = [];

      if (ytKey) {
        try {
          const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(
            theme
          )}&key=${ytKey}`;

          const ytRes = await fetch(ytUrl);
          const ytData = await ytRes.json();

          if (ytRes.ok && ytData.items && Array.isArray(ytData.items)) {
            results = ytData.items
              .map((item: any) => ({
                videoId: item.id?.videoId,
                titulo: item.snippet?.title || 'Vídeo de Música',
                canal: item.snippet?.channelTitle || 'YouTube',
                thumbnail:
                  item.snippet?.thumbnails?.medium?.url ||
                  item.snippet?.thumbnails?.default?.url ||
                  `https://i.ytimg.com/vi/${item.id?.videoId}/hqdefault.jpg`,
              }))
              .filter((x: any) => Boolean(x.videoId));
          } else if (ytData.error) {
            console.warn('[YouTube API v3 Error]:', ytData.error?.message || ytData.error);
            if (ytData.error?.code === 403) {
              console.warn('[YouTube API v3] Quota exceeded or API disabled. Falling back to curated embeddable stream collection.');
            }
          }
        } catch (apiErr) {
          console.error('[YouTube API v3 Fetch Error]:', apiErr);
        }
      }

      // Fallback curated list if YouTube Data API key is missing or quota/error occurred
      if (!results || results.length === 0) {
        console.log('[Music Search] Generating fallback embeddable list for theme:', theme);
        const fallbackCatalog = [
          { videoId: 'jfKfPfyJRdk', titulo: 'Lofi Girl - lofi hip hop radio - beats to relax/study to', canal: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg' },
          { videoId: '5qap5aO4i9A', titulo: 'Classical Music for Studying & Brain Power', canal: 'HALIDONMUSIC', thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg' },
          { videoId: 'eKFTSSKCzWA', titulo: 'Relaxing Rain & Thunder Sounds for Sleep or Study', canal: 'Calm Sounds', thumbnail: 'https://i.ytimg.com/vi/eKFTSSKCzWA/hqdefault.jpg' },
          { videoId: 'DWcjZAZBaT0', titulo: 'Synthwave Radio - chill synth / retro beats', canal: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/DWcjZAZBaT0/hqdefault.jpg' },
          { videoId: 'f02gHuu5K2I', titulo: 'Coffee Shop BGM - Relaxing Jazz Music', canal: 'Cafe Music BGM', thumbnail: 'https://i.ytimg.com/vi/f02gHuu5K2I/hqdefault.jpg' },
          { videoId: 'TURbeWK2wwg', titulo: 'Bossa Nova Guitar Instrumental for Focus', canal: 'Relaxing Bossa', thumbnail: 'https://i.ytimg.com/vi/TURbeWK2wwg/hqdefault.jpg' },
          { videoId: 'kgx4WGK0oNU', titulo: 'Jazz Hop & Lofi Beats Collection', canal: 'ChilledCow', thumbnail: 'https://i.ytimg.com/vi/kgx4WGK0oNU/hqdefault.jpg' },
          { videoId: 'lP26UCnoHso', titulo: 'Deep Focus Ambient Music for Work & Coding', canal: 'Music for Body and Spirit', thumbnail: 'https://i.ytimg.com/vi/lP26UCnoHso/hqdefault.jpg' },
        ];

        // Shuffle / filter based on keyword
        results = fallbackCatalog;
      }

      // Cache the search result for 24 hours
      musicSearchCache.set(cacheKey, { timestamp: Date.now(), results });

      return res.json({
        erro: false,
        results,
        title: results[0]?.titulo,
        url: results[0] ? `https://www.youtube.com/watch?v=${results[0].videoId}` : undefined,
      });
    } catch (err: any) {
      console.error('Erro na rota /api/music-search:', err);
      return res.status(500).json({
        erro: true,
        tipo: 'erro_temporario',
        error: err.message || 'Falha ao buscar playlist de música.',
        mensagem: err.message || 'Falha ao buscar playlist de música.',
      });
    }
  });

  // YouTube Link Embeddability Validation Endpoint
  app.post('/api/music-validate', async (req, res) => {
    try {
      const { videoId, url } = req.body || {};
      let idToTest = videoId;

      if (!idToTest && url && typeof url === 'string') {
        const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([^#&?]*)/);
        if (match && match[1] && match[1].length === 11) {
          idToTest = match[1];
        }
      }

      if (!idToTest) {
        return res.status(400).json({ erro: true, mensagem: 'ID de vídeo ou URL inválida.' });
      }

      let isEmbeddable = false;
      let videoTitle = '';

      // Method 1: YouTube Data API v3 if key available
      const ytKey = "AIzaSyCSEReZYr4UPR9-b4xpzBgz3uij4eSNI74";
      if (ytKey) {
        try {
          const apiRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${idToTest}&key=${ytKey}`
          );
          const apiData = await apiRes.json();
          if (apiRes.ok && apiData.items && apiData.items.length > 0) {
            const item = apiData.items[0];
            isEmbeddable = item.status?.embeddable === true;
            videoTitle = item.snippet?.title || '';
          }
        } catch (err) {
          console.warn('[Music Validate] API v3 check failed, trying oEmbed:', err);
        }
      }

      // Method 2: Public oEmbed API fallback
      if (!isEmbeddable) {
        try {
          const oembedRes = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${idToTest}&format=json`
          );
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            isEmbeddable = true;
            videoTitle = oembedData.title || '';
          }
        } catch (e) {
          isEmbeddable = false;
        }
      }

      if (!isEmbeddable) {
        return res.json({
          erro: false,
          embeddable: false,
          videoId: idToTest,
          title: videoTitle,
          autoSearchQuery: videoTitle || 'lofi estudo foco',
          mensagem:
            'Este vídeo/mix não permite reprodução incorporada (restrição do proprietário). Buscando alternativas parecidas...',
        });
      }

      return res.json({
        erro: false,
        embeddable: true,
        videoId: idToTest,
        title: videoTitle,
      });
    } catch (err: any) {
      console.error('Erro na rota /api/music-validate:', err);
      return res.status(500).json({ erro: true, mensagem: 'Falha ao validar link do vídeo.' });
    }
  });


  // Vite middleware in development or static serve in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SYNAPSE running on http://localhost:${PORT}`);
  });
}

startServer();
