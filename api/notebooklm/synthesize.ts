import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { title, content, sourceType } = req.body || {};
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'O conteúdo de origem para sintetizar é obrigatório.' });
    }

    const prompt = `Você é a API de Inteligência do Google NotebookLM. Sua função é processar fontes de estudo (documentos, tarefas, slides, PDFs ou notas) e gerar um Notebook de Estudo Sintetizado com 4 artefatos fundamentais:

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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    let parsedData;
    try {
      parsedData = JSON.parse(response.text || '{}');
    } catch {
      parsedData = { rawText: response.text };
    }

    return res.status(200).json({ success: true, notebook: parsedData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao sintetizar com NotebookLM API.' });
  }
}
