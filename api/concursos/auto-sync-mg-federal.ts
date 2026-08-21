const SEED_CONCURSOS = [
  { orgao: 'Prefeitura de Belo Horizonte (PBH)', cargo: 'Professor, Técnico em Educação e Agente Administrativo', banca: 'Fundep', situacao: 'aberto', vagas: '115 Vagas', remuneracao: 'R$ 3.100,00 a R$ 6.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Concurso da capital mineira com excelente plano de carreira.', fonte: 'Concursos no Brasil' },
  { orgao: 'Prefeitura de Contagem', cargo: 'Guarda Municipal, Agente e Professores', banca: 'Fundep', situacao: 'aberto', vagas: '272 Vagas', remuneracao: 'R$ 2.800,00 a R$ 7.200,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Grande concurso na Região Metropolitana de Belo Horizonte.', fonte: 'Concursos no Brasil' },
  { orgao: 'Polícia Militar de Minas Gerais (PMMG)', cargo: 'Soldado e Oficial da PMMG', banca: 'CRS/PMMG', situacao: 'aberto', vagas: '3.102 Vagas', remuneracao: 'R$ 4.360,83 inicial', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://www.policiamilitar.mg.gov.br/crs', resumo: 'Exigência de nível superior e idade até 30 anos.', fonte: 'PMMG CRS' },
  { orgao: 'Polícia Civil de Minas Gerais (PC MG)', cargo: 'Investigador, Escrivão, Delegado e Perito', banca: 'FGV', situacao: 'previsto', vagas: '255 Vagas Autorizadas', remuneracao: 'R$ 5.890,00 a R$ 14.200,00', uf: 'MG', dataLimiteInscricao: 'Edital Iminente', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Carreiras policiais civis no Estado de Minas Gerais.', fonte: 'Concursos no Brasil' },
  { orgao: 'Corpo de Bombeiros Militar de Minas Gerais (CBM MG)', cargo: 'Soldado Combatente e Oficial Bombeiro', banca: 'Idecan', situacao: 'previsto', vagas: '342 Vagas', remuneracao: 'R$ 4.360,00 a R$ 10.028,00', uf: 'MG', dataLimiteInscricao: 'Autorizado e Iminente', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Exigência de nível superior e TAF. Grande certame de segurança pública em MG.', fonte: 'Concursos no Brasil' },
  { orgao: 'Tribunal de Justiça de Minas Gerais (TJMG)', cargo: 'Oficial Judiciário e Analista Judiciário', banca: 'MS Concursos', situacao: 'aberto', vagas: 'Vagas + Cadastro Reserva', remuneracao: 'R$ 3.667,87 a R$ 6.511,62', uf: 'MG', dataLimiteInscricao: 'Inscrições em Andamento', linkOficial: 'https://www.msconcursos.com.br', resumo: 'Oportunidades para nível médio e superior no Poder Judiciário mineiro.', fonte: 'TJMG Oficial' },
  { orgao: 'IBGE', cargo: 'Agente Censitário e Analista', banca: 'FGV / Cebraspe', situacao: 'previsto', vagas: '36.946 Vagas Solicitadas', remuneracao: 'R$ 4.500,00 a R$ 9.200,00', uf: 'BR', dataLimiteInscricao: 'Aguardando Aval MGI', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Mega seleção nacional autorizada para todo o território brasileiro.', fonte: 'Concursos no Brasil' },
  { orgao: 'INSS', cargo: 'Técnico e Analista do Seguro Social', banca: 'Cebraspe', situacao: 'previsto', vagas: '10.000 Vagas Solicitadas', remuneracao: 'R$ 6.593,90 a R$ 9.767,20', uf: 'BR', dataLimiteInscricao: 'Aguardando Aval MGI', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Solicitação formalizada para recomposição do quadro previdenciário.', fonte: 'Concursos no Brasil' },
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    erro: false,
    data: SEED_CONCURSOS,
    syncTimestamp: Date.now(),
  });
}
