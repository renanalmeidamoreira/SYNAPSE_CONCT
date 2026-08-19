import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Building2,
  Briefcase,
  ExternalLink,
  Plus,
  Loader2,
  RefreshCw,
  Calendar,
  Globe,
  Award,
  Filter,
  Sparkles,
  MapPin,
  CheckCircle2,
  X,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  Landmark,
  FileText,
} from 'lucide-react';

export interface ConcursoResult {
  orgao: string;
  cargo: string;
  banca?: string;
  situacao: 'aberto' | 'em_andamento' | 'previsto' | 'encerrado' | 'indefinido';
  vagas?: string;
  remuneracao?: string;
  uf?: string;
  dataLimiteInscricao?: string | null;
  linkOficial: string;
  resumo?: string;
  fonte: string;
}

const BANCAS_POPULARES = [
  'Todas',
  'Fundep',
  'IBGP',
  'MS Concursos',
  'FGV',
  'Cebraspe',
  'VUNESP',
  'FCC',
  'Cesgranrio',
  'Idecan',
  'Reis & Reis',
  'Exame Auditores',
];

const INITIAL_SEED_CONCURSOS: ConcursoResult[] = [
  // CÂMARAS MUNICIPAIS MG
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

  // AUTARQUIAS, CONSÓRCIOS & ESTADUAIS MG
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
  { orgao: 'Polícia Militar de Minas Gerais (PMMG)', cargo: 'Soldado e Oficial da PMMG', banca: 'Centro de Recrutamento e Seleção (CRS/PMMG)', situacao: 'aberto', vagas: '3.102 Vagas', remuneracao: 'R$ 4.360,83 inicial', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://www.policiamilitar.mg.gov.br/crs', resumo: 'Exigência de nível superior e idade até 30 anos.', fonte: 'PMMG CRS' },
  { orgao: 'Tribunal de Justiça de Minas Gerais (TJMG)', cargo: 'Oficial Judiciário e Analista Judiciário', banca: 'MS Concursos', situacao: 'aberto', vagas: 'Vagas + Cadastro Reserva', remuneracao: 'R$ 3.667,87 a R$ 6.511,62', uf: 'MG', dataLimiteInscricao: 'Inscrições em Andamento', linkOficial: 'https://www.msconcursos.com.br', resumo: 'Oportunidades para nível médio e superior no Poder Judiciário mineiro.', fonte: 'TJMG Oficial' },
  { orgao: 'Tribunal Regional do Trabalho 3ª Região (TRT-MG)', cargo: 'Técnico e Analista Judiciário', banca: 'FCC', situacao: 'aberto', vagas: 'Cadastro de Reserva', remuneracao: 'R$ 9.052,54 a R$ 14.852,66', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://www.concursosfcc.com.br', resumo: 'Tribunal Federal em Minas Gerais com padrão unificado da União.', fonte: 'TRT-3 / FCC' },

  // PREFEITURAS MUNICIPAIS MG
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
  { orgao: 'Prefeitura de Divinópolis', cargo: 'Agente, Saúde e Educação', banca: 'IBGP', situacao: 'aberto', vagas: '8 Vagas + CR', remuneracao: 'R$ 2.200,00 a R$ 7.800,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Divinópolis no Centro-Oeste.', fonte: 'Concursos no Brasil' },
  { orgao: 'Prefeitura de Formiga', cargo: 'Diversos Cargos', banca: 'Fundep', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 1.800,00 a R$ 6.500,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Formiga/MG.', fonte: 'Concursos no Brasil' },
  { orgao: 'Prefeitura de Mariana', cargo: 'Saúde, Educação e Guarda', banca: 'IBGP', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 2.200,00 a R$ 8.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Mariana/MG.', fonte: 'Concursos no Brasil' },
  { orgao: 'Prefeitura de Ponte Nova', cargo: 'Geral', banca: 'Banca Oficial', situacao: 'aberto', vagas: 'Várias Vagas', remuneracao: 'R$ 1.800,00 a R$ 7.000,00', uf: 'MG', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Prefeitura de Ponte Nova/MG.', fonte: 'Concursos no Brasil' },
  { orgao: 'Prefeitura de Pouso Alegre', cargo: 'Educação, Saúde e Guarda Municipal', banca: 'Fundep', situacao: 'previsto', vagas: '471 Vagas Previstas', remuneracao: 'R$ 2.400,00 a R$ 8.500,00', uf: 'MG', dataLimiteInscricao: 'Comissão Formada', linkOficial: 'https://concursosnobrasil.com/concursos/mg/', resumo: 'Grande concurso para o polo do Sul de Minas.', fonte: 'Concursos no Brasil' },

  // FEDERAIS / NACIONAIS
  { orgao: 'IBGE - Instituto Brasileiro de Geografia e Estatística', cargo: 'Agente Censitário e Analista', banca: 'FGV / Cebraspe', situacao: 'previsto', vagas: '36.946 Vagas Solicitadas', remuneracao: 'R$ 4.500,00 a R$ 9.200,00', uf: 'BR', dataLimiteInscricao: 'Aguardando Aval MGI', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Mega seleção nacional autorizada para todo o território brasileiro.', fonte: 'Concursos no Brasil' },
  { orgao: 'INSS - Instituto Nacional do Seguro Social', cargo: 'Técnico e Analista do Seguro Social', banca: 'Cebraspe', situacao: 'previsto', vagas: '10.000 Vagas Solicitadas', remuneracao: 'R$ 6.593,90 a R$ 9.767,20', uf: 'BR', dataLimiteInscricao: 'Aguardando Aval MGI', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Solicitação formalizada para recomposição do quadro previdenciário.', fonte: 'Concursos no Brasil' },
  { orgao: 'Ministério da Saúde', cargo: 'Diversos Cargos em Saúde Pública e Gestão', banca: 'Cebraspe', situacao: 'previsto', vagas: '7.327 Vagas', remuneracao: 'R$ 4.200,00 a R$ 12.000,00', uf: 'BR', dataLimiteInscricao: 'Autorizado MGI', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Grande concurso federal para a área da saúde pública nacional.', fonte: 'Concursos no Brasil' },
  { orgao: 'FUNAI - Fundação Nacional dos Povos Indígenas', cargo: 'Indigenista Especializado e Agente', banca: 'Cesgranrio (CNU)', situacao: 'aberto', vagas: '900 Vagas', remuneracao: 'R$ 6.987,00 a R$ 8.900,00', uf: 'BR', dataLimiteInscricao: 'Inscrições em Andamento', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Vagas de nível superior e médio distribuídas por todas as regiões.', fonte: 'Concursos no Brasil' },
  { orgao: 'Transpetro', cargo: 'Quadro de Terra e Quadro de Mar', banca: 'Cesgranrio', situacao: 'aberto', vagas: '4.171 Vagas', remuneracao: 'R$ 5.540,00 a R$ 15.416,00', uf: 'BR', dataLimiteInscricao: 'Inscrições Abertas', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Subsidiária da Petrobras com vagas nacionais e pacote de benefícios.', fonte: 'Concursos no Brasil' },
  { orgao: 'Petrobras', cargo: 'Profissional de Nível Superior e Técnico', banca: 'Cebraspe', situacao: 'previsto', vagas: '1.100 Vagas Previstas', remuneracao: 'R$ 6.200,00 a R$ 14.500,00', uf: 'BR', dataLimiteInscricao: 'Edital Previsto', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Nova seleção para preenchimento de quadro operacional e de engenharia.', fonte: 'Concursos no Brasil' },
  { orgao: 'BACEN - Banco Central do Brasil', cargo: 'Analista do Banco Central', banca: 'Cebraspe', situacao: 'previsto', vagas: '170 Vagas', remuneracao: 'R$ 20.924,80 inicial', uf: 'BR', dataLimiteInscricao: 'Em Andamento/Fase de Provas', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Nível Superior em qualquer área.', fonte: 'Concursos no Brasil' },
  { orgao: 'Receita Federal do Brasil (RFB)', cargo: 'Auditor Fiscal e Analista Tributário', banca: 'FGV', situacao: 'previsto', vagas: '146 Vagas Solicitadas', remuneracao: 'R$ 13.000,00 a R$ 22.900,00', uf: 'BR', dataLimiteInscricao: 'Aguardando Autorização', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Novo pedido de concurso formulado pelo Ministério da Fazenda.', fonte: 'Concursos no Brasil' },
  { orgao: 'Banco do Brasil', cargo: 'Escriturário e Agente de Tecnologia', banca: 'Cesgranrio', situacao: 'previsto', vagas: 'Várias Vagas Previstas', remuneracao: 'R$ 3.800,00 + PLR e Benefícios', uf: 'BR', dataLimiteInscricao: 'Planejamento Interno', linkOficial: 'https://concursosnobrasil.com/concursos/br/', resumo: 'Estudos para novo concurso com foco comercial e de TI.', fonte: 'Concursos no Brasil' },
  { orgao: 'Polícia Federal (PF)', cargo: 'Agente, Escrivão, Papiloscopista e Delegado', banca: 'Cebraspe', situacao: 'previsto', vagas: '1.800 Vagas Solicitadas', remuneracao: 'R$ 14.710,00 a R$ 26.300,00', uf: 'BR', dataLimiteInscricao: 'Solicitado ao MGI', linkOficial: 'https://www.gov.br/pf', resumo: 'Porte nacional e carreiras policiais federais.', fonte: 'Polícia Federal' },
  { orgao: 'Polícia Rodoviária Federal (PRF)', cargo: 'Policial Rodoviário Federal', banca: 'Cebraspe', situacao: 'previsto', vagas: '4.900 Vagas Solicitadas', remuneracao: 'R$ 11.114,60 inicial', uf: 'BR', dataLimiteInscricao: 'Aguardando Aval do MGI', linkOficial: 'https://www.gov.br/prf', resumo: 'Nível Superior em qualquer área e CNH B.', fonte: 'PRF Oficial' },
];

const INDEX_CACHE_KEY = 'synapse_concursos_index_v7';

export function getIndexedConcursos(): ConcursoResult[] {
  try {
    const raw = localStorage.getItem(INDEX_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler cache local de concursos:', e);
  }
  return INITIAL_SEED_CONCURSOS;
}

export function saveToConcursosIndex(newItems: ConcursoResult[]): ConcursoResult[] {
  const current = getIndexedConcursos();
  const mapKey = (item: ConcursoResult) =>
    `${(item.orgao || '').toLowerCase().trim()}_${(item.uf || 'BR').toUpperCase()}`;

  const existingMap = new Map<string, ConcursoResult>();
  current.forEach((item) => existingMap.set(mapKey(item), item));
  newItems.forEach((item) => existingMap.set(mapKey(item), item));

  const merged = Array.from(existingMap.values());
  try {
    localStorage.setItem(INDEX_CACHE_KEY, JSON.stringify(merged));
  } catch (e) {}
  return merged;
}

interface ConcursosSearchProps {
  initialStatusFilter?: string;
  initialBancaFilter?: string;
  initialEstadoFilter?: string;
  onImportEdital: (url: string) => void;
  onClose: () => void;
}

export const ConcursosSearch: React.FC<ConcursosSearchProps> = ({
  initialStatusFilter = 'todos',
  initialBancaFilter = 'Todas',
  initialEstadoFilter = 'TODOS',
  onImportEdital,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'mg' | 'federal' | 'todos'>('mg');
  const [categoryFilter, setCategoryFilter] = useState<'todos' | 'prefeitura' | 'camara' | 'autarquia' | 'seguranca' | 'tribunal'>('todos');
  const [banca, setBanca] = useState<string>(initialBancaFilter);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Mode switcher: Radar Rápido vs Google Search
  const [mode, setMode] = useState<'radar' | 'google'>('radar');
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [googleResults, setGoogleResults] = useState<ConcursoResult[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [indexedStore, setIndexedStore] = useState<ConcursoResult[]>(() => getIndexedConcursos());
  const [lastSyncTime, setLastSyncTime] = useState<string>('Sincronizado');

  // Auto-sync on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSync = async () => {
      try {
        const res = await fetch('/api/concursos/auto-sync-mg-federal');
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.data) && isMounted) {
          const updated = saveToConcursosIndex(data.data);
          setIndexedStore(updated);
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (err) {
        console.warn('Auto-sync background check falhou, usando dados locais indexados.');
      }
    };
    fetchSync();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualSearch = async () => {
    if (mode === 'google' && searchTerm.trim()) {
      setGoogleLoading(true);
      try {
        const ufParam = activeTab === 'mg' ? 'MG' : activeTab === 'federal' ? 'BR' : undefined;
        const res = await fetch('/api/concursos/google-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchTerm.trim(),
            estado: ufParam,
            banca: banca !== 'Todas' ? banca : undefined,
          }),
        });
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setGoogleResults(json.data);
          saveToConcursosIndex(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setGoogleLoading(false);
      }
    } else {
      setLoading(true);
      try {
        const ufParam = activeTab === 'mg' ? 'MG' : activeTab === 'federal' ? 'BR' : undefined;
        const res = await fetch('/api/concursos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estado: ufParam,
            banca: banca !== 'Todas' ? banca : undefined,
            status: statusFilter,
            termoCargo: searchTerm.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const updated = saveToConcursosIndex(json.data);
          setIndexedStore(updated);
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenIntegrated = (url: string, title: string) => {
    if ((window as any).openInAppWeb) {
      (window as any).openInAppWeb(url, title);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Filtered results
  const displayedResults = useMemo(() => {
    if (mode === 'google' && googleResults.length > 0) {
      return googleResults;
    }

    return indexedStore.filter((item) => {
      // Tab filter
      if (activeTab === 'mg') {
        const isMG = item.uf === 'MG' || item.orgao.toUpperCase().includes('MINAS GERAIS') || item.orgao.includes('MG') || item.orgao.includes('Câmara de') || item.orgao.includes('Prefeitura de');
        if (!isMG) return false;
      } else if (activeTab === 'federal') {
        const isFed = item.uf === 'BR' || item.orgao.toLowerCase().includes('federal') || item.orgao.toLowerCase().includes('nacional');
        if (!isFed) return false;
      }

      // Category filter
      if (categoryFilter === 'prefeitura' && !item.orgao.toLowerCase().includes('prefeitura')) {
        return false;
      }
      if (categoryFilter === 'camara' && !item.orgao.toLowerCase().includes('câmara')) {
        return false;
      }
      if (categoryFilter === 'autarquia') {
        const isAut = item.orgao.includes('DMAE') || item.orgao.includes('DAMAE') || item.orgao.includes('EMATER') || item.orgao.includes('HOB') || item.orgao.includes('SAAE') || item.orgao.includes('CIDAS') || item.orgao.includes('CIDES') || item.orgao.includes('CIGEDAS') || item.orgao.includes('CISICOM') || item.orgao.includes('CISMAS') || item.orgao.includes('Unimontes') || item.orgao.includes('IFSULDEMINAS');
        if (!isAut) return false;
      }
      if (categoryFilter === 'seguranca') {
        const isSeg = item.orgao.includes('Polícia') || item.orgao.includes('Bombeiros') || item.orgao.includes('PMMG') || item.orgao.includes('PCMG') || item.orgao.includes('PRF') || item.orgao.includes('PF') || item.orgao.includes('CBM');
        if (!isSeg) return false;
      }
      if (categoryFilter === 'tribunal') {
        const isTrib = item.orgao.includes('Tribunal') || item.orgao.includes('TJ') || item.orgao.includes('TRT') || item.orgao.includes('MPU') || item.orgao.includes('Ministério Público');
        if (!isTrib) return false;
      }

      // Status filter
      if (statusFilter !== 'todos' && item.situacao !== statusFilter) {
        return false;
      }

      // Banca filter
      if (banca !== 'Todas' && item.banca && !item.banca.toLowerCase().includes(banca.toLowerCase())) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          item.orgao.toLowerCase().includes(q) ||
          item.cargo.toLowerCase().includes(q) ||
          (item.resumo && item.resumo.toLowerCase().includes(q)) ||
          (item.banca && item.banca.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [indexedStore, activeTab, categoryFilter, statusFilter, banca, searchTerm, mode, googleResults]);

  const mgCount = useMemo(() => indexedStore.filter((i) => i.uf === 'MG' || i.orgao.includes('MG') || i.orgao.includes('Prefeitura') || i.orgao.includes('Câmara')).length, [indexedStore]);
  const fedCount = useMemo(() => indexedStore.filter((i) => i.uf === 'BR' || i.orgao.toLowerCase().includes('federal') || i.orgao.toLowerCase().includes('nacional')).length, [indexedStore]);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 md:p-7 shadow-xl animate-in fade-in duration-200 space-y-6">
      {/* Top Header & Close Button */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Radar de Concursos & Editais</span>
              <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                Concursos no Brasil & Diários
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Varredura contínua de Prefeituras, Câmaras Municipais, Autarquias de MG e Concursos Nacionais
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Fechar painel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Region & Source Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Quick Region Tabs */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('mg');
              setMode('radar');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'mg'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>🔺 Minas Gerais (MG)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{mgCount}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('federal');
              setMode('radar');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'federal'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <span>🇧🇷 Federais (BR)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{fedCount}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('todos');
              setMode('radar');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'todos'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Todos os Estados
          </button>
        </div>

        {/* Source Direct Link & Engine Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenIntegrated('https://concursosnobrasil.com/concursos/mg/', 'Concursos no Brasil - MG')}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center gap-1.5 transition-all"
            title="Abrir página oficial do portal Concursos no Brasil"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>Ver no Portal Concursos no Brasil</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </button>

          <button
            onClick={() => setMode(mode === 'radar' ? 'google' : 'radar')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
              mode === 'google'
                ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <span>{mode === 'google' ? 'Google Search Ativo' : 'Buscar no Google'}</span>
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      {activeTab === 'mg' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold text-[11px] mr-1">Filtrar Categoria:</span>
          {[
            { id: 'todos', label: 'Todas as Categorias' },
            { id: 'prefeitura', label: '🏛️ Prefeituras Municipais' },
            { id: 'camara', label: '📜 Câmaras Municipais' },
            { id: 'autarquia', label: '💧 Autarquias & Saúde (DMAE/HOB)' },
            { id: 'seguranca', label: '🛡️ Polícias & Bombeiros' },
            { id: 'tribunal', label: '⚖️ Tribunais & Judiciário' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Search Bar & Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            placeholder="Buscar por cidade, órgão, cargo (ex: Belo Horizonte, Contagem, PMMG, DMAE, Guarda)..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={banca}
            onChange={(e) => setBanca(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Todas">Banca: Todas</option>
            {BANCAS_POPULARES.filter((b) => b !== 'Todas').map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="todos">Status: Todos</option>
            <option value="aberto">Inscrições Abertas</option>
            <option value="previsto">Previstos / Autorizados</option>
            <option value="em_andamento">Em Andamento</option>
          </select>

          <button
            onClick={handleManualSearch}
            disabled={loading || googleLoading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer"
            title="Atualizar busca"
          >
            {loading || googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-800 dark:text-indigo-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>
            Exibindo <strong>{displayedResults.length} editais</strong> correspondentes. Fonte sincronizada com o catálogo do Concursos no Brasil.
          </span>
        </div>
        <span className="text-[10px] text-indigo-400 font-mono">Última atualização: {lastSyncTime}</span>
      </div>

      {/* Grid of Results */}
      {displayedResults.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Nenhum concurso localizado com esses critérios</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Tente remover alguns filtros ou buscar pelo nome da cidade diretamente.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('todos');
              setStatusFilter('todos');
              setBanca('Todas');
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl transition-all"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedResults.map((item, idx) => {
            const isAberto = item.situacao === 'aberto';
            const isPrevisto = item.situacao === 'previsto';

            return (
              <div
                key={`${item.orgao}-${idx}`}
                className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-xs hover:shadow-md"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isAberto
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          : isPrevisto
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                      }`}
                    >
                      {isAberto ? 'Inscrições Abertas' : isPrevisto ? 'Previsto / Autorizado' : 'Em Andamento'}
                    </span>

                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase">
                      {item.uf || 'MG'}
                    </span>
                  </div>

                  {/* Organ & Cargo */}
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1 line-clamp-1">
                    {item.orgao}
                  </h3>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2.5 line-clamp-2">
                    {item.cargo}
                  </p>

                  {/* Summary / Metadata */}
                  <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 mb-3 bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Vagas:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{item.vagas || 'Vagas em Edital'}</span>
                    </div>
                    {item.remuneracao && (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Remuneração:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{item.remuneracao}</span>
                      </div>
                    )}
                    {item.banca && (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Banca:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[140px] text-right">{item.banca}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                  <button
                    onClick={() => onImportEdital(item.linkOficial)}
                    className="w-full flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                    title="Criar Estação de Estudos para este edital"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar Estação</span>
                  </button>

                  <button
                    onClick={() => handleOpenIntegrated(item.linkOficial, item.orgao)}
                    className="w-full flex items-center justify-center gap-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs py-2 rounded-xl transition-all cursor-pointer"
                    title="Abrir página do concurso no navegador interno do SYNAPSE"
                  >
                    <span>Abrir no SY</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
