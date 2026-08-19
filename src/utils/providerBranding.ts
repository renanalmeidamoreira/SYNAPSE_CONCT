export interface ProviderBranding {
  dominio: string;
  nome: string;
  corPrimaria: string;
  corFundo: string;
  textoInstrucao: string;
  textoBotao: string;
  badgeText?: string;
  badgeBg?: string;
  badgeTextCol?: string;
  logoSubtext?: string;
  logoUrl?: string;
}

export const KNOWN_PROVIDERS: ProviderBranding[] = [
  {
    dominio: 'focusconcursos.com.br',
    nome: 'Focus Concursos',
    corPrimaria: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/20',
    corFundo: 'bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-emerald-500/30',
    textoInstrucao: 'O login deve ser feito diretamente pelo site da Focus Concursos.',
    textoBotao: 'Entrar com a conta Focus Concursos',
    badgeText: 'PORTAL FOCUS CONCURSOS',
    badgeBg: 'bg-emerald-500/10',
    badgeTextCol: 'text-emerald-400 border-emerald-500/30',
    logoSubtext: 'Plataforma de Cursos e Concursos',
  },
];

export function getProviderBranding(url?: string | null): ProviderBranding | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const formattedUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(formattedUrl);
    const host = parsed.hostname.toLowerCase();

    for (const provider of KNOWN_PROVIDERS) {
      if (host === provider.dominio || host.endsWith('.' + provider.dominio)) {
        return provider;
      }
    }
  } catch (e) {
    if (trimmed.includes('focusconcursos.com.br')) {
      return KNOWN_PROVIDERS[0];
    }
  }

  return null;
}
