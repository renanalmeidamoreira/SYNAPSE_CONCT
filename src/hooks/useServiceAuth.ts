import { useGoogleMusicAuth, GoogleMusicAuthState } from './useGoogleMusicAuth';
import { useGeminiAuth, GeminiAuthState } from './useGeminiAuth';

export type ServiceType = 'google_music' | 'gemini' | 'llamafile' | 'classroom';

export interface ServiceStatus {
  service: ServiceType;
  name: string;
  isConnected: boolean;
  userIdentifier: string | null;
  details?: string;
}

export function useServiceAuth() {
  const googleMusic = useGoogleMusicAuth();
  const gemini = useGeminiAuth();

  const getServiceStatusList = (): ServiceStatus[] => {
    return [
      {
        service: 'google_music',
        name: 'YouTube Music / Google Music',
        isConnected: googleMusic.isAuthenticated,
        userIdentifier: googleMusic.userEmail || (googleMusic.isAuthenticated ? 'Conectado' : null),
        details: 'Permite sincronizar e buscar playlists de estudo personalizadas.',
      },
      {
        service: 'gemini',
        name: 'Google Gemini Pro / Flash AI',
        isConnected: true, // Managed by server/cloud, with optional user custom key
        userIdentifier: gemini.hasCustomKey ? 'Chave personalizada ativa' : 'Chave do Servidor SYNAPSE',
        details: `Modelo atual: ${gemini.preferredModel}`,
      },
      {
        service: 'llamafile',
        name: 'Llamafile (IA Local Offline)',
        isConnected: gemini.useLocalLlamafile,
        userIdentifier: gemini.useLocalLlamafile ? gemini.llamafileEndpoint : 'Desativado',
        details: 'Execução de modelo de IA local no host para estudo offline e alta privacidade.',
      },
    ];
  };

  return {
    googleMusic,
    gemini,
    getServiceStatusList,
  };
}
